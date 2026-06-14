import { ObjectId } from 'mongodb';

export const ADMIN_PASSWORD = 'clustertothemoon';

export function createSafeUrl(blogTitle) {
  const cleanTitle = blogTitle.replace(/[^a-zA-Z0-9 \-]/g, '');
  const encodedTitle = encodeURIComponent(cleanTitle.replace(/ /g, '-'));
  return encodedTitle.toLowerCase();
}

export function verifyPassword(password) {
  return password === ADMIN_PASSWORD;
}

export function formatTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function safeTimestamp(timestamp) {
  if (!timestamp) return null;
  try {
    const parsed = parseInt(timestamp, 10);
    return new Date(parsed).toISOString().replace(/\.\d{3}Z$/, '.000Z');
  } catch {
    return null;
  }
}

export function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export function stripMongoId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

export function stringifyId(doc) {
  if (!doc) return doc;
  return { ...doc, _id: String(doc._id) };
}
