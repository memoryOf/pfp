const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://backend:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );
};
