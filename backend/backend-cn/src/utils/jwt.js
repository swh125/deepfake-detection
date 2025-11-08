const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成JWT Token
 * @param {Object} payload - Token载荷
 * @param {string} payload.userId - 用户ID
 * @param {string} payload.email - 用户邮箱
 * @param {string} payload.region - 地区 ('cn' 或 'global')
 * @returns {string} JWT Token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {Object} 解码后的Token载荷
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * 从请求头中提取Token
 * @param {Object} req - Express请求对象
 * @returns {string|null} Token或null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  JWT_SECRET,
  JWT_EXPIRES_IN
};







