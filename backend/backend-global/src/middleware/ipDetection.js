const { getClientIP, detectIPLocation, shouldUseCNSystem } = require('../utils/ipDetector');
const { getIPRecord } = require('../services/ipService');

/**
 * IP detection middleware
 * Automatically detects user IP and adds region information to the request object
 */
const ipDetectionMiddleware = async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    
    // 查询或检测IP信息
    let ipRecord = await getIPRecord(clientIP);
    
    if (!ipRecord) {
      const ipInfo = detectIPLocation(clientIP);
      // 这里可以选择性地保存到数据库（避免每次请求都保存）
      // await saveIPRecord(ipInfo);
      
      req.ipInfo = {
        ip: ipInfo.ip,
        country: ipInfo.country,
        region: ipInfo.region,
        city: ipInfo.city,
        isChina: ipInfo.isChina,
        recommendedRegion: ipInfo.isChina ? 'cn' : 'global'
      };
    } else {
      req.ipInfo = {
        ip: ipRecord.ip_address,
        country: ipRecord.country,
        region: ipRecord.region_name,
        city: ipRecord.city,
        isChina: ipRecord.is_china,
        recommendedRegion: ipRecord.is_china ? 'cn' : 'global'
      };
    }

    // 在响应头中添加地区信息（可选）
    res.setHeader('X-Detected-Region', req.ipInfo.recommendedRegion);
    
    next();
  } catch (error) {
    // 如果IP检测失败，使用默认值
    req.ipInfo = {
      ip: 'unknown',
      country: null,
      region: null,
      city: null,
      isChina: false,
      recommendedRegion: 'global'
    };
    next();
  }
};

module.exports = {
  ipDetectionMiddleware
};

