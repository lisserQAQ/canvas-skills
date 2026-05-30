import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const PORT = config.server.port;
const AUTO_STOP_TIMEOUT = config.server.autoStopTimeout;
const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

// 🚀 核心：代码只存在这个 RAM 变量里！
let latestReactCode: string = `const App = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-indigo-600 mb-4">Canvas 准备就绪！</h1>
        <p className="text-xl text-gray-600">开始你的 React 创作之旅</p>
      </div>
    </div>
  );
};
render(App);`;

let autoStopTimer: NodeJS.Timeout | null = null;

function resetAutoStopTimer() {
  if (AUTO_STOP_TIMEOUT <= 0) {
    return;
  }

  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }

  const now = new Date().toLocaleTimeString('zh-CN');
  console.log(`🔄 [${now}] 计时器已重置，将在 ${AUTO_STOP_TIMEOUT / 60000} 分钟后自动停止`);

  autoStopTimer = setTimeout(() => {
    const stopTime = new Date().toLocaleTimeString('zh-CN');
    console.log(`⏰ [${stopTime}] 服务器空闲 ${AUTO_STOP_TIMEOUT / 1000} 秒，自动停止...`);
    server.close(() => {
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(0);
    }, 1000).unref();
  }, AUTO_STOP_TIMEOUT);
}

const server = http.createServer((req, res) => {
  const now = new Date().toLocaleTimeString('zh-CN');
  console.log(`📥 [${now}] ${req.method} ${req.url}`);

  resetAutoStopTimer();

  // CORS: restrict to same-origin (localhost)
  const allowedOrigin = `http://localhost:${PORT}`;
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. API: 获取最新代码
  if (req.url === '/api/get-code') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: latestReactCode }));
    return;
  }

  // 2. API: 更新代码
  if (req.url === '/api/update-code' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (typeof data.code !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid code field' }));
          return;
        }
        latestReactCode = data.code;
        console.log('✅ 代码已更新到内存');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 3. API: 获取配置
  if (req.url === '/api/get-config') {
    try {
      const configData = fs.readFileSync(configPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(configData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read config' }));
    }
    return;
  }

  // 4. API: 更新配置
  if (req.url === '/api/update-config' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const newConfig = JSON.parse(body);

        // 验证配置结构和类型
        if (!newConfig.server || !newConfig.mcp) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid config format' }));
          return;
        }

        const port = newConfig.server.port;
        const timeout = newConfig.server.autoStopTimeout;
        if (typeof port !== 'number' || port < 1024 || port > 65535) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Port must be a number between 1024 and 65535' }));
          return;
        }
        if (typeof timeout !== 'number' || timeout < 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'autoStopTimeout must be a non-negative number' }));
          return;
        }

        // Only persist the known config shape
        const safeConfig = {
          server: {
            port,
            autoStopTimeout: timeout,
            host: typeof newConfig.server.host === 'string' ? newConfig.server.host : 'localhost'
          },
          mcp: {
            name: typeof newConfig.mcp.name === 'string' ? newConfig.mcp.name : config.mcp.name,
            version: typeof newConfig.mcp.version === 'string' ? newConfig.mcp.version : config.mcp.version
          }
        };

        fs.writeFileSync(configPath, JSON.stringify(safeConfig, null, 2), 'utf-8');
        console.log('✅ 配置已保存到文件');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 5. 静态文件服务
  const publicDir = path.join(__dirname, '../public');
  const assetsDir = path.join(__dirname, '../src/sandbox-assets');

  let filePath = '';
  let contentType = 'text/html';

  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(publicDir, 'index.html');
  } else if (req.url === '/sandbox.html') {
    filePath = path.join(publicDir, 'sandbox.html');
  } else if (req.url?.startsWith('/assets/')) {
    const assetName = path.basename(req.url.replace('/assets/', ''));
    filePath = path.join(assetsDir, assetName);

    // Prevent path traversal
    if (!filePath.startsWith(assetsDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (assetName.endsWith('.js')) {
      contentType = 'application/javascript';
    } else if (assetName.endsWith('.css')) {
      contentType = 'text/css';
    }
  }

  if (filePath && fs.existsSync(filePath)) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Canvas 沙箱服务器已启动: http://localhost:${PORT}`);
  console.log(`📝 内存中的代码大小: ${(latestReactCode.length / 1024).toFixed(2)} KB`);
  console.log(`⏱️  空闲自动停止: ${AUTO_STOP_TIMEOUT / 60000} 分钟，请求任意资源都会续期`);
  resetAutoStopTimer();
});

process.on('SIGTERM', () => {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }

  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }

  server.close(() => {
    process.exit(0);
  });
});
