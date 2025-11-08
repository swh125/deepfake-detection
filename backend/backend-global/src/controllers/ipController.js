const { getClientIP, detectIPLocation } = require('../utils/ipDetector');
const { saveIPRecord, getIPRecord, saveIPRecordCN } = require('../services/ipService');

/**
 * 将时间转换为中国时区（UTC+8）的 ISO 字符串
 */
const toChinaTimeISO = (dt = null) => {
  const sourceTime = dt ? (dt instanceof Date ? dt : new Date(dt)) : new Date();
  const chinaTime = new Date(sourceTime.getTime() + 8 * 60 * 60 * 1000);
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(chinaTime.getUTCSeconds()).padStart(2, '0');
  const ms = String(chinaTime.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+08:00`;
};

/**
 * 检测当前请求的IP
 */
const detectCurrentIP = async (req, res, next) => {
  try {
    // 获取客户端IP
    let clientIP = getClientIP(req);
    const force = (req.query.force || '').toString().toLowerCase();
    // 支持前端传递的真实IP信息（通过query参数）
    const frontendIP = req.query.ip;
    const frontendCountry = req.query.country;
    // 不再接收region、city、经纬度参数

    // 如果前端传递了真实IP，优先使用前端的IP
    if (frontendIP && frontendIP !== 'unknown' && frontendIP !== 'forced') {

      clientIP = frontendIP;
    }
    // 如果是本地访问，尝试通过API获取真实IP
    else if (clientIP === 'needs-api-detection' || clientIP === '::1' || clientIP === '127.0.0.1') {

      const { getRealIPFromAPI } = require('../utils/ipDetector');
      const realIP = await getRealIPFromAPI();
      if (realIP) {
        clientIP = realIP;

      } else {
        // 如果API也失败了，且有force参数，根据force参数决定使用什么IP
        if (force === 'cn') {

          clientIP = '116.31.95.45'; // 默认中国IP
        } else {

          clientIP = '8.8.8.8'; // 默认国际IP（用于测试）
        }
      }
    }
    
    // 进行检测
    let ipInfoDetected = detectIPLocation(clientIP);
    
    // 如果前端传递了国家信息和IP，优先使用前端的信息（更准确）
    let isChinaFromFrontend = null;
    if (frontendCountry && frontendIP && frontendIP !== 'unknown' && frontendIP !== 'forced') {
      // 确保正确判断是否为中国
      isChinaFromFrontend = frontendCountry === 'CN' || frontendCountry === 'cn';

      // 使用前端传递的真实IP信息，完全覆盖后端检测的结果
      ipInfoDetected = {
        ...ipInfoDetected,
        ip: frontendIP, // 使用前端传递的真实IP
        country: frontendCountry, // 使用前端传递的国家代码
        // 不再使用region、city、latitude、longitude字段
        isChina: isChinaFromFrontend, // 根据国家代码判断（强制使用前端判断）
        source: 'frontend-api' // 标记来源为前端API
      };
      
      // 确保这些字段不存在
      delete ipInfoDetected.region;
      delete ipInfoDetected.city;
      delete ipInfoDetected.latitude;
      delete ipInfoDetected.longitude;

    }
    
    const useCN = force === 'cn' ? true : force === 'global' ? false : ipInfoDetected.isChina === true;

    // 保存到对应区域数据库
    let storedRecord;
    if (useCN) {

      storedRecord = await saveIPRecordCN(ipInfoDetected);

    } else {
      // Supabase 分支：优先使用前端传递的真实IP
      const queryIP = frontendIP && frontendIP !== 'unknown' && frontendIP !== 'forced' ? frontendIP : clientIP;
      
      // 如果前端传递了完整信息，直接保存新记录（总是保存，确保使用真实IP和准确数据）
      if (frontendIP && frontendIP !== 'unknown' && frontendIP !== 'forced' && frontendCountry) {

        // 直接保存，不使用查询（避免查到旧的错误数据）
        // 确保使用前端传递的真实IP和所有地理信息
        // 如果没有isChinaFromFrontend，根据国家代码判断
        const finalIsChina = isChinaFromFrontend !== null 
          ? isChinaFromFrontend 
          : (frontendCountry === 'CN');
        const ipInfoToSave = {
          ip: frontendIP,  // 强制使用前端传递的真实IP
          country: frontendCountry,  // 使用前端传递的国家
          // 不再使用region、city、latitude、longitude字段
          isChina: finalIsChina,  // 根据国家代码判断
          source: 'frontend-api'  // 标记来源
        };
        
        // 确保这些字段不存在
        delete ipInfoToSave.region;
        delete ipInfoToSave.city;
        delete ipInfoToSave.latitude;
        delete ipInfoToSave.longitude;

        const saved = await saveIPRecord(ipInfoToSave);
        if (saved) {

        } else {

        }
        
        storedRecord = saved
          ? {
              ip_address: saved.ip_address || frontendIP,
              country: saved.country,
              is_china: saved.is_china,
              detected_at: saved.detected_at || new Date().toISOString(),
            }
          : null;
      } else {
        // 如果没有前端信息，查询现有记录
        // 但即使查询到了，如果有后端检测的信息，也应该保存新记录以确保数据准确
        let existing = await getIPRecord(queryIP);
        
        // 如果查询到了记录，但后端检测到的信息不同，保存新记录
        const shouldUpdate = existing && (
          existing.country !== ipInfoDetected.country
        );
        
        if (!existing || shouldUpdate) {
          if (shouldUpdate) {

          }
          const saved = await saveIPRecord(ipInfoDetected);
          storedRecord = saved
            ? {
                ip_address: saved.ip_address || queryIP,
                country: saved.country,
                is_china: saved.is_china,
                detected_at: saved.detected_at || new Date().toISOString(),
              }
            : null;
        } else {

          storedRecord = existing;
        }
      }
    }

    // 构建响应
    // 从 Supabase 读取的数据，detected_at 已经是+8小时后的时间（保存时已经加过）
    // 所以直接返回，不要再次转换
    const formatDetectedAt = (dt) => {
      if (!dt) {
        return toChinaTimeISO(); // 如果没有时间，返回当前时间+8小时
      }
      if (dt instanceof Date) {
        // Date 对象，直接转换为 ISO 字符串（已经是+8小时后的时间）
        return dt.toISOString();
      }
      if (typeof dt === 'string') {
        // 字符串格式，如果已经是 ISO 格式，直接返回
        // Supabase 保存时已经是+8小时后的时间，所以直接返回
        return dt;
      }
      return toChinaTimeISO(dt);
    };

    // 确保 isChina 正确设置（根据国家代码强制判断）
    const finalIsChina = storedRecord 
      ? (storedRecord.country === 'CN' || storedRecord.country === 'cn' || !!storedRecord.is_china)
      : (ipInfoDetected.country === 'CN' || ipInfoDetected.country === 'cn' || ipInfoDetected.isChina === true);
    
    const response = storedRecord
      ? {
          ip: storedRecord.ip_address || clientIP,
          country: storedRecord.country ?? null,
          isChina: finalIsChina, // Force judgment based on country code
          detectedAt: formatDetectedAt(storedRecord.detected_at),
          recommendedRegion: finalIsChina ? 'cn' : 'global'
        }
      : {
          ip: clientIP,
          country: ipInfoDetected.country ?? null,
          isChina: finalIsChina, // Force judgment based on country code
          detectedAt: toChinaTimeISO(),
          recommendedRegion: finalIsChina ? 'cn' : 'global'
        };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 查询指定IP的信息
 */
const getIPInfo = async (req, res, next) => {
  try {
    const { ip } = req.params;
    
    if (!ip || ip === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }

    // 先查询数据库
    let ipRecord = await getIPRecord(ip);
    
    // 如果数据库中没有，进行检测并保存
    if (!ipRecord) {
      const ipInfo = detectIPLocation(ip);
      ipRecord = await saveIPRecord(ipInfo);
    }

    if (!ipRecord) {
      return res.status(404).json({
        success: false,
        error: 'IP information not found'
      });
    }

    // 从 Supabase 读取的数据，detected_at 已经是+8小时后的时间（保存时已经加过）
    // 所以直接返回，不要再次转换
    const formatDetectedAt = (dt) => {
      if (!dt) {
        return toChinaTimeISO(); // 如果没有时间，返回当前时间+8小时
      }
      if (dt instanceof Date) {
        // Date 对象，直接转换为 ISO 字符串（已经是+8小时后的时间）
        return dt.toISOString();
      }
      if (typeof dt === 'string') {
        // 字符串格式，直接返回（Supabase 保存时已经是+8小时后的时间）
        return dt;
      }
      return toChinaTimeISO(dt);
    };

    const response = {
      ip: ipRecord.ip_address,
      country: ipRecord.country,
      isChina: ipRecord.is_china,
      detectedAt: formatDetectedAt(ipRecord.detected_at),
      recommendedRegion: ipRecord.is_china ? 'cn' : 'global'
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  detectCurrentIP,
  getIPInfo
};

