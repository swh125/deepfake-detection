const { getSupabaseClient, getMySQLConnection, cloudbaseApp } = require('../config/database');
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
    // Does not include city, region_name, latitude, longitude fields
    const insertData = {
      ip_address: ipInfo.ip,
      country: ipInfo.country,
      // No longer save city, region_name, latitude, longitude fields
      is_china: ipInfo.isChina,
      detected_at: detectedAt, // Explicitly specify UTC time
      source: ipInfo.source || 'api'
    };

    const { data, error } = await supabase
      .from('ip_records')
      .insert(insertData)
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
  /**
   * Save to Tencent Cloud database (China)
   * Priority to use CloudBase, if not configured then use MySQL
   * Add deduplication logic: if there's a record with same IP within last 1 minute, don't save again
   */
  saveIPRecordCN: async (ipInfo) => {
    // Priority to use CloudBase
    if (cloudbaseApp) {

      return await cloudbaseService.saveIPRecordCN(ipInfo);
    }
    
    // If no CloudBase, use MySQL (backward compatibility)
    let connection;
    try {

      connection = await getMySQLConnection();
      
      // First check if there's a record with same IP within last 1 minute
      const [existing] = await connection.execute(
        `SELECT id, ip_address, detected_at FROM ip_records 
         WHERE ip_address = ? AND detected_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
         ORDER BY detected_at DESC LIMIT 1`,
        [ipInfo.ip]
      );

      if (existing && existing.length > 0) {

        // Return existing record, ensure detected_at format is correct
        const existingRecord = existing[0];
        let detectedAt = existingRecord.detected_at;
        // If Date object, convert to ISO string; if string, ensure ISO format
        if (detectedAt instanceof Date) {
          detectedAt = detectedAt.toISOString();
        } else if (typeof detectedAt === 'string' && !detectedAt.includes('T')) {
          // If MySQL date format (YYYY-MM-DD HH:mm:ss), convert to ISO format
          detectedAt = new Date(detectedAt).toISOString();
        }
        return {
          id: existingRecord.id,
          ip_address: existingRecord.ip_address || ipInfo.ip,
          country: existingRecord.country || ipInfo.country || null,
          region_name: existingRecord.region_name || ipInfo.region || null,
          city: existingRecord.city || ipInfo.city || null,
          is_china: existingRecord.is_china !== undefined ? existingRecord.is_china : (ipInfo.isChina ? 1 : 0),
          latitude: existingRecord.latitude || ipInfo.latitude || null,
          longitude: existingRecord.longitude || ipInfo.longitude || null,
          detected_at: detectedAt,
          source: existingRecord.source || ipInfo.source || 'api'
        };
      }

      const [result] = await connection.execute(
        `INSERT INTO ip_records (ip_address, country, region_name, city, is_china, latitude, longitude, detected_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          ipInfo.ip,
          ipInfo.country || null,
          ipInfo.region || null,
          ipInfo.city || null,
          ipInfo.isChina ? 1 : 0,
          ipInfo.latitude || null,
          ipInfo.longitude || null,
          ipInfo.source || 'api'
        ]
      );

      // Query just inserted record to get accurate time saved by database
      const [inserted] = await connection.execute(
        `SELECT * FROM ip_records WHERE id = ?`,
        [result.insertId]
      );
      
      // Format detected_at as ISO string
      let detectedAt = new Date().toISOString(); // Default to use current time
      if (inserted && inserted.length > 0) {
        const dbTime = inserted[0].detected_at;
        if (dbTime instanceof Date) {
          detectedAt = dbTime.toISOString();
        } else if (typeof dbTime === 'string') {
          // MySQL may return string format, convert to ISO
          detectedAt = new Date(dbTime).toISOString();
        }
      }
      
      // Return structure consistent with Supabase, use accurate time saved by database
      return {
        id: result.insertId,
        ip_address: ipInfo.ip,
        country: ipInfo.country || null,
        region_name: ipInfo.region || null,
        city: ipInfo.city || null,
        is_china: ipInfo.isChina ? 1 : 0,
        latitude: ipInfo.latitude || null,
        longitude: ipInfo.longitude || null,
        detected_at: detectedAt,
        source: ipInfo.source || 'api'
      };
    } catch (error) {

      return null;
    } finally {
      if (connection) connection.release();
    }
  }
};

