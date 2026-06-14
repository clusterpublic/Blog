import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db.js';
import { verifyPassword, stringifyId, formatTimestamp, toObjectId } from '../utils/helpers.js';
import { validateApplicationFormData, sanitizeApplicationData } from '../utils/validationHelpers.js';

const router = Router();

const VALID_TYPES = ['fulltime', 'intern', 'advisory', 'parttime', 'contract'];
const VALID_ROLES = ['product', 'design', 'tech', 'management', 'social', 'marketing', 'sales'];

router.post('/api/job', async (req, res) => {
  try {
    const { jobs } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    for (const field of ['role_name', 'location', 'type', 'description', 'role_category']) {
      if (!data[field]) return res.status(400).json({ error: `${field} is required` });
    }
    if (!VALID_TYPES.includes(data.type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!VALID_ROLES.includes(data.role_category)) {
      return res.status(400).json({ error: `Invalid role category. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const now = formatTimestamp();
    const result = await jobs.insertOne({
      role_name: data.role_name,
      location: data.location,
      type: data.type,
      description: data.description,
      role_category: data.role_category,
      timestamp: Date.now() / 1000,
      created_at: now,
      updated_at: now,
      is_active: data.is_active ?? true,
    });

    if (result.insertedId) {
      return res.status(201).json({
        success: true,
        message: 'Job posting created successfully',
        job_id: String(result.insertedId),
      });
    }
    return res.status(500).json({ error: 'Failed to create job posting' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/jobs', async (req, res) => {
  try {
    const { jobs } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '10', 10);
    const search = req.query.search || '';
    const jobType = req.query.type || '';
    const roleCategory = req.query.role_category || '';
    const location = req.query.location || '';
    const skip = (page - 1) * perPage;

    const query = { is_active: true };
    if (search) {
      query.$or = [
        { role_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (jobType) query.type = jobType;
    if (roleCategory) query.role_category = roleCategory;
    if (location) query.location = { $regex: location, $options: 'i' };

    const totalJobs = await jobs.countDocuments(query);
    const jobList = await jobs.find(query).sort({ timestamp: -1 }).skip(skip).limit(perPage).toArray();

    return res.json({
      jobs: jobList.map(stringifyId),
      total: totalJobs,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalJobs / perPage),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/admin/jobs', async (req, res) => {
  try {
    const { jobs } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '10', 10);
    const search = req.query.search || '';
    const skip = (page - 1) * perPage;

    let query = {};
    if (search) {
      query = {
        $or: [
          { role_name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const totalJobs = await jobs.countDocuments(query);
    const jobList = await jobs.find(query).sort({ timestamp: -1 }).skip(skip).limit(perPage).toArray();

    return res.json({
      jobs: jobList.map(stringifyId),
      total: totalJobs,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalJobs / perPage),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/api/job/:job_id', async (req, res) => {
  try {
    const { jobs } = getCollections();
    const objectId = toObjectId(req.params.job_id);
    if (!objectId) return res.status(400).json({ error: 'Invalid job ID' });
    const job = await jobs.findOne({ _id: objectId });
    if (job) return res.json(stringifyId(job));
    return res.status(404).json({ error: 'Job not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/api/job/:job_id', async (req, res) => {
  try {
    const { jobs } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    if (data.type && !VALID_TYPES.includes(data.type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (data.role_category && !VALID_ROLES.includes(data.role_category)) {
      return res.status(400).json({ error: `Invalid role category. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const updateData = { updated_at: formatTimestamp() };
    for (const field of ['role_name', 'location', 'type', 'description', 'role_category', 'is_active']) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const result = await jobs.updateOne({ _id: toObjectId(req.params.job_id) }, { $set: updateData });
    if (result.matchedCount) return res.json({ success: true, message: 'Job posting updated successfully' });
    return res.status(404).json({ error: 'Job not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/api/job/:job_id', async (req, res) => {
  try {
    const { jobs } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    const result = await jobs.deleteOne({ _id: toObjectId(req.params.job_id) });
    if (result.deletedCount) return res.json({ success: true, message: 'Job posting deleted successfully' });
    return res.status(404).json({ error: 'Job not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/api/submit-job-application', async (req, res) => {
  try {
    const { jobApplications } = getCollections();
    const data = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'No JSON data received',
        errors: ['Request must contain valid JSON data'],
        warnings: [],
      });
    }

    const validation = validateApplicationFormData(data);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const sanitized = sanitizeApplicationData(data);
    const result = await jobApplications.insertOne({
      ...sanitized,
      timestamp: Date.now() / 1000,
      submitted_at: formatTimestamp(),
      status: 'submitted',
    });

    if (result.insertedId) {
      return res.status(200).json({
        success: true,
        message: 'Application submitted successfully',
        application_id: String(result.insertedId),
        data: sanitized,
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to submit application' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/api/debug-application', async (req, res) => {
  try {
    const data = req.body;
    return res.json({
      success: true,
      message: 'Debug endpoint reached',
      received_data: data,
      data_type: typeof data,
      data_keys: data ? Object.keys(data) : null,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Debug error: ${e.message}` });
  }
});

router.get('/api/admin/applications', async (req, res) => {
  try {
    const { jobs, jobApplications } = getCollections();
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '10', 10);
    const search = req.query.search || '';
    const statusFilter = req.query.status || '';
    const educationFilter = req.query.education || '';
    const jobIdFilter = req.query.job_id || '';
    const skip = (page - 1) * perPage;

    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { educationLevel: { $regex: search, $options: 'i' } },
      ];
    }
    if (statusFilter) query.status = statusFilter;
    if (educationFilter) query.educationLevel = educationFilter;
    if (jobIdFilter) query.jobId = jobIdFilter;

    const totalApplications = await jobApplications.countDocuments(query);
    const applications = await jobApplications.find(query).sort({ timestamp: -1 }).skip(skip).limit(perPage).toArray();

    for (const application of applications) {
      application._id = String(application._id);
      if (application.jobId) {
        try {
          const job = await jobs.findOne({ _id: new ObjectId(application.jobId) });
          application.jobDetails = job
            ? {
                role_name: job.role_name || 'Unknown Job',
                location: job.location || 'Unknown Location',
                type: job.type || 'Unknown Type',
                role_category: job.role_category || 'Unknown Category',
              }
            : { role_name: 'Job Not Found', location: 'N/A', type: 'N/A', role_category: 'N/A' };
        } catch {
          application.jobDetails = { role_name: 'Invalid Job ID', location: 'N/A', type: 'N/A', role_category: 'N/A' };
        }
      } else {
        application.jobDetails = { role_name: 'No Job ID', location: 'N/A', type: 'N/A', role_category: 'N/A' };
      }
    }

    return res.json({
      applications,
      total: totalApplications,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalApplications / perPage),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/api/admin/application/:application_id', async (req, res) => {
  try {
    const { jobApplications } = getCollections();
    const data = req.body;
    if (!verifyPassword(data.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }

    const validStatuses = ['submitted', 'reviewed', 'accepted', 'rejected'];
    if (data.status && !validStatuses.includes(data.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updateData = { updated_at: formatTimestamp() };
    if (data.status !== undefined) updateData.status = data.status;

    const result = await jobApplications.updateOne(
      { _id: toObjectId(req.params.application_id) },
      { $set: updateData }
    );
    if (result.matchedCount) return res.json({ success: true, message: 'Application updated successfully' });
    return res.status(404).json({ error: 'Application not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/api/admin/application/:application_id', async (req, res) => {
  try {
    const { jobApplications } = getCollections();
    if (!verifyPassword(req.body?.password)) {
      return res.status(401).json({ success: false, message: 'Wrong Password' });
    }
    const result = await jobApplications.deleteOne({ _id: toObjectId(req.params.application_id) });
    if (result.deletedCount) return res.json({ success: true, message: 'Application deleted successfully' });
    return res.status(404).json({ error: 'Application not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
