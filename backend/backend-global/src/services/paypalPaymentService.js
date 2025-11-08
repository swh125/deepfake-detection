// PayPal payment service (Sandbox environment)
// Requires configuration: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE

const paypal = require('@paypal/checkout-server-sdk');

let paypalClient = null;

// Function to initialize PayPal client
const initializePayPalClient = () => {
  if (paypalClient) {
    return paypalClient; // Already initialized, return directly
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || 'sandbox';

  if (clientId && clientSecret) {
    try {
      const environment = mode === 'live' 
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);
      
      paypalClient = new paypal.core.PayPalHttpClient(environment);

      return paypalClient;
    } catch (error) {

      return null;
    }
  } else {

    return null;
  }
};

// Try to initialize when module loads
initializePayPalClient();

/**
 * Create PayPal order
 */
const createOrder = async (order) => {
  try {
    // Ensure PayPal client is initialized
    const client = initializePayPalClient();
    
    // If PayPal not configured, return mock data
    if (!client) {

      return {
        order_id: `PAYPAL_${Date.now()}`,
        approval_url: `https://www.sandbox.paypal.com/checkoutnow?token=TOKEN_${Date.now()}`,
        note: 'This is mock data, please configure PayPal environment variables to use real payment'
      };
    }

    // Actual PayPal API call
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order.order_no,
        amount: {
          currency_code: order.currency,
          value: order.amount.toString()
        },
        description: order.description || 'Deepfake Detection Service'
      }],
      application_context: {
        return_url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').trim()}/payment/success`,
        cancel_url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').trim()}/payment/cancel`
      }
    });

    // Add timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('PayPal API request timeout (30s). Please try again.'));
      }, 30000); // 30 second timeout
    });
    
    try {
      const response = await Promise.race([
        client.execute(request),
        timeoutPromise
      ]);

      const orderId = response.result.id;
      const approvalUrl = response.result.links.find(link => link.rel === 'approve')?.href;

      return {
        order_id: orderId,
        approval_url: approvalUrl
      };
    } catch (apiError) {

      // If timeout error, return more friendly error message
      if (apiError.message && apiError.message.includes('timeout')) {
        const timeoutError = new Error('PayPal system temporarily unresponsive, please try again later');
        timeoutError.code = 'PAYPAL_TIMEOUT';
        throw timeoutError;
      }
      
      // Other errors, rethrow
      throw apiError;
    }
  } catch (error) {

    throw error;
  }
};

module.exports = {
  createOrder
};

