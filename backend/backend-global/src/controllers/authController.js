const bcrypt = require('bcryptjs');
const { getDatabaseClient, getSupabaseClient } = require('../config/database');
const { generateToken, extractTokenFromHeader } = require('../utils/jwt');
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

    // backend-global always uses Supabase for registration (global region only)
    // No cross-region support: users must register separately in each region
    // Check IP: if user is in China, reject registration (must use backend-cn)
    const { detectIPLocation } = require('../utils/ipDetector');
    const ipInfo = detectIPLocation(clientIP);
    
    if (ipInfo.isChina && clientIP !== '127.0.0.1' && clientIP !== '::1') {
      return res.status(403).json({
        success: false,
        error: 'This API is only for global region users. Please use the China API (backend-cn) to register.'
      });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Supabase database not configured. Please check SUPABASE_URL_GLOBAL and SUPABASE_SERVICE_ROLE_KEY_GLOBAL environment variables.'
      });
    }
    
    // Check if user already exists in Supabase
    const { data: existingUserInSupabase, error: supabaseCheckError } = await supabase
      .from('users')
      .select('id, email, region')
      .eq('email', email)
      .maybeSingle();
    
    if (existingUserInSupabase) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    if (supabaseCheckError && supabaseCheckError.code !== 'PGRST116') {
      // Real error (not "not found" error)
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: process.env.NODE_ENV === 'development' ? supabaseCheckError.message : undefined
      });
    }


    // Always use Supabase for registration (backend-global)
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in Supabase
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name: name.trim(),
        region: 'global',
        ip_address: clientIP
      })
      .select('id, email, name, password_hash')
      .single();

    if (insertError) {
      // Log detailed error for debugging (always show in production for troubleshooting)
      console.error('Supabase insert error:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create user in database',
        details: {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check Supabase table structure and permissions'
        }
      });
    }
    
    if (!user) {
      return res.status(500).json({
        success: false,
        error: 'User creation failed: no data returned'
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      region: 'global'
    });

    // Save session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token,
        region: 'global',
        ip_address: clientIP,
        expires_at: expiresAt.toISOString()
      });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          subscription_type: null,
          subscription_expires_at: null,
          region: 'global'
        },
        token
      }
    });
  } catch (error) {
    // Log error for debugging
    console.error('Registration error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return more detailed error information (always show details for troubleshooting)
    return res.status(500).json({
      success: false,
      error: error.message || 'Registration failed',
      details: {
        name: error.name,
        message: error.message
      }
    });
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

    // backend-global only uses Supabase (international system)
    // Check IP: if user is in China, reject login (must use backend-cn)
    const { detectIPLocation } = require('../utils/ipDetector');
    const ipInfo = detectIPLocation(clientIP);
    
    if (ipInfo.isChina && clientIP !== '127.0.0.1' && clientIP !== '::1') {
      return res.status(403).json({
        success: false,
        error: 'This API is only for global region users. Please use the China API (backend-cn) to login.'
      });
    }

    const supabase = getSupabaseClient();
    
    // First try to query including subscription field
    let { data: user, error: supabaseError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, region, subscription_type, subscription_expires_at')
      .eq('email', email)
      .maybeSingle();
    
    // If field doesn't exist (error code 42703), only query basic fields
    if (supabaseError && supabaseError.code === '42703') {

      const result = await supabase
        .from('users')
        .select('id, email, password_hash, name, region')
        .eq('email', email)
        .maybeSingle();
      user = result.data;
      supabaseError = result.error;
      // Manually set subscription field to null
      if (user) {
        user.subscription_type = null;
        user.subscription_expires_at = null;
      }
    }
    
    // Detailed log

    if (supabaseError && supabaseError.code !== 'PGRST116') {
      // Real error (not "not found" error)

      return res.status(500).json({
        success: false,
        error: 'Database query failed'
      });
    }
    
    if (!user) {
      // User not found in Supabase
      // backend-global only supports global region users
      // If user registered in China, they need to register again in global region
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    if (!user.password_hash) {

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 生成Token
    const token = generateToken({
      userId: user.id.toString(), // 确保转换为字符串，与注册时保持一致
      email: user.email,
      region: 'global'
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id.toString(), // 确保返回字符串类型，与注册时保持一致
          email: user.email,
          name: user.name,
          subscription_type: user.subscription_type || null,
          subscription_expires_at: user.subscription_expires_at || null,
          region: user.region || 'global'
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

    // Get user's registered region from token
    const userRegion = decoded.region || 'global';
    const userId = decoded.userId;
    
    // backend-global only supports global region users
    // If user registered in China, they need to use backend-cn
    if (userRegion === 'cn') {
      return res.status(403).json({
        success: false,
        error: 'This API is only for global region users. Please use the China API (backend-cn).'
      });
    }
    
    let user = null;
    let error = null;
    
    // Query from Supabase only (global region)
    {
      const supabase = getSupabaseClient();
      
      // Ensure userId type matches (Supabase id is bigint, need to convert to number or string)
      const userIdNum = typeof userId === 'string' ? parseInt(userId) || userId : userId;

      // Try querying with number type first (including subscription field)
      let result = await supabase
        .from('users')
        .select('id, email, name, subscription_type, subscription_expires_at, region')
        .eq('id', userIdNum)
        .maybeSingle();
      
      user = result.data;
      error = result.error;
      
      // If field doesn't exist (error code 42703), only query basic fields
      if (error && error.code === '42703') {
        result = await supabase
          .from('users')
          .select('id, email, name, region')
          .eq('id', userIdNum)
          .maybeSingle();
        user = result.data;
        error = result.error;
        // Manually set subscription fields to null
        if (user) {
          user.subscription_type = null;
          user.subscription_expires_at = null;
        }
      }
      
      // If user not found, try other types
      if (!user) {
        // If userId is number, try querying with string
        if (typeof userIdNum === 'number') {
          result = await supabase
            .from('users')
            .select('id, email, name, subscription_type, subscription_expires_at, region')
            .eq('id', userIdNum.toString())
            .maybeSingle();
          
          // If field doesn't exist, only query basic fields
          if (result.error && result.error.code === '42703') {
            result = await supabase
              .from('users')
              .select('id, email, name, region')
              .eq('id', userIdNum.toString())
              .maybeSingle();
            if (result.data) {
              result.data.subscription_type = null;
              result.data.subscription_expires_at = null;
            }
          }
          
          if (result.data) {
            user = result.data;
            error = result.error;
          }
        }
        
        // If still not found, try with original decoded.userId (might be string)
        if (!user && userIdNum !== userId) {
          result = await supabase
            .from('users')
            .select('id, email, name, subscription_type, subscription_expires_at, region')
            .eq('id', userId)
            .maybeSingle();
          
          // If field doesn't exist, only query basic fields
          if (result.error && result.error.code === '42703') {
            result = await supabase
              .from('users')
              .select('id, email, name, region')
              .eq('id', userId)
              .maybeSingle();
            if (result.data) {
              result.data.subscription_type = null;
              result.data.subscription_expires_at = null;
            }
          }
          
          if (result.data) {
            user = result.data;
            error = result.error;
          }
        }
      }
    }

    if (!user || error) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // If subscription field is null or doesn't exist, calculate membership status from payment_orders
    // Query from Supabase payment_orders only (global region)
    if (!user.subscription_type || !user.subscription_expires_at) {
      try {
        let allPaidOrders = [];
        let ordersError = null;
        
        // Query from Supabase payment_orders
        const supabase = getSupabaseClient();
        let result = await supabase
          .from('payment_orders')
          .select('payment_provider_response, paid_at, payment_status, created_at, updated_at, description')
          .eq('user_id', user.id)
          .eq('payment_status', 'paid')
          .order('paid_at', { ascending: true });
        
        allPaidOrders = result.data;
        ordersError = result.error;
        
        // If paid_at field doesn't exist, try using created_at for sorting
        if (ordersError && ordersError.code === '42703') {
          result = await supabase
            .from('payment_orders')
            .select('payment_provider_response, payment_status, created_at, updated_at, description')
            .eq('user_id', user.id)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: true });
          allPaidOrders = result.data;
          ordersError = result.error;
        }
        
        // If description field doesn't exist, only query payment_provider_response
        if (ordersError && ordersError.code === '42703' && ordersError.message?.includes('description')) {
          result = await supabase
            .from('payment_orders')
            .select('payment_provider_response, payment_status, created_at, updated_at, paid_at')
            .eq('user_id', user.id)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: true });
          allPaidOrders = result.data;
          ordersError = result.error;
        }
        
        // If still fails, try querying all without sorting
        if (ordersError && ordersError.code === '42703') {
          result = await supabase
            .from('payment_orders')
            .select('payment_provider_response, payment_status, created_at, updated_at')
            .eq('user_id', user.id)
            .eq('payment_status', 'paid');
          allPaidOrders = result.data;
          ordersError = result.error;
          // Manually sort by created_at
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

        // 保持原有的 null 值
      }
    }

    // 设置缓存控制头，防止浏览器缓存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const responseData = {
      id: user.id.toString(), // 确保返回字符串类型，与 token 中的 userId 保持一致
      email: user.email,
      name: user.name,
      subscription_type: user.subscription_type || null,
      subscription_expires_at: user.subscription_expires_at || null,
      region: user.region || 'global'
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
 * Google登录 - 处理Google OAuth回调
 */
const googleLogin = async (req, res) => {
  try {
    const { code, google_id, email, name } = req.body;
    const region = 'global'; // Google登录只用于国外用户
    const clientIP = getClientIP(req);

    // 如果没有提供google_id，尝试从code获取（实际应该调用Google API）
    let finalGoogleId = google_id;
    if (!finalGoogleId && code) {
      // 实际应该用code换取Google用户信息
      // 这里简化处理，使用code作为临时ID

      finalGoogleId = `google_${code}`;
    }

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

      // 如果没有配置Supabase，使用模拟模式（创建临时用户）

      const mockToken = generateToken({
        userId: `mock_${finalGoogleId}`,
        email: userEmail,
        region: 'global'
      });
      return res.json({
        success: true,
        data: {
          user: {
            id: `mock_${finalGoogleId}`,
            email: userEmail,
            name: userName,
            google_id: finalGoogleId,
            subscription_type: null,
            subscription_expires_at: null,
            region: 'global'
          },
          token: mockToken
        },
        mock: true,
        message: 'Using mock mode (Supabase not configured)'
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

    // 生成Token
    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      region: 'global',
      google_id: finalGoogleId
    });

    // 保存会话
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
  googleLogin,
  logout
};

