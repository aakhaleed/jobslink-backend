// src/controllers/ratings.controller.js
// After a job is completed both sides rate each other.
// Worker ratings update their average score on their profile.

const { Rating, Job, User, WorkerProfile } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');

// ─── SUBMIT RATING ───────────────────────────────────────────
// POST /api/ratings/:jobId
const submitRating = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      communication,
      quality,
      speed,
      professionalism,
      review_text
    } = req.body;

    // Validate all scores are provided
    if (!communication || !quality || !speed || !professionalism) {
      return errorResponse(res, 'Please provide all rating scores.');
    }

    // Find the job
    const job = await Job.findByPk(jobId);
    if (!job) return errorResponse(res, 'Job not found.', 404);

    // Job must be completed
    if (job.status !== 'completed') {
      return errorResponse(res, 'You can only rate completed jobs.');
    }

    // User must be part of this job
    const isClient = job.client_id === req.user.id;
    const isWorker = job.worker_id === req.user.id;

    if (!isClient && !isWorker) {
      return errorResponse(res, 'Not authorized to rate this job.', 403);
    }

    // Determine who is being rated
    const reviewee_id = isClient ? job.worker_id : job.client_id;

    // Check if already rated
    const existingRating = await Rating.findOne({
      where: { job_id: jobId, reviewer_id: req.user.id }
    });

    if (existingRating) {
      return errorResponse(res, 'You have already rated this job.');
    }

    // Calculate overall score
    const overall = (
      (parseInt(communication) +
      parseInt(quality) +
      parseInt(speed) +
      parseInt(professionalism)) / 4
    ).toFixed(2);

    // Create rating
    const rating = await Rating.create({
      job_id: jobId,
      reviewer_id: req.user.id,
      reviewee_id,
      communication,
      quality,
      speed,
      professionalism,
      overall,
      review_text
    });

    // If client rated worker — update worker's average rating on profile
    if (isClient) {
      const workerProfile = await WorkerProfile.findOne({
        where: { user_id: reviewee_id }
      });

      if (workerProfile) {
        // Get all ratings for this worker
        const allRatings = await Rating.findAll({
          where: { reviewee_id }
        });

        // Calculate new average
        const avgRating = (
          allRatings.reduce((sum, r) => sum + parseFloat(r.overall), 0) /
          allRatings.length
        ).toFixed(2);

        await workerProfile.update({
          avg_rating: avgRating,
          total_jobs: allRatings.length
        });
      }
    }

    return successResponse(res, 'Rating submitted successfully.', { rating }, 201);

  } catch (error) {
    console.error('Submit rating error:', error);
    return errorResponse(res, 'Could not submit rating.', 500);
  }
};

// ─── GET RATINGS FOR A USER ──────────────────────────────────
// GET /api/ratings/user/:userId
const getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.findAll({
      where: { reviewee_id: req.params.userId },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'category']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate overall average
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + parseFloat(r.overall), 0) / ratings.length).toFixed(2)
      : 0;

    return successResponse(res, 'Ratings fetched successfully.', {
      ratings,
      total: ratings.length,
      average: avgRating
    });

  } catch (error) {
    console.error('Get ratings error:', error);
    return errorResponse(res, 'Could not fetch ratings.', 500);
  }
};

module.exports = { submitRating, getUserRatings };