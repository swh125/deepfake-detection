# Railway 部署指南 - 国内后端

## 🚀 为什么选择 Railway？

- ✅ **免费额度**：每月 $5 免费额度
- ✅ **简单易用**：连接 GitHub 自动部署
- ✅ **支持 Node.js**：完美支持 Express 应用
- ✅ **自动 HTTPS**：自动配置 SSL 证书
- ✅ **环境变量**：可视化配置

## 📦 部署步骤

### 1. 注册 Railway 账号

1. 访问 [Railway](https://railway.app)
2. 使用 GitHub 账号登录（推荐）

### 2. 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的仓库 `swh125/deepfake-detection`
4. 选择分支 `main`

### 3. 配置项目

1. **Root Directory**: 设置为 `backend/backend-cn`
2. **Build Command**: 留空（Railway 会自动检测）
3. **Start Command**: 设置为 `node src/server.js`

### 4. 配置环境变量

在 Railway 项目设置中添加环境变量：

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

部署成功后，Railway 会提供：
- **默认域名**: `your-project-name.up.railway.app`
- **自定义域名**: 可以在设置中配置

### 6. 更新环境变量

部署后，添加 `BACKEND_URL`：
```
BACKEND_URL=https://your-project-name.up.railway.app
```

## ⚠️ 注意事项

1. **代码修改**：需要修改 `src/server.js`，确保在 Railway 环境下正确启动
2. **端口**：Railway 会自动分配端口，使用 `process.env.PORT`
3. **数据库**：继续使用 CloudBase 数据库（不受影响）

## 🔧 代码修改

确保 `src/server.js` 中有：

```javascript
const PORT = process.env.PORT || 8000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 China Backend Server running on port ${PORT}`);
  });
}
```

## 📚 参考

- [Railway 文档](https://docs.railway.app)
- [Railway Node.js 部署](https://docs.railway.app/deploy/nodejs)



