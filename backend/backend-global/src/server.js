const path = require('path');
// 加载环境变量：从 backend/.env 加载（与 backend-cn 使用相同的配置文件）
const backendEnvPath = path.join(__dirname, '..', '..', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');
const cnEnvPath = path.join(__dirname, '..', 'backend-cn', '.env');

// Load backend/.env first (contains Supabase configuration)
require('dotenv').config({ path: backendEnvPath });

// If CloudBase environment variables are not set, try loading from backend-cn/.env (CloudBase config is there)
if (!process.env.CLOUDBASE_ENV_ID) {
  require('dotenv').config({ path: cnEnvPath });
}

// Finally load local .env (if exists, will override previous values)
require('dotenv').config({ path: localEnvPath });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const ipRoutes = require('./routes/ip');
const paymentRoutes = require('./routes/payment');
const authRoutes = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { checkGlobalRegion } = require('./middleware/ipCheck');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3006'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'deepfake-detection-backend-global',
    region: 'global',
    database: 'Supabase'
  });
});

app.use('/api/v1', checkGlobalRegion);
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
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

module.exports = app;
