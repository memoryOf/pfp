const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://backend:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      timeout: 120000, // 120秒超时
      proxyTimeout: 120000, // 代理超时
      ws: true, // 启用WebSocket代理
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        if (res && !res.headersSent) {
          if (res.writeHead) {
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
            res.end('Proxy error: ' + err.message);
          } else {
            // WebSocket 连接错误，不需要响应
            console.error('WebSocket proxy error:', err.message);
          }
        }
      }
    })
  );
};


