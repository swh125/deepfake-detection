const serverless = require('serverless-http');
const app = require('./src/server');

// 将 Express app 包装成云函数（Web云函数格式）
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream']
});

/**
 * 腾讯云 CloudBase Web云函数入口
 * 选择类型：Web云函数（处理HTTP请求）
 * 
 * @param {Object} event - HTTP请求事件对象
 * @param {Object} context - 云函数上下文
 * @returns {Object} HTTP响应对象
 */
exports.main = async (event, context) => {
  // 设置超时时间（云函数默认超时时间）
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Web云函数：event 包含 HTTP 请求信息
    // serverless-http 会自动将 event 转换为 Express 请求
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('云函数执行错误:', error);
    // 返回标准HTTP错误响应
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};

