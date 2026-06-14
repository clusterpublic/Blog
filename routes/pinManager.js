import { Router } from 'express';
import { getCollections } from '../config/db.js';
import { verifyPassword, stringifyId } from '../utils/helpers.js';

const router = Router();

function buildSearchFilter(search) {
  return [
    { text: { $regex: search, $options: 'i' } },
    { author_name: { $regex: search, $options: 'i' } },
    { author_username: { $regex: search, $options: 'i' } },
    { tweet_id: { $regex: search, $options: 'i' } },
  ];
}

router.get('/api/pin_manager/tweets', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '12', 10);
    const search = req.query.search || '';
    const tweetType = req.query.type || '';
    const skip = (page - 1) * perPage;

    const query = { tweet_type: { $ne: 'space' } };
    if (search) query.$or = buildSearchFilter(search);
    if (tweetType && tweetType !== 'all' && tweetType !== 'space') query.tweet_type = tweetType;

    const totalTweets = await tweets.countDocuments(query);
    const tweetList = await tweets.find(query).sort({ tweet_id: -1 }).skip(skip).limit(perPage).toArray();

    return res.json({
      tweets: tweetList.map(stringifyId),
      total: totalTweets,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalTweets / perPage),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/pin_manager/pinned/:tweet_type', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const tweetType = req.params.tweet_type;
    const pinnedTweets = await tweets
      .find({ pinned: { $elemMatch: { type: tweetType } }, tweet_type: { $ne: 'space' } })
      .toArray();

    const filtered = [];
    for (const tweet of pinnedTweets) {
      for (const pin of tweet.pinned || []) {
        if (pin.type === tweetType) {
          filtered.push({ ...tweet, pinned: pin });
          break;
        }
      }
    }
    filtered.sort((a, b) => a.pinned.index - b.pinned.index);

    return res.json({ pinned_tweets: filtered.map(stringifyId), count: filtered.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/api/pin_manager/pin_tweet', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const { password, tweet_id, tweet_type } = req.body;
    if (!verifyPassword(password)) return res.status(401).json({ success: false, message: 'Wrong Password' });
    if (!tweet_id || !tweet_type) {
      return res.status(400).json({ success: false, message: 'Tweet ID and type are required' });
    }

    const tweet = await tweets.findOne({ tweet_id });
    if (!tweet) return res.status(404).json({ success: false, message: 'Tweet not found' });

    const allPinned = await tweets.find({ pinned: { $elemMatch: { type: tweet_type } } }).toArray();
    let maxIndex = 0;
    for (const doc of allPinned) {
      for (const pin of doc.pinned || []) {
        if (pin.type === tweet_type && pin.index > maxIndex) maxIndex = pin.index;
      }
    }
    const nextIndex = maxIndex + 1;
    if (nextIndex > 10) {
      return res.status(400).json({ success: false, message: `Maximum 10 tweets can be pinned for type "${tweet_type}"` });
    }

    const existing = await tweets.findOne({ tweet_id, pinned: { $elemMatch: { type: tweet_type } } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Tweet is already pinned for type "${tweet_type}"` });
    }

    const result = await tweets.updateOne(
      { tweet_id },
      { $push: { pinned: { type: tweet_type, index: nextIndex } } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Tweet not found' });
    return res.json({ success: true, message: 'Tweet pinned successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/api/pin_manager/unpin_tweet', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const { password, tweet_id, tweet_type } = req.body;
    if (!verifyPassword(password)) return res.status(401).json({ success: false, message: 'Wrong Password' });
    if (!tweet_id || !tweet_type) {
      return res.status(400).json({ success: false, message: 'Tweet ID and type are required' });
    }

    const tweet = await tweets.findOne({ tweet_id });
    if (!tweet?.pinned) return res.status(404).json({ success: false, message: 'Tweet not found' });

    let removedIndex = null;
    for (const pin of tweet.pinned) {
      if (pin.type === tweet_type) {
        removedIndex = pin.index;
        break;
      }
    }
    if (removedIndex === null) {
      return res.status(404).json({ success: false, message: `Tweet not pinned for type "${tweet_type}"` });
    }

    await tweets.updateOne({ tweet_id }, { $pull: { pinned: { type: tweet_type } } });

    const remaining = await tweets.find({ pinned: { $elemMatch: { type: tweet_type } } }).toArray();
    for (const remainingTweet of remaining) {
      for (const pin of remainingTweet.pinned || []) {
        if (pin.type === tweet_type && pin.index > removedIndex) {
          await tweets.updateOne(
            { tweet_id: remainingTweet.tweet_id, 'pinned.type': tweet_type },
            { $set: { 'pinned.$.index': pin.index - 1 } }
          );
        }
      }
    }

    return res.json({ success: true, message: 'Tweet unpinned successfully and indexes reordered' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/api/pin_manager/update_pin_index', async (req, res) => {
  try {
    const { tweets } = getCollections();
    const { password, tweet_id, new_index, tweet_type } = req.body;
    if (!verifyPassword(password)) return res.status(401).json({ success: false, message: 'Wrong Password' });
    if (!tweet_id || new_index === undefined || !tweet_type) {
      return res.status(400).json({ success: false, message: 'Tweet ID, new index, and type are required' });
    }
    if (new_index < 1 || new_index > 10) {
      return res.status(400).json({ success: false, message: 'Index must be between 1 and 10' });
    }

    const currentTweet = await tweets.findOne({ tweet_id });
    if (!currentTweet?.pinned) return res.status(404).json({ success: false, message: 'Pinned tweet not found' });

    let oldIndex = null;
    for (const pin of currentTweet.pinned) {
      if (pin.type === tweet_type) {
        oldIndex = pin.index;
        break;
      }
    }
    if (oldIndex === null) {
      return res.status(404).json({ success: false, message: `Tweet not pinned for type "${tweet_type}"` });
    }
    if (oldIndex === new_index) return res.json({ success: true, message: 'Index unchanged' });

    const pinnedTweets = await tweets.find({ pinned: { $elemMatch: { type: tweet_type } } }).toArray();
    const tweetIndices = [];
    for (const tweet of pinnedTweets) {
      for (const pin of tweet.pinned || []) {
        if (pin.type === tweet_type) tweetIndices.push([tweet.tweet_id, pin.index]);
      }
    }
    tweetIndices.sort((a, b) => a[1] - b[1]);

    for (const [tid, currentIdx] of tweetIndices) {
      if (tid === tweet_id) {
        await tweets.updateOne({ tweet_id: tid, 'pinned.type': tweet_type }, { $set: { 'pinned.$.index': new_index } });
      } else if (oldIndex < new_index) {
        if (oldIndex < currentIdx && currentIdx <= new_index) {
          await tweets.updateOne(
            { tweet_id: tid, 'pinned.type': tweet_type },
            { $set: { 'pinned.$.index': currentIdx - 1 } }
          );
        }
      } else if (new_index <= currentIdx && currentIdx < oldIndex) {
        await tweets.updateOne(
          { tweet_id: tid, 'pinned.type': tweet_type },
          { $set: { 'pinned.$.index': currentIdx + 1 } }
        );
      }
    }

    return res.json({ success: true, message: 'Pin index updated successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
