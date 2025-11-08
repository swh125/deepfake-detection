/**
 * 清理Supabase中的错误IP记录
 * 删除所有localhost、::1、127.0.0.1等无效IP的记录
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getSupabaseClient } = require('../src/config/database');

async function cleanupInvalidIPRecords() {
  try {
    const supabase = getSupabaseClient();
    
    // 无效IP列表
    const invalidIPs = ['::1', '127.0.0.1', 'localhost', 'needs-api-detection', 'unknown'];

    // 删除所有无效IP的记录
    for (const invalidIP of invalidIPs) {
      const { data, error } = await supabase
        .from('ip_records')
        .delete()
        .eq('ip_address', invalidIP);
      
      if (error) {

      } else {

      }
    }
    
    // 删除所有显示"珠海"或"Zhuhai"的记录（可能是错误的默认值）
    const { data, error } = await supabase
      .from('ip_records')
      .delete()
      .or('city.eq.珠海,city.eq.Zhuhai,region_name.eq.珠海,region_name.eq.Zhuhai');
    
    if (error) {

    } else {

    }

    // 显示剩余的记录数量
    const { count } = await supabase
      .from('ip_records')
      .select('*', { count: 'exact', head: true });

  } catch (error) {

  }
  
  process.exit(0);
}

cleanupInvalidIPRecords();
