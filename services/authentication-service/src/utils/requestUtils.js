const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
};

const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

module.exports = { getClientIp, getUserAgent };
