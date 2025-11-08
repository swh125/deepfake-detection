/**
 * 检查 CloudBase 中的 payment_orders 数据
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const cloudbase = require('@cloudbase/node-sdk');

const envId = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;

if (!envId || !secretId || !secretKey) {
  process.exit(1);
}

const app = cloudbase.init({
  env: envId,
  secretId: secretId,
  secretKey: secretKey
});

const db = app.database();

async function checkCloudBaseOrders() {
  try {
    // 查询所有订单
    const result = await db.collection('payment_orders')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    if (result.data && result.data.length > 0) {
      result.data.forEach((order, index) => {
      });
    } else {
    }

    // 查询用户数据
    const usersResult = await db.collection('users')
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();

    if (usersResult.data && usersResult.data.length > 0) {
      usersResult.data.forEach((user, index) => {
      });
    } else {
    }
  } catch (error) {
  }
}

checkCloudBaseOrders();



