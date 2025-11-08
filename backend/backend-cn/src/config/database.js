const path = require('path');
// Load environment variables from backend/.env (shared with backend-global)
const backendEnvPath = path.join(__dirname, '..', '..', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

// Load backend/.env first (contains Supabase configuration)
require('dotenv').config({ path: backendEnvPath });

// If CloudBase environment variables are not set, try loading from local .env
if (!process.env.CLOUDBASE_ENV_ID) {
  require('dotenv').config({ path: localEnvPath });
}

const cloudbase = require('@cloudbase/node-sdk');

let cloudbaseApp = null;
if (process.env.CLOUDBASE_ENV_ID && process.env.CLOUDBASE_SECRET_ID) {
  try {
    cloudbaseApp = cloudbase.init({
      env: process.env.CLOUDBASE_ENV_ID,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY
    });
  } catch (error) {
    // CloudBase initialization failed
  }
}

const getDatabaseClient = () => {
  if (cloudbaseApp) {
    return {
      type: 'cloudbase',
      client: cloudbaseApp,
      db: cloudbaseApp.database()
    };
  } else {
    throw new Error('CloudBase not configured');
  }
};

const getCloudbaseDB = () => {
  if (!cloudbaseApp) {
    throw new Error('CloudBase not initialized');
  }
  return cloudbaseApp.database();
};

const testConnection = async () => {
  try {
    if (cloudbaseApp) {
      const db = cloudbaseApp.database();
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Supabase client (for checking global database)
let supabaseGlobal = null;

if (process.env.SUPABASE_URL_GLOBAL && process.env.SUPABASE_SERVICE_ROLE_KEY_GLOBAL) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabaseGlobal = createClient(
      process.env.SUPABASE_URL_GLOBAL,
      process.env.SUPABASE_SERVICE_ROLE_KEY_GLOBAL
    );
  } catch (error) {
    // Supabase initialization failed
  }
}

module.exports = {
  getDatabaseClient,
  getCloudbaseDB,
  cloudbaseApp,
  testConnection,
  supabaseGlobal
};

