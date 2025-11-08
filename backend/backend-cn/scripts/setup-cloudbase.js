/**
 * 云开发数据库初始化脚本
 * 自动创建集合和索引
 */

const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发客户端
const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY
});

const db = app.database();

/**
 * 创建集合（通过插入测试数据自动创建）
 */
async function createCollection(collectionName, sampleData) {
  try {

    // 尝试插入一条测试数据，如果集合不存在会自动创建
    const result = await db.collection(collectionName).add(sampleData);
    
    // CloudBase返回的ID可能在result.id或result._id中
    const docId = result.id || result._id || result.inserted || result.insertedId;
    
    if (docId) {

      // 立即删除测试数据
      try {
        await db.collection(collectionName).doc(docId).remove();

      } catch (removeError) {

      }
    } else {

    }
    
    return true;
  } catch (error) {
    // 检查是否是集合不存在的错误
    if (error.message && (
      error.message.includes('not exist') || 
      error.message.includes('COLLECTION_NOT_EXIST') ||
      error.message.includes('Db or Table not exist')
    )) {

      return false;
    }
    
    // 如果集合已存在，尝试删除可能的测试数据
    if (error.message.includes('already exists') || error.code === 'COLLECTION_EXISTS') {

      return true;
    }

    return false;
  }
}

/**
 * 创建索引
 */
async function createIndex(collectionName, indexName, keys, options = {}) {
  try {
    // 云开发的索引创建可能需要通过控制台或特定API
    // 这里我们只记录，实际索引需要在控制台创建

    if (options.unique) {

    }
    return true;
  } catch (error) {

    return false;
  }
}

/**
 * 初始化数据库
 */
async function initDatabase() {

  // 检查环境变量
  if (!process.env.CLOUDBASE_ENV_ID || !process.env.CLOUDBASE_SECRET_ID) {

    process.exit(1);
  }

  // 1. 创建 ip_records 集合

  const ipRecordsSample = {
    ip_address: '127.0.0.1',
    country: 'CN',
    region_name: 'Beijing',
    city: 'Beijing',
    is_china: true,
    latitude: 39.9042,
    longitude: 116.4074,
    detected_at: new Date(),
    source: 'setup-script'
  };
  await createCollection('ip_records', ipRecordsSample);

  // 2. 创建 users 集合

  const usersSample = {
    email: 'setup-test@example.com',
    password_hash: 'test_hash',
    name: '测试用户',
    region: 'cn',
    ip_address: '127.0.0.1',
    created_at: new Date(),
    updated_at: new Date()
  };
  await createCollection('users', usersSample);

  // 3. 创建 payment_orders 集合

  const paymentOrdersSample = {
    order_no: 'SETUP_TEST_ORDER',
    user_id: 'test_user_id',
    amount: 0.01,
    currency: 'CNY',
    payment_method: 'wechat',
    payment_status: 'pending',
    region: 'cn',
    ip_address: '127.0.0.1',
    created_at: new Date(),
    updated_at: new Date()
  };
  await createCollection('payment_orders', paymentOrdersSample);

}

// 运行初始化
initDatabase()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  });

