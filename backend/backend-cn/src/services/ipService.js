const { getSupabaseClient, cloudbaseApp } = require('../config/database');
const cloudbaseService = require('./cloudbaseService');

/**
 * Save IP record to database
 * Fix: Use upsert (update or insert) to ensure using real IP update instead of inserting duplicate records
 */
const saveIPRecord = async (ipInfo) => {
  try {
    const supabase = getSupabaseClient();
    
    // Get current time, then format as Shanghai time (UTC+8) with timezone marker
    // Use +08:00 timezone marker so Supabase will recognize it as Shanghai time and display correctly
    const now = new Date();
    // Calculate Shanghai timezone time (UTC+8), use Date object to properly handle date carryover
    const chinaTimeMs = now.getTime() + 8 * 60 * 60 * 1000;
    const chinaTime = new Date(chinaTimeMs);
    
    // Get each part of Shanghai timezone time
    const year = chinaTime.getUTCFullYear();
    const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(chinaTime.getUTCDate()).padStart(2, '0');
    const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
    const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(chinaTime.getUTCSeconds()).padStart(2, '0');
    const ms = String(chinaTime.getUTCMilliseconds()).padStart(3, '0');
    
    // Format as ISO string with timezone marker (+08:00 represents Shanghai timezone)
    // This way Supabase will correctly recognize it as Shanghai timezone time and convert to Shanghai time when displaying
    const detectedAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+08:00`;
    
    // Directly insert new record, keep all history (no longer delete old records)

    // Insert new record (don't use .single() because UNIQUE constraint may cause insert failure)
    const { data, error } = await supabase
      .from('ip_records')
      .insert({
        ip_address: ipInfo.ip,
        country: ipInfo.country,
        region_name: ipInfo.region,
        city: ipInfo.city,
        is_china: ipInfo.isChina,
        latitude: ipInfo.latitude,
        longitude: ipInfo.longitude,
        detected_at: detectedAt, // Explicitly specify UTC time
        source: ipInfo.source
      })
      .select();

    if (error) {
      // If UNIQUE constraint error, database has unique constraint, need to remove constraint first
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {

      } else {

      }
      return null;
    }

    // data may be array (if insert succeeded)
    const insertedRecord = Array.isArray(data) ? data[0] : data;

    return insertedRecord;
  } catch (error) {

    return null;
  }
};

/**
 * Query IP record
 * Priority to return latest record, avoid returning old incorrect data
 */
const getIPRecord = async (ip) => {
  try {
    const supabase = getSupabaseClient();
    
    // Query all matching records, sort by time descending, get latest
    const { data, error } = await supabase
      .from('ip_records')
      .select('*')
      .eq('ip_address', ip)
      .order('detected_at', { ascending: false })
      .limit(1);

    if (error) {

      return null;
    }

    // Return first (latest) record
    if (data && data.length > 0) {

      return data[0];
    }

    return null;
  } catch (error) {

    return null;
  }
};

module.exports = {
  saveIPRecord,
  getIPRecord,
  saveIPRecordCN: async (ipInfo) => {
    if (cloudbaseApp) {
      return await cloudbaseService.saveIPRecordCN(ipInfo);
    }
    throw new Error('CloudBase not configured');
  }
};

