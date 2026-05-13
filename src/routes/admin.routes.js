// src/routes/admin.routes.js
// All admin routes are protected by both
// the login check AND the admin role check

const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  getUser,
  verifyWorker,
  suspendUser,
  reactivateUser,
  getAllJobs,
  getAllTransactions,
  deleteJob
} = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Every route here requires login + admin role
router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:userId', getUser);
router.put('/users/:userId/verify', verifyWorker);
router.put('/users/:userId/suspend', suspendUser);
router.put('/users/:userId/reactivate', reactivateUser);
router.get('/jobs', getAllJobs);
router.delete('/jobs/:jobId', deleteJob);
router.get('/transactions', getAllTransactions);

module.exports = router;