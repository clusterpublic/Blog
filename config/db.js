import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const clusterUri =
  process.env.MONGODB_URI ||
  'mongodb+srv://mostuselessboy:iSyoN7VUAwcAnQL5@clusterblog.elmvpst.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(clusterUri);
let db;

export async function connectDb() {
  if (db) return db;
  await client.connect();
  db = client.db('cluster');
  return db;
}

export function getCollections() {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return {
    blogs: db.collection('blogs'),
    tweets: db.collection('tweets'),
    creatorShowcase: db.collection('creator_showcase'),
    faqs: db.collection('faqs'),
    jobs: db.collection('jobs'),
    jobApplications: db.collection('job_applications'),
  };
}
