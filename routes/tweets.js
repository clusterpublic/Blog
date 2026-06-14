import { Router } from 'express';
import { getCollections } from '../config/db.js';
import { verifyPassword, stringifyId } from '../utils/helpers.js';
import {
  extractTweetId,
  extractSpaceId,
  isSpaceUrl,
} from '../utils/validationHelpers.js';
import {
  fetchTweetData,
  fetchSpaceData,
  parseTweetData,
  parseSpaceData,
} from '../utils/tweetHelpers.js';

const router = Router();

function buildSearchFilter(search) {
  return [
    { text: { $regex: search, $options: 'i' } },
    { author_name: { $regex: search, $options: 'i' } },
    { author_username: { $regex: search, $options: 'i' } },
    { tweet_id: { $regex: search, $options: 'i' } },
  ];
}

function getPinnedTweetsForType(tweetsCollection, tweetType, search) {
  const pinnedQuery = {
    pinned: { $elemMatch: { type: tweetType } },
    tweet_type: { $ne: 'space' },
  };
  if (search) pinnedQuery.$or = buildSearchFilter(search);
  return tweetsCollection.find(pinnedQuery).toArray();
}

async function processPinnedTweets(tweetsCollection, tweetType, search) {
  const typeToFetch = tweetType && tweetType !== 'all' ? tweetType : 'all';
  const pinnedTweetsRaw = await getPinnedTweetsForType(tweetsCollection, typeToFetch, search);
  const pinnedTweets = [];

  for (const tweet of pinnedTweetsRaw) {
    if (Array.isArray(tweet.pinned)) {
      for (const pin of tweet.pinned) {
        if (pin.type === typeToFetch) {
          pinnedTweets.push({ ...tweet, _pin_index: pin.index || 0 });
          break;
        }
      }
    }
  }
  pinnedTweets.sort((a, b) => a._pin_index - b._pin_index);
  return pinnedTweets;
}

function getPinnedExclusion(tweetType) {
  const pinType = tweetType && tweetType !== 'all' ? tweetType : 'all';
  return [
    { pinned: { $exists: false } },
    { pinned: { $not: { $elemMatch: { type: pinType } } } },
  ];
}

router.post('/api/add_tweet', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const tweetUrl = data.tweet_url;
    const tweetType = data.tweet_type || 'tweet';
    if (!tweetUrl) return res.status(400).json({ success: false, message: 'Tweet URL is required' });

    let parsedTweet;
    if (tweetType === 'space') {
      if (!isSpaceUrl(tweetUrl)) {
        return res.status(400).json({
          success: false,
          message: 'For Space content type, please use a valid Space URL format: https://x.com/i/spaces/...',
        });
      }
      const spaceId = extractSpaceId(tweetUrl);
      if (!spaceId) return res.status(400).json({ success: false, message: 'Invalid space URL format' });
      if (await tweets.findOne({ space_id: spaceId })) {
        return res.status(400).json({ success: false, message: 'Space already exists' });
      }
      parsedTweet = parseSpaceData(await fetchSpaceData(spaceId));
    } else {
      if (isSpaceUrl(tweetUrl)) {
        return res.status(400).json({
          success: false,
          message:
            'For this content type, please use a valid Tweet URL format: https://twitter.com/username/status/... or https://x.com/username/status/...',
        });
      }
      const tweetId = extractTweetId(tweetUrl);
      if (!tweetId) return res.status(400).json({ success: false, message: 'Invalid tweet URL format' });
      if (await tweets.findOne({ tweet_id: tweetId })) {
        return res.status(400).json({ success: false, message: 'Tweet already exists' });
      }
      parsedTweet = parseTweetData(await fetchTweetData(tweetId), tweetType);
    }

    await tweets.insertOne(parsedTweet);
    return res.json({ success: true, message: 'Tweet added successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/api/get_all_tweets', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '12', 10);
    const search = req.query.search || '';
    const tweetType = req.query.type || '';
    const skip = (page - 1) * perPage;

    const query = { tweet_type: { $ne: 'space' } };
    if (search) query.$or = buildSearchFilter(search);
    if (tweetType && tweetType !== 'space') query.tweet_type = tweetType;

    const totalTweets = await tweets.countDocuments(query);
    const pinnedTweets = await processPinnedTweets(tweets, tweetType, search);

    const regularQuery = { ...query };
    const pinnedExclusion = getPinnedExclusion(tweetType);

    if (regularQuery.$or) {
      const searchFilter = regularQuery.$or;
      delete regularQuery.$or;
      regularQuery.$and = [{ $or: searchFilter }, { $or: pinnedExclusion }];
      if (query.tweet_type) regularQuery.$and.push({ tweet_type: query.tweet_type });
    } else {
      regularQuery.$or = pinnedExclusion;
    }

    const pinnedCount = pinnedTweets.length;
    let regularSkip, regularLimit;
    if (skip < pinnedCount) {
      regularSkip = 0;
      regularLimit = perPage - (pinnedCount - skip);
    } else {
      regularSkip = skip - pinnedCount;
      regularLimit = perPage;
    }

    let regularTweets = [];
    if (regularLimit > 0) {
      regularTweets = await tweets
        .find(regularQuery)
        .sort({ tweet_id: -1 })
        .skip(regularSkip)
        .limit(regularLimit)
        .toArray();
    }

    let paginatedTweets;
    if (skip < pinnedCount) {
      paginatedTweets = [...pinnedTweets.slice(skip), ...regularTweets];
    } else {
      paginatedTweets = regularTweets;
    }

    const cleaned = paginatedTweets.map((tweet) => {
      const copy = stringifyId(tweet);
      delete copy._pin_index;
      return copy;
    });

    return res.json({
      tweets: cleaned,
      total: totalTweets,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalTweets / perPage),
      pinned_count: pinnedCount,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/api/delete_tweet/:tweet_id', async (req, res) => {
  try {
    const { tweets } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    const result = await tweets.deleteOne({ tweet_id: req.params.tweet_id });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Tweet not found' });
    return res.json({ success: true, message: 'Tweet deleted successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/api/debug_tweet/:tweet_id', async (req, res) => {
  try {
    const tweetData = await fetchTweetData(req.params.tweet_id);
    return res.json({
      success: true,
      tweet_id: req.params.tweet_id,
      raw_response: tweetData,
      response_structure: {
        top_level_keys: typeof tweetData === 'object' ? Object.keys(tweetData) : 'Not a dict',
        data_keys: tweetData.data ? Object.keys(tweetData.data) : 'No data field',
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
