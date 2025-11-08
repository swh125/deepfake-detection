const { cloudbaseApp } = require('../config/database');
const cloudbaseService = require('../services/cloudbaseService');

const handleCallback = async (req, res) => {
  try {
    const callbackData = req.query || req.body;
    const order_no = callbackData.out_trade_no || callbackData.out_trade_no;
    const payment_status = callbackData.trade_status === 'TRADE_SUCCESS' ? 'paid' : 'failed';

    if (cloudbaseApp) {
      await cloudbaseService.updatePaymentOrder(order_no, {
        payment_provider_order_id: callbackData.trade_no || '',
        payment_status: payment_status,
        callback_data: callbackData,
        paid_at: payment_status === 'paid' ? new Date() : null
      });

      // After payment success, update user subscription information
      if (payment_status === 'paid' && order_no) {
        try {
          // Query order to get user_id and description
          const db = cloudbaseApp.database();
          const orderResult = await db.collection('payment_orders')
            .where({ order_no: order_no })
            .get();
          
          if (orderResult.data && orderResult.data.length > 0) {
            const order = orderResult.data[0];
            if (order.user_id && order.description) {
              const { updateUserSubscriptionAfterPayment } = require('./paymentController');
              await updateUserSubscriptionAfterPayment(order.user_id.toString(), order.description, 'cn');
            }
          }
        } catch (subError) {
          // Don't throw error, because payment has already succeeded
        }
      }
    }

    res.send('success');
  } catch (error) {

    res.send('fail');
  }
};

module.exports = {
  handleCallback
};

