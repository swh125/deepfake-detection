const { getClientIP, detectIPLocation } = require('../utils/ipDetector');

const checkGlobalRegion = (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  const clientIP = getClientIP(req);
  const ipInfo = detectIPLocation(clientIP);
  
  if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === 'localhost') {
    return next();
  }
  
  if (ipInfo.isChina) {

  }
  
  next();
};

module.exports = { checkGlobalRegion };

