// src/routes/ratings.routes.js
const express = require('express');
const router = express.Router();
const { submitRating, getUserRatings } = require('../controllers/ratings.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/:jobId', protect, submitRating);
router.get('/user/:userId', getUserRatings);

module.exports = router;