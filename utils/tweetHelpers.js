const TWITTER241_RAPIDAPI_KEY =
  process.env.TWITTER241_RAPIDAPI_KEY || '7d5407919amsh0f9a6e1cfe28dbdp12189ajsn16aa00c7243f';

export async function fetchTweetData(tweetId) {
  const url = `https://twitter241.p.rapidapi.com/tweet?pid=${tweetId}`;
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'twitter241.p.rapidapi.com',
      'x-rapidapi-key': TWITTER241_RAPIDAPI_KEY,
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch tweet data: ${response.statusText}`);
  return response.json();
}

export async function fetchSpaceData(spaceId) {
  const url = `https://twitter241.p.rapidapi.com/spaces?id=${spaceId}`;
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'twitter241.p.rapidapi.com',
      'x-rapidapi-key': TWITTER241_RAPIDAPI_KEY,
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch space data: ${response.statusText}`);
  return response.json();
}

function parseTweetDataAlternative(tweetData, tweetType) {
  let mainTweet = null;
  let userInfo = null;

  if (tweetData.tweet) mainTweet = tweetData.tweet;
  else if (tweetData.data?.tweet) mainTweet = tweetData.data.tweet;

  if (!mainTweet && tweetData.data) {
    const data = tweetData.data;
    for (const key of ['tweet', 'result', 'tweet_results']) {
      if (data[key]) {
        if (typeof data[key] === 'object' && data[key].result) {
          mainTweet = data[key].result;
          break;
        }
        if (typeof data[key] === 'object') {
          mainTweet = data[key];
          break;
        }
      }
    }
  }

  if (!mainTweet) throw new Error('Could not find tweet data in any expected structure');

  const tweetId = mainTweet.id || mainTweet.rest_id || '';
  const text = mainTweet.text || mainTweet.full_text || '';

  if (mainTweet.user) userInfo = mainTweet.user;
  else if (mainTweet.author) userInfo = mainTweet.author;
  else if (mainTweet.core?.user_results?.result) userInfo = mainTweet.core.user_results.result;

  if (!userInfo) {
    userInfo = { name: 'Unknown User', screen_name: 'unknown', profile_image_url_https: '' };
  }

  const images = [];
  if (mainTweet.media) {
    for (const media of mainTweet.media) {
      if (['photo', 'video', 'animated_gif'].includes(media.type)) {
        images.push({ url: media.media_url_https || media.url || '', alt: media.display_url || 'Tweet image' });
      }
    }
  }

  const tweetObj = {
    tweet_id: String(tweetId),
    text,
    author_name: userInfo.name || 'Unknown',
    author_username: userInfo.screen_name || 'unknown',
    author_profile_image: userInfo.profile_image_url_https || '',
    images,
    tweet_type: tweetType,
    created_at: mainTweet.created_at || '',
    favorite_count: mainTweet.favorite_count || 0,
    retweet_count: mainTweet.retweet_count || 0,
    reply_count: mainTweet.reply_count || 0,
    timestamp: Date.now() / 1000,
  };

  let isQuote = mainTweet.is_quote_status || false;
  if (!isQuote && mainTweet.legacy) isQuote = mainTweet.legacy.is_quote_status || false;

  if (mainTweet.quoted_status_result && isQuote) {
    try {
      const quotedResult = mainTweet.quoted_status_result.result || {};
      let quotedUser = null;
      if (quotedResult.core?.user_results?.result?.legacy) quotedUser = quotedResult.core.user_results.result.legacy;
      else if (quotedResult.user) quotedUser = quotedResult.user;
      else if (quotedResult.author) quotedUser = quotedResult.author;

      const quotedTweetLegacy = quotedResult.legacy || quotedResult;
      const quotedImages = [];
      const mediaSource =
        quotedTweetLegacy.extended_entities?.media || quotedTweetLegacy.media || [];
      for (const media of mediaSource) {
        if (['photo', 'video', 'animated_gif'].includes(media.type)) {
          quotedImages.push({ url: media.media_url_https || media.url || '', alt: media.display_url || 'Quoted tweet image' });
        }
      }

      tweetObj.quoted_tweet_info = {
        user_name: quotedUser?.name || 'Unknown',
        user_username: quotedUser?.screen_name || 'unknown',
        user_photo: quotedUser?.profile_image_url_https || '',
        text: quotedTweetLegacy.full_text || quotedTweetLegacy.text || '',
        images: quotedImages,
        tweet_id: quotedResult.rest_id || quotedResult.id || '',
        created_at: quotedTweetLegacy.created_at || '',
      };
    } catch (e) {
      console.error('[Alternative] Error extracting quoted tweet info:', e.message);
    }
  }

  return tweetObj;
}

export function parseTweetData(tweetData, tweetType) {
  try {
    if (!tweetData.data) throw new Error("No 'data' field in response");
    const data = tweetData.data;
    if (!data.threaded_conversation_with_injections_v2) {
      throw new Error("No 'threaded_conversation_with_injections_v2' field in data");
    }

    const instructions = data.threaded_conversation_with_injections_v2.instructions;
    if (!instructions?.length) throw new Error('No instructions found');

    let entries = null;
    for (const instruction of instructions) {
      if (instruction.entries) {
        entries = instruction.entries;
        break;
      }
    }
    if (!entries) throw new Error("No 'entries' field found in any instruction");

    let mainTweet = null;
    for (const entry of entries) {
      if (entry.entryId?.startsWith('tweet-')) {
        const itemContent = entry.content?.itemContent;
        if (itemContent?.tweet_results?.result) {
          mainTweet = itemContent.tweet_results.result;
          break;
        }
      }
    }
    if (!mainTweet) throw new Error('Could not find main tweet in response');
    if (!mainTweet.legacy) throw new Error("No 'legacy' field in main tweet");

    const tweetInfo = mainTweet.legacy;
    const userInfo = mainTweet.core?.user_results?.result?.legacy;
    if (!userInfo) throw new Error('No user information found');

    let text = tweetInfo.full_text || '';
    const images = [];
    if (tweetInfo.extended_entities?.media) {
      for (const media of tweetInfo.extended_entities.media) {
        if (['photo', 'video', 'animated_gif'].includes(media.type)) {
          images.push({ url: media.media_url_https || '', alt: media.display_url || 'Tweet image' });
        }
      }
    }

    try {
      const articleData = mainTweet.article?.article_results?.result;
      if (articleData) {
        const articleTitle = articleData.title || '';
        if (articleTitle) text = articleTitle;
        const coverImageUrl = articleData.cover_media?.media_info?.original_img_url;
        if (coverImageUrl) {
          images.length = 0;
          images.push({ url: coverImageUrl, alt: articleTitle || 'Article cover image' });
        }
      }
    } catch (e) {
      console.error('Error extracting article data:', e.message);
    }

    const tweetObj = {
      tweet_id: mainTweet.rest_id || '',
      text,
      author_name: userInfo.name || 'Unknown',
      author_username: userInfo.screen_name || 'unknown',
      author_profile_image: userInfo.profile_image_url_https || '',
      images,
      tweet_type: tweetType,
      created_at: tweetInfo.created_at || '',
      favorite_count: tweetInfo.favorite_count || 0,
      retweet_count: tweetInfo.retweet_count || 0,
      reply_count: tweetInfo.reply_count || 0,
      timestamp: Date.now() / 1000,
    };

    if (mainTweet.quoted_status_result && tweetInfo.is_quote_status) {
      try {
        const quotedResult = mainTweet.quoted_status_result.result || {};
        const quotedUser = quotedResult.core?.user_results?.result?.legacy || {};
        const quotedTweetLegacy = quotedResult.legacy || {};
        const quotedImages = [];
        if (quotedTweetLegacy.extended_entities?.media) {
          for (const media of quotedTweetLegacy.extended_entities.media) {
            if (['photo', 'video', 'animated_gif'].includes(media.type)) {
              quotedImages.push({ url: media.media_url_https || '', alt: media.display_url || 'Quoted tweet image' });
            }
          }
        }
        tweetObj.quoted_tweet_info = {
          user_name: quotedUser.name || 'Unknown',
          user_username: quotedUser.screen_name || 'unknown',
          user_photo: quotedUser.profile_image_url_https || '',
          text: quotedTweetLegacy.full_text || '',
          images: quotedImages,
          tweet_id: quotedResult.rest_id || '',
          created_at: quotedTweetLegacy.created_at || '',
        };
      } catch (e) {
        console.error('Error extracting quoted tweet info:', e.message);
      }
    }

    return tweetObj;
  } catch (e) {
    console.error(`Primary parsing failed: ${e.message}`);
    console.log('Trying alternative parsing method...');
    try {
      return parseTweetDataAlternative(tweetData, tweetType);
    } catch (e2) {
      throw new Error(`Failed to parse tweet data with both methods: ${e.message} | ${e2.message}`);
    }
  }
}

export function parseSpaceData(spaceData) {
  if (!spaceData.data?.audioSpace) throw new Error('No audioSpace data found in response');

  const audioSpace = spaceData.data.audioSpace;
  const metadata = audioSpace.metadata || {};
  const participants = audioSpace.participants || {};

  let spaceDuration = null;
  if (metadata.ended_at && metadata.started_at) {
    try {
      spaceDuration = parseInt(metadata.ended_at, 10) - parseInt(metadata.started_at, 10);
    } catch {
      spaceDuration = null;
    }
  }

  const creator = metadata.creator_results?.result?.legacy || {};
  const spaceAdmins = (participants.admins || []).map((admin) => ({
    username: admin.twitter_screen_name,
    display_name: admin.display_name,
    avatar_url: admin.avatar_url,
    is_verified: admin.is_verified || false,
  }));
  const spaceSpeakers = (participants.speakers || []).map((speaker) => ({
    username: speaker.twitter_screen_name,
    display_name: speaker.display_name,
    avatar_url: speaker.avatar_url,
    is_verified: speaker.is_verified || false,
  }));

  const tweetInfo = metadata.tweet_results?.result?.legacy || {};
  const text = tweetInfo.full_text || metadata.title || '';

  const safeTs = (timestamp) => {
    if (!timestamp) return null;
    try {
      return new Date(parseInt(timestamp, 10)).toISOString().replace(/\.\d{3}Z$/, '.000Z');
    } catch {
      return null;
    }
  };

  return {
    tweet_id: metadata.rest_id,
    text,
    author_name: creator.name || 'Unknown',
    author_username: creator.screen_name || 'unknown',
    author_profile_image: creator.profile_image_url_https || '',
    images: [],
    tweet_type: 'space',
    created_at: safeTs(metadata.created_at),
    favorite_count: tweetInfo.favorite_count || 0,
    retweet_count: tweetInfo.retweet_count || 0,
    reply_count: tweetInfo.reply_count || 0,
    timestamp: Date.now() / 1000,
    space_id: metadata.rest_id,
    space_title: metadata.title,
    space_state: metadata.state,
    space_duration: spaceDuration,
    total_live_listeners: metadata.total_live_listeners,
    total_replay_watched: metadata.total_replay_watched,
    is_space_available_for_replay: metadata.is_space_available_for_replay,
    space_admins: spaceAdmins,
    space_speakers: spaceSpeakers,
    space_participant_count: participants.total,
    scheduled_start: safeTs(metadata.scheduled_start),
    started_at: safeTs(metadata.started_at),
    ended_at: safeTs(metadata.ended_at),
  };
}
