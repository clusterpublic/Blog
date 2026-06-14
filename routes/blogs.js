import { Router } from 'express';
import { getCollections } from '../config/db.js';
import { createSafeUrl, verifyPassword, stripMongoId, stringifyId } from '../utils/helpers.js';
import {
  normalizeBlogPublishFields,
  validateBlogForPublish,
  mergeQueryWithPublicFilter,
  getDisplayStatus,
  parsePublishDate,
} from '../utils/blogHelpers.js';
import {
  blogCacheKey,
  getOrSetBlogCache,
  invalidateBlogCache,
  setBlogCacheHeaders,
} from '../utils/blogCache.js';

const router = Router();

const blogListProjection = {
  title: 1,
  description: 1,
  blog_id: 1,
  timestamp: 1,
  thumbnail: 1,
  status: 1,
  publish_date: 1,
};

function enrichBlogForAdmin(blog) {
  const enriched = stringifyId(blog);
  enriched.display_status = getDisplayStatus(blog);
  return enriched;
}

router.post('/upload_blog', async (req, res) => {
  const { blogs } = getCollections();
  if (!verifyPassword(req.body.password)) {
    return res.json({ success: false, message: 'Wrong Password' });
  }

  const { title, thumbnail, content, description } = req.body;
  const { status, publish_date } = normalizeBlogPublishFields(req.body, { isNew: true });
  const validationError = validateBlogForPublish(req.body, status);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const blogEntry = {
    blog_id: `${createSafeUrl(title || 'untitled')}-${String(Date.now() / 1000).split('.')[0]}`,
    title: title || '',
    thumbnail: thumbnail || '',
    content: content || '',
    description: description || '',
    status,
    publish_date,
    timestamp: Date.now() / 1000,
  };

  await blogs.insertOne(blogEntry);
  invalidateBlogCache();
  return res.json({
    success: true,
    message:
      status === 'draft'
        ? 'Blog saved as draft'
        : status === 'hidden'
          ? 'Blog saved as hidden'
          : 'Blog uploaded successfully',
    blog_id: blogEntry.blog_id,
    status,
    publish_date,
  });
});

router.get('/api/getblogpage/:pagination_index', async (req, res) => {
  const paginationIndex = parseInt(req.params.pagination_index, 10);
  const cacheKey = blogCacheKey(`getblogpage:${paginationIndex}`);

  const { data, hit } = await getOrSetBlogCache(cacheKey, async () => {
    const { blogs } = getCollections();
    const blogsPerPage = 10;
    const skipValue = Math.max(0, (paginationIndex - 1) * blogsPerPage);
    const query = mergeQueryWithPublicFilter({});

    const result = await blogs
      .find(query, { projection: { title: 1, thumbnail: 1, description: 1, blog_id: 1 } })
      .sort({ _id: -1 })
      .skip(skipValue)
      .limit(blogsPerPage)
      .toArray();

    const countDocuments = await blogs.countDocuments(query);
    const hasNextPage = countDocuments > skipValue + blogsPerPage;

    if (countDocuments > 0) {
      return { blogs: result.map(stripMongoId), has_next_page: hasNextPage };
    }
    return { has_next_page: false, blogs: [] };
  });

  setBlogCacheHeaders(res, hit);
  return res.json(data);
});

router.get('/api/blog', async (req, res) => {
  const blogID = req.query.blogID;
  if (!blogID) return res.status(400).json({ error: 'blogID parameter is required' });

  const cacheKey = blogCacheKey(`blog:${blogID}`);
  const { data, hit } = await getOrSetBlogCache(cacheKey, async () => {
    const { blogs } = getCollections();
    const result = await blogs.findOne({ blog_id: blogID });
    if (result) {
      if (result.status === 'hidden') return [];
      const blog = stripMongoId(result);
      blog.display_status = getDisplayStatus(result);
      return blog;
    }
    return [];
  });

  setBlogCacheHeaders(res, hit);
  return res.json(data);
});

router.get('/api/get_all_blogs', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '10', 10);
    const search = req.query.search || '';
    const statusFilter = req.query.status || '';
    const isPublicList = statusFilter === 'published' && !search;

    const buildResponse = async () => {
      const { blogs } = getCollections();
      const skip = (page - 1) * perPage;

      let query = {};
      if (search) {
        query = {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { blog_id: { $regex: search, $options: 'i' } },
          ],
        };
      }
      if (statusFilter === 'draft') query.status = 'draft';
      else if (statusFilter === 'hidden') query.status = 'hidden';
      else if (statusFilter === 'scheduled') {
        query.status = { $nin: ['draft', 'hidden'] };
        query.publish_date = { $gt: Date.now() / 1000 };
      } else if (statusFilter === 'published') {
        query = mergeQueryWithPublicFilter(query);
      }

      const totalBlogs = await blogs.countDocuments(query);
      const blogList = await blogs
        .find(query, { projection: blogListProjection })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(perPage)
        .toArray();

      return {
        blogs: blogList.map(enrichBlogForAdmin),
        total: totalBlogs,
        page,
        per_page: perPage,
        total_pages: Math.ceil(totalBlogs / perPage),
      };
    };

    if (isPublicList) {
      const cacheKey = blogCacheKey(`get_all_blogs:${page}:${perPage}`);
      const { data, hit } = await getOrSetBlogCache(cacheKey, buildResponse);
      setBlogCacheHeaders(res, hit);
      return res.json(data);
    }

    return res.json(await buildResponse());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/api/update_blog/:blog_id', async (req, res) => {
  try {
    const { blogs } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const existing = await blogs.findOne({ blog_id: req.params.blog_id });
    if (!existing) return res.status(404).json({ success: false, message: 'Blog not found' });

    const { status, publish_date } = normalizeBlogPublishFields(data, { existing });
    const validationError = validateBlogForPublish(data, status);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const updateData = {
      title: data.title,
      description: data.description,
      content: data.content,
      thumbnail: data.thumbnail,
      status,
      last_updated: Date.now() / 1000,
    };
    if (publish_date !== null) updateData.publish_date = publish_date;
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

    const result = await blogs.updateOne({ blog_id: req.params.blog_id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Blog not found' });
    invalidateBlogCache();
    return res.json({ success: true, message: 'Blog updated successfully', status, publish_date });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/api/update_blog_status/:blog_id', async (req, res) => {
  try {
    const { blogs } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const existing = await blogs.findOne({ blog_id: req.params.blog_id });
    if (!existing) return res.status(404).json({ success: false, message: 'Blog not found' });

    const status = data.status || existing.status || 'published';
    let publishDate = data.publish_date !== undefined ? parsePublishDate(data.publish_date) : existing.publish_date;

    if (status === 'published' && !publishDate) {
      publishDate = Date.now() / 1000;
    }

    await blogs.updateOne(
      { blog_id: req.params.blog_id },
      { $set: { status, publish_date: publishDate, last_updated: Date.now() / 1000 } }
    );

    invalidateBlogCache();
    return res.json({
      success: true,
      message: 'Blog status updated successfully',
      status,
      publish_date: publishDate,
      display_status: getDisplayStatus({ status, publish_date: publishDate, timestamp: existing.timestamp }),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/api/delete_blog/:blog_id', async (req, res) => {
  try {
    const { blogs } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const result = await blogs.deleteOne({ blog_id: req.params.blog_id });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Blog not found' });
    invalidateBlogCache();
    return res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/api/get_blog_for_edit/:blog_id', async (req, res) => {
  try {
    const { blogs } = getCollections();
    const result = await blogs.findOne({ blog_id: req.params.blog_id });
    if (result) {
      const blog = stringifyId(result);
      blog.display_status = getDisplayStatus(result);
      return res.json({ success: true, blog });
    }
    return res.status(404).json({ success: false, message: 'Blog not found' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
