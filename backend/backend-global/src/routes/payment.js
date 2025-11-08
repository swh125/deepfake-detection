const express = require('express');
const router = express.Router();
const { createPayment, confirmPayment, getPaymentStatus, getPaymentHistory, mockPaymentComplete } = require('../controllers/paymentController');

/**
 * @route   POST /api/v1/payment/create
 * @desc    Create payment order (automatically select payment method by region)
 * @access  Public (should actually require authentication)
 */
router.post('/create', createPayment);

/**
 * @route   POST /api/v1/payment/confirm
 * @desc    Confirm payment (update order status and payment_provider_order_id)
 * @access  Public
 */
router.post('/confirm', confirmPayment);

/**
 * @route   GET /api/v1/payment/status/:order_no
 * @desc    Query payment order status
 * @access  Public
 */
router.get('/status/:order_no', getPaymentStatus);

/**
 * @route   GET /api/v1/payment/history
 * @desc    Get payment history
 * @access  Public
 */
router.get('/history', getPaymentHistory);

/**
 * @route   POST /api/v1/payment/mock-complete
 * @desc    Simulate payment completion (for demo/testing)
 * @access  Public
 */
router.post('/mock-complete', mockPaymentComplete);

/**
 * @route   POST /api/v1/payment/wechat/callback
 * @desc    WeChat payment callback
 * @access  Public (called by WeChat server)
 */
router.post('/wechat/callback', require('../controllers/wechatPaymentController').handleCallback);

/**
 * @route   POST /api/v1/payment/alipay/callback
 * @desc    Alipay payment callback
 * @access  Public (called by Alipay server)
 */
router.post('/alipay/callback', require('../controllers/alipayPaymentController').handleCallback);

/**
 * @route   POST /api/v1/payment/stripe/webhook
 * @desc    Stripe payment Webhook
 * @access  Public (called by Stripe server)
 */
router.post('/stripe/webhook', require('../controllers/stripePaymentController').handleWebhook);

/**
 * @route   POST /api/v1/payment/paypal/capture
 * @desc    Capture PayPal payment
 * @access  Public
 */
router.post('/paypal/capture', require('../controllers/paypalCaptureController').capturePayment);

/**
 * @route   POST /api/v1/payment/paypal/callback
 * @desc    PayPal payment callback
 * @access  Public (called by PayPal server)
 */
router.post('/paypal/callback', require('../controllers/paypalPaymentController').handleCallback);

module.exports = router;

