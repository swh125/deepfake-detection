const { getClientIP, detectIPLocation } = require('../utils/ipDetector');

const checkCNRegion = (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  const clientIP = getClientIP(req);
  const frontendIP = req.query.ip || req.body.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  let ipToCheck = clientIP;
  
  if ((clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === 'localhost' || clientIP === 'needs-api-detection') && frontendIP) {
    if (frontendIP !== '127.0.0.1' && frontendIP !== '::1' && frontendIP !== 'localhost' && frontendIP !== 'needs-api-detection') {
      ipToCheck = frontendIP;
    }
  }
  
  if (ipToCheck === '127.0.0.1' || ipToCheck === '::1' || ipToCheck === 'localhost' || ipToCheck === 'needs-api-detection') {
    return next();
  }
  
  const ipInfo = detectIPLocation(ipToCheck);
  
  if (!ipInfo.isChina) {
    return res.status(403).json({
      success: false,
      error: 'This API is only for China region users',
      message: 'Please use the global API',
      detectedIP: ipToCheck,
      detectedCountry: ipInfo.country,
      globalApiUrl: process.env.GLOBAL_API_URL || 'https://global-api.vercel.app'
    });
  }
  
  next();
};

module.exports = { checkCNRegion };

