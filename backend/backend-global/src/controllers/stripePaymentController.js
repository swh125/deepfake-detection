const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const { supabaseGlobal } = require('../config/database');

/**
 * Stripe Webhook handler
 */
const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    
    if (webhookSecret) {
      // Verify Webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // If key not configured, parse directly (testing only)
      event = req.body;
    }

    // Handle payment success event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const order_no = paymentIntent.metadata?.order_no;

      if (order_no) {
        // Update order status
        const { data: order, error: updateError } = await supabaseGlobal
          .from('payment_orders')
          .update({
            payment_status: 'paid',
            payment_provider_order_id: paymentIntent.id,
            callback_data: paymentIntent,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_no', order_no)
          .select()
          .single();

        // After payment success, update user subscription information
        if (!updateError && order && order.user_id && order.description) {
          try {
            const { updateUserSubscriptionAfterPayment } = require('./paymentController');
            await updateUserSubscriptionAfterPayment(order.user_id.toString(), order.description, 'global');
          } catch (subError) {
            // Don't throw error, because payment has already succeeded
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {

    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

module.exports = {
  handleWebhook
};

