const { mysqlPool, cloudbaseApp } = require('../config/database');
const cloudbaseService = require('../services/cloudbaseService');

/**
 * WeChat payment callback handler
 */
const handleCallback = async (req, res) => {
  try {
    // WeChat payment V3 API callback may use different format
    // May be JSON body or encrypted XML format
    let callbackData = req.body;
    
    // If WeChat payment V3 callback, data may be in resource.ciphertext (encrypted)
    // Simplified handling here, assume JSON format
    if (typeof callbackData === 'string') {
      try {
        callbackData = JSON.parse(callbackData);
      } catch (e) {

      }
    }

    // Verify signature (should actually verify WeChat signature)
    // TODO: Implement WeChat payment V3 signature verification
    // const isValid = wechatpay.verifySignature(...);
    // if (!isValid) {
    //   return res.status(400).send('Invalid signature');
    // }

    // WeChat payment V3 callback format: resource.data may contain order information
    // Or directly in body: out_trade_no, trade_state, transaction_id
    const order_no = callbackData.out_trade_no || callbackData.resource?.data?.out_trade_no;
    const trade_state = callbackData.trade_state || callbackData.resource?.data?.trade_state;
    const transaction_id = callbackData.transaction_id || callbackData.resource?.data?.transaction_id;
    
    const payment_status = trade_state === 'SUCCESS' ? 'paid' : 'failed';
    const payment_provider_order_id = transaction_id || '';

    // Update order status (prefer CloudBase)
    if (cloudbaseApp) {

      await cloudbaseService.updatePaymentOrder(order_no, {
        payment_provider_order_id: payment_provider_order_id,
        payment_status: payment_status,
        callback_data: callbackData,
        paid_at: payment_status === 'paid' ? new Date() : null
      });

    } else if (mysqlPool) {
      // MySQL
      await mysqlPool.execute(
        `UPDATE payment_orders 
         SET payment_status = ?, 
             payment_provider_order_id = ?, 
             callback_data = ?,
             paid_at = NOW()
         WHERE order_no = ?`,
        [
          payment_status,
          payment_provider_order_id,
          JSON.stringify(callbackData),
          order_no
        ]
      );

    } else {

    }

    // Return format required by WeChat
    res.json({
      code: 'SUCCESS',
      message: 'Success'
    });
  } catch (error) {

    res.status(500).json({
      code: 'FAIL',
      message: 'Processing failed'
    });
  }
};

module.exports = {
  handleCallback
};

