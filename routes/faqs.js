import { Router } from 'express';
import { getCollections } from '../config/db.js';
import { verifyPassword, stringifyId, formatTimestamp, toObjectId } from '../utils/helpers.js';

const router = Router();

router.post('/api/faq', async (req, res) => {
  try {
    const { faqs } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    if (!data.title || !data.description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const maxDoc = await faqs.find().sort({ position: -1 }).limit(1).toArray();
    const nextPosition = maxDoc.length ? (maxDoc[0].position || 0) + 1 : 1;
    const now = formatTimestamp();

    const result = await faqs.insertOne({
      title: data.title,
      description: data.description,
      position: data.position ?? nextPosition,
      timestamp: Date.now() / 1000,
      created_at: now,
      updated_at: now,
    });

    if (result.insertedId) {
      return res.status(201).json({ success: true, message: 'FAQ created successfully', faq_id: String(result.insertedId) });
    }
    return res.status(500).json({ error: 'Failed to create FAQ' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/faqs', async (req, res) => {
  try {
    const { faqs } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '10', 10);
    const search = req.query.search || '';
    const skip = (page - 1) * perPage;

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const totalFaqs = await faqs.countDocuments(query);
    const faqList = await faqs.find(query).sort({ position: 1, timestamp: -1 }).skip(skip).limit(perPage).toArray();

    for (const faq of faqList) {
      if (faq.position === undefined) faq.position = 999;
    }

    return res.json({
      faqs: faqList.map(stringifyId),
      total: totalFaqs,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalFaqs / perPage),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/faq/:faq_id', async (req, res) => {
  try {
    const { faqs } = getCollections();
    const objectId = toObjectId(req.params.faq_id);
    if (!objectId) return res.status(400).json({ error: 'Invalid FAQ ID' });
    const faq = await faqs.findOne({ _id: objectId });
    if (faq) return res.json(stringifyId(faq));
    return res.status(404).json({ error: 'FAQ not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/api/faq/:faq_id', async (req, res) => {
  try {
    const { faqs } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    if (!data.title || !data.description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const updateData = {
      title: data.title,
      description: data.description,
      updated_at: formatTimestamp(),
    };
    if (data.position !== undefined) updateData.position = data.position;

    const result = await faqs.updateOne({ _id: toObjectId(req.params.faq_id) }, { $set: updateData });
    if (result.matchedCount) return res.json({ success: true, message: 'FAQ updated successfully' });
    return res.status(404).json({ error: 'FAQ not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/api/faq/:faq_id', async (req, res) => {
  try {
    const { faqs } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    const result = await faqs.deleteOne({ _id: toObjectId(req.params.faq_id) });
    if (result.deletedCount) return res.json({ success: true, message: 'FAQ deleted successfully' });
    return res.status(404).json({ error: 'FAQ not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/api/faq/:faq_id/position', async (req, res) => {
  try {
    const { faqs } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    if (req.body.position === undefined) return res.status(400).json({ error: 'Position is required' });

    const objectId = toObjectId(req.params.faq_id);
    const currentFaq = await faqs.findOne({ _id: objectId });
    if (!currentFaq) return res.status(404).json({ error: 'FAQ not found' });

    const result = await faqs.updateOne(
      { _id: objectId },
      { $set: { position: parseInt(req.body.position, 10), updated_at: formatTimestamp() } }
    );
    if (result.matchedCount) return res.json({ success: true, message: 'FAQ position updated successfully' });
    return res.status(404).json({ error: 'FAQ not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/api/faqs/reorder', async (req, res) => {
  try {
    const { faqs } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    if (!req.body.faq_positions) return res.status(400).json({ error: 'faq_positions array is required' });

    for (const item of req.body.faq_positions) {
      if (!item.faq_id || item.position === undefined) continue;
      await faqs.updateOne(
        { _id: toObjectId(item.faq_id) },
        { $set: { position: item.position, updated_at: formatTimestamp() } }
      );
    }
    return res.json({ success: true, message: 'FAQs reordered successfully' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/faqs/all', async (req, res) => {
  try {
    const { faqs } = getCollections();
    const faqList = await faqs.find().sort({ position: 1, timestamp: -1 }).toArray();
    for (const faq of faqList) {
      if (faq.position === undefined) faq.position = 999;
    }
    return res.json({ faqs: faqList.map(stringifyId) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/api/faqs/init-positions', async (req, res) => {
  try {
    const { faqs } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const withoutPosition = await faqs.find({ position: { $exists: false } }).sort({ timestamp: 1 }).toArray();
    for (let i = 0; i < withoutPosition.length; i++) {
      await faqs.updateOne({ _id: withoutPosition[i]._id }, { $set: { position: i + 1 } });
    }

    return res.json({
      success: true,
      message: `Initialized positions for ${withoutPosition.length} FAQs`,
      count: withoutPosition.length,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
