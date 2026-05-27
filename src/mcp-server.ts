import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, ChildProcess } from 'child_process';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载配置
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const SERVER_PORT = config.server.port;
const AUTO_STOP_TIMEOUT = config.server.autoStopTimeout; // 5分钟 = 300000ms
const PID_FILE = path.join(__dirname, '../.server.pid');

// 🚀 创建 MCP Server
const server = new Server(
  {
    name: config.mcp.name,
    version: config.mcp.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 内存服务器进程管理
let serverProcess: ChildProcess | null = null;

// 检查服务器是否已运行
async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${SERVER_PORT}/api/get-code`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 读取 PID 文件
function readPidFile(): number | null {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {
    return null;
  }
  return null;
}

// 写入 PID 文件
function writePidFile(pid: number) {
  try {
    fs.writeFileSync(PID_FILE, pid.toString(), 'utf-8');
  } catch (error) {
    console.error('写入 PID 文件失败:', error);
  }
}

// 删除 PID 文件
function deletePidFile() {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (error) {
    console.error('删除 PID 文件失败:', error);
  }
}

// 检查进程是否存在
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0); // 信号 0 只检查进程是否存在，不杀死
    return true;
  } catch {
    return false;
  }
}

// 杀死旧进程
function killOldProcess(pid: number) {
  try {
    if (isProcessRunning(pid)) {
      process.kill(pid, 'SIGTERM');
      console.error(`✅ 已停止旧的服务器进程 (PID: ${pid})`);
    }
  } catch (error) {
    console.error('停止旧进程失败:', error);
  }
}

// 停止内存服务器
function stopMemoryServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    deletePidFile();
    console.error('🛑 内存服务器已停止');
  }
}

// 启动内存服务器
async function startMemoryServer(): Promise<void> {
  // 1. 检查服务器是否已运行
  const running = await isServerRunning();
  if (running) {
    console.error('✅ 内存服务器已在运行，无需重新启动');
    return;
  }

  // 2. 检查是否有僵尸进程
  const oldPid = readPidFile();
  if (oldPid) {
    if (isProcessRunning(oldPid)) {
      console.error(`⚠️  发现旧进程 (PID: ${oldPid})，正在停止...`);
      killOldProcess(oldPid);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待进程停止
    } else {
      deletePidFile(); // 清理无效的 PID 文件
    }
  }

  // 3. 启动新的服务器进程
  return new Promise<void>((resolve, reject) => {
    serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    if (!serverProcess.pid) {
      reject(new Error('无法获取服务器进程 PID'));
      return;
    }

    // 写入 PID 文件
    writePidFile(serverProcess.pid);

    serverProcess.stdout?.on('data', (data) => {
      console.error(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (error: Error) => {
      console.error('❌ 服务器启动失败:', error);
      deletePidFile();
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      console.error(`🛑 服务器进程退出 (code: ${code})`);
      serverProcess = null;
      deletePidFile();
    });

    // 等待服务器启动
    setTimeout(async () => {
      const isRunning = await isServerRunning();
      if (isRunning) {
        console.error(`✅ 内存服务器已启动 (PID: ${serverProcess?.pid})`);
        resolve();
      } else {
        reject(new Error('服务器启动超时'));
      }
    }, 2000);
  });
}

// 📋 注册工具：列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'renderReactCanvas',
        description: '在本地浏览器的 Canvas 沙箱中渲染 React 代码。支持 JSX、Hooks、Tailwind CSS。代码会在双面板界面中显示：左侧是代码编辑器，右侧是实时预览。服务器会在空闲 5 分钟后自动停止。',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '完整的 React JSX 代码，必须包含 render(App) 来渲染组件。可以使用 React.useState, useEffect 等 Hooks，以及 Tailwind CSS 类名。',
            },
          },
          required: ['code'],
        },
      },
    ],
  };
});

// 🔧 注册工具：执行工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'renderReactCanvas') {
    try {
      const code = request.params.arguments?.code as string;

      if (!code) {
        throw new Error('缺少 code 参数');
      }

      // 确保服务器已启动
      await startMemoryServer();

      // 更新内存服务器中的代码
      const response = await fetch(`http://localhost:${SERVER_PORT}/api/update-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`更新代码失败: ${response.statusText}`);
      }

      // 打开浏览器
      await open(`http://localhost:${SERVER_PORT}`);

      return {
        content: [
          {
            type: 'text',
            text: `✅ 成功！Canvas 沙箱已在浏览器中打开。\n\n📊 代码统计：\n- 代码长度: ${code.length} 字符\n- 代码行数: ${code.split('\n').length} 行\n\n🌐 访问地址: http://localhost:${SERVER_PORT}\n\n💡 提示：\n- 左侧是代码编辑器，可以手动修改代码\n- 右侧是实时预览，点击"刷新预览"或按 Ctrl+S 更新\n- 代码存储在内存中，重启服务器会清空\n- 服务器会在空闲 ${AUTO_STOP_TIMEOUT / 60000} 分钟后自动停止`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 错误: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`未知工具: ${request.params.name}`);
});

// 🚀 启动 MCP Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Canvas Sandbox MCP Server 已启动 (stdio)');
  console.error(`配置: 端口 ${SERVER_PORT}, 自动停止 ${AUTO_STOP_TIMEOUT / 60000} 分钟`);
}

// 清理函数
process.on('SIGINT', () => {
  console.error('\n收到 SIGINT 信号，正在清理...');
  stopMemoryServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n收到 SIGTERM 信号，正在清理...');
  stopMemoryServer();
  process.exit(0);
});

process.on('exit', () => {
  stopMemoryServer();
});

main().catch((error) => {
  console.error('启动失败:', error);
  stopMemoryServer();
  process.exit(1);
});
