const express = require('express');
const router = express.Router();
const {
  emailRegister,
  emailLogin,
  getCurrentUser,
  getWechatQRCode,
  wechatCallback,
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
 * @route   GET /api/v1/auth/wechat/qrcode
 * @desc    Get WeChat login QR code
 * @access  Public
 */
router.get('/wechat/qrcode', getWechatQRCode);

/**
 * @route   GET /api/v1/auth/wechat/callback
 * @desc    WeChat login callback (OAuth callback, GET request from WeChat server)
 * @access  Public
 */
router.get('/wechat/callback', wechatCallback);

/**
 * @route   POST /api/v1/auth/wechat/callback
 * @desc    WeChat login callback (frontend direct call, mock mode)
 * @access  Public
 */
router.post('/wechat/callback', wechatCallback);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout
 * @access  Private
 */
router.post('/logout', logout);

module.exports = router;

