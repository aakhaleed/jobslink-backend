// src/controllers/jobs.controller.js
// This handles everything about jobs:
// post a job, view jobs, update, delete, and assign a worker

const { Job, User, WorkerProfile, Bid } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');
const notify = require('../utils/notify')

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

// Notify worker they got assigned
await notify(bid.worker_id, {
  title: 'You got assigned a job!',
  message: `Congratulations! You have been assigned the job "${job.title}". Fund escrow to start.`,
  type: 'job_assigned',
  link: `/jobs/${job.id}`,
  data: { job_id: job.id }
})

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

// ─── WORKER MARKS JOB COMPLETE ───────────────────────────────
// PUT /api/jobs/:id/complete
// Worker clicks done — client gets notified to confirm
const markComplete = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job) return errorResponse(res, 'Job not found.', 404)

    // Only the assigned worker can mark complete
    if (job.worker_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403)
    }

    // Job must be in progress
    if (job.status !== 'in_progress') {
      return errorResponse(res, 'Job must be in progress to mark complete.')
    }

    // Update job status to awaiting confirmation
    await job.update({ status: 'awaiting_confirmation' })

    // Notify client
    await notify(job.client_id, {
      title: 'Job marked as complete!',
      message: `Your worker has marked "${job.title}" as complete. Please review and release payment if satisfied.`,
      type: 'job_completed',
      link: `/jobs/${job.id}`,
      data: { job_id: job.id }
    })

    return successResponse(res, 'Job marked as complete. Waiting for client confirmation.')

  } catch (error) {
    console.error('Mark complete error:', error)
    return errorResponse(res, 'Could not mark job as complete.', 500)
  }
}

// ─── QUICK MATCH ─────────────────────────────────────────────
// GET /api/jobs/quick-match/:jobId
// Returns top 5 best matched workers for a job
const quickMatch = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.jobId)
    if (!job) return errorResponse(res, 'Job not found.', 404)

    // Only the client who posted can see quick match
    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403)
    }

    // Find best matched workers
    const workers = await User.findAll({
      where: {
        role: 'worker',
        is_active: true,
        is_verified: true,
        state: job.state
      },
      include: [{
        model: WorkerProfile,
        as: 'workerProfile',
        required: true,
        where: {
          category: job.category,
          is_available: true
        }
      }],
      attributes: { exclude: ['password_hash', 'otp', 'otp_expires'] }
    })

    // If no verified workers in same state
    // fall back to same category anywhere in Nigeria
    let matched = workers

    if (matched.length === 0) {
      const fallback = await User.findAll({
        where: {
          role: 'worker',
          is_active: true
        },
        include: [{
          model: WorkerProfile,
          as: 'workerProfile',
          required: true,
          where: {
            category: job.category,
            is_available: true
          }
        }],
        attributes: { exclude: ['password_hash', 'otp', 'otp_expires'] }
      })
      matched = fallback
    }

    // Sort by rating desc, then by total jobs desc
    matched.sort((a, b) => {
      const ratingA = parseFloat(a.workerProfile?.avg_rating || 0)
      const ratingB = parseFloat(b.workerProfile?.avg_rating || 0)
      if (ratingB !== ratingA) return ratingB - ratingA
      const jobsA = parseInt(a.workerProfile?.total_jobs || 0)
      const jobsB = parseInt(b.workerProfile?.total_jobs || 0)
      return jobsB - jobsA
    })

    // Return top 5
    const top5 = matched.slice(0, 5)

    return successResponse(res, 'Quick match results fetched.', {
      workers: top5,
      total: top5.length,
      job_category: job.category,
      job_state: job.state
    })

  } catch (error) {
    console.error('Quick match error:', error)
    return errorResponse(res, 'Could not find matched workers.', 500)
  }
}

// ─── QUICK MATCH HIRE ────────────────────────────────────────
// POST /api/jobs/:jobId/hire/:workerId
// Client directly hires a worker via quick match
// No bid needed — skips straight to assignment
const quickMatchHire = async (req, res) => {
  try {
    const { jobId, workerId } = req.params

    const job = await Job.findByPk(jobId)
    if (!job) return errorResponse(res, 'Job not found.', 404)

    // Only the client who posted can hire
    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403)
    }

    if (job.status !== 'open') {
      return errorResponse(res, 'Job is no longer open.')
    }

    // Find the worker
    const worker = await User.findByPk(workerId)
    if (!worker) return errorResponse(res, 'Worker not found.', 404)
    if (worker.role !== 'worker') {
      return errorResponse(res, 'Selected user is not a worker.', 400)
    }

    // Get worker hourly rate as the price
    const workerProfile = await WorkerProfile.findOne({
      where: { user_id: workerId }
    })

    const finalPrice = workerProfile?.hourly_rate || job.budget_min || 0

    // Assign worker directly
    await job.update({
      worker_id: workerId,
      final_price: finalPrice,
      status: 'assigned',
      hire_type: 'quick_match'
    })

    // Notify worker
    await notify(workerId, {
      title: 'You got hired via Quick Match!',
      message: `A client has directly hired you for "${job.title}". Check the job details.`,
      type: 'job_assigned',
      link: `/jobs/${jobId}`,
      data: { job_id: jobId }
    })

    return successResponse(res, 'Worker hired successfully via Quick Match!', { job })

  } catch (error) {
    console.error('Quick match hire error:', error)
    return errorResponse(res, 'Could not hire worker.', 500)
  }
}

module.exports = {
  postJob,
  getAllJobs,
  getJob,
  getMyJobs,
  updateJob,
  deleteJob,
  assignWorker,
  markComplete,
  quickMatch,
  quickMatchHire
};