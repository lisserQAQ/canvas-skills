# 🎨 Canvas Skills - 本地 React 沙箱

一个基于 MCP (Model Context Protocol) 的本地 React 代码沙箱，让 AI 助手（Claude Code、Gemini）能够在浏览器中实时渲染和预览 React 代码。

## ✨ 特性

- 🔌 **MCP Server**：通过 stdio 协议与 AI 客户端通信
- 🖥️ **双面板界面**：左侧代码编辑器 + 右侧实时预览
- 💾 **纯内存服务器**：代码存储在 RAM 中，零硬盘占用
- 📦 **100% 离线运行**：React、Babel、Tailwind 全部本地化
- ⚡ **实时编译**：使用 Babel 即时转译 JSX
- 🎯 **安全沙箱**：iframe 隔离执行环境
- ⚙️ **可视化设置**：通过界面修改服务器配置
- 🤖 **无需 API Key**：AI 能力由客户端（Claude Code）提供

## 🎯 工作原理

```
用户 → Claude Code/Gemini → MCP Server (stdio) → 内存服务器 → 浏览器
```

1. 用户对 Claude Code 说："帮我创建一个待办事项应用"
2. Claude Code 调用 MCP 工具 `renderReactCanvas`
3. MCP Server 启动内存服务器，更新代码
4. 自动打开浏览器显示结果

---

## 📦 安装和部署

### 前置要求

- **Node.js**: 版本 >= 16.0.0
- **npm**: 版本 >= 7.0.0

### 完整安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/canvas-skills.git
cd canvas-skills

# 2. 安装依赖
npm install

# 3. 编译 TypeScript
npm run build

# 4. 启动服务器
npm start
(本命令只是为了检测该服务器可以正常启动,启动后可以使用目录中的pid文件看到服务器的pid并停止)
```

### 为什么需要编译？

这是一个 **TypeScript** 项目，源代码在 `src/` 目录，需要编译为 JavaScript 才能运行：

```
src/server.ts  →  (npm run build)  →  dist/server.js  →  (npm start)  →  运行
```

**重要**：
- ✅ `dist/` 目录不会提交到 Git（在 `.gitignore` 中）
- ✅ 每次克隆项目后都需要重新编译
- ✅ 修改代码后需要重新编译

---

## 🚀 快速开始

### 方式 1：配置 MCP Server（推荐）

#### 1. 编译项目

```bash
npm install
npm run build
```

#### 2. 配置 Claude Code

在 Claude Code 的配置文件中添加：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "canvas": {
      "command": "node",
      "args": [
        "D:/canvas-skills/dist/mcp-server.js"
      ]
    }
  }
}
```

> 💡 记得修改路径为你的实际路径！

#### 3. 重启 Claude Code

#### 4. 开始使用

在 Claude Code 中说：

```
帮我创建一个待办事项应用，使用 Tailwind CSS
```

Claude 会自动调用 Canvas 沙箱，在浏览器中打开结果！

### 方式 2：手动模式

```bash
# 启动服务器
npm start

# 打开浏览器
http://localhost:12345
```

在左侧编辑器中编写 React 代码，点击"刷新预览"或按 `Ctrl+S` 更新。

---

## 📖 使用指南

### MCP 工具

#### renderReactCanvas

**描述**: 在本地浏览器的 Canvas 沙箱中渲染 React 代码

**参数**:
- `code` (string, 必需): 完整的 React JSX 代码，必须包含 `render(App)`

**支持的功能**:
- ✅ React 18 + Hooks (useState, useEffect, etc.)
- ✅ Tailwind CSS 样式
- ✅ JSX 语法
- ✅ 实时预览
- ✅ 双面板编辑器

### 代码示例

#### 基础组件

```jsx
const App = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-blue-50">
      <h1 className="text-4xl font-bold text-blue-600">Hello Canvas!</h1>
    </div>
  );
};
render(App);
```

#### 带状态的组件

```jsx
const App = () => {
  const [count, setCount] = React.useState(0);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-5xl font-bold mb-4">{count}</h1>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        点击 +1
      </button>
    </div>
  );
};
render(App);
```

---

## ⚙️ 配置说明

### 配置文件

编辑 `config.json` 文件可以修改配置：

```json
{
  "server": {
    "port": 12345,              // 服务器端口
    "autoStopTimeout": 600000,  // 自动停止时间（毫秒）
    "host": "localhost"         // 监听地址
  },
  "mcp": {
    "name": "canvas",
    "version": "1.0.0"
  }
}
```

### 可视化设置

点击页面左上角的齿轮图标 ⚙️，可以通过界面修改配置：

- **服务器端口**：1024-65535
- **自动停止时间**：0-1440 分钟（0 表示永不停止）

修改后需要重启服务器才能生效。

### 配置项说明

#### server.port
- **类型**: `number`
- **默认值**: `12345`
- **说明**: 内存 HTTP 服务器的端口号

#### server.autoStopTimeout
- **类型**: `number` (毫秒)
- **默认值**: `600000` (10 分钟)
- **说明**: 服务器空闲多久后自动停止
- **常用值**:
  - `60000` - 1 分钟
  - `300000` - 5 分钟
  - `600000` - 10 分钟（默认）
  - `0` - 永不自动停止

---

## 🏗️ 项目架构

### 核心组件

```
┌─────────────────────────────────────────────────────────┐
│                    用户交互层                              │
├─────────────────────────────────────────────────────────┤
│  浏览器 (http://localhost:12345)                         │
│  ┌──────────────────┬──────────────────┐                │
│  │  代码编辑器       │   实时预览        │                │
│  │  (CodeMirror)    │  (iframe)        │                │
│  └──────────────────┴──────────────────┘                │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                  内存服务器层                              │
├─────────────────────────────────────────────────────────┤
│  Node.js HTTP Server (server.ts)                        │
│  ┌─────────────────────────────────────┐                │
│  │  RAM 变量: latestReactCode          │                │
│  │  API: /api/get-code                 │                │
│  │  API: /api/update-code              │                │
│  │  API: /api/get-config               │                │
│  │  API: /api/update-config            │                │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                  MCP Server 层                            │
├─────────────────────────────────────────────────────────┤
│  MCP Server (mcp-server.ts)                             │
│  ┌─────────────────────────────────────┐                │
│  │  Tool: renderReactCanvas            │                │
│  │  智能进程管理                         │                │
│  │  自动启动/停止服务器                  │                │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### 文件结构

```
canvas-skills/
├── src/                          # TypeScript 源代码
│   ├── server.ts                 # 内存 HTTP 服务器
│   ├── mcp-server.ts             # MCP Server 入口
│   ├── public/                   # 静态文件
│   │   ├── index.html            # 主页面（双面板）
│   │   └── sandbox.html          # React 沙箱
│   └── sandbox-assets/           # 离线依赖
│       ├── react.production.min.js
│       ├── react-dom.production.min.js
│       └── babel.min.js
├── dist/                         # 编译输出（自动生成）
│   ├── server.js
│   └── mcp-server.js
├── config.json                   # 服务器配置
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
└── README.md                     # 本文件
```

---

## 🔧 开发命令

```bash
# 编译 TypeScript
npm run build

# 启动服务器（需要先编译）
npm start

# 启动 MCP Server（用于 Claude Code/Gemini）
npm run mcp

# 开发模式（编译 + 启动）
npm run dev
```

---

## 🛠️ API 接口

### GET /api/get-code

获取当前内存中的代码

**响应：**
```json
{
  "code": "const App = () => { ... }"
}
```

### POST /api/update-code

更新内存中的代码

**请求体：**
```json
{
  "code": "const App = () => { ... }"
}
```

**响应：**
```json
{
  "success": true
}
```

### GET /api/get-config

获取当前配置

**响应：**
```json
{
  "server": {
    "port": 12345,
    "autoStopTimeout": 600000,
    "host": "localhost"
  },
  "mcp": {
    "name": "canvas",
    "version": "1.0.0"
  }
}
```

### POST /api/update-config

更新配置

**请求体：**
```json
{
  "server": {
    "port": 12345,
    "autoStopTimeout": 600000,
    "host": "localhost"
  },
  "mcp": {
    "name": "canvas",
    "version": "1.0.0"
  }
}
```

---

## 🎨 技术栈

- **后端**：Node.js + TypeScript + MCP SDK
- **前端**：React 18 + CodeMirror + Ant Design + Tailwind CSS
- **构建**：Babel（客户端实时转译）

---

## 🔒 安全特性

- iframe 沙箱隔离
- 代码仅在内存中执行
- 无文件系统访问
- CORS 保护

---

## 🐛 常见问题

### 问题 1：`npm start` 报错找不到文件

**错误信息**：
```
Error: Cannot find module 'D:\canvas-skills\dist\server.js'
```

**解决方法**：
```bash
npm run build  # 先编译
npm start      # 再启动
```

### 问题 2：端口被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::12345
```

**解决方法**：
1. 点击左上角齿轮图标修改端口号
2. 或者关闭占用端口的程序

### 问题 3：设置图标不显示

**原因**：Ant Design Icons 未加载

**解决方法**：检查网络连接，确保 CDN 可访问

### 问题 4：服务器提前停止

**原因**：浏览器缓存导致没有真正请求服务器

**解决方法**：
- 按 `Ctrl+Shift+R` 强制刷新
- 或在设置中增加自动停止时间

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 服务器启动时间 | < 1 秒 |
| 代码更新延迟 | < 50ms |
| 内存占用 | ~50MB |
| 离线依赖大小 | 2.9MB |
| 支持的代码大小 | 无限制（RAM） |

---

## 🎉 使用示例

### 在 Claude Code 中使用

```
用户: 帮我创建一个计数器组件

Claude: 我来为你创建一个计数器组件...
[自动调用 renderReactCanvas 工具]
✅ 已在浏览器中打开 Canvas 沙箱！
```

### 手动编辑模式

1. 启动服务器：`npm start`
2. 打开浏览器：`http://localhost:12345`
3. 在左侧编辑器中编写 React 代码
4. 点击"刷新预览"或按 `Ctrl+S`

---

## 📄 许可证

MIT

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 🎊 开始使用

配置好 MCP Server 后，在 Claude Code 中说：

```
创建一个登录表单
创建一个图片画廊
创建一个倒计时器
```

一切都是自动的！🚀
