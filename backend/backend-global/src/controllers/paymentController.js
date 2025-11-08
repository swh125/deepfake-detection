const { mysqlPool, supabaseGlobal, cloudbaseApp } = require('../config/database');
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

    // Determine which system to use
    // Priority to use user's registered database (from token), if not then judge based on IP
    const { mysqlPool, supabaseGlobal, cloudbaseApp } = require('../config/database');
    
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

    // Check if database client is available
    if (dbRegion === 'cn') {
      // Priority to check CloudBase, if no CloudBase then check MySQL
      if (!cloudbaseApp && !mysqlPool) {
        return res.status(500).json({
          success: false,
          message: 'China database not configured (CloudBase or MySQL). Please configure CLOUDBASE_* environment variables or TENCENT_MYSQL_* environment variables.'
        });
      }
    } else {
      if (!supabaseGlobal) {
        return res.status(500).json({
          success: false,
          message: 'Supabase database not configured, cannot process international region orders. Please configure SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.'
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
        } else if (mysqlPool) {
          // MySQL: Check if user with ID 1 exists
          const [existingUsers] = await mysqlPool.execute('SELECT id FROM users WHERE id = 1 LIMIT 1');
          if (existingUsers.length === 0) {
            // Create test user
            const [result] = await mysqlPool.execute(
              'INSERT INTO users (email, password_hash, region, ip_address) VALUES (?, ?, ?, ?)',
              ['test@example.com', 'test_hash', dbRegion, clientIP]
            );
            user_id = result.insertId;
          } else {
            user_id = 1;
          }
        } else {
          return res.status(500).json({
            success: false,
            message: 'China database not configured (CloudBase or MySQL)'
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
    // Prepare order data based on database region
    // For CloudBase: user_id can be string (CloudBase ObjectId)
    // For Supabase: user_id must be number (BIGINT)
    let orderData;
    
    if (dbRegion === 'cn') {
      // CloudBase: user_id can be string
      orderData = {
        order_no,
        user_id: user_id, // Keep as string for CloudBase
        amount: parseFloat(amount),
        currency: currency || 'CNY',
        payment_method,
        payment_status: 'pending',
        region: dbRegion,
        ip_address: clientIP,
        payment_provider_response: {},
        description: description || ''
      };
    } else {
      // Supabase: user_id must be number
      const userIdNum = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
      if (isNaN(userIdNum) || userIdNum === null || userIdNum === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user_id: must be a valid number for Supabase database'
        });
      }
      
      orderData = {
        order_no,
        user_id: userIdNum, // Ensure it's a number for Supabase BIGINT
        amount: parseFloat(amount),
        currency: currency || 'USD',
        payment_method,
        payment_status: 'pending',
        region: dbRegion,
        ip_address: clientIP,
        payment_provider_response: {},
        description: description || '' // Save order description for later subscription update
      };
    }
    
    let order;
    if (dbRegion === 'cn') {
      // Priority to use CloudBase
      if (cloudbaseApp) {

        order = await cloudbaseService.createPaymentOrder(orderData);
      } else if (mysqlPool) {
        // MySQL
        const [result] = await mysqlPool.execute(
          `INSERT INTO payment_orders 
          (order_no, user_id, amount, currency, payment_method, payment_status, region, ip_address, payment_provider_response, description) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderData.order_no,
            orderData.user_id,
            orderData.amount,
            orderData.currency,
            orderData.payment_method,
            orderData.payment_status,
            orderData.region,
            orderData.ip_address,
            JSON.stringify(orderData.payment_provider_response),
            orderData.description || ''
          ]
        );
        order = { id: result.insertId, ...orderData };
      } else {
        return res.status(500).json({
          success: false,
          message: 'China database not configured (CloudBase or MySQL)'
        });
      }
    } else {
      // Supabase (for global region)
      if (!supabaseGlobal) {
        throw new Error('Supabase database not configured. Please configure SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.');
      }
      
      // Supabase payment_orders table structure (from schema):
      // - order_no, user_id (BIGINT), amount, currency, payment_method, payment_status, region
      // - payment_provider_order_id, payment_provider_response (JSONB), callback_data (JSONB)
      // - ip_address, created_at, updated_at, paid_at
      // Note: description field doesn't exist in schema, store it in payment_provider_response
      const supabaseOrderData = {
        order_no: orderData.order_no,
        user_id: orderData.user_id, // Already converted to number
        amount: orderData.amount,
        currency: orderData.currency,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        region: orderData.region,
        ip_address: orderData.ip_address,
        // Store description in payment_provider_response since description field doesn't exist
        payment_provider_response: {
          ...(orderData.payment_provider_response || {}),
          description: orderData.description || ''
        }
      };

      const { data, error: insertError } = await supabaseGlobal
        .from('payment_orders')
        .insert(supabaseOrderData)
        .select()
        .single();

      if (insertError) {
        // Log detailed error for debugging
        console.error('Supabase insert error:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          orderData: supabaseOrderData
        });
        throw new Error(`Failed to create payment order in Supabase: ${insertError.message} (code: ${insertError.code})`);
      }
      
      if (!data) {
        console.error('Supabase insert returned no data:', {
          orderData: supabaseOrderData,
          insertError: insertError
        });
        throw new Error('Payment order creation failed: no data returned from Supabase');
      }
      
      console.log('Payment order created successfully in Supabase:', {
        order_no: data.order_no,
        user_id: data.user_id,
        amount: data.amount,
        currency: data.currency
      });
      
      // For consistency, add description back to order object (extract from payment_provider_response)
      order = {
        ...data,
        description: data.payment_provider_response?.description || orderData.description || ''
      };
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
        paymentResult = await require('../services/stripePaymentService').createPaymentIntent(order);
        // Stripe's mock mode is determined by client_secret
        isMockMode = !paymentResult.client_secret || paymentResult.client_secret.includes('dummy');
        break;
      case 'paypal':
        paymentResult = await require('../services/paypalPaymentService').createOrder(order);
        isMockMode = paymentResult.note !== undefined || !process.env.PAYPAL_CLIENT_ID;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method'
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
          } else if (mysqlPool) {
            // MySQL (backward compatibility)
            await mysqlPool.execute(
              `UPDATE payment_orders 
               SET payment_provider_order_id = ?,
                   payment_status = 'paid',
                   callback_data = ?,
                   paid_at = NOW(),
                   updated_at = NOW()
               WHERE order_no = ?`,
              [
                mockPaymentProviderOrderId,
                JSON.stringify({ mock: true, auto_completed: true, completed_at: new Date().toISOString() }),
                order.order_no
              ]
            );

            // Update user subscription information
            if (order.user_id) {
              const planDescription = order.description || '';
              await updateUserSubscriptionAfterPayment(order.user_id.toString(), planDescription, dbRegion);
            }
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
    const descLower = (planDescription || '').toLowerCase().trim();
    
    // Check for yearly first (more specific), then monthly
    // This ensures "Pro Yearly" is correctly identified as yearly, not monthly
    // Use exact matches first, then partial matches
    // Priority: exact matches > partial matches
    if (descLower.includes('pro yearly') || 
        descLower.includes('pro-yearly') ||
        descLower.includes('yearly') || 
        descLower.includes('annual') ||
        descLower === 'pro yearly' ||
        descLower.endsWith('yearly')) {
      subscriptionType = 'yearly';
    } else if (descLower.includes('pro monthly') || 
               descLower.includes('pro-monthly') ||
               descLower.includes('monthly') ||
               descLower === 'pro monthly' ||
               descLower.endsWith('monthly')) {
      subscriptionType = 'monthly';
    } else if (descLower.includes('year') && !descLower.includes('month')) {
      // Only check 'year' if not already matched and doesn't contain 'month'
      subscriptionType = 'yearly';
    } else if (descLower.includes('month') && !descLower.includes('year')) {
      // Only check 'month' if not already matched and doesn't contain 'year'
      subscriptionType = 'monthly';
    }
    
    // If still cannot determine from description, this is a critical issue
    // We should never reach here if description is correct
    if (!subscriptionType) {
      // This should not happen - description should always be present
      subscriptionType = 'yearly'; // Default to yearly as fallback
    }

    const now = new Date();
    let expiresAt;
    let updatedExpiresAt = null; // Store the calculated expiresAt for syncing
    
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
          updatedExpiresAt = expiresAt;
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
      const { supabaseGlobal } = require('../config/database');
      
      if (supabaseGlobal) {
        // Ensure userId type matches (Supabase id is bigint)
        const userIdNum = typeof userId === 'string' ? parseInt(userId) || userId : userId;
        
        // Query user current subscription information
        let { data: user, error: userError } = await supabaseGlobal
          .from('users')
          .select('id, subscription_type, subscription_expires_at')
          .eq('id', userIdNum)
          .single();
        
        // If user not found, try other types
        if (!user) {
          // If userIdNum is number, try querying with string
          if (typeof userIdNum === 'number') {

            const result = await supabaseGlobal
              .from('users')
              .select('id, subscription_type, subscription_expires_at')
              .eq('id', userIdNum.toString())
              .single();
            if (result.data) {
              user = result.data;
              userError = result.error;
            }
          }
          
          // If still not found, try using original userId (may be string)
          if (!user && userIdNum !== userId) {

            const result = await supabaseGlobal
              .from('users')
              .select('id, subscription_type, subscription_expires_at')
              .eq('id', userId)
              .single();
            if (result.data) {
              user = result.data;
              userError = result.error;
            }
          }
        }
        
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
          
          // Update user subscription (use correct userId type)
          const updateUserId = user ? user.id : userIdNum;
          
          // Calculate days for logging
          const oldDays = currentExpiresAt ? Math.ceil((currentExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;
          const newDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          // Force update subscription - retry if needed
          let { error: updateError } = await supabaseGlobal
            .from('users')
            .update({
              subscription_type: subscriptionType,
              subscription_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', updateUserId);
          
          // If update fails, retry once after a short delay
          if (updateError && updateError.code !== '42703') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const retryResult = await supabaseGlobal
              .from('users')
              .update({
                subscription_type: subscriptionType,
                subscription_expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', updateUserId);
            updateError = retryResult.error;
          }
          
          if (!updateError) {
            updatedExpiresAt = expiresAt;
            
            
            // Update succeeded, verify it after a delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            const { data: verifyUser } = await supabaseGlobal
              .from('users')
              .select('subscription_type, subscription_expires_at')
              .eq('id', updateUserId)
              .single();
            
            if (verifyUser && verifyUser.subscription_expires_at) {
              const verifyExpiresAt = new Date(verifyUser.subscription_expires_at);
              const verifyDays = Math.ceil((verifyExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
              // Subscription updated successfully
            }
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
    const { mysqlPool, supabaseGlobal, cloudbaseApp } = require('../config/database');

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
    
    // First try to query order, determine which database the order is stored in
    let order = null;
    let orderDbRegion = null; // Database where the order is stored
    
    // First try to find order in CloudBase
    if (cloudbaseApp) {
      try {
        const db = cloudbaseApp.database();
        const orderResult = await db.collection('payment_orders')
          .where({ order_no: order_no })
          .get();
        if (orderResult.data && orderResult.data.length > 0) {
          order = orderResult.data[0];
          orderDbRegion = 'cn'; // Order is in CloudBase
        }
      } catch (error) {
        // Ignore error, continue to try Supabase
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
          orderDbRegion = 'global'; // Order is in Supabase
        }
      } catch (error) {
        // Ignore error
      }
    }
    
    // If order not found, return error
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Determine which database to use for updating subscription
    // Use order's database region (where the order is stored)
    // No cross-database sync: subscription updates to the same database as the order
    const dbRegion = orderDbRegion || (order.region || 'global');
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[confirmPayment] Subscription update region:', {
        orderDbRegion,
        orderRegion: order.region,
        finalDbRegion: dbRegion,
        userId: order.user_id
      });
    }

    // Update order status in the database where the order is stored
    if (orderDbRegion === 'cn') {
      // Order is in CloudBase, update it there
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
      } else if (mysqlPool) {
        // MySQL
        const [result] = await mysqlPool.execute(
          `UPDATE payment_orders 
           SET payment_provider_order_id = ?,
               payment_status = ?,
               callback_data = ?,
               paid_at = NOW(),
               updated_at = NOW()
           WHERE order_no = ?`,
          [
            payment_provider_order_id,
            payment_status || 'paid',
            payment_data ? JSON.stringify(payment_data) : null,
            order_no
          ]
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

      } else {
        return res.status(500).json({
          success: false,
          message: 'China database not configured (CloudBase or MySQL)'
        });
      }
    } else if (orderDbRegion === 'global') {
      // Order is in Supabase, update it there
      if (!supabaseGlobal) {
        return res.status(500).json({
          success: false,
          message: 'Supabase database not configured'
        });
      }

      // Order already queried above, no need to query again

      const updateData = {
        payment_provider_order_id: payment_provider_order_id,
        payment_status: payment_status || 'paid',
        callback_data: payment_data || null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Update order status - ensure it succeeds
      const { data: updateResult, error: updateError } = await supabaseGlobal
        .from('payment_orders')
        .update(updateData)
        .eq('order_no', order_no)
        .select()
        .single();

      if (updateError) {
        // If update fails, try again after a short delay
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryResult = await supabaseGlobal
          .from('payment_orders')
          .update(updateData)
          .eq('order_no', order_no)
          .select()
          .single();
        
        if (retryResult.error) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update payment order',
            error: retryResult.error.message
          });
        }
        
        // Use retry result
        order = retryResult.data;
      } else {
        order = updateResult;
      }

      // Verify update succeeded
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found after update'
        });
      }

      // Double-check payment_status was updated
      const { data: verifyData, error: verifyError } = await supabaseGlobal
        .from('payment_orders')
        .select('payment_status, payment_provider_order_id, paid_at')
        .eq('order_no', order_no)
        .single();
      
      if (verifyError || !verifyData) {
        // Log but don't fail - order might still be updated
      } else if (verifyData.payment_status !== 'paid') {
        // If status is not paid, try one more time
        await new Promise(resolve => setTimeout(resolve, 500));
        await supabaseGlobal
          .from('payment_orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('order_no', order_no);
      }

      // After Supabase update, order is the updated order
      if (order) {
        // Extract description from payment_provider_response (JSONB field)
        let extractedDescription = '';
        if (order.payment_provider_response) {
          if (typeof order.payment_provider_response === 'object') {
            extractedDescription = order.payment_provider_response.description || '';
          } else if (typeof order.payment_provider_response === 'string') {
            try {
              const parsed = JSON.parse(order.payment_provider_response);
              extractedDescription = parsed.description || '';
            } catch (e) {
              // Ignore parsing error
            }
          }
        }
        
        order = {
          ...order,
          description: order.description || extractedDescription || ''
        };
      }
    }

    // After payment success, update user subscription information
    // If order wasn't queried before, query again now to ensure we have the latest data
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
        } else if (mysqlPool) {
          const [orders] = await mysqlPool.execute(
            'SELECT * FROM payment_orders WHERE order_no = ?',
            [order_no]
          );
          if (orders.length > 0) {
            order = orders[0];
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
            // Extract description from payment_provider_response (JSONB field)
            let extractedDescription = '';
            if (data.payment_provider_response) {
              if (typeof data.payment_provider_response === 'object') {
                extractedDescription = data.payment_provider_response.description || '';
              } else if (typeof data.payment_provider_response === 'string') {
                try {
                  const parsed = JSON.parse(data.payment_provider_response);
                  extractedDescription = parsed.description || '';
                } catch (e) {
                  // Ignore parsing error
                }
              }
            }
            
            order = {
              ...data,
              description: data.description || extractedDescription || ''
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

    if (order && order.user_id && payment_status === 'paid') {
      // Extract description from order, supports multiple formats
      let planDescription = order.description || 
                            order.payment_provider_response?.description || 
                            (typeof order.payment_provider_response === 'string' ? JSON.parse(order.payment_provider_response || '{}').description : '') ||
                            '';

      // If still no description, try to extract from payment_data in request body
      if (!planDescription && req.body.payment_data) {
        if (typeof req.body.payment_data === 'object' && req.body.payment_data.description) {
          planDescription = req.body.payment_data.description;
        } else if (typeof req.body.payment_data === 'string') {
          try {
            const parsed = JSON.parse(req.body.payment_data);
            planDescription = parsed.description || '';
          } catch (e) {
            // Ignore parsing error
          }
        }
      }

      // If still no description, try to query the original order creation to get description
      if (!planDescription && order_no) {
        try {
          if (dbRegion === 'global' && supabaseGlobal) {
            const { data: originalOrder } = await supabaseGlobal
              .from('payment_orders')
              .select('payment_provider_response')
              .eq('order_no', order_no)
              .maybeSingle();
            
            if (originalOrder && originalOrder.payment_provider_response) {
              if (typeof originalOrder.payment_provider_response === 'object') {
                planDescription = originalOrder.payment_provider_response.description || '';
              } else if (typeof originalOrder.payment_provider_response === 'string') {
                try {
                  const parsed = JSON.parse(originalOrder.payment_provider_response);
                  planDescription = parsed.description || '';
                } catch (e) {
                  // Ignore parsing error
                }
              }
            }
          }
        } catch (queryError) {
          // Ignore query error
        }
      }

      // Always try to update subscription if payment is paid and user_id exists
      // If no description found, try to get it from order creation or use default
      if (!planDescription && order_no) {
        // Last resort: query order with all fields to get description
        try {
          if (dbRegion === 'global' && supabaseGlobal) {
            const { data: fullOrder } = await supabaseGlobal
              .from('payment_orders')
              .select('*')
              .eq('order_no', order_no)
              .maybeSingle();
            
            if (fullOrder) {
              // Try all possible ways to get description
              planDescription = fullOrder.description || 
                                (fullOrder.payment_provider_response?.description) ||
                                (typeof fullOrder.payment_provider_response === 'string' ? 
                                  (() => {
                                    try {
                                      const parsed = JSON.parse(fullOrder.payment_provider_response);
                                      return parsed.description || '';
                                    } catch { return ''; }
                                  })() : '') ||
                                '';
            }
          }
        } catch (e) {
          // Ignore error
        }
      }

      // If still no description, infer from amount (fallback)
      if (!planDescription && order) {
        // Default to yearly if amount is high, monthly if low
        // This is a fallback - should not happen normally
        // For USD: yearly is usually $149.99, monthly is $14.99
        // For CNY: yearly is usually 999, monthly is 99
        if (order.currency === 'USD') {
          planDescription = order.amount >= 100 ? 'Pro Plan - Pro Yearly' : 'Pro Plan - Pro Monthly';
        } else {
          planDescription = order.amount >= 500 ? 'Pro Plan - Pro Yearly' : 'Pro Plan - Pro Monthly';
        }
      }

      // Always try to update subscription if payment is paid and user_id exists
      // Even if planDescription is empty, we can infer from order amount
      if (order && order.user_id && payment_status === 'paid') {
        // If no description, infer from order amount (critical for correct subscription type)
        if (!planDescription && order.amount) {
          if (order.currency === 'USD') {
            planDescription = order.amount >= 100 ? 'Pro Plan - Pro Yearly' : 'Pro Plan - Pro Monthly';
          } else {
            planDescription = order.amount >= 500 ? 'Pro Plan - Pro Yearly' : 'Pro Plan - Pro Monthly';
          }
        }
        
        if (planDescription) {
          // Wait a bit before updating subscription to ensure order is fully saved
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Update subscription in the same database as the order
          // No cross-database sync: subscription updates to order's database
          // Log for debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('[confirmPayment] Updating subscription:', {
              userId: order.user_id.toString(),
              planDescription,
              dbRegion,
              orderDbRegion
            });
          }
          
          // Update subscription in order's database
          try {
            await updateUserSubscriptionAfterPayment(
              order.user_id.toString(), 
              planDescription, 
              dbRegion
            );
            
            // Wait additional time for database to sync
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify update succeeded
            if (process.env.NODE_ENV === 'development') {
              console.log('[confirmPayment] Subscription update completed for region:', dbRegion);
            }
          } catch (updateSubError) {
            // Log error but don't fail the payment confirmation
            if (process.env.NODE_ENV === 'development') {
              console.error('[confirmPayment] Subscription update error:', updateSubError);
            }
          }
        }
      }
    } else {
      // If order not found or no user_id, log warning
    }

    // Final verification: ensure order status is updated in Supabase
    if (dbRegion === 'global' && supabaseGlobal && order_no) {
      const { data: finalCheck } = await supabaseGlobal
        .from('payment_orders')
        .select('payment_status, payment_provider_order_id')
        .eq('order_no', order_no)
        .single();
      
      if (finalCheck && finalCheck.payment_status !== 'paid') {
        // One more attempt to update
        await supabaseGlobal
          .from('payment_orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('order_no', order_no);
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        order_no: order_no,
        payment_status: payment_status || 'paid',
        payment_provider_order_id: payment_provider_order_id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message || error.toString(),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Query payment order status
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { order_no } = req.params;
    const { mysqlPool, supabaseGlobal, cloudbaseApp } = require('../config/database');
    
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
    
    // If no CloudBase, try MySQL (backward compatibility)
    if (!order && mysqlPool) {
      const [rows] = await mysqlPool.execute(
        'SELECT * FROM payment_orders WHERE order_no = ?',
        [order_no]
      );
      order = rows[0];
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
    const { mysqlPool, supabaseGlobal, cloudbaseApp } = require('../config/database');

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
      } else if (mysqlPool) {
        // MySQL (backward compatibility)
        const [rows] = await mysqlPool.execute(
          'SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT 50'
        );
        orders = rows;
      } else {
        return res.status(500).json({
          success: false,
          message: 'China database not configured (CloudBase or MySQL). Please configure CLOUDBASE_* environment variables.'
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
    const { mysqlPool, supabaseGlobal, cloudbaseApp } = require('../config/database');
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

      } else if (mysqlPool) {
        // MySQL (backward compatibility)
        const [result] = await mysqlPool.execute(
          `UPDATE payment_orders 
           SET payment_provider_order_id = ?,
               payment_status = 'paid',
               callback_data = ?,
               paid_at = NOW(),
               updated_at = NOW()
           WHERE order_no = ?`,
          [
            mockPaymentProviderOrderId,
            JSON.stringify({ mock: true, completed_at: new Date().toISOString() }),
            order_no
          ]
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

      } else {
        return res.status(500).json({
          success: false,
          message: 'China database not configured (CloudBase or MySQL)'
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
      } else if (mysqlPool) {
        const [orders] = await mysqlPool.execute(
          'SELECT * FROM payment_orders WHERE order_no = ?',
          [order_no]
        );
        if (orders.length > 0) {
          order = orders[0];
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

