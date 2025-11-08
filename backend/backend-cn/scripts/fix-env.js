/**
 * 修复.env文件，添加云开发配置
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

// 读取现有.env文件
let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}

// 删除所有现有的云开发配置
const lines = content.split('\n');
const newLines = [];
let skipCloudbase = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // 检测云开发配置的开始
  if (line.includes('# 云开发') || line.includes('CLOUDBASE_')) {
    if (!skipCloudbase) {
      skipCloudbase = true;
    }
    continue; // 跳过这一行
  } else {
    // 如果遇到非云开发配置的行，重置skip标志
    if (skipCloudbase && line.trim() !== '') {
      skipCloudbase = false;
    }
    if (!skipCloudbase) {
      newLines.push(line);
    }
  }
}

// 添加云开发配置
newLines.push('');
newLines.push('# 云开发（CloudBase）配置');
newLines.push('CLOUDBASE_ENV_ID=your_cloudbase_env_id');
newLines.push('CLOUDBASE_SECRET_ID=your_secret_id');
newLines.push('CLOUDBASE_SECRET_KEY=your_secret_key');

// 写入文件
fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
