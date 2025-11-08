const express = require('express');
const router = express.Router();
const {
  emailRegister,
  emailLogin,
  getCurrentUser,
  googleLogin,
  logout
} = require('../controllers/authController');

/**
 * @route   POST /api/v1/auth/email/register
 * @desc    Email registration
 * @access  Public
 */
router.post('/email/register', emailRegister);

/**
 * @route   POST /api/v1/auth/email/login
 * @desc    Email login
 * @access  Public
 */
router.post('/email/login', emailLogin);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', getCurrentUser);

/**
 * @route   POST /api/v1/auth/google/callback
 * @desc    Google登录回调
 * @access  Public
 */
router.post('/google/callback', googleLogin);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout
 * @access  Private
 */
router.post('/logout', logout);

module.exports = router;

