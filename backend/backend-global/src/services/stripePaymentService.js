// Stripe payment service (test environment)
// Requires configuration: STRIPE_SECRET_KEY

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

/**
 * Create Stripe payment intent (PaymentIntent)
 */
const createPaymentIntent = async (order) => {
  try {
    // If Stripe key not configured, return mock data (without client_secret to prevent Stripe validation errors)
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
      // Don't return a fake client_secret - Stripe will reject it
      // Instead, return mock data that frontend can handle
      return {
        payment_intent_id: `pi_mock_${Date.now()}`,
        note: 'This is mock data, please configure STRIPE_SECRET_KEY environment variable to use real payment'
      };
    }

    // Actual Stripe API call

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100), // Stripe amount unit is cents
      currency: order.currency.toLowerCase(),
      metadata: {
        order_no: order.order_no,
        user_id: order.user_id.toString()
      },
      description: order.description || 'Deepfake Detection Service'
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    };
  } catch (error) {

    throw error;
  }
};

module.exports = {
  createPaymentIntent
};

