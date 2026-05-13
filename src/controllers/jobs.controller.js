// src/controllers/jobs.controller.js
// This handles everything about jobs:
// post a job, view jobs, update, delete, and assign a worker

const { Job, User, WorkerProfile, Bid } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');

// ─── POST A JOB ──────────────────────────────────────────────
// POST /api/jobs
// Only clients can post jobs
const postJob = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      urgency,
      hire_type,
      budget_min,
      budget_max,
      address,
      state,
      scheduled_at
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !urgency) {
      return errorResponse(
        res,
        'Please provide title, description, category and urgency.'
      );
    }

    // Only clients can post jobs
    if (req.user.role !== 'client') {
      return errorResponse(
        res,
        'Only clients can post jobs.',
        403
      );
    }

    const job = await Job.create({
      client_id: req.user.id,
      title,
      description,
      category,
      urgency,
      hire_type: hire_type || 'bidding',
      budget_min,
      budget_max,
      address,
      state: state || req.user.state,
      scheduled_at
    });

    return successResponse(res, 'Job posted successfully.', { job }, 201);

  } catch (error) {
    console.error('Post job error:', error);
    return errorResponse(res, 'Could not post job. Please try again.', 500);
  }
};

// ─── GET ALL JOBS ────────────────────────────────────────────
// GET /api/jobs
// Anyone can browse open jobs
const getAllJobs = async (req, res) => {
  try {
    const {
      category,
      urgency,
      state,
      hire_type,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object based on query params
    const where = { status: 'open' };
    if (category) where.category = category;
    if (urgency) where.urgency = urgency;
    if (state) where.state = state;
    if (hire_type) where.hire_type = hire_type;

    const offset = (page - 1) * limit;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'full_name', 'avatar_url', 'state']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, 'Jobs fetched successfully.', {
      jobs,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    return errorResponse(res, 'Could not fetch jobs.', 500);
  }
};

// ─── GET SINGLE JOB ──────────────────────────────────────────
// GET /api/jobs/:id
const getJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'full_name', 'avatar_url', 'state']
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: User,
              as: 'worker',
              attributes: ['id', 'full_name', 'avatar_url'],
              include: [
                {
                  model: WorkerProfile,
                  as: 'workerProfile',
                  attributes: ['avg_rating', 'total_jobs', 'badges']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    return successResponse(res, 'Job fetched successfully.', { job });

  } catch (error) {
    console.error('Get job error:', error);
    return errorResponse(res, 'Could not fetch job.', 500);
  }
};

// ─── GET MY JOBS ─────────────────────────────────────────────
// GET /api/jobs/my-jobs
// Returns jobs posted by the logged-in client
const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      where: { client_id: req.user.id },
      include: [
        {
          model: Bid,
          as: 'bids',
          attributes: ['id', 'amount', 'status']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, 'Your jobs fetched successfully.', { jobs });

  } catch (error) {
    console.error('Get my jobs error:', error);
    return errorResponse(res, 'Could not fetch your jobs.', 500);
  }
};

// ─── UPDATE JOB ──────────────────────────────────────────────
// PUT /api/jobs/:id
const updateJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);

    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    // Only the client who posted the job can update it
    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized to update this job.', 403);
    }

    // Can only update open jobs
    if (job.status !== 'open') {
      return errorResponse(res, 'Cannot update a job that is already in progress.');
    }

    await job.update(req.body);

    return successResponse(res, 'Job updated successfully.', { job });

  } catch (error) {
    console.error('Update job error:', error);
    return errorResponse(res, 'Could not update job.', 500);
  }
};

// ─── DELETE JOB ──────────────────────────────────────────────
// DELETE /api/jobs/:id
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);

    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized to delete this job.', 403);
    }

    if (job.status === 'in_progress') {
      return errorResponse(res, 'Cannot delete a job that is in progress.');
    }

    await job.update({ status: 'cancelled' });

    return successResponse(res, 'Job cancelled successfully.');

  } catch (error) {
    console.error('Delete job error:', error);
    return errorResponse(res, 'Could not delete job.', 500);
  }
};

// ─── ASSIGN WORKER ───────────────────────────────────────────
// PUT /api/jobs/:id/assign/:bidId
// Client accepts a bid and assigns a worker
const assignWorker = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    const bid = await Bid.findByPk(req.params.bidId);

    if (!job) return errorResponse(res, 'Job not found.', 404);
    if (!bid) return errorResponse(res, 'Bid not found.', 404);

    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403);
    }

    if (job.status !== 'open') {
      return errorResponse(res, 'Job is no longer open.');
    }

    // Assign worker and update job
    await job.update({
      worker_id: bid.worker_id,
      final_price: bid.amount,
      status: 'assigned'
    });

    // Accept this bid
    await bid.update({ status: 'accepted' });

    // Reject all other bids for this job
    await Bid.update(
      { status: 'rejected' },
      {
        where: {
          job_id: job.id,
          id: { [Op.ne]: bid.id }
        }
      }
    );

    return successResponse(res, 'Worker assigned successfully.', { job });

  } catch (error) {
    console.error('Assign worker error:', error);
    return errorResponse(res, 'Could not assign worker.', 500);
  }
};

module.exports = {
  postJob,
  getAllJobs,
  getJob,
  getMyJobs,
  updateJob,
  deleteJob,
  assignWorker
};