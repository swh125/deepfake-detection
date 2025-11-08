const geoip = require('geoip-lite');
const requestIp = require('request-ip');
const ipaddr = require('ipaddr.js');

/**
 * Extract client IP address from request
 * Priority to get real IP from request headers (if there is proxy/load balancer)
 */
const getClientIP = (req) => {
  // Try to get real IP from various request headers (by priority)
  let ip = 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] || // Cloudflare
    req.headers['x-client-ip'] ||
    null;
  
  // If not found in headers, use request-ip library
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    ip = requestIp.getClientIp(req);
  }
  
  // If IPv4-mapped IPv6 address, extract IPv4 part
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // If local address, try to get real IP via API
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown') {
    // Return a special marker to let caller know API detection is needed
    return 'needs-api-detection';
  }
  
  return ip || req.ip || req.connection?.remoteAddress || 'unknown';
};

/**
 * Get client real IP via API (when local detection fails)
 */
const getRealIPFromAPI = async () => {
  try {
    const response = await require('axios').get('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {

    return null;
  }
};

/**
 * Detect IP geolocation
 */
const detectIPLocation = (ip) => {
  // Skip local IP and private IP
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === 'localhost') {
    return {
      ip,
      country: null,
      region: null,
      city: null,
      isChina: false,
      latitude: null,
      longitude: null,
      source: 'local'
    };
  }

  // Check if private IP
  try {
    const addr = ipaddr.process(ip);
    if (addr.kind() === 'ipv6' || addr.range() === 'private' || addr.range() === 'linkLocal') {
      return {
        ip,
        country: null,
        region: null,
        city: null,
        isChina: false,
        latitude: null,
        longitude: null,
        source: 'private'
      };
    }
  } catch (e) {
    // If parsing fails, continue using geoip-lite
  }

  // Use geoip-lite to detect
  const geo = geoip.lookup(ip);
  
  if (!geo) {
    return {
      ip,
      country: null,
      region: null,
      city: null,
      isChina: false,
      latitude: null,
      longitude: null,
      source: 'geoip-lite-failed'
    };
  }

  const isChina = geo.country === 'CN';
  
  return {
    ip,
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    isChina,
    latitude: geo.ll ? geo.ll[0] : null,
    longitude: geo.ll ? geo.ll[1] : null,
    source: 'geoip-lite'
  };
};

/**
 * Determine if should use China system
 */
const shouldUseCNSystem = (ipInfo) => {
  return ipInfo.isChina === true;
};

module.exports = {
  getClientIP,
  detectIPLocation,
  shouldUseCNSystem,
  getRealIPFromAPI
};

