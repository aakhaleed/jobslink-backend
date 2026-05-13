// src/controllers/auth.controller.js
// This handles all authentication logic:
// register, login, verify OTP, get current user

const { User, WorkerProfile } = require('../models/index');
const {
  hashPassword,
  comparePassword,
  generateToken,
  generateOTP,
  successResponse,
  errorResponse
} = require('../utils/helpers');

// ─── REGISTER ───────────────────────────────────────────────
// POST /api/auth/register
// Anyone can sign up as a client or worker
const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, role, state } = req.body;

    // Make sure required fields are provided
    if (!full_name || !password || (!email && !phone)) {
      return errorResponse(
        res,
        'Please provide your name, password, and email or phone.'
      );
    }

    // Check if email already exists
    if (email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return errorResponse(res, 'Email is already registered.');
      }
    }

    // Check if phone already exists
    if (phone) {
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return errorResponse(res, 'Phone number is already registered.');
      }
    }

    // Hash the password before saving
    const password_hash = await hashPassword(password);

    // Generate OTP for verification
    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create the user
    const user = await User.create({
      full_name,
      email,
      phone,
      password_hash,
      role: role || 'client',
      state,
      otp,
      otp_expires
    });

    // If user is a worker, create their profile automatically
    if (role === 'worker') {
      await WorkerProfile.create({
        user_id: user.id,
        category: 'other'
      });
    }

    // Generate login token
    const token = generateToken(user.id, user.role);

    // In production you would send OTP via SMS here
    // For now we return it in the response for testing
    console.log(`OTP for ${full_name}: ${otp}`);

    return successResponse(
      res,
      'Account created successfully. Please verify your account.',
      {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_verified: user.is_verified
        },
        otp // Remove this in production!
      },
      201
    );

  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'Registration failed. Please try again.', 500);
  }
};

// ─── LOGIN ───────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return errorResponse(res, 'Please provide your email or phone and password.');
    }

    // Find user by email or phone
    const user = await User.findOne({
      where: email ? { email } : { phone }
    });

    if (!user) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    // Check password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    if (!user.is_active) {
      return errorResponse(res, 'Your account has been suspended.', 401);
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    return successResponse(res, 'Login successful.', {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_verified: user.is_verified,
        avatar_url: user.avatar_url
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
};

// ─── VERIFY OTP ──────────────────────────────────────────────
// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = req.user; // comes from protect middleware

    if (!otp) {
      return errorResponse(res, 'Please provide the OTP.');
    }

    // Check OTP matches and is not expired
    if (user.otp !== otp) {
      return errorResponse(res, 'Invalid OTP.');
    }

    if (new Date() > user.otp_expires) {
      return errorResponse(res, 'OTP has expired. Please request a new one.');
    }

    // Mark user as verified
    await user.update({
      is_verified: true,
      otp: null,
      otp_expires: null
    });

    return successResponse(res, 'Account verified successfully.');

  } catch (error) {
    console.error('OTP error:', error);
    return errorResponse(res, 'Verification failed.', 500);
  }
};

// ─── GET CURRENT USER ────────────────────────────────────────
// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    return successResponse(res, 'User fetched successfully.', {
      user: {
        id: req.user.id,
        full_name: req.user.full_name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        is_verified: req.user.is_verified,
        avatar_url: req.user.avatar_url,
        state: req.user.state
      }
    });
  } catch (error) {
    return errorResponse(res, 'Could not fetch user.', 500);
  }
};

module.exports = { register, login, verifyOTP, getMe };