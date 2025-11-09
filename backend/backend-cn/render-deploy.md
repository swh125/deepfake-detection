# Render 部署指南 - 国内后端

## 🚀 为什么选择 Render？

- ✅ **免费额度**：免费 Web 服务（有休眠限制）
- ✅ **简单易用**：连接 GitHub 自动部署
- ✅ **支持 Node.js**：完美支持 Express 应用
- ✅ **自动 HTTPS**：自动配置 SSL 证书

## 📦 部署步骤

### 1. 注册 Render 账号

1. 访问 [Render](https://render.com)
2. 使用 GitHub 账号登录

### 2. 创建 Web Service

1. 点击 "New +" → "Web Service"
2. 选择 "Build and deploy from a Git repository"
3. 连接你的 GitHub 仓库 `swh125/deepfake-detection`

### 3. 配置服务

- **Name**: `backend-cn`
- **Environment**: `Node`
- **Build Command**: `cd backend/backend-cn && npm install`
- **Start Command**: `cd backend/backend-cn && node src/server.js`
- **Plan**: Free（免费计划）

### 4. 配置环境变量

在 "Environment" 标签页添加：

```
CLOUDBASE_ENV_ID=cloud1-3giwb8x723267ff3
CLOUDBASE_SECRET_ID=AKIDb2LTP8mNn12rUwBD3pfU9czOjusdCcqr
CLOUDBASE_SECRET_KEY=yuoZ9lLlz75rQmvrcDcrvnRt9C2g7MPG
JWT_SECRET=deepfake_detection_secret_key_2024_change_this_in_production_abc123xyz
FRONTEND_URL=https://deepfake-detection-3cmt.vercel.app
PORT=8000
NODE_ENV=production
```

### 5. 获取部署地址

部署成功后，Render 会提供：
- **默认域名**: `backend-cn.onrender.com`
- **自定义域名**: 可以在设置中配置

### 6. 更新环境变量

部署后，添加 `BACKEND_URL`：
```
BACKEND_URL=https://backend-cn.onrender.com
```

## ⚠️ 注意事项

1. **休眠限制**：免费计划在 15 分钟无请求后会休眠，首次请求需要等待唤醒（约 30 秒）
2. **端口**：Render 会自动分配端口，使用 `process.env.PORT`
3. **数据库**：继续使用 CloudBase 数据库（不受影响）

## 📚 参考

- [Render 文档](https://render.com/docs)
- [Render Node.js 部署](https://render.com/docs/node-version)



