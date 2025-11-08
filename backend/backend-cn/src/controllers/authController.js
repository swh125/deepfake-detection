const bcrypt = require('bcryptjs');
const { getDatabaseClient, getCloudbaseDB } = require('../config/database');
const { generateToken, extractTokenFromHeader } = require('../utils/jwt');
let cloudbaseService;
try {
  cloudbaseService = require('../services/cloudbaseService');
  if (!cloudbaseService) {
    throw new Error('cloudbaseService module is undefined');
  }
} catch (error) {

  // Create an empty object to avoid errors in subsequent calls
  cloudbaseService = {
    findUserByEmail: async () => { throw new Error('cloudbaseService not loaded'); },
    createUser: async () => { throw new Error('cloudbaseService not loaded'); },
    saveUserSession: async () => { throw new Error('cloudbaseService not loaded'); },
    findUserByWechatOpenId: async () => { throw new Error('cloudbaseService not loaded'); },
    ensureCollectionExists: async () => { throw new Error('cloudbaseService not loaded'); },
  };
}
const { getClientIP } = require('../utils/ipDetector');

/**
 * Email registration
 */
const emailRegister = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const clientIP = getClientIP(req);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // backend-cn always uses CloudBase (China system)
    // But need to check IP to ensure user is actually in China
    let region = 'cn'; // backend-cn fixed to use cn
    const { detectIPLocation } = require('../utils/ipDetector');
    
    // Priority to use IP passed from frontend (if exists)
    let ipToCheck = clientIP;
    const frontendIP = req.query.ip || req.body.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    if ((clientIP === 'needs-api-detection' || clientIP === '127.0.0.1' || clientIP === '::1') && frontendIP) {
      if (frontendIP !== '127.0.0.1' && frontendIP !== '::1' && frontendIP !== 'needs-api-detection') {
        ipToCheck = frontendIP;

      }
    }
    
    const ipInfo = detectIPLocation(ipToCheck);

    // backend-cn only accepts China IP addresses
    // If foreign IP detected (not localhost), reject registration
    if (!ipInfo.isChina && ipToCheck !== '127.0.0.1' && ipToCheck !== '::1' && ipToCheck !== 'needs-api-detection') {
      return res.status(403).json({
        success: false,
        error: 'This API is only for China region users. Please use the global API (backend-global) to register.'
      });
    }

    // If frontend explicitly specified region, log it (but backend-cn always uses cn)
    if (req.body.region && req.body.region !== region) {

    }

    // backend-cn only uses CloudBase, check if email already exists

    const existingUserInCloudBase = await cloudbaseService.findUserByEmail(email);
    if (existingUserInCloudBase) {

      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Check if already registered in Supabase (global database)
    const { supabaseGlobal } = require('../config/database');
    if (supabaseGlobal) {
      try {
        const { data: existingUserInSupabase, error: supabaseCheckError } = await supabaseGlobal
          .from('users')
          .select('id, email, region')
          .eq('email', email)
          .maybeSingle();
        
        if (existingUserInSupabase && !supabaseCheckError) {

          return res.status(400).json({
            success: false,
            error: 'Email already registered'
          });
        }
      } catch (checkError) {

      }
    }

    // backend-cn always uses CloudBase
    {
      // Use CloudBase

      // Hash password

      const passwordHash = await bcrypt.hash(password, 10);

      // Create user

      const user = await cloudbaseService.createUser({
        email,
        password_hash: passwordHash,
        name: name.trim(),
        region: 'cn',
        ip_address: clientIP
      });

      // Generate token
      const token = generateToken({
        userId: user.id || user._id,
        email: user.email,
        region: 'cn'
      });

      // Save session

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
      
      try {
        await cloudbaseService.saveUserSession({
          user_id: user.id || user._id,
          token,
          region: 'cn',
          ip_address: clientIP,
          expires_at: expiresAt
        });

      } catch (sessionError) {
        // Session save failure shouldn't prevent registration, but need to log

        // Don't throw error, allow registration to continue
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id || user._id,
            email: user.email,
            name: user.name,
            subscription_type: user.subscription_type || null,
            subscription_expires_at: user.subscription_expires_at || null,
            region: 'cn'
          },
          token
        }
      });
    }
  } catch (error) {

    // Return more detailed error information (development environment)
    const errorResponse = {
      success: false,
      error: error.message || 'Registration failed'
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    return res.status(500).json(errorResponse);
  }
};

/**
 * Email login
 */
const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = getClientIP(req);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // backend-cn only uses CloudBase (China system)
    // Check IP: if user is not in China, reject login (must use backend-global)
    const { detectIPLocation } = require('../utils/ipDetector');
    
    // Priority to use IP passed from frontend (if exists)
    let ipToCheck = clientIP;
    const frontendIP = req.query.ip || req.body.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    if ((clientIP === 'needs-api-detection' || clientIP === '127.0.0.1' || clientIP === '::1') && frontendIP) {
      if (frontendIP !== '127.0.0.1' && frontendIP !== '::1' && frontendIP !== 'needs-api-detection') {
        ipToCheck = frontendIP;
      }
    }
    
    const ipInfo = detectIPLocation(ipToCheck);
    
    // If foreign IP detected (not localhost), reject login
    if (!ipInfo.isChina && ipToCheck !== '127.0.0.1' && ipToCheck !== '::1' && ipToCheck !== 'needs-api-detection') {
      return res.status(403).json({
        success: false,
        error: 'This API is only for China region users. Please use the global API (backend-global) to login.'
      });
    }

    // Find user in CloudBase (backend-cn only uses CloudBase)
    const user = await cloudbaseService.findUserByEmail(email);
    
    if (!user) {
      // User not found in CloudBase
      // backend-cn only supports China region users
      // If user registered in global region, they need to register again in China region
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id || user._id,
      email: user.email,
      region: 'cn'
    });

    // Save session

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    try {
      await cloudbaseService.saveUserSession({
        user_id: user.id || user._id,
        token,
        region: 'cn',
        ip_address: clientIP,
        expires_at: expiresAt
      });

    } catch (sessionError) {
      // Session save failure shouldn't prevent login, but need to log

      // Don't throw error, allow login to continue
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id || user._id,
          email: user.email,
          name: user.name,
          wechat_openid: user.wechat_openid,
          subscription_type: user.subscription_type || null,
          subscription_expires_at: user.subscription_expires_at || null,
          region: 'cn'
        },
        token
      }
    });
  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
};

/**
 * Get current user information
 */
const getCurrentUser = async (req, res) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const { verifyToken } = require('../utils/jwt');
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // backend-cn 只支持 cn 区域的用户
    if (decoded.region !== 'cn') {

      return res.status(403).json({
        success: false,
        error: 'This API is only for China region users. Please use the global API.'
      });
    }

    // 使用 CloudBase 查询用户
    const db = getCloudbaseDB();
    
    // Ensure users collection exists
    const cloudbaseService = require('../services/cloudbaseService');
    await cloudbaseService.ensureCollectionExists('users', {
      email: 'temp@example.com',
      password_hash: 'temp',
      name: '临时',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });

    const result = await db.collection('users')
      .doc(decoded.userId)
      .get();

    // Handle CloudBase returned data structure (may be array)
    let userData = null;
    if (result && result.data) {
      if (Array.isArray(result.data)) {
        userData = result.data[0];

      } else if (typeof result.data === 'object') {
        userData = result.data;
      }
    }

    if (!userData) {

      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 设置缓存控制头，防止浏览器缓存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const responseData = {
      id: userData._id || userData.id,
      email: userData.email,
      name: userData.name,
      wechat_openid: userData.wechat_openid,
      subscription_type: userData.subscription_type || null,
      subscription_expires_at: userData.subscription_expires_at || null,
      region: 'cn'
    };

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * 微信登录 - 获取二维码
 * 如果配置了WECHAT_APP_ID和WECHAT_APP_SECRET，使用真实的微信OAuth流程
 * 否则使用模拟模式
 */
const getWechatQRCode = async (req, res) => {
  try {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const redirectUri = `${backendUrl}/api/v1/auth/wechat/callback`;
    
    // 检查是否配置了微信OAuth
    const isRealOAuth = appId && appSecret && appId !== 'your_wechat_app_id' && appSecret !== 'your_wechat_app_secret';
    
    if (isRealOAuth) {
      // 真实的微信OAuth流程
      // 生成state参数（用于防止CSRF攻击）
      const state = `wechat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // 构建微信授权URL
      // 微信开放平台网站应用授权URL
      const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
      
      // 生成二维码（使用第三方服务生成包含授权URL的二维码）
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(authUrl)}`;

      return res.json({
        success: true,
        data: {
          qr_code_url: qrCodeUrl,
          auth_url: authUrl, // 前端可以直接跳转
          ticket: state, // 使用state作为ticket
          expires_in: 300, // 5分钟
          is_mock: false
        }
      });
    } else {
      // 模拟模式

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=mock_wechat_login_${Date.now()}`;
      
      return res.json({
        success: true,
        data: {
          qr_code_url: qrCodeUrl,
          ticket: `mock_ticket_${Date.now()}`,
          expires_in: 300, // 5分钟
          is_mock: true
        }
      });
    }
  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
};

/**
 * Google登录 - backend-cn 不支持 Google 登录（只支持微信登录）
 */
const googleLogin = async (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Google login is not available in China region. Please use WeChat login or email registration.'
  });
};

/**

    // 如果前端传入了固定的mock_google_demo_user_001，优先使用它
    // 这样可以确保每次登录都是同一个用户，会员信息能正确保存
    if (google_id === 'mock_google_demo_user_001') {
      finalGoogleId = 'mock_google_demo_user_001';

    }

    if (!finalGoogleId) {
      return res.status(400).json({
        success: false,
        error: 'Google ID or code is required'
      });
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (supabaseError) {

      return res.status(500).json({
        success: false,
        error: 'Supabase database is not configured. Please configure SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.'
      });
    }
    
    // 如果没有email，生成一个临时邮箱
    // 如果是演示用户，使用固定的邮箱和用户名
    const userEmail = email || (finalGoogleId === 'mock_google_demo_user_001' ? 'google@demo.com' : `google_${finalGoogleId}@google.oauth`);
    const userName = name || (finalGoogleId === 'mock_google_demo_user_001' ? 'Demo User' : 'Google User');

    // 步骤1：先通过 google_id 查找用户
    // 先尝试查询包含 subscription 字段，如果字段不存在则只查询基本字段
    let { data: existingUserByGoogleId, error: findErrorByGoogleId } = await supabase
      .from('users')
      .select('id, email, name, google_id, subscription_type, subscription_expires_at')
      .eq('google_id', finalGoogleId)
      .single();

    // 如果遇到字段不存在的错误，只查询基本字段
    if (findErrorByGoogleId && findErrorByGoogleId.code === '42703') {

      const result = await supabase
        .from('users')
        .select('id, email, name, google_id')
        .eq('google_id', finalGoogleId)
        .single();
      existingUserByGoogleId = result.data;
      findErrorByGoogleId = result.error;
      // 如果找到用户，手动添加 subscription 字段
      if (existingUserByGoogleId) {
        existingUserByGoogleId.subscription_type = null;
        existingUserByGoogleId.subscription_expires_at = null;
      }
    }

    let user = existingUserByGoogleId;
    
    if (!user || findErrorByGoogleId) {
      // 步骤2：如果通过 google_id 没找到，尝试通过 email 查找

      let { data: existingUserByEmail, error: findErrorByEmail } = await supabase
        .from('users')
        .select('id, email, name, google_id, subscription_type, subscription_expires_at')
        .eq('email', userEmail)
        .maybeSingle(); // 使用 maybeSingle() 而不是 single()，这样找不到用户时不会报错

      // 如果遇到字段不存在的错误，只查询基本字段
      if (findErrorByEmail && findErrorByEmail.code === '42703') {

        const result = await supabase
          .from('users')
          .select('id, email, name, google_id')
          .eq('email', userEmail)
          .maybeSingle();
        existingUserByEmail = result.data;
        findErrorByEmail = result.error;
        // 如果找到用户，手动添加 subscription 字段
        if (existingUserByEmail) {
          existingUserByEmail.subscription_type = null;
          existingUserByEmail.subscription_expires_at = null;
        }
      }

      if (existingUserByEmail && !findErrorByEmail) {
        // 找到了通过email注册的用户，直接使用这个账号登录（不更新google_id）

        user = existingUserByEmail;
      } else {
        // 用户不存在（maybeSingle() 找不到用户时返回 { data: null, error: null }），Create new user

        // 尝试Create user
        let userData = {
          email: userEmail,
          google_id: finalGoogleId,
          region: 'global',
          ip_address: clientIP
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(userData)
          .select()
          .single();

        if (createError) {
          // 如果错误是email重复，尝试通过email查找并使用现有账号
          if (createError.code === '23505' || (createError.message && createError.message.includes('duplicate key') && createError.message.includes('email'))) {

            let { data: existingUserByEmail2, error: findErrorByEmail2 } = await supabase
              .from('users')
              .select('id, email, name, google_id, subscription_type, subscription_expires_at')
              .eq('email', userEmail)
              .maybeSingle(); // 使用 maybeSingle() 而不是 single()

            // 如果遇到字段不存在的错误，只查询基本字段
            if (findErrorByEmail2 && findErrorByEmail2.code === '42703') {

              const result = await supabase
                .from('users')
                .select('id, email, name, google_id')
                .eq('email', userEmail)
                .maybeSingle();
              existingUserByEmail2 = result.data;
              findErrorByEmail2 = result.error;
              // 如果找到用户，手动添加 subscription 字段
              if (existingUserByEmail2) {
                existingUserByEmail2.subscription_type = null;
                existingUserByEmail2.subscription_expires_at = null;
              }
            }

            if (existingUserByEmail2 && !findErrorByEmail2) {
              // 找到了用户，直接使用这个账号登录
              user = existingUserByEmail2;

            } else {

              throw createError;
            }
          } else if (createError.message && createError.message.includes("'name' column")) {

            throw new Error('Supabase users table is missing the "name" column. Please add it using: ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);');
          } else {

            });
            throw createError;
          }
        } else {
          // 验证创建的用户数据
          if (!newUser || !newUser.id) {

            throw new Error('User creation succeeded but no user ID was returned from Supabase');
          }

          // 如果Success创建，尝试更新name字段（如果表中有这个字段）
          if (newUser && userName) {
            try {
              const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({ name: userName })
                .eq('id', newUser.id)
                .select()
                .single();
              
              if (!updateError && updatedUser) {
                user = updatedUser;

              } else {
                // 如果更新失败（可能是name字段不存在），使用创建的用户
                user = { ...newUser, name: null };

              }
            } catch (updateError) {
              // 更新失败，使用创建的用户（没有name）
              user = { ...newUser, name: null };

            }
          } else {
            user = newUser;

          }
        }
      }
    } else {

    }
    
    // 确保user对象存在
    if (!user) {
      throw new Error('Failed to create or find user');
    }

    // 如果 subscription 字段为 null，从 payment_orders 计算会员状态
    if (!user.subscription_type || !user.subscription_expires_at) {

      try {

        // 查询所有已支付的订单，用于累加计算会员状态
        // 先尝试查询所有可能需要的字段
        let { data: allPaidOrders, error: ordersError } = await supabase
            .from('payment_orders')
            .select('payment_provider_response, paid_at, payment_status, created_at, updated_at, description')
          .eq('user_id', user.id)
          .eq('payment_status', 'paid')
          .order('paid_at', { ascending: true }); // 按时间升序排列，从最早到最晚
        
        // 如果 paid_at 字段不存在，尝试使用 created_at 排序
        if (ordersError && ordersError.code === '42703') {

          const result = await supabase
            .from('payment_orders')
            .select('payment_provider_response, payment_status, created_at, updated_at, description')
            .eq('user_id', user.id)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: true }); // 按时间升序排列
          allPaidOrders = result.data;
          ordersError = result.error;
        }
        
        // 如果 description 字段不存在，只查询 payment_provider_response
        if (ordersError && ordersError.code === '42703' && ordersError.message?.includes('description')) {

          const result = await supabase
            .from('payment_orders')
            .select('payment_provider_response, payment_status, created_at, updated_at, paid_at')
            .eq('user_id', user.id)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: true }); // 按时间升序排列
          allPaidOrders = result.data;
          ordersError = result.error;
        }
        
        // 如果还是失败，尝试不排序，直接查询所有
        if (ordersError && ordersError.code === '42703') {

          const result = await supabase
            .from('payment_orders')
            .select('payment_provider_response, payment_status, created_at, updated_at')
            .eq('user_id', user.id)
            .eq('payment_status', 'paid');
          allPaidOrders = result.data;
          ordersError = result.error;
          // 手动按 created_at 排序
          if (allPaidOrders && allPaidOrders.length > 0) {
            allPaidOrders.sort((a, b) => {
              const timeA = new Date(a.created_at || 0).getTime();
              const timeB = new Date(b.created_at || 0).getTime();
              return timeA - timeB;
            });
          }
        }

        if (!ordersError && allPaidOrders && allPaidOrders.length > 0) {

          const now = new Date();
          let currentExpiresAt = null;
          let finalSubscriptionType = null;
          
          // 按时间顺序处理每个订单，累加天数
          for (const order of allPaidOrders) {
            // 从 order.description 或 payment_provider_response.description 中提取描述
            let planDescription = order.description;
            if (!planDescription && order.payment_provider_response) {
              if (typeof order.payment_provider_response === 'string') {
                try {
                  const parsed = JSON.parse(order.payment_provider_response);
                  planDescription = parsed.description;
                } catch (e) {

                }
              } else if (typeof order.payment_provider_response === 'object') {
                planDescription = order.payment_provider_response.description;
              }
            }
            
            if (!planDescription) {

              continue;
            }
            
            const descLower = planDescription.toLowerCase();
            let subscriptionType = null;
            
            if (descLower.includes('monthly') || descLower.includes('pro monthly')) {
              subscriptionType = 'monthly';
            } else if (descLower.includes('yearly') || descLower.includes('pro yearly')) {
              subscriptionType = 'yearly';
            }
            
            if (!subscriptionType) {

              continue;
            }
            
            // 使用 paid_at，如果不存在则使用 updated_at 或 created_at
            const paidAtStr = order.paid_at || order.updated_at || order.created_at;
            if (!paidAtStr) {

              continue;
            }
            
            const paidAt = new Date(paidAtStr);
            let daysToAdd = 0;
            
            if (subscriptionType === 'monthly') {
              daysToAdd = 30;
            } else {
              daysToAdd = 365;
            }
            
            // 判断是否累加或重新开始
            // Rules:如果当前到期时间存在且 > 订单支付时间（会员未过期），累加天数
            //      如果当前到期时间不存在或 <= 订单支付时间（会员已过期），从订单支付时间开始计算
            const hadActiveSubscription = currentExpiresAt && currentExpiresAt > paidAt;
            
            if (hadActiveSubscription) {
              // 会员未过期，累加天数
              currentExpiresAt = new Date(currentExpiresAt.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

            } else {
              // 会员已过期或没有会员，从订单支付时间开始计算
              const reason = !currentExpiresAt ? '首次购买' : '会员已过期';
              currentExpiresAt = new Date(paidAt.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

            }
            
            finalSubscriptionType = subscriptionType; // 使用最后一个订单的类型
          }
          
          // 检查最终结果是否过期
          if (currentExpiresAt && currentExpiresAt > now) {
            user.subscription_type = finalSubscriptionType;
            user.subscription_expires_at = currentExpiresAt.toISOString();
            const daysRemaining = Math.ceil((currentExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          } else {
            user.subscription_type = null;
            user.subscription_expires_at = null;

          }
        } else {

        }
      } catch (calcError) {

        // 保持原有的 null 值，不覆盖
      }
    }

    // Generate token
    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      region: 'global',
      google_id: finalGoogleId
    });

    // Save session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    try {
      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          token,
          region: 'global',
          ip_address: clientIP,
          expires_at: expiresAt.toISOString()
        });

    } catch (sessionError) {

    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          google_id: finalGoogleId,
          subscription_type: user.subscription_type || null,
          subscription_expires_at: user.subscription_expires_at || null,
          region: 'global'
        },
        token
      }
    });
  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message || 'Google login failed'
    });
  }
};

/**
 * 微信登录 - 回调处理
 * 支持两种方式：
 * 1. 真实的OAuth回调（从微信服务器接收code，GET请求）
 * 2. 模拟模式（前端直接传递openid，POST请求）
 */
const wechatCallback = async (req, res) => {
  try {
    // GET请求：微信OAuth回调（从query参数获取）
    // POST请求：前端直接调用（从body获取）
    const code = req.query.code || req.body.code;
    const openid = req.body.openid;
    const state = req.query.state || req.body.state;
    const isGetRequest = req.method === 'GET';

    const region = 'cn';
    const clientIP = getClientIP(req);
    
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    const isRealOAuth = appId && appSecret && appId !== 'your_wechat_app_id' && appSecret !== 'your_wechat_app_secret';
    
    let wechatOpenId = null;
    
    // 如果是真实的OAuth流程，用code换取openid
    if (isRealOAuth && code) {
      try {

        // 调用微信API用code换取access_token和openid
        const axios = require('axios');
        const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
        
        const tokenResponse = await axios.get(tokenUrl);
        const tokenData = tokenResponse.data;
        
        if (tokenData.errcode) {

          throw new Error(`微信OAuth失败: ${tokenData.errmsg || '未知错误'}`);
        }
        
        wechatOpenId = tokenData.openid;

        // 可选：获取用户信息（需要scope包含snsapi_userinfo）
        // const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${wechatOpenId}&lang=zh_CN`;
        // const userInfoResponse = await axios.get(userInfoUrl);
        // const userInfo = userInfoResponse.data;
        
      } catch (oauthError) {

        // 如果OAuth失败，回退到模拟模式

        wechatOpenId = openid || `mock_openid_${Date.now()}`;
      }
    } else {
      // 模拟模式：使用提供的openid或生成一个固定的

      // 如果前端提供了openid，使用前端的（前端会从localStorage获取固定的openid）
      // 如果没有提供，生成一个固定的模拟openid（用于测试）
      wechatOpenId = openid || 'mock_wechat_demo_user_001';

    }

    if (!wechatOpenId) {
      return res.status(400).json({
        success: false,
        error: 'Failed to get WeChat openid'
      });
    }

    // 查找或Create user

    let user = await cloudbaseService.findUserByWechatOpenId(wechatOpenId);
    
    if (!user) {
      // Create new user

      // 为微信用户生成一个模拟的用户名
      // 如果是真实OAuth，可以从微信API获取用户昵称，这里使用模拟名称
      const wechatUserName = isRealOAuth 
        ? '微信用户' // 真实OAuth时，可以从微信API获取昵称
        : `微信用户_${wechatOpenId.substring(0, 8)}`; // 模拟模式：使用openid的一部分
      
      // 微信用户没有email，设置为null
      // 注意：需要在CloudBase控制台将email字段的唯一索引改为"稀疏索引"（允许null）
      // 或者删除email的唯一索引，在代码层面检查email唯一性
      user = await cloudbaseService.createUser({
        email: null, // 微信用户没有email
        name: wechatUserName, // 设置模拟用户名
        wechat_openid: wechatOpenId,
        region: 'cn',
        ip_address: clientIP
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id || user._id,
      email: user.email,
      region: 'cn',
      wechat_openid: wechatOpenId
    });

    // Save session

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    try {
      await cloudbaseService.saveUserSession({
        user_id: user.id || user._id,
        token,
        region: 'cn',
        ip_address: clientIP,
        expires_at: expiresAt
      });

    } catch (sessionError) {
      // Session save failure shouldn't prevent login, but need to log

      // Don't throw error, allow login to continue
    }

    // 如果是GET请求（微信OAuth回调），返回HTML页面，让前端知道登录Success
    if (isGetRequest) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const userData = {
        id: user.id || user._id,
        email: user.email || null,
        name: user.name || `微信用户_${wechatOpenId.substring(0, 8)}`, // 确保有name
        wechat_openid: wechatOpenId,
        subscription_type: user.subscription_type || null,
        subscription_expires_at: user.subscription_expires_at || null,
        region: 'cn'
      };
      
      // 返回HTML页面，通过postMessage通知父窗口，或者直接重定向
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>微信登录Success</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>登录Success！</h2>
            <p>正在跳转...</p>
          </div>
          <script>

            const token = '${token}';
            const userData = ${JSON.stringify(userData)};
            const frontendUrl = '${frontendUrl}';
            
            // 尝试通过postMessage通知父窗口
            if (window.opener && !window.opener.closed) {

              try {
                window.opener.postMessage({
                  type: 'WECHAT_LOGIN_SUCCESS',
                  token: token,
                  user: userData
                }, '*');

                setTimeout(() => {
                  window.close();
                }, 500);
              } catch (e) {

                // 如果postMessage失败，重定向
                window.location.href = frontendUrl + '?token=' + encodeURIComponent(token);
              }
            } else {

              // 如果没有父窗口，重定向到前端页面
              window.location.href = frontendUrl + '?token=' + encodeURIComponent(token);
            }
          </script>
        </body>
        </html>
      `;
      return res.send(html);
    }
    
    // POST请求：返回JSON
    // 确保返回完整的用户信息，包括订阅信息
    const userResponse = {
      id: user.id || user._id,
      email: user.email || null,
      name: user.name || `微信用户_${wechatOpenId.substring(0, 8)}`, // 确保有name
      wechat_openid: wechatOpenId,
      subscription_type: user.subscription_type || null,
      subscription_expires_at: user.subscription_expires_at || null,
      region: 'cn'
    };

    return res.json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {

    // 如果是GET请求，返回错误页面
    if (req.method === 'GET') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMsg = (error.message || 'WeChat login failed').replace(/'/g, "\\'");
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>微信登录失败</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error {
              color: #d32f2f;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="error">登录失败</h2>
            <p>${errorMsg}</p>
            <p>正在跳转...</p>
          </div>
          <script>

            const frontendUrl = '${frontendUrl}';
            const errorMsg = '${errorMsg}';
            
            if (window.opener && !window.opener.closed) {

              try {
                window.opener.postMessage({
                  type: 'WECHAT_LOGIN_ERROR',
                  error: errorMsg
                }, '*');
                setTimeout(() => {
                  window.close();
                }, 2000);
              } catch (e) {

                window.location.href = frontendUrl + '/login?error=' + encodeURIComponent(errorMsg);
              }
            } else {

              window.location.href = frontendUrl + '/login?error=' + encodeURIComponent(errorMsg);
            }
          </script>
        </body>
        </html>
      `;
      return res.status(500).send(html);
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'WeChat login failed'
    });
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  try {
    const token = extractTokenFromHeader(req);
    if (token) {
      // 这里可以删除会话记录
      // 暂时只返回Success
    }
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message || 'Logout failed'
    });
  }
};

module.exports = {
  emailRegister,
  emailLogin,
  getCurrentUser,
  getWechatQRCode,
  wechatCallback,
  googleLogin,
  logout
};

