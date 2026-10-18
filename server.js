import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDb } from './config/db.js';
import pagesRouter from './routes/pages.js';
import blogsRouter from './routes/blogs.js';
import tweetsRouter from './routes/tweets.js';
import pinManagerRouter from './routes/pinManager.js';
import creatorShowcaseRouter from './routes/creatorShowcase.js';
import faqsRouter from './routes/faqs.js';
import jobsRouter from './routes/jobs.js';
import aiRouter from './routes/ai.js';
import adminAuthRouter from './routes/adminAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(pagesRouter);
app.use(blogsRouter);
app.use(tweetsRouter);
app.use(pinManagerRouter);
app.use(creatorShowcaseRouter);
app.use(faqsRouter);
app.use(jobsRouter);
app.use(aiRouter);
app.use(adminAuthRouter);

await connectDb();

app.listen(PORT, () => {
  console.log(`Blog backend running on http://localhost:${PORT}`);
});
