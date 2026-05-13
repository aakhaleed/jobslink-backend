// src/controllers/bids.controller.js
// This handles everything about bids:
// place a bid, view bids, update, withdraw

const { Bid, Job, User, WorkerProfile } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─── PLACE A BID ─────────────────────────────────────────────
// POST /api/bids/:jobId
// Only workers can place bids
const placeBid = async (req, res) => {
  try {
    const { amount, proposal, est_hours } = req.body;
    const { jobId } = req.params;

    // Only workers can bid
    if (req.user.role !== 'worker') {
      return errorResponse(res, 'Only workers can place bids.', 403);
    }

    // Validate required fields
    if (!amount || !proposal) {
      return errorResponse(res, 'Please provide amount and proposal.');
    }

    // Find the job
    const job = await Job.findByPk(jobId);
    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    // Job must be open
    if (job.status !== 'open') {
      return errorResponse(res, 'This job is no longer accepting bids.');
    }

    // Worker cannot bid on their own... wait workers don't post jobs
    // But a worker cannot bid twice on the same job
    const existingBid = await Bid.findOne({
      where: { job_id: jobId, worker_id: req.user.id }
    });

    if (existingBid) {
      return errorResponse(res, 'You have already placed a bid on this job.');
    }

    const bid = await Bid.create({
      job_id: jobId,
      worker_id: req.user.id,
      amount,
      proposal,
      est_hours
    });

    return successResponse(res, 'Bid placed successfully.', { bid }, 201);

  } catch (error) {
    console.error('Place bid error:', error);
    return errorResponse(res, 'Could not place bid.', 500);
  }
};

// ─── GET BIDS FOR A JOB ──────────────────────────────────────
// GET /api/bids/job/:jobId
// Only the client who posted the job can see all bids
const getJobBids = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.jobId);

    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    // Only the job owner can see bids
    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized to view these bids.', 403);
    }

    const bids = await Bid.findAll({
      where: { job_id: req.params.jobId },
      include: [
        {
          model: User,
          as: 'worker',
          attributes: ['id', 'full_name', 'avatar_url', 'state'],
          include: [
            {
              model: WorkerProfile,
              as: 'workerProfile',
              attributes: [
                'avg_rating',
                'total_jobs',
                'badges',
                'category',
                'experience_years',
                'response_time_minutes'
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return successResponse(res, 'Bids fetched successfully.', { bids });

  } catch (error) {
    console.error('Get bids error:', error);
    return errorResponse(res, 'Could not fetch bids.', 500);
  }
};

// ─── GET MY BIDS ─────────────────────────────────────────────
// GET /api/bids/my-bids
// Worker sees all their bids
const getMyBids = async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return errorResponse(res, 'Only workers can view their bids.', 403);
    }

    const bids = await Bid.findAll({
      where: { worker_id: req.user.id },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: [
            'id', 'title', 'description',
            'category', 'status', 'urgency',
            'address', 'state', 'budget_min', 'budget_max'
          ],
          include: [
            {
              model: User,
              as: 'client',
              attributes: ['id', 'full_name', 'avatar_url']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, 'Your bids fetched successfully.', { bids });

  } catch (error) {
    console.error('Get my bids error:', error);
    return errorResponse(res, 'Could not fetch your bids.', 500);
  }
};

// ─── UPDATE BID ──────────────────────────────────────────────
// PUT /api/bids/:bidId
// Worker can update their pending bid
const updateBid = async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.bidId);

    if (!bid) {
      return errorResponse(res, 'Bid not found.', 404);
    }

    // Only the worker who placed the bid can update it
    if (bid.worker_id !== req.user.id) {
      return errorResponse(res, 'Not authorized to update this bid.', 403);
    }

    // Can only update pending bids
    if (bid.status !== 'pending') {
      return errorResponse(res, 'Cannot update a bid that has already been reviewed.');
    }

    const { amount, proposal, est_hours } = req.body;
    await bid.update({ amount, proposal, est_hours });

    return successResponse(res, 'Bid updated successfully.', { bid });

  } catch (error) {
    console.error('Update bid error:', error);
    return errorResponse(res, 'Could not update bid.', 500);
  }
};

// ─── WITHDRAW BID ────────────────────────────────────────────
// DELETE /api/bids/:bidId
// Worker withdraws their bid
const withdrawBid = async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.bidId);

    if (!bid) {
      return errorResponse(res, 'Bid not found.', 404);
    }

    if (bid.worker_id !== req.user.id) {
      return errorResponse(res, 'Not authorized to withdraw this bid.', 403);
    }

    if (bid.status !== 'pending') {
      return errorResponse(res, 'Cannot withdraw a bid that has already been reviewed.');
    }

    await bid.update({ status: 'withdrawn' });

    return successResponse(res, 'Bid withdrawn successfully.');

  } catch (error) {
    console.error('Withdraw bid error:', error);
    return errorResponse(res, 'Could not withdraw bid.', 500);
  }
};

module.exports = {
  placeBid,
  getJobBids,
  getMyBids,
  updateBid,
  withdrawBid
};