// 国外系统 - 主要使用Supabase，但也需要访问CloudBase（用于跨区域登录）
// 加载环境变量：从 backend/.env 加载（与 backend-cn 使用相同的配置文件）
const path = require('path');
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
const { createClient } = require('@supabase/supabase-js');

// CloudBase 配置（用于跨区域登录检查）- 可选依赖
let cloudbaseApp = null;
let cloudbase = null;
try {
  cloudbase = require('@cloudbase/node-sdk');
  
  // 调试：输出环境变量状态

  if (process.env.CLOUDBASE_ENV_ID && process.env.CLOUDBASE_SECRET_ID) {
    try {
      cloudbaseApp = cloudbase.init({
        env: process.env.CLOUDBASE_ENV_ID,
        secretId: process.env.CLOUDBASE_SECRET_ID,
        secretKey: process.env.CLOUDBASE_SECRET_KEY
      });

    } catch (error) {

    }
  } else {

  }
} catch (error) {

}

const getCloudbaseDB = () => {
  if (!cloudbaseApp) {
    throw new Error('CloudBase客户端未初始化，请检查环境变量或安装 @cloudbase/node-sdk');
  }
  return cloudbaseApp.database();
};

// 创建Supabase客户端（国外系统）
let supabaseGlobal = null;
if (process.env.SUPABASE_URL_GLOBAL && process.env.SUPABASE_SERVICE_ROLE_KEY_GLOBAL) {
  supabaseGlobal = createClient(
    process.env.SUPABASE_URL_GLOBAL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_GLOBAL
  );

} else {

  // 调试输出
  if (process.env.NODE_ENV !== 'production') {

  }
}

/**
 * 获取数据库客户端（国外系统 - 只使用Supabase）
 */
const getDatabaseClient = () => {
  if (!supabaseGlobal) {
    throw new Error('Supabase客户端未初始化，请检查环境变量');
  }
  return {
    type: 'supabase',
    client: supabaseGlobal
  };
};

/**
 * 获取Supabase客户端（国外系统）
 */
const getSupabaseClient = () => {
  if (!supabaseGlobal) {
    throw new Error('Supabase客户端未初始化，请检查环境变量');
  }
  return supabaseGlobal;
};

// 测试数据库连接（国外系统）
const testConnection = async () => {
  try {
    if (!supabaseGlobal) {

      return false;
    }
    
    const { data, error } = await supabaseGlobal
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {

      return false;
    }

    return true;
  } catch (error) {

    return false;
  }
};

module.exports = {
  getDatabaseClient,
  getSupabaseClient,
  supabaseGlobal,
  testConnection,
  cloudbaseApp,
  getCloudbaseDB
};
