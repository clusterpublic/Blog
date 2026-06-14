import { Router } from 'express';
import { getCollections } from '../config/db.js';
import { verifyPassword, stringifyId } from '../utils/helpers.js';
import { mergeQueryWithPublicFilter } from '../utils/blogHelpers.js';
import {
  blogCacheKey,
  getOrSetBlogCache,
  setBlogCacheHeaders,
} from '../utils/blogCache.js';
import {
  validateInstagramUrl,
  validateTwitterUrl,
  validateYoutubeUrl,
  generateEmbedUrl,
} from '../utils/validationHelpers.js';

const router = Router();

router.post('/api/add_creator_showcase', async (req, res) => {
  try {
    const { creatorShowcase } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const { creator_name, image_url, platform, post_url } = data;
    if (!creator_name || !image_url || !platform || !post_url) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!['instagram', 'twitter', 'youtube'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Invalid platform. Must be instagram, twitter, or youtube' });
    }

    const validators = { instagram: validateInstagramUrl, twitter: validateTwitterUrl, youtube: validateYoutubeUrl };
    if (!validators[platform](post_url)) {
      return res.status(400).json({ success: false, message: `Invalid ${platform} URL format` });
    }

    await creatorShowcase.insertOne({
      creator_name,
      image_url,
      platform,
      post_url,
      embed_post_url: generateEmbedUrl(post_url, platform),
      timestamp: Date.now() / 1000,
    });

    return res.json({ success: true, message: 'Creator showcase added successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/api/get_all_creator_showcases', async (req, res) => {
  try {
    const { creatorShowcase } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '12', 10);
    const search = req.query.search || '';
    const platformFilter = req.query.platform || '';
    const skip = (page - 1) * perPage;

    const query = {};
    if (search) {
      query.$or = [
        { creator_name: { $regex: search, $options: 'i' } },
        { platform: { $regex: search, $options: 'i' } },
      ];
    }
    if (platformFilter) query.platform = platformFilter;

    const total = await creatorShowcase.countDocuments(query);
    const showcases = await creatorShowcase
      .find(query, {
        projection: { creator_name: 1, image_url: 1, platform: 1, post_url: 1, embed_post_url: 1, timestamp: 1 },
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    return res.json({
      showcases: showcases.map(stringifyId),
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/api/delete_creator_showcase/:showcase_id', async (req, res) => {
  try {
    const { creatorShowcase } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    const objectId = toObjectId(req.params.showcase_id);
    if (!objectId) return res.status(400).json({ success: false, message: 'Invalid showcase ID' });

    const result = await creatorShowcase.deleteOne({ _id: objectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Creator showcase not found' });
    }
    return res.json({ success: true, message: 'Creator showcase deleted successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/api/prompt-protocol-data', async (req, res) => {
  try {
    const cacheKey = blogCacheKey('prompt-protocol-data');
    const { data, hit } = await getOrSetBlogCache(cacheKey, async () => {
      const { blogs, creatorShowcase, tweets } = getCollections();

      const latestBlogs = await blogs
        .find(mergeQueryWithPublicFilter({}), {
          projection: { title: 1, description: 1, blog_id: 1, timestamp: 1, thumbnail: 1 },
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray();

      const allCreators = await creatorShowcase
        .find({}, { projection: { creator_name: 1, image_url: 1, platform: 1, post_url: 1, embed_post_url: 1, timestamp: 1 } })
        .sort({ timestamp: -1 })
        .toArray();

      const pinnedTweets = await tweets.find({ pinned: { $exists: true } }).sort({ 'pinned.index': 1 }).toArray();
      const regularTweets = await tweets.find({ pinned: { $exists: false } }).sort({ created_at: -1 }).toArray();
      const allTweets = [...pinnedTweets, ...regularTweets].map(stringifyId);

      const tweetList = allTweets.filter((t) => t.tweet_type !== 'space');
      const spaces = allTweets.filter((t) => t.tweet_type === 'space');

      return {
        success: true,
        data: {
          latest_blogs: { count: latestBlogs.length, blogs: latestBlogs.map(stringifyId) },
          creators: { count: allCreators.length, creators: allCreators.map(stringifyId) },
          tweets: { count: tweetList.length, tweets: tweetList },
          spaces: { count: spaces.length, spaces },
        },
        metadata: {
          total_blogs: await blogs.countDocuments(mergeQueryWithPublicFilter({})),
          total_creators: await creatorShowcase.countDocuments({}),
          total_tweets: await tweets.countDocuments({ tweet_type: { $ne: 'space' } }),
          total_spaces: await tweets.countDocuments({ tweet_type: 'space' }),
          generated_at: Date.now() / 1000,
        },
      };
    });

    setBlogCacheHeaders(res, hit);
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, message: 'Failed to fetch prompt protocol data' });
  }
});

export default router;
