// src/controllers/chat.controller.js
// This handles saving and fetching messages.
// Real-time delivery is handled by Socket.io in server.js

const { Message, User, Job } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─── SEND MESSAGE ────────────────────────────────────────────
// POST /api/chat/:jobId
// Client or worker can send a message linked to a job
const sendMessage = async (req, res) => {
  try {
    const { content, receiver_id, type, file_url } = req.body;
    const { jobId } = req.params;

    if (!content || !receiver_id) {
      return errorResponse(res, 'Please provide message content and receiver.');
    }

    // Make sure the job exists
    const job = await Job.findByPk(jobId);
    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    // Make sure sender is part of this job
    const isClient = job.client_id === req.user.id;
    const isWorker = job.worker_id === req.user.id;

    if (!isClient && !isWorker) {
      return errorResponse(
        res,
        'You are not authorized to chat on this job.',
        403
      );
    }

    // Save message to database
    const message = await Message.create({
      job_id: jobId,
      sender_id: req.user.id,
      receiver_id,
      content,
      type: type || 'text',
      file_url
    });

    // Fetch the message with sender details
    const fullMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        }
      ]
    });

    return successResponse(
      res,
      'Message sent successfully.',
      { message: fullMessage },
      201
    );

  } catch (error) {
    console.error('Send message error:', error);
    return errorResponse(res, 'Could not send message.', 500);
  }
};

// ─── GET MESSAGES ────────────────────────────────────────────
// GET /api/chat/:jobId
// Get all messages for a specific job
const getMessages = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findByPk(jobId);
    if (!job) {
      return errorResponse(res, 'Job not found.', 404);
    }

    // Only client and worker of this job can see messages
    const isClient = job.client_id === req.user.id;
    const isWorker = job.worker_id === req.user.id;

    if (!isClient && !isWorker) {
      return errorResponse(
        res,
        'Not authorized to view these messages.',
        403
      );
    }

    const messages = await Message.findAll({
      where: { job_id: jobId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Mark all messages as read
    await Message.update(
      { is_read: true },
      {
        where: {
          job_id: jobId,
          receiver_id: req.user.id,
          is_read: false
        }
      }
    );

    return successResponse(res, 'Messages fetched successfully.', { messages });

  } catch (error) {
    console.error('Get messages error:', error);
    return errorResponse(res, 'Could not fetch messages.', 500);
  }
};

// ─── GET MY CONVERSATIONS ────────────────────────────────────
// GET /api/chat/conversations
// Get all job conversations for the logged in user
const getConversations = async (req, res) => {
  try {
    const { Job: JobModel, User: UserModel } = require('../models/index');

    // Find all jobs where user is client or worker
    const jobs = await Job.findAll({
      where: {
        status: ['assigned', 'in_progress', 'completed']
      },
      include: [
        {
          model: UserModel,
          as: 'client',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: UserModel,
          as: 'worker',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          attributes: ['content', 'createdAt', 'is_read', 'sender_id']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    // Filter only jobs this user is part of
    const myConversations = jobs.filter(
      job =>
        job.client_id === req.user.id ||
        job.worker_id === req.user.id
    );

    return successResponse(
      res,
      'Conversations fetched successfully.',
      { conversations: myConversations }
    );

  } catch (error) {
    console.error('Get conversations error:', error);
    return errorResponse(res, 'Could not fetch conversations.', 500);
  }
};

module.exports = { sendMessage, getMessages, getConversations };