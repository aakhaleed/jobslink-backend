// src/routes/jobs.routes.js
const express = require('express');
const router = express.Router();
const {
  postJob,
  getAllJobs,
  getJob,
  getMyJobs,
  updateJob,
  deleteJob,
  assignWorker
} = require('../controllers/jobs.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public routes — anyone can browse jobs
router.get('/', getAllJobs);
router.get('/:id', getJob);

// Protected routes — must be logged in
router.post('/', protect, postJob);
router.get('/client/my-jobs', protect, getMyJobs);
router.put('/:id', protect, updateJob);
router.delete('/:id', protect, deleteJob);
router.put('/:id/assign/:bidId', protect, assignWorker);

module.exports = router;