import express, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(__dirname, '../site');

const router = Router();

router.use('/styles', express.static(path.join(siteDir, 'styles')));
router.use('/js', express.static(path.join(siteDir, 'js')));

router.get('/', (_req, res) => res.sendFile(path.join(siteDir, 'index.html')));
router.get('/manager', (_req, res) => res.sendFile(path.join(siteDir, 'manager.html')));
router.get('/editor', (_req, res) => res.sendFile(path.join(siteDir, 'editor.html')));
router.get('/editor/:blog_id', (_req, res) => res.sendFile(path.join(siteDir, 'editor.html')));
router.get('/tweets', (_req, res) => res.sendFile(path.join(siteDir, 'tweets.html')));
router.get('/creator_showcase', (_req, res) => res.sendFile(path.join(siteDir, 'creator_showcase.html')));
router.get('/faq-manager', (_req, res) => res.sendFile(path.join(siteDir, 'faq-manager.html')));
router.get('/job-manager', (_req, res) => res.sendFile(path.join(siteDir, 'job-manager.html')));
router.get('/settings', (_req, res) => res.sendFile(path.join(siteDir, 'settings.html')));
router.get('/test-header', (_req, res) => res.sendFile(path.join(siteDir, 'test-header.html')));
router.get('/components/sidebar.html', (_req, res) => res.sendFile(path.join(siteDir, 'components/sidebar.html')));
router.get('/components/header.html', (_req, res) => res.sendFile(path.join(siteDir, 'components/header.html')));
router.get('/components/header-loader.js', (_req, res) => res.sendFile(path.join(siteDir, 'components/header-loader.js')));

export default router;
