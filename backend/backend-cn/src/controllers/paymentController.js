const { cloudbaseApp, supabaseGlobal } = require('../config/database');
const { shouldUseCNSystem } = require('../utils/ipDetector');
const cloudbaseService = require('../services/cloudbaseService');
const { extractTokenFromHeader, verifyToken } = require('../utils/jwt');

// Generate order number using timestamp and random number, not dependent on uuid
const generateOrderNo = () => {
  return `ORDER${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

/**
 * Create payment order
 */
const createPayment = async (req, res) => {
  try {
    const { amount, currency, payment_method, region, description } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Validate parameters
    if (!amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, payment_method'
      });
    }

    // Get user ID and region from token (priority)
    let user_id = req.body.user_id;
    let userRegion = null; // User's registered database region
    
    // Always try to get user info and region from token (even if user_id in body)
    try {
      const token = extractTokenFromHeader(req);

      if (token) {
        const decoded = verifyToken(token);

        if (decoded && decoded.userId) {
          // Priority to use user_id and region from token
          user_id = decoded.userId;
          userRegion = decoded.region; // Get user's registered region

        } else {

        }
      } else {

      }
    } catch (tokenError) {

    }

    const { cloudbaseApp } = require('../config/database');
    
    let dbRegion;
    if (userRegion) {
      // If got user's region from token, use user's registered database
      dbRegion = userRegion;

    } else {
      // If no token info, judge based on IP or request parameters
      const isChina = region === 'cn' || shouldUseCNSystem(clientIP);
      dbRegion = isChina ? 'cn' : 'global';

    }
    
    // Extra check: If user_id is CloudBase format (long string), force use CloudBase
    // CloudBase ID is usually 24-32 digit hexadecimal string

    if (user_id && typeof user_id === 'string' && user_id.length > 20 && !/^\d+$/.test(user_id)) {
      // CloudBase format: long string, not pure number
      if (dbRegion === 'global') {

        dbRegion = 'cn';

      } else {

      }
    } else if (user_id && /^\d+$/.test(user_id)) {
      // Supabase format: pure number
      if (dbRegion === 'cn') {

      } else {

      }
    } else {

    }

    if (dbRegion === 'cn') {
      if (!cloudbaseApp) {
        return res.status(500).json({
          success: false,
          message: 'CloudBase not configured. Please set CLOUDBASE_* environment variables.'
        });
      }
    }

    // Generate order number
    const order_no = generateOrderNo();
    
    // If still no user_id, require user login
    if (!user_id) {

      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.',
        error: 'Missing user_id and authentication token'
      });
    }
    
    // Backward compatibility: If test user logic is really needed (disabled, changed to require login)
    /*
    if (!user_id) {
      // Check if test user exists, create if not
      if (dbRegion === 'cn') {
        // Priority to use CloudBase
        if (cloudbaseApp) {

          user_id = await cloudbaseService.getOrCreateTestUser(clientIP);
        } else {
          return res.status(500).json({
            success: false,
            message: 'CloudBase not configured'
          });
        }
      } else {
        // Supabase: Check if test user exists
        if (!supabaseGlobal) {
          return res.status(500).json({
            success: false,
            message: 'Supabase database not configured. Please configure SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.'
          });
        }
        
        const { data: existingUser, error: queryError } = await supabaseGlobal
          .from('users')
          .select('id')
          .eq('email', 'test@example.com')
          .limit(1)
          .maybeSingle();
        
        if (queryError) {

        }
        
        if (existingUser && existingUser.id) {
          user_id = existingUser.id;

        } else {
          // Create test user

          const { data: newUser, error } = await supabaseGlobal
            .from('users')
            .insert({
              email: 'test@example.com',
              password_hash: 'test_hash',
              region: dbRegion,
              ip_address: clientIP
            })
            .select()
            .single();
          
          if (error) {

            // If creation fails, try using ID 1
            user_id = 1;

          } else if (newUser && newUser.id) {
            user_id = newUser.id;

          } else {
            // If returned data has no id, use default value

            user_id = 1;
          }
        }
      }
    }
    */

    // user_id already validated earlier, no need to check again here

    // Create order data
    const orderData = {
      order_no,
      user_id: user_id, // Ensure has value
      amount: parseFloat(amount),
      currency: currency || (dbRegion === 'cn' ? 'CNY' : 'USD'),
      payment_method,
      payment_status: 'pending',
      region: dbRegion,
      ip_address: clientIP,
      payment_provider_response: {},
      description: description || '' // Save order description for later subscription update
    };

    let order;
    if (dbRegion === 'cn') {
      // Priority to use CloudBase
      if (cloudbaseApp) {

        order = await cloudbaseService.createPaymentOrder(orderData);
      } else {
        return res.status(500).json({
          success: false,
          message: 'CloudBase not configured'
        });
      }
    } else {
      // Supabase
      if (!supabaseGlobal) {
        throw new Error('Supabase database not configured. Please configure SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.');
      }
      
      // Supabase payment_orders table may not have description field
      // Store description in payment_provider_response, or exclude it
      const supabaseOrderData = {
        ...orderData,
        // If Supabase table doesn't have description field, store it in payment_provider_response
        payment_provider_response: {
          ...(orderData.payment_provider_response || {}),
          description: orderData.description || ''
        }
      };
      
      // Remove description field because Supabase table may not have this field
      delete supabaseOrderData.description;

      const { data, error } = await supabaseGlobal
        .from('payment_orders')
        .insert(supabaseOrderData)
        .select()
        .single();

      if (error) {

        throw error;
      }
      
      // For consistency, add description back to order object (extract from payment_provider_response)
      if (data) {
        order = {
          ...data,
          description: data.payment_provider_response?.description || orderData.description || ''
        };
      } else {
        order = data;
      }
    }

    // Create corresponding payment request based on payment method
    let paymentResult;
    let isMockMode = false;
    
    switch (payment_method) {
      case 'wechat':
        paymentResult = await require('../services/wechatPaymentService').createOrder(order);
        // Check if mock mode: has note field or WeChat payment not configured
        isMockMode = (paymentResult && paymentResult.note) || !process.env.WECHAT_APP_ID;

        break;
      case 'alipay':
        paymentResult = await require('../services/alipayPaymentService').createOrder(order);
        isMockMode = paymentResult.note !== undefined || !process.env.ALIPAY_APP_ID;
        break;
      case 'stripe':
      case 'paypal':
        return res.status(400).json({
          success: false,
          message: 'Stripe and PayPal are not available in China region. Please use WeChat Pay or Alipay.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method. China region supports: wechat, alipay'
        });
    }

    // If mock mode, automatically complete payment
    if (isMockMode) {

      const mockPaymentProviderOrderId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        if (dbRegion === 'cn') {
          // Priority to use CloudBase
          if (cloudbaseApp) {

            await cloudbaseService.updatePaymentOrder(order.order_no, {
              payment_provider_order_id: mockPaymentProviderOrderId,
              payment_status: 'paid',
              callback_data: { mock: true, auto_completed: true, completed_at: new Date().toISOString() },
              paid_at: new Date()
            });

            // Update user subscription information
            if (order.user_id) {
              const planDescription = order.description || '';
              await updateUserSubscriptionAfterPayment(order.user_id.toString(), planDescription, dbRegion);
            }
          } else {
            throw new Error('CloudBase not configured');
          }
        } else {
          // Supabase
          if (supabaseGlobal) {
            await supabaseGlobal
              .from('payment_orders')
              .update({
                payment_provider_order_id: mockPaymentProviderOrderId,
                payment_status: 'paid',
                callback_data: { mock: true, auto_completed: true, completed_at: new Date().toISOString() },
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('order_no', order.order_no);

            // Update user subscription information
            // Ensure order object has description (extract from payment_provider_response)
            if (order && order.user_id) {
              const planDescription = order.description || order.payment_provider_response?.description || '';
              if (planDescription) {
                await updateUserSubscriptionAfterPayment(order.user_id.toString(), planDescription, dbRegion);
              }
            }
          }
        }
      } catch (error) {

        // Don't throw error, because order has already been created successfully
      }
    }

    res.json({
      success: true,
      data: {
        order_no: order.order_no,
        payment_method,
        amount: order.amount,
        currency: order.currency,
        payment_status: isMockMode ? 'paid' : 'pending', // If mock mode, directly return paid
        ...paymentResult
      }
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message || error.toString(),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Update user subscription information (after payment success)
 * @param {string} userId - User ID
 * @param {string} planDescription - Order description, e.g. "Pro Plan - Pro Monthly"
 * @param {string} dbRegion - 'cn' or 'global'
 */
const updateUserSubscriptionAfterPayment = async (userId, planDescription, dbRegion) => {
  try {

    // Extract plan type from description (supports multiple formats)
    let subscriptionType = null;
    const descLower = (planDescription || '').toLowerCase();
    
    if (descLower.includes('monthly') || descLower.includes('pro monthly')) {
      subscriptionType = 'monthly';
    } else if (descLower.includes('yearly') || descLower.includes('pro yearly')) {
      subscriptionType = 'yearly';
    }
    
    if (!subscriptionType) {

      return; // If cannot determine plan type, don't update subscription
    }

    const now = new Date();
    let expiresAt;
    
    if (dbRegion === 'cn') {
      // CloudBase
      const { cloudbaseApp } = require('../config/database');
      const cloudbaseService = require('../services/cloudbaseService');
      
      if (cloudbaseApp) {
        // Query user current subscription information
        const db = cloudbaseApp.database();
        const userResult = await db.collection('users')
          .doc(userId)
          .get();
        
        // CloudBase .doc().get() returns { data: {...} }, not array
        // But need to check if data exists and is object
        let user = null;
        if (userResult && userResult.data) {
          // If data is array, take first element
          if (Array.isArray(userResult.data)) {
            user = userResult.data[0];

          } else if (typeof userResult.data === 'object') {
            user = userResult.data;
          }
        }
        
        if (user) {
          // Correctly parse date (may be string or Date object)
          let currentExpiresAt = null;
          // Check if subscription_expires_at field exists (may be null, undefined or valid date)
          if (user.subscription_expires_at !== null && user.subscription_expires_at !== undefined) {
            if (user.subscription_expires_at instanceof Date) {
              currentExpiresAt = user.subscription_expires_at;
            } else {
              // Try to parse date string
              currentExpiresAt = new Date(user.subscription_expires_at);
            }
            // Verify if date is valid
            if (isNaN(currentExpiresAt.getTime())) {

              currentExpiresAt = null;
            }
          } else {

          }
          
          // Calculate current remaining days (to judge if expired)
          let daysRemaining = 0;
          if (currentExpiresAt) {
            daysRemaining = Math.ceil((currentExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          }

          // Judge membership status and calculate new expiration time
          // Rules:
          // 1. If membership not expired (daysRemaining > 0), accumulate days
          // 2. If membership expired (daysRemaining <= 0) or no membership (currentExpiresAt is null), calculate from current time
          const isActive = currentExpiresAt && daysRemaining > 0;
          
          if (isActive) {
            // Case 1: Membership not expired, accumulate days

            if (subscriptionType === 'monthly') {
              expiresAt = new Date(currentExpiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
              const newDaysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            } else {
              expiresAt = new Date(currentExpiresAt.getTime() + 365 * 24 * 60 * 60 * 1000);
              const newDaysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            }
          } else {
            // Case 2: First purchase, membership expired or no membership, calculate from current time
            const reason = !currentExpiresAt 
              ? 'First purchase (no membership record)' 
              : daysRemaining <= 0 
                ? `Membership expired (expired ${Math.abs(daysRemaining)} days)` 
                : 'Unknown reason';

            if (subscriptionType === 'monthly') {
              expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            } else {
              expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

            }
          }
          
          // Update user subscription

          await cloudbaseService.updateUserSubscription(userId, subscriptionType, expiresAt);

          // Verify if update succeeded (wait a bit for database sync)
          await new Promise(resolve => setTimeout(resolve, 1500)); // Increase wait time
          const verifyResult = await db.collection('users').doc(userId).get();
          
          // Handle returned data structure
          let userData = null;
          if (verifyResult && verifyResult.data) {
            if (Array.isArray(verifyResult.data)) {
              userData = verifyResult.data[0];

            } else if (typeof verifyResult.data === 'object') {
              userData = verifyResult.data;
            }
          }
          
          if (userData) {
            // Check userData actual structure
            
            // Calculate actual remaining days
            if (userData.subscription_expires_at) {
              const actualExpiresAt = new Date(userData.subscription_expires_at);
              const daysRemaining = Math.ceil((actualExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            }
          } else {

          }
        } else {

        }
      }
    } else {
      // Supabase
      // supabaseGlobal already imported at top of file
      
      if (supabaseGlobal) {
        // Query user current subscription information
        const { data: user, error: userError } = await supabaseGlobal
          .from('users')
          .select('id, subscription_type, subscription_expires_at')
          .eq('id', userId)
          .single();
        
        if (!userError && user) {
          const currentExpiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
          
          // Calculate remaining days
          let daysRemaining = 0;
          if (currentExpiresAt) {
            daysRemaining = Math.ceil((currentExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          }
          
          // Judge membership status and calculate new expiration time
          // Rules:
          // 1. If membership not expired (daysRemaining > 0), accumulate days
          // 2. If membership expired (daysRemaining <= 0) or no membership (currentExpiresAt is null), calculate from current time
          const isActive = currentExpiresAt && daysRemaining > 0;
          
          if (isActive) {
            // Case 1: Membership not expired, accumulate days

            if (subscriptionType === 'monthly') {
              expiresAt = new Date(currentExpiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
              expiresAt = new Date(currentExpiresAt.getTime() + 365 * 24 * 60 * 60 * 1000);
            }
          } else {
            // Case 2: First purchase, membership expired or no membership, calculate from current time
            const reason = !currentExpiresAt 
              ? 'First purchase (no membership record)' 
              : daysRemaining <= 0 
                ? `Membership expired (expired ${Math.abs(daysRemaining)} days)` 
                : 'Unknown reason';

            if (subscriptionType === 'monthly') {
              expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
              expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            }
          }
          
          // Update user subscription
          const { error: updateError } = await supabaseGlobal
            .from('users')
            .update({
              subscription_type: subscriptionType,
              subscription_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (updateError) {
            // If error is field doesn't exist, log warning but don't throw error
            if (updateError.code === '42703') {

            } else {

            }
          } else {

          }
        }
      }
    }
  } catch (error) {

    // Don't throw error, because payment has already succeeded, subscription update failure shouldn't affect payment flow
  }
};

/**
 * Confirm payment (update order status and payment_provider_order_id)
 */
const confirmPayment = async (req, res) => {
  try {
    const { order_no, payment_provider_order_id, payment_status, payment_data } = req.body;

    if (!order_no || !payment_provider_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: order_no, payment_provider_order_id'
      });
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    const { cloudbaseApp } = require('../config/database');

    // First get user's region from token (priority)
    let userRegion = null;
    try {
      const token = extractTokenFromHeader(req);

      if (token) {
        const decoded = verifyToken(token);

        if (decoded && decoded.region) {
          userRegion = decoded.region;

        } else {

        }
      } else {

      }
    } catch (tokenError) {

    }
    
    // First try to query order, determine which database to use based on order's region
    let order = null;
    let dbRegion = null;
    
    // Priority to use user's region
    if (userRegion) {
      dbRegion = userRegion;

    } else {
      // If no token info, first try to find in CloudBase
      if (cloudbaseApp) {
        try {
          const db = cloudbaseApp.database();
          const orderResult = await db.collection('payment_orders')
            .where({ order_no: order_no })
            .get();
          if (orderResult.data && orderResult.data.length > 0) {
            order = orderResult.data[0];
            dbRegion = order.region || 'cn';

          }
        } catch (error) {

        }
      }
      
      // If not found in CloudBase, try to find in Supabase
      if (!order && supabaseGlobal) {
        try {
          const { data } = await supabaseGlobal
            .from('payment_orders')
            .select('*')
            .eq('order_no', order_no)
            .maybeSingle();
          if (data) {
            order = data;
            dbRegion = order.region || 'global';

          }
        } catch (error) {

        }
      }
      
      // If not found in both, judge based on IP
      if (!dbRegion) {
        const isChina = shouldUseCNSystem(clientIP);
        dbRegion = isChina ? 'cn' : 'global';

      }
    }

    if (dbRegion === 'cn') {
      // Priority to use CloudBase
      if (cloudbaseApp) {

        await cloudbaseService.updatePaymentOrder(order_no, {
          payment_provider_order_id: payment_provider_order_id,
          payment_status: payment_status || 'paid',
          callback_data: payment_data || null,
          paid_at: new Date()
        });

        // After update, re-query order to get complete information (including description)
        if (!order) {
          const db = cloudbaseApp.database();
          const orderResult = await db.collection('payment_orders')
            .where({ order_no: order_no })
            .get();
          if (orderResult.data && orderResult.data.length > 0) {
            order = orderResult.data[0];

          }
        }
      } else {
        return res.status(500).json({
          success: false,
          message: 'CloudBase not configured'
        });
      }
    } else {
      // Supabase
      if (!supabaseGlobal) {
        return res.status(500).json({
          success: false,
          message: 'Supabase database not configured'
        });
      }

      const { data, error } = await supabaseGlobal
        .from('payment_orders')
        .update({
          payment_provider_order_id: payment_provider_order_id,
          payment_status: payment_status || 'paid',
          callback_data: payment_data || null,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_no', order_no)
        .select()
        .single();

      if (error) {

        throw error;
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // After Supabase update, data is the updated order
      if (data) {
        order = {
          ...data,
          description: data.description || data.payment_provider_response?.description || ''
        };
      }
    }

    // After payment success, update user subscription information
    // If order wasn't queried before, query again now
    if (!order) {
      if (dbRegion === 'cn') {
        if (cloudbaseApp) {
          const db = cloudbaseApp.database();
          const orderResult = await db.collection('payment_orders')
            .where({ order_no: order_no })
            .get();
          if (orderResult.data && orderResult.data.length > 0) {
            order = orderResult.data[0];
          }
        }
      } else {
        if (supabaseGlobal) {
          const { data } = await supabaseGlobal
            .from('payment_orders')
            .select('*')
            .eq('order_no', order_no)
            .maybeSingle();
          if (data) {
            // Extract description from payment_provider_response (if exists)
            order = {
              ...data,
              description: data.description || data.payment_provider_response?.description || ''
            };
          }
        }
      }
    } else if (order && !order.description && order.payment_provider_response) {
      // If order exists but lacks description, try to extract from payment_provider_response
      if (typeof order.payment_provider_response === 'string') {
        try {
          const parsed = JSON.parse(order.payment_provider_response);
          order.description = parsed.description || order.description || '';
        } catch (e) {
          // Ignore parsing error
        }
      } else if (typeof order.payment_provider_response === 'object') {
        order.description = order.payment_provider_response.description || order.description || '';
      }
    }

    // NOTE: For WeChat and Alipay payments, subscription update is already handled in their callback handlers
    // (wechatPaymentController.js and alipayPaymentController.js)
    // So we should NOT update subscription again here to avoid double counting
    // Only update subscription for other payment methods (Stripe, PayPal, etc.)
    if (order && order.user_id && payment_status === 'paid') {
      const paymentMethod = order.payment_method || '';
      
      // Skip subscription update for WeChat and Alipay (already handled in callbacks)
      if (paymentMethod.toLowerCase() === 'wechat' || paymentMethod.toLowerCase() === 'alipay') {
        // Subscription already updated in callback handler, skip here
      } else {
        // For other payment methods (Stripe, PayPal, etc.), update subscription here
        const planDescription = order.description || 
                                order.payment_provider_response?.description || 
                                (typeof order.payment_provider_response === 'string' ? JSON.parse(order.payment_provider_response || '{}').description : '') ||
                                '';

        if (planDescription) {
          await updateUserSubscriptionAfterPayment(order.user_id.toString(), planDescription, dbRegion);
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message || error.toString()
    });
  }
};

/**
 * Query payment order status
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { order_no } = req.params;
    const { cloudbaseApp } = require('../config/database');
    
    let order = null;
    
    // Priority to use CloudBase to query domestic orders
    if (cloudbaseApp) {
      const db = cloudbaseApp.database();
      const result = await db.collection('payment_orders')
        .where({ order_no: order_no })
        .get();
      if (result.data && result.data.length > 0) {
        order = result.data[0];
      }
    }
    

    // If not found domestically, query international database (Supabase)
    if (!order && supabaseGlobal) {
      const { data, error } = await supabaseGlobal
        .from('payment_orders')
        .select('*')
        .eq('order_no', order_no)
        .single();
      
      if (!error && data) {
        order = data;
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

/**
 * Get payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const region = req.query.region || 'global';
    const { cloudbaseApp } = require('../config/database');

    let orders;
    if (region === 'cn') {
      // Priority to use CloudBase
      if (cloudbaseApp) {

        const db = cloudbaseApp.database();
        const result = await db.collection('payment_orders')
          .orderBy('created_at', 'desc')
          .limit(50)
          .get();
        orders = result.data || [];
      } else {
        return res.status(500).json({
          success: false,
          message: 'CloudBase not configured'
        });
      }
    } else {
      if (!supabaseGlobal) {
        return res.status(500).json({
          success: false,
          message: 'Supabase database not configured. Please configure SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.'
        });
      }
      const { data, error } = await supabaseGlobal
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      orders = data;
    }

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
};

/**
 * Simulate payment completion (for demo/testing)
 * In mock mode, automatically set order status to paid
 */
const mockPaymentComplete = async (req, res) => {
  try {
    const { order_no } = req.body;

    if (!order_no) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: order_no'
      });
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    const { cloudbaseApp } = require('../config/database');
    const isChina = shouldUseCNSystem(clientIP);
    const dbRegion = isChina ? 'cn' : 'global';

    // Mock payment provider order ID
    const mockPaymentProviderOrderId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update order status to paid
    if (dbRegion === 'cn') {
      // Priority to use CloudBase
      if (cloudbaseApp) {

        await cloudbaseService.updatePaymentOrder(order_no, {
          payment_provider_order_id: mockPaymentProviderOrderId,
          payment_status: 'paid',
          callback_data: { mock: true, completed_at: new Date().toISOString() },
          paid_at: new Date()
        });

      } else {
        return res.status(500).json({
          success: false,
          message: 'CloudBase not configured'
        });
      }
    } else {
      // Supabase
      if (!supabaseGlobal) {
        return res.status(500).json({
          success: false,
          message: 'Supabase database not configured'
        });
      }

      const { data, error } = await supabaseGlobal
        .from('payment_orders')
        .update({
          payment_provider_order_id: mockPaymentProviderOrderId,
          payment_status: 'paid',
          callback_data: { mock: true, completed_at: new Date().toISOString() },
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_no', order_no)
        .select()
        .single();

      if (error) {

        throw error;
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

    }

    // After payment success, update user subscription information
    // Need to query order first to get user_id and description
    let order = null;
    if (dbRegion === 'cn') {
      if (cloudbaseApp) {
        const db = cloudbaseApp.database();
        const orderResult = await db.collection('payment_orders')
          .where({ order_no: order_no })
          .get();
        if (orderResult.data && orderResult.data.length > 0) {
          order = orderResult.data[0];
        }
      }
    } else {
      if (supabaseGlobal) {
        const { data } = await supabaseGlobal
          .from('payment_orders')
          .select('*')
          .eq('order_no', order_no)
          .single();
        if (data) {
          // Extract description from payment_provider_response (if exists)
          order = {
            ...data,
            description: data.description || data.payment_provider_response?.description || ''
          };
        }
      }
    }

    if (order && order.user_id) {
      // Extract description from order, supports multiple formats
      const planDescription = order.description || 
                              order.payment_provider_response?.description || 
                              (typeof order.payment_provider_response === 'string' ? JSON.parse(order.payment_provider_response || '{}').description : '') ||
                              '';

      if (planDescription) {
        await updateUserSubscriptionAfterPayment(order.user_id.toString(), planDescription, dbRegion);
      } else {

      }
    } else {

    }

    res.json({
      success: true,
      message: 'Mock payment completed successfully',
      data: {
        order_no,
        payment_provider_order_id: mockPaymentProviderOrderId,
        payment_status: 'paid'
      }
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to complete mock payment',
      error: error.message || error.toString()
    });
  }
};

module.exports = {
  createPayment,
  confirmPayment,
  getPaymentStatus,
  getPaymentHistory,
  mockPaymentComplete
};

