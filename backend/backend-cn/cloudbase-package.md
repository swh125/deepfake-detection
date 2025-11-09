# CloudBase 云函数打包指南

## ❌ 错误原因

错误 `ResourceNotFound.Entryfile` 和 `filename not matched: scf_bootstrap` 通常是因为：
1. ZIP 文件结构不正确
2. 入口文件不在 ZIP 根目录
3. 缺少必要的文件

## ✅ 正确的打包方式

### 方法 1：使用命令行打包（推荐）

在 `backend/backend-cn` 目录下执行：

**Windows (PowerShell):**
```powershell
# 进入目录
cd backend/backend-cn

# 创建 ZIP（排除不需要的文件）
Compress-Archive -Path index.js,package.json,src -DestinationPath function.zip -Force

# 或者使用 7-Zip（如果已安装）
7z a function.zip index.js package.json src -xr!node_modules -xr!.git -xr!.env*
```

**Windows (CMD):**
```cmd
cd backend\backend-cn
powershell Compress-Archive -Path index.js,package.json,src -DestinationPath function.zip -Force
```

**Mac/Linux:**
```bash
cd backend/backend-cn
zip -r function.zip index.js package.json src -x "node_modules/*" -x ".git/*" -x "*.env*"
```

### 方法 2：手动打包

1. 进入 `backend/backend-cn` 目录
2. 选择以下文件/文件夹：
   - `index.js`（必须在根目录）
   - `package.json`
   - `src/` 文件夹（整个文件夹）
3. 右键 → 压缩/打包
4. 命名为 `function.zip`

## 📁 正确的文件结构

ZIP 文件解压后应该是这样的结构：

```
function.zip
├── index.js          ← 入口文件（必须在根目录）
├── package.json      ← 依赖配置
└── src/              ← 源代码目录
    ├── server.js
    ├── config/
    ├── controllers/
    ├── routes/
    ├── services/
    └── ...
```

## ⚠️ 重要注意事项

1. **不要包含**：
   - `node_modules/`（CloudBase 会自动安装）
   - `.env` 文件（环境变量在控制台配置）
   - `.git/` 文件夹
   - `scripts/` 文件夹（可选）

2. **必须包含**：
   - `index.js`（在 ZIP 根目录）
   - `package.json`
   - `src/` 文件夹

3. **入口文件配置**：
   - 在 CloudBase 控制台：
     - 入口文件：`index.js`
     - 入口函数：`main`

## 🔧 在 CloudBase 控制台配置

1. **函数类型**：选择 **Web函数**
2. **运行环境**：Node.js 18.x 或 20.x
3. **入口文件**：`index.js`
4. **入口函数**：`main`
5. **执行超时**：60 秒

## 📤 上传步骤

1. 打包完成后，在 CloudBase 控制台
2. 选择「上传 ZIP 包」
3. 选择 `function.zip` 文件
4. 等待上传和部署完成

## 🧪 测试

部署成功后，测试：
```bash
curl https://your-function-url/health
```

应该返回：
```json
{
  "status": "ok",
  "service": "deepfake-detection-backend-cn"
}
```



