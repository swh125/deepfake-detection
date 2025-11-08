const express = require('express');
const router = express.Router();
const { detectCurrentIP, getIPInfo } = require('../controllers/ipController');

/**
 * @route   GET /api/v1/utils/detect-ip
 * @desc    检测当前请求的IP地址和地理位置
 * @access  Public
 */
router.get('/utils/detect-ip', detectCurrentIP);

/**
 * @route   GET /api/v1/utils/ip-info/:ip
 * @desc    查询指定IP地址的信息
 * @access  Public
 */
router.get('/utils/ip-info/:ip', getIPInfo);

module.exports = router;

