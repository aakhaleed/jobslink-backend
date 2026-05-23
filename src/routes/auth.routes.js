// src/routes/auth.routes.js
// These are the URL paths for authentication.
// Think of routes like doors into your API.

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyOTP,
  getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Public routes — no login needed
router.post('/register', register);
router.post('/login', login);

// Protected routes — must be logged in
router.post('/verify-otp', protect, verifyOTP);

router.get('/workers', async (req, res) => {
  try {
    const { User, WorkerProfile } = require('../models/index')
    const { category, is_verified } = req.query

    const where = { role: 'worker', is_active: true }
    if (is_verified === 'true') where.is_verified = true

    const workers = await User.findAll({
      where,
      attributes: { exclude: ['password_hash', 'otp', 'otp_expires'] },
      include: [{
        model: WorkerProfile,
        as: 'workerProfile',
        required: false
      }],
      order: [['createdAt', 'DESC']]
    })

    // filter by category after fetching
    const filtered = category
      ? workers.filter(w => w.workerProfile?.category === category)
      : workers

    return res.json({
      success: true,
      message: 'Workers fetched.',
      data: { users: filtered }
    })
  } catch (error) {
    console.error('Workers error:', error)
    return res.status(500).json({
      success: false,
      message: 'Could not fetch workers.'
    })
  }
})

router.put('/workers/profile', protect, async (req, res) => {
  try {
    const { User, WorkerProfile } = require('../models/index')

    if (req.user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Only workers can update their profile.'
      })
    }

    let profile = await WorkerProfile.findOne({
      where: { user_id: req.user.id }
    })

    if (!profile) {
      profile = await WorkerProfile.create({
        user_id: req.user.id,
        category: 'other'
      })
    }

    const {
      bio, category, hourly_rate,
      experience_years, is_available,
      skills, state
    } = req.body

    await profile.update({
      bio: bio !== undefined ? bio : profile.bio,
      category: category !== undefined ? category : profile.category,
      hourly_rate: hourly_rate !== undefined ? hourly_rate : profile.hourly_rate,
      experience_years: experience_years !== undefined ? experience_years : profile.experience_years,
      is_available: is_available !== undefined ? is_available : profile.is_available,
      skills: skills !== undefined ? skills : profile.skills
    })

    if (state) {
      await req.user.update({ state })
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { profile }
    })

  } catch (error) {
    console.error('Update profile error:', error)
    return res.status(500).json({
      success: false,
      message: 'Could not update profile.'
    })
  }
})

router.get('/me', protect, async (req, res) => {
  try {
    const { User, WorkerProfile } = require('../models/index')
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'otp', 'otp_expires'] },
      include: [{
        model: WorkerProfile,
        as: 'workerProfile',
        required: false
      }]
    })
    return res.json({
      success: true,
      message: 'User fetched.',
      data: { user }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch user.' })
  }
})

module.exports = router;