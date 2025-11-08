const { getClientIP, detectIPLocation, shouldUseCNSystem } = require('../utils/ipDetector');
const { getIPRecord } = require('../services/ipService');

/**
 * IP detection middleware
 * Automatically detects user IP and adds region information to the request object
 */
const ipDetectionMiddleware = async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    
    // Query or detect IP information
    let ipRecord = await getIPRecord(clientIP);
    
    if (!ipRecord) {
      const ipInfo = detectIPLocation(clientIP);
      // Optionally save to database (avoid saving on every request)
      // await saveIPRecord(ipInfo);
      
      req.ipInfo = {
        ip: ipInfo.ip,
        country: ipInfo.country,
        isChina: ipInfo.isChina,
        recommendedRegion: ipInfo.isChina ? 'cn' : 'global'
      };
    } else {
      req.ipInfo = {
        ip: ipRecord.ip_address,
        country: ipRecord.country,
        isChina: ipRecord.is_china,
        recommendedRegion: ipRecord.is_china ? 'cn' : 'global'
      };
    }

    // Add region information to response header (optional)
    res.setHeader('X-Detected-Region', req.ipInfo.recommendedRegion);
    
    next();
  } catch (error) {
    // If IP detection fails, use default values
    req.ipInfo = {
      ip: 'unknown',
      country: null,
      isChina: false,
      recommendedRegion: 'global'
    };
    next();
  }
};

module.exports = {
  ipDetectionMiddleware
};
