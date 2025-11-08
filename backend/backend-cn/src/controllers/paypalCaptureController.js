const paypal = require('@paypal/checkout-server-sdk');
const { supabaseGlobal } = require('../config/database');
const { shouldUseCNSystem } = require('../utils/ipDetector');

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
 * Capture PayPal payment
 */
const capturePayment = async (req, res) => {
  try {
    const { order_id, order_no } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: order_id'
      });
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    const isChina = shouldUseCNSystem(clientIP);
    const dbRegion = isChina ? 'cn' : 'global';

    // Ensure PayPal client is initialized
    const client = initializePayPalClient();

    let captureResult;

    if (!client) {
      // If PayPal not configured, return mock data

      captureResult = {
        id: order_id,
        status: 'COMPLETED',
        payer: {
          payer_id: 'TEST_PAYER_ID',
          email_address: 'test@example.com'
        },
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '0.00'
          }
        }],
        note: 'This is mock data, please configure PayPal environment variables to use real payment'
      };
    } else {
      // Actual PayPal API call
      const request = new paypal.orders.OrdersCaptureRequest(order_id);
      request.requestBody({});

      const response = await client.execute(request);
      captureResult = response.result;

    }

    res.json({
      success: true,
      data: captureResult
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to capture PayPal payment',
      error: error.message || error.toString()
    });
  }
};

module.exports = {
  capturePayment
};

