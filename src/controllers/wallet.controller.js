// src/controllers/wallet.controller.js
// Handles all wallet operations:
// get balance, fund wallet, fund escrow,
// release payment, withdraw, transaction history

const { Wallet, Transaction, Escrow, Job, User } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');
const notify = require('../utils/notify')

// ─── GET MY WALLET ───────────────────────────────────────────
// GET /api/wallet
const getWallet = async (req, res) => {
  try {
    // Find or create wallet for this user
    let wallet = await Wallet.findOne({
      where: { user_id: req.user.id }
    });

    // If wallet doesn't exist yet, create it
    if (!wallet) {
      wallet = await Wallet.create({ user_id: req.user.id });
    }

    return successResponse(res, 'Wallet fetched successfully.', { wallet });

  } catch (error) {
    console.error('Get wallet error:', error);
    return errorResponse(res, 'Could not fetch wallet.', 500);
  }
};

// ─── FUND WALLET ─────────────────────────────────────────────
// POST /api/wallet/fund
// In production this would verify payment from Paystack/Flutterwave
// For now we simulate a successful payment
const fundWallet = async (req, res) => {
  try {
    const { amount, gateway } = req.body;

    if (!amount || amount <= 0) {
      return errorResponse(res, 'Please provide a valid amount.');
    }

    if (amount < 100) {
      return errorResponse(res, 'Minimum deposit is ₦100.');
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: req.user.id });
    }

    // Add money to wallet
    await wallet.update({
      available_balance: parseFloat(wallet.available_balance) + parseFloat(amount)
    });

    // Record the transaction
    await Transaction.create({
      user_id: req.user.id,
      type: 'deposit',
      amount,
      status: 'success',
      reference: uuidv4(),
      gateway: gateway || 'paystack',
      description: `Wallet funded with ₦${amount}`
    });

    return successResponse(res, `Wallet funded successfully with ₦${amount}.`, {
      new_balance: wallet.available_balance
    });

  } catch (error) {
    console.error('Fund wallet error:', error);
    return errorResponse(res, 'Could not fund wallet.', 500);
  }
};

// ─── FUND ESCROW ─────────────────────────────────────────────
// POST /api/wallet/escrow/:jobId
// Client locks money for a specific job
const fundEscrow = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Find the job
    const job = await Job.findByPk(jobId);
    if (!job) return errorResponse(res, 'Job not found.', 404);

    // Only the client can fund escrow
    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403);
    }

    // Job must be assigned
    if (job.status !== 'assigned') {
      return errorResponse(res, 'Job must be assigned to a worker first.');
    }

    // Check if escrow already exists
    const existingEscrow = await Escrow.findOne({ where: { job_id: jobId } });
    if (existingEscrow && existingEscrow.status === 'funded') {
      return errorResponse(res, 'Escrow already funded for this job.');
    }

    // Get final price
    const amount = parseFloat(job.final_price);
    if (!amount) {
      return errorResponse(res, 'Job does not have a final price set.');
    }

    // Check client wallet balance
    let wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (!wallet || parseFloat(wallet.available_balance) < amount) {
      return errorResponse(res, 'Insufficient wallet balance. Please fund your wallet.');
    }

    // Calculate platform fee (10%) and worker payout (90%)
    const platformFee = amount * 0.10;
    const workerPayout = amount * 0.90;

    // Deduct from client wallet
    await wallet.update({
      available_balance: parseFloat(wallet.available_balance) - amount,
      pending_balance: parseFloat(wallet.pending_balance) + amount,
      total_spent: parseFloat(wallet.total_spent) + amount
    });

    // Create or update escrow
    if (existingEscrow) {
      await existingEscrow.update({
        status: 'funded',
        amount,
        platform_fee: platformFee,
        worker_payout: workerPayout,
        worker_id: job.worker_id
      });
    } else {
      await Escrow.create({
        job_id: jobId,
        client_id: req.user.id,
        worker_id: job.worker_id,
        amount,
        platform_fee: platformFee,
        worker_payout: workerPayout,
        status: 'funded'
      });
    }

    // Record transaction
    await Transaction.create({
      user_id: req.user.id,
      job_id: jobId,
      type: 'escrow_lock',
      amount,
      status: 'success',
      reference: uuidv4(),
      gateway: 'system',
      description: `Escrow funded for job: ${job.title}`
    });

    // Update job status
    await job.update({ status: 'in_progress' });

    return successResponse(res, 'Escrow funded successfully. Job is now in progress.', {
      amount,
      platform_fee: platformFee,
      worker_payout: workerPayout
    });

  } catch (error) {
    console.error('Fund escrow error:', error);
    return errorResponse(res, 'Could not fund escrow.', 500);
  }
};

// ─── RELEASE PAYMENT ─────────────────────────────────────────
// POST /api/wallet/release/:jobId
// Client confirms job is done — money goes to worker
const releasePayment = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findByPk(jobId);
    if (!job) return errorResponse(res, 'Job not found.', 404);

    // Only the client can release payment
    if (job.client_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403);
    }

    // Find funded escrow
    const escrow = await Escrow.findOne({
      where: { job_id: jobId, status: 'funded' }
    });

    if (!escrow) {
      return errorResponse(res, 'No funded escrow found for this job.');
    }

    // Find or create worker wallet
    let workerWallet = await Wallet.findOne({
      where: { user_id: escrow.worker_id }
    });
    if (!workerWallet) {
      workerWallet = await Wallet.create({ user_id: escrow.worker_id });
    }

    // Find client wallet
    const clientWallet = await Wallet.findOne({
      where: { user_id: req.user.id }
    });

    // Add payout to worker wallet
    await workerWallet.update({
      available_balance: parseFloat(workerWallet.available_balance) + parseFloat(escrow.worker_payout),
      total_earned: parseFloat(workerWallet.total_earned) + parseFloat(escrow.worker_payout)
    });

    // Reduce client pending balance
    await clientWallet.update({
      pending_balance: parseFloat(clientWallet.pending_balance) - parseFloat(escrow.amount)
    });

    // Update escrow status
    await escrow.update({ status: 'released' });

// Notify worker payment was released
await notify(escrow.worker_id, {
  title: 'Payment received!',
  message: `₦${escrow.worker_payout} has been added to your wallet for completing "${job.title}"`,
  type: 'payment_received',
  link: '/wallet',
  data: { amount: escrow.worker_payout }
})

// Notify client job is complete
await notify(req.user.id, {
  title: 'Job completed!',
  message: `Your job "${job.title}" has been marked as complete.`,
  type: 'job_completed',
  link: `/jobs/${job.id}`,
  data: { job_id: job.id }
})

    // Update job status
    await job.update({
      status: 'completed',
      completed_at: new Date()
    });

    // Record transactions for both sides
    await Transaction.create({
      user_id: escrow.worker_id,
      job_id: jobId,
      type: 'escrow_release',
      amount: escrow.worker_payout,
      status: 'success',
      reference: uuidv4(),
      gateway: 'system',
      description: `Payment received for job: ${job.title}`
    });

    await Transaction.create({
      user_id: req.user.id,
      job_id: jobId,
      type: 'platform_fee',
      amount: escrow.platform_fee,
      status: 'success',
      reference: uuidv4(),
      gateway: 'system',
      description: `Platform fee for job: ${job.title}`
    });

    return successResponse(res, 'Payment released successfully. Job completed!', {
      worker_payout: escrow.worker_payout,
      platform_fee: escrow.platform_fee
    });

  } catch (error) {
    console.error('Release payment error:', error);
    return errorResponse(res, 'Could not release payment.', 500);
  }
};

// ─── GET TRANSACTION HISTORY ─────────────────────────────────
// GET /api/wallet/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    return successResponse(
      res,
      'Transactions fetched successfully.',
      { transactions }
    );

  } catch (error) {
    console.error('Get transactions error:', error);
    return errorResponse(res, 'Could not fetch transactions.', 500);
  }
};

// ─── UPDATE BANK DETAILS ─────────────────────────────────────
// PUT /api/wallet/bank
const updateBankDetails = async (req, res) => {
  try {
    const { bank_name, account_number, account_name } = req.body;

    if (!bank_name || !account_number || !account_name) {
      return errorResponse(res, 'Please provide bank name, account number and account name.');
    }

    let wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: req.user.id });
    }

    await wallet.update({ bank_name, account_number, account_name });

    return successResponse(res, 'Bank details updated successfully.', { wallet });

  } catch (error) {
    console.error('Update bank error:', error);
    return errorResponse(res, 'Could not update bank details.', 500);
  }
};

module.exports = {
  getWallet,
  fundWallet,
  fundEscrow,
  releasePayment,
  getTransactions,
  updateBankDetails
};