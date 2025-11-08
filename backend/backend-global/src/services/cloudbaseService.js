let getCloudbaseDB;
try {
  const dbConfig = require('../config/database');
  getCloudbaseDB = dbConfig.getCloudbaseDB;
  if (!getCloudbaseDB) {
    throw new Error('getCloudbaseDB function not found in database config');
  }
} catch (error) {

  // Create a safe wrapper function
  getCloudbaseDB = () => {
    throw new Error('CloudBase database not configured. Please check CLOUDBASE_ENV_ID and related environment variables.');
  };
}

/**
 * Ensure collection exists (create if not exists)
 */
const ensureCollectionExists = async (collectionName, sampleData) => {
  try {
    const db = getCloudbaseDB();
    
    // Try to query collection (will throw error if collection does not exist)
    try {
      const testQuery = await db.collection(collectionName).limit(1).get();
      // If query succeeds, collection exists

      return true;
    } catch (queryError) {
      // If query fails, collection may not exist, try to create
      const errorMsg = queryError.message || String(queryError);
      if (errorMsg.includes('not exist') || 
          errorMsg.includes('COLLECTION_NOT_EXIST') ||
          errorMsg.includes('Db or Table not exist') ||
          errorMsg.includes('ResourceNotFound')) {

        // Try to insert a record to create collection
        try {
          // Add marker to test data for later identification
          const testData = {
            ...sampleData,
            _is_temp_collection_init: true,
            _created_at: new Date()
          };
          
          const result = await db.collection(collectionName).add(testData);
          const docId = result.id || result._id || result.inserted || result.insertedId;
          
          if (docId) {

            // Verify collection is really created (wait a bit for database sync)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Try to query again to confirm collection exists
            try {
              await db.collection(collectionName).limit(1).get();

              // Do not delete test data, CloudBase may delete collection after deleting all documents
              // Test data will be kept but won't affect normal queries (normal data won't have _is_temp_collection_init marker)

            } catch (verifyError) {

            }
          } else {

          }
          
          return true;
        } catch (createError) {
          const createErrorMsg = createError.message || String(createError);
          // If collection doesn't exist error, need to manually create collection
          if (createErrorMsg.includes('not exist') || 
              createErrorMsg.includes('ResourceNotFound') ||
              createError.code === 'DATABASE_COLLECTION_NOT_EXIST') {

            // For some collections (like user_sessions), if creation fails, allow continuing to try operation
            // Because collection may already exist but query failed, or will be created in console later
            if (collectionName === 'user_sessions') {

              return false; // Return false to indicate collection doesn't exist, but don't throw error
            }
            throw createError;
          } else {
            // Other errors, throw directly

            throw createError;
          }
        }
      } else {
        // Other errors, throw directly

        throw queryError;
      }
    }
  } catch (error) {

    throw error;
  }
};

/**
 * CloudBase database service adapter
 * Convert MySQL/Supabase operations to CloudBase operations
 */

/**
 * Save IP record to CloudBase database
 */
const saveIPRecordCN = async (ipInfo) => {
  try {
    const db = getCloudbaseDB();
    
    // Format time (UTC+8)
    const now = new Date();
    const chinaTimeMs = now.getTime() + 8 * 60 * 60 * 1000;
    const chinaTime = new Date(chinaTimeMs);
    const detectedAt = chinaTime.toISOString();
    
    // Ensure ip_records collection exists
    await ensureCollectionExists('ip_records', {
      ip_address: '127.0.0.1',
      country: 'CN',
      region_name: 'Beijing',
      city: 'Beijing',
      is_china: true,
      latitude: 39.9042,
      longitude: 116.4074,
      detected_at: new Date(),
      source: 'auto-create'
    });
    
    // First delete old record (if exists)
    try {
      await db.collection('ip_records')
        .where({
          ip_address: ipInfo.ip
        })
        .remove();
    } catch (removeError) {
      // Ignore delete error (record may not exist)

    }
    
    // Ensure is_china is correctly set (force judgment based on country code)
    const isChina = ipInfo.country === 'CN' || ipInfo.country === 'cn' || ipInfo.isChina === true;
    
    // Insert new record
    const ipRecord = {
      ip_address: ipInfo.ip,
      country: ipInfo.country,
      region_name: ipInfo.region,
      city: ipInfo.city,
      is_china: isChina, // Force judgment based on country code
      latitude: ipInfo.latitude,
      longitude: ipInfo.longitude,
      detected_at: detectedAt,
      source: ipInfo.source || 'cloudbase'
    };

    const result = await db.collection('ip_records').add(ipRecord);
    
    // CloudBase returned ID may be in result.id or result._id
    const recordId = result.id || result._id || result.inserted || result.insertedId;

    if (!recordId) {

      throw new Error('Failed to get inserted record ID from CloudBase');
    }
    
    return {
      id: recordId,
      ip: ipInfo.ip,
      country: ipInfo.country,
      region: ipInfo.region,
      city: ipInfo.city,
      isChina: ipInfo.isChina,
      latitude: ipInfo.latitude,
      longitude: ipInfo.longitude,
      detected_at: detectedAt,
      source: 'cloudbase'
    };
  } catch (error) {

    throw error;
  }
};

/**
 * Get or create test user
 */
const getOrCreateTestUser = async (clientIP) => {
  try {
    const db = getCloudbaseDB();
    
    // Find existing user
    const existingUsers = await db.collection('users')
      .where({
        email: 'test@example.com'
      })
      .get();
    
    if (existingUsers.data && existingUsers.data.length > 0) {
      return existingUsers.data[0]._id;
    }
    
    // Create new user
    const newUser = await db.collection('users')
      .add({
        email: 'test@example.com',
        password_hash: 'test_hash',
        region: 'cn',
        ip_address: clientIP,
        created_at: new Date(),
        updated_at: new Date()
      });
    
    return newUser.id;
  } catch (error) {

    throw error;
  }
};

/**
 * Create payment order
 */
const createPaymentOrder = async (orderData) => {
  try {
    const db = getCloudbaseDB();
    
    // Ensure payment_orders collection exists
    await ensureCollectionExists('payment_orders', {
      order_no: 'TEMP_ORDER',
      user_id: 'temp_user',
      amount: 0.01,
      currency: 'CNY',
      payment_method: 'wechat',
      payment_status: 'pending',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const result = await db.collection('payment_orders')
      .add({
        ...orderData,
        created_at: new Date(),
        updated_at: new Date()
      });
    
    return {
      id: result.id,
      ...orderData
    };
  } catch (error) {

    throw error;
  }
};

/**
 * Update payment order
 */
const updatePaymentOrder = async (orderNo, updateData) => {
  try {
    const db = getCloudbaseDB();

    // Ensure payment_orders collection exists
    await ensureCollectionExists('payment_orders', {
      order_no: 'TEMP_ORDER',
      user_id: 'temp_user',
      amount: 0.01,
      currency: 'CNY',
      payment_method: 'wechat',
      payment_status: 'pending',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Find order
    const orders = await db.collection('payment_orders')
      .where({
        order_no: orderNo
      })
      .get();

    if (!orders.data || orders.data.length === 0) {

      throw new Error('Order not found');
    }
    
    const orderId = orders.data[0]._id;

    // Update order
    const result = await db.collection('payment_orders')
      .doc(orderId)
      .update({
        ...updateData,
        updated_at: new Date()
      });

    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Find user by email
 */
const findUserByEmail = async (email) => {
  try {
    const db = getCloudbaseDB();

    // Ensure users collection exists
    await ensureCollectionExists('users', {
      email: 'temp@example.com',
      password_hash: 'temp',
      name: '临时',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const result = await db.collection('users')
      .where({
        email: email
      })
      .get();

    if (result.data && result.data.length > 0) {

      return result.data[0];
    }

    return null;
  } catch (error) {

    throw error;
  }
};

/**
 * Find user by WeChat OpenID
 */
const findUserByWechatOpenId = async (openid) => {
  try {
    const db = getCloudbaseDB();

    // Ensure users collection exists
    await ensureCollectionExists('users', {
      email: 'temp@example.com',
      password_hash: 'temp',
      name: '临时',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });

    const result = await db.collection('users')
      .where({
        wechat_openid: openid
      })
      .get();
    
    if (result.data && result.data.length > 0) {

      return result.data[0];
    }

    return null;
  } catch (error) {

    throw error;
  }
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  try {
    const db = getCloudbaseDB();

    // Ensure users collection exists
    await ensureCollectionExists('users', {
      email: 'temp@example.com',
      password_hash: 'temp',
      name: '临时',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Try to get user by document ID
    try {
      const result = await db.collection('users').doc(userId).get();
      if (result && result.data) {
        return {
          _id: userId,
          id: userId,
          ...result.data
        };
      }
    } catch (docError) {
      // If doc().get() fails, try querying by _id or id field
    }
    
    // Try querying by _id field
    const resultById = await db.collection('users')
      .where({
        _id: userId
      })
      .get();

    if (resultById.data && resultById.data.length > 0) {
      return resultById.data[0];
    }
    
    // Try querying by id field (string)
    const resultByStringId = await db.collection('users')
      .where({
        id: userId.toString()
      })
      .get();

    if (resultByStringId.data && resultByStringId.data.length > 0) {
      return resultByStringId.data[0];
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Create user
 */
const createUser = async (userData) => {
  try {
    const db = getCloudbaseDB();
    const now = new Date();

    const userRecord = {
      email: userData.email,
      password_hash: userData.password_hash,
      name: userData.name,
      region: userData.region || 'cn',
      ip_address: userData.ip_address || null,
      wechat_openid: userData.wechat_openid || null,
      google_id: userData.google_id || null,
      created_at: now,
      updated_at: now
    };

    // Ensure users collection exists

    await ensureCollectionExists('users', {
      email: 'temp@example.com',
      password_hash: 'temp',
      name: '临时',
      region: 'cn',
      created_at: new Date(),
      updated_at: new Date()
    });

    let result;
    try {
      result = await db.collection('users').add(userRecord);

    } catch (insertError) {

      throw insertError;
    }
    
    // CloudBase returned ID may be in result.id or result._id
    const userId = result?.id || result?._id || result?.inserted || result?.insertedId;

    if (!userId) {

      throw new Error('Failed to get inserted user ID from CloudBase');
    }
    
    return {
      _id: userId,
      id: userId,
      ...userRecord
    };
  } catch (error) {

    throw error;
  }
};

/**
 * Update user subscription information
 * @param {string} userId - User ID
 * @param {string} subscriptionType - 'monthly' or 'yearly'
 * @param {Date} expiresAt - Expiration time
 */
const updateUserSubscription = async (userId, subscriptionType, expiresAt) => {
  try {
    const db = getCloudbaseDB();

    // Ensure users collection exists
    await ensureCollectionExists('users', {
      email: 'temp@example.com',
      password_hash: 'temp',
      name: '临时',
      region: 'cn',
      subscription_type: 'monthly',
      subscription_expires_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Ensure expiresAt is a Date object
    const expiresAtDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    
    const updateData = {
      subscription_type: subscriptionType,
      subscription_expires_at: expiresAtDate,
      updated_at: new Date()
    };
    
    const result = await db.collection('users')
      .doc(userId)
      .update(updateData);
    
    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Update user information
 */
const updateUser = async (userId, updateData) => {
  try {
    const db = getCloudbaseDB();
    const result = await db.collection('users')
      .doc(userId)
      .update({
        ...updateData,
        updated_at: new Date()
      });
    
    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Save user session
 */
const saveUserSession = async (sessionData) => {
  try {
    const db = getCloudbaseDB();

    // Try to ensure user_sessions collection exists (if fails, continue trying to insert)

    try {
      const collectionExists = await ensureCollectionExists('user_sessions', {
        user_id: 'temp_user',
        token: 'temp_token',
        region: 'cn',
        ip_address: '127.0.0.1',
        expires_at: new Date(),
        created_at: new Date()
      });
      
      if (!collectionExists) {

      }
    } catch (ensureError) {
      // Collection creation failed, but continue trying to insert (collection may already exist)

    }
    
    // Try to insert directly (if collection doesn't exist, CloudBase should auto-create or throw clear error)

    try {
      const result = await db.collection('user_sessions')
        .add({
          ...sessionData,
          created_at: new Date()
        });

      const sessionId = result?.id || result?._id || result?.inserted || result?.insertedId;

      if (!sessionId) {

        throw new Error('Failed to get inserted session ID from CloudBase');
      }
      
      return {
        _id: sessionId,
        id: sessionId,
        ...sessionData
      };
    } catch (insertError) {
      // If insert fails because collection doesn't exist, provide clear hint
      const errorMsg = insertError.message || String(insertError);
      if (errorMsg.includes('not exist') || 
          errorMsg.includes('ResourceNotFound') ||
          insertError.code === 'DATABASE_COLLECTION_NOT_EXIST') {

        throw new Error('user_sessions collection does not exist. Please create it in CloudBase console.');
      }
      throw insertError;
    }
  } catch (error) {

    throw error;
  }
};

/**
 * Find session by token
 */
const findSessionByToken = async (token) => {
  try {
    const db = getCloudbaseDB();
    
    // Ensure user_sessions collection exists
    await ensureCollectionExists('user_sessions', {
      user_id: 'temp_user',
      token: 'temp_token',
      region: 'cn',
      ip_address: '127.0.0.1',
      expires_at: new Date(),
      created_at: new Date()
    });
    
    const result = await db.collection('user_sessions')
      .where({
        token: token
      })
      .get();
    
    if (result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {

    throw error;
  }
};

/**
 * Delete expired sessions
 */
const deleteExpiredSessions = async () => {
  try {
    const db = getCloudbaseDB();
    const now = new Date();
    const result = await db.collection('user_sessions')
      .where({
        expires_at: db.command.lte(now)
      })
      .remove();
    
    return result;
  } catch (error) {

    // Don't throw error, this is cleanup operation
    return null;
  }
};

module.exports = {
  ensureCollectionExists,
  saveIPRecordCN,
  getOrCreateTestUser,
  createPaymentOrder,
  updatePaymentOrder,
  findUserByEmail,
  findUserByWechatOpenId,
  getUserById,
  createUser,
  updateUser,
  updateUserSubscription,
  saveUserSession,
  findSessionByToken,
  deleteExpiredSessions
};

