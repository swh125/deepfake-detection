/**
 * 检查 Supabase 数据库中的数据
 * 用于诊断为什么只有 user_sessions 有数据
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL_GLOBAL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_GLOBAL;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseData() {
  try {
    // 1. 检查 users 表
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(10);

    if (usersError) {
    } else {
      if (users && users.length > 0) {
        users.forEach((user, index) => {
        });
      } else {
      }
    }

    // 2. 检查 payment_orders 表
    const { data: orders, error: ordersError, count: ordersCount } = await supabase
      .from('payment_orders')
      .select('*', { count: 'exact' })
      .limit(10);

    if (ordersError) {
    } else {
      if (orders && orders.length > 0) {
        orders.forEach((order, index) => {
        });
      } else {
      }
    }

    // 3. 检查 user_sessions 表
    const { data: sessions, error: sessionsError, count: sessionsCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact' })
      .limit(10);

    if (sessionsError) {
    } else {
      if (sessions && sessions.length > 0) {
        sessions.forEach((session, index) => {
        });
      } else {
      }
    }

    // 4. 检查 user_sessions 中的 user_id 是否在 users 表中
    if (sessions && sessions.length > 0) {
      const userIds = [...new Set(sessions.map(s => s.user_id))];
      for (const userId of userIds) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, name, google_id')
          .eq('id', userId)
          .maybeSingle();

        if (userError) {
        } else if (user) {
        } else {
        }
      }
    }
  } catch (error) {
  }
}

checkSupabaseData();



