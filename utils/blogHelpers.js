export const BLOG_STATUSES = ['draft', 'published', 'hidden'];

export function parsePublishDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed / 1000;
  return null;
}

/** MongoDB filter: only blogs visible on public list APIs */
export function getPublicBlogFilter(now = Date.now() / 1000) {
  return {
    $and: [
      { $or: [{ status: { $exists: false } }, { status: { $nin: ['draft', 'hidden'] } }] },
      {
        $expr: {
          $lte: [{ $ifNull: ['$publish_date', '$timestamp'] }, now],
        },
      },
    ],
  };
}

export function mergeQueryWithPublicFilter(baseQuery, now = Date.now() / 1000) {
  const publicFilter = getPublicBlogFilter(now);
  if (!baseQuery || Object.keys(baseQuery).length === 0) return publicFilter;
  return { $and: [baseQuery, publicFilter] };
}

export function getDisplayStatus(blog, now = Date.now() / 1000) {
  const status = blog.status || 'published';
  if (status === 'hidden') return 'hidden';
  if (status === 'draft') return 'draft';
  const publishDate = blog.publish_date ?? blog.timestamp ?? now;
  if (publishDate > now) return 'scheduled';
  return 'published';
}

export function normalizeBlogPublishFields(data, { isNew = false, now = Date.now() / 1000, existing = null } = {}) {
  const status =
    data.status !== undefined
      ? BLOG_STATUSES.includes(data.status)
        ? data.status
        : 'published'
      : existing?.status || 'published';

  let publishDate;
  if (data.publish_date !== undefined) {
    publishDate = parsePublishDate(data.publish_date);
  } else if (existing) {
    publishDate = existing.publish_date ?? null;
  } else if (status === 'published' && isNew) {
    publishDate = now;
  } else {
    publishDate = null;
  }

  return { status, publish_date: publishDate };
}

export function validateBlogForPublish(blogData, status) {
  if (status === 'draft' || status === 'hidden') return null;
  const required = ['title', 'description', 'thumbnail', 'content'];
  for (const field of required) {
    if (!blogData[field] || String(blogData[field]).trim() === '') {
      return `Please fill in ${field} before publishing`;
    }
  }
  return null;
}
