// src/routes/wallet.routes.js
const express = require('express');
const router = express.Router();
const {
  getWallet,
  fundWallet,
  fundEscrow,
  releasePayment,
  getTransactions,
  updateBankDetails
} = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth.middleware');

// All wallet routes require login
router.get('/', protect, getWallet);
router.post('/fund', protect, fundWallet);
router.post('/escrow/:jobId', protect, fundEscrow);
router.post('/release/:jobId', protect, releasePayment);
router.get('/transactions', protect, getTransactions);
router.put('/bank', protect, updateBankDetails);

module.exports = router;