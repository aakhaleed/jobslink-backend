// src/routes/bids.routes.js
const express = require('express');
const router = express.Router();
const {
  placeBid,
  getJobBids,
  getMyBids,
  updateBid,
  withdrawBid
} = require('../controllers/bids.controller');
const { protect } = require('../middleware/auth.middleware');

// All bid routes require login
router.post('/:jobId', protect, placeBid);
router.get('/job/:jobId', protect, getJobBids);
router.get('/my-bids', protect, getMyBids);
router.put('/:bidId', protect, updateBid);
router.delete('/:bidId', protect, withdrawBid);

module.exports = router;