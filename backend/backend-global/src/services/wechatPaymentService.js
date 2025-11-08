// WeChat payment service (supports sandbox environment)
// Requires configuration: WECHAT_APP_ID, WECHAT_MERCHANT_ID, WECHAT_API_KEY, WECHAT_API_V3_KEY (optional)

const WechatPay = require('wechatpay-node-v3');

let wechatpay = null;
const isSandbox = process.env.WECHAT_SANDBOX === 'true' || process.env.WECHAT_SANDBOX === '1';

// Initialize WeChat payment (if environment variables are configured)
if (process.env.WECHAT_APP_ID && process.env.WECHAT_MERCHANT_ID && process.env.WECHAT_API_KEY) {
  try {
    const config = {
      appid: process.env.WECHAT_APP_ID,
      mchid: process.env.WECHAT_MERCHANT_ID,
      publicKey: process.env.WECHAT_API_KEY,
      // API v3 key (if provided)
      key: process.env.WECHAT_API_V3_KEY || process.env.WECHAT_API_KEY,
      // Sandbox environment flag
      ...(isSandbox && { sandbox: true })
    };
    
    wechatpay = new WechatPay(config);
    
    if (isSandbox) {

    } else {

    }
  } catch (error) {

  }
} else {

}

/**
 * Create WeChat payment order
 */
const createOrder = async (order) => {
  try {
    // If WeChat payment not configured, return mock data
    if (!wechatpay) {

      return {
        qr_code: 'https://example.com/qr-code',
        payment_url: 'weixin://wxpay/bizpayurl?pr=xxx',
        prepay_id: `PREPAY_${Date.now()}`,
        note: 'This is mock data, please configure WeChat payment environment variables to use real payment'
      };
    }

    // Actual WeChat payment API call
    const notifyUrl = process.env.WECHAT_NOTIFY_URL || 
                     `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/payment/wechat/callback`;
    
    const paymentData = {
      appid: process.env.WECHAT_APP_ID,
      mchid: process.env.WECHAT_MERCHANT_ID,
      description: order.description || 'Deepfake Detection Service',
      out_trade_no: order.order_no,
      notify_url: notifyUrl,
      amount: {
        total: Math.round(order.amount * 100), // WeChat payment amount unit is cents
        currency: 'CNY'
      }
    };

    const result = await wechatpay.transactions_native(paymentData);

    return {
      qr_code: result.code_url,
      payment_url: result.code_url,
      prepay_id: result.prepay_id,
      sandbox: isSandbox
    };
  } catch (error) {

    throw error;
  }
};

module.exports = {
  createOrder
};

