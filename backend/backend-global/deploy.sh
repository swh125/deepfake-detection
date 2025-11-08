#!/bin/bash

# 后端部署脚本 - backend-global
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署 backend-global"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未安装 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "警告: .env 文件不存在，请先创建并配置环境变量"
    echo "创建 .env 文件模板..."
    cat > .env.example << EOF
# Supabase配置
SUPABASE_URL_GLOBAL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY_GLOBAL=your_service_role_key

# CloudBase配置
CLOUDBASE_ENV_ID=your_cloudbase_env_id
CLOUDBASE_SECRET_ID=your_secret_id
CLOUDBASE_SECRET_KEY=your_secret_key

# JWT配置
JWT_SECRET=your_strong_jwt_secret_key_here_min_32_chars

# Stripe配置
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal配置
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=live

# 服务器配置
PORT=8001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
EOF
    echo "请复制 .env.example 为 .env 并填写配置"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
npm install --production

# 停止旧服务（如果存在）
if pm2 list | grep -q "backend-global"; then
    echo "停止旧服务..."
    pm2 stop backend-global || true
    pm2 delete backend-global || true
fi

# 启动服务
echo "启动服务..."
pm2 start src/server.js --name backend-global

# 保存 PM2 配置
pm2 save

# 等待服务启动
sleep 3

# 检查服务状态
if pm2 list | grep -q "backend-global.*online"; then
    echo "=========================================="
    echo "✅ 部署成功！"
    echo "=========================================="
    echo "服务状态:"
    pm2 status backend-global
    echo ""
    echo "查看日志: pm2 logs backend-global"
    echo "查看状态: pm2 status"
    echo "健康检查: curl http://localhost:8001/health"
else
    echo "=========================================="
    echo "❌ 部署失败！"
    echo "=========================================="
    echo "查看日志: pm2 logs backend-global"
    exit 1
fi






