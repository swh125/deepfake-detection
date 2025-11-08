const { mysqlPool } = require('../config/database');

/**
 * Alipay payment callback处理
 */
const handleCallback = async (req, res) => {
  try {
    const callbackData = req.query || req.body;

    // 验证签名（实际应该验证支付宝签名）
    const order_no = callbackData.out_trade_no || callbackData.out_trade_no;

    // Update order状态
    await mysqlPool.execute(
      `UPDATE payment_orders 
       SET payment_status = ?, 
           payment_provider_order_id = ?, 
           callback_data = ?,
           paid_at = NOW()
       WHERE order_no = ?`,
      [
        callbackData.trade_status === 'TRADE_SUCCESS' ? 'paid' : 'failed',
        callbackData.trade_no || '',
        JSON.stringify(callbackData),
        order_no
      ]
    );

    // 返回支付宝要求的格式
    res.send('success');
  } catch (error) {

    res.send('fail');
  }
};

module.exports = {
  handleCallback
};

