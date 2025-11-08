const { getDatabaseClient } = require('../config/database');

/**
 * PayPal payment callback handler
 */
const handleCallback = async (req, res) => {
  try {
    const { token, PayerID } = req.query;
    // Should actually call PayPal API to capture payment
    // const request = new paypal.orders.OrdersCaptureRequest(token);
    // const response = await paypalClient.execute(request);

    const db = getDatabaseClient('global');
    
    // Update order status (simplified handling)
    // Should actually get order_no from callback
    // await db.from('payment_orders').update({...}).eq('order_no', order_no);

    res.redirect(`${(process.env.FRONTEND_URL || 'http://localhost:3000').trim()}/payment/success`);
  } catch (error) {
    res.redirect(`${(process.env.FRONTEND_URL || 'http://localhost:3000').trim()}/payment/cancel`);
  }
};

module.exports = {
  handleCallback
};















