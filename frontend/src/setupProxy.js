const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app, server) {
  // API 代理（包括 WebSocket）
  // 在 Docker 环境中使用 backend:8000，本地开发使用 127.0.0.1:8000（避免 IPv6 问题）
  const apiTarget = process.env.REACT_APP_API_URL || 'http://backend:8000';
  
  const apiProxy = createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    secure: false,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    timeout: 120000, // 120秒超时
    proxyTimeout: 120000, // 代理超时
    ws: true, // 启用WebSocket代理
    // 过滤掉 webpack-dev-server 的 HMR WebSocket
    filter: (pathname, req) => {
      // 不代理 /ws 路径（webpack-dev-server 的 HMR WebSocket）
      if (pathname === '/ws' || pathname.startsWith('/ws?')) {
        return false;
      }
      // 只代理 /api 路径
      return pathname.startsWith('/api');
    },
    onError: (err, req, res) => {
      // 忽略 webpack-dev-server 的 HMR WebSocket 连接错误
      if (req.url && (req.url.startsWith('/ws') || req.url === '/ws')) {
        return;
      }
      // 忽略 WebSocket 升级错误（这些可能是正常的连接关闭）
      if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ERR_STREAM_WRITE_AFTER_END') {
        return;
      }
      console.error('Proxy error:', err);
      if (res && !res.headersSent) {
        if (res.writeHead) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
          });
          res.end('Proxy error: ' + err.message);
        }
      }
    }
  });
  
  app.use('/api', apiProxy);
  
  // 处理 WebSocket 升级请求
  if (server) {
    server.on('upgrade', (req, socket, head) => {
      // 完全忽略 webpack-dev-server 的 HMR WebSocket (/ws)
      if (req.url === '/ws' || req.url.startsWith('/ws?')) {
        // webpack-dev-server 的 HMR WebSocket，不进行代理，让 webpack-dev-server 自己处理
        return;
      }
      // 只处理 /api 路径的 WebSocket 升级
      if (req.url && req.url.startsWith('/api')) {
        apiProxy.upgrade(req, socket, head);
      }
    });
  }
};


