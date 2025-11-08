const path = require('path');
// Load backend/.env first (contains Supabase configuration)
const backendEnvPath = path.join(__dirname, '..', '..', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');
// 先加载 backend/.env
require('dotenv').config({ path: backendEnvPath });
// 然后加载本地 .env（可能会覆盖一些变量，但 CloudBase 配置应该在本地）
require('dotenv').config({ path: localEnvPath });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const ipRoutes = require('./routes/ip');
const paymentRoutes = require('./routes/payment');
const authRoutes = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { checkCNRegion } = require('./middleware/ipCheck');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
// CORS configuration - support multiple frontend URLs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3006',
  'https://www.shuwen.online',
  'https://shuwen.online',
  'https://deepfake-detection-3cmt.vercel.app' // Keep old domain for backward compatibility
];
// Add FRONTEND_URL from environment if it exists
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL;
  // Handle both string and array formats
  if (Array.isArray(frontendUrl)) {
    allowedOrigins.push(...frontendUrl);
  } else {
    allowedOrigins.push(frontendUrl);
  }
}
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'deepfake-detection-backend-cn',
    region: 'cn',
    database: 'CloudBase'
  });
});

app.use('/api/v1', checkCNRegion);
app.use('/api/v1', ipRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.originalUrl} not found` 
  });
});

app.use(errorHandler);

// 云函数模式下不需要监听端口，直接导出 app
// 本地开发时如果需要，可以取消注释
// 判断是否为云函数环境（通过环境变量或运行时环境）
if (require.main === module) {
  // 直接运行 node src/server.js 时，启动本地服务器
  // 监听 0.0.0.0 以支持 Railway/Render 等云平台
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 China Backend Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🇨🇳 Region: China (CloudBase)`);
  });
}

module.exports = app;

