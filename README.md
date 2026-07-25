# Pi-Agent-Extend

Pi Coding Agent 扩展集合，增强 AI 助手的各项能力。

## 扩展列表

| 扩展 | 描述 |
|------|------|
| [Chinese Mode](./src/chinese-mode.ts) | 🌐 强制 AI 使用中文思考和回复（含推理模型 DeepSeek 优化） |
| [Vision Mode](./src/vision-mode.ts) | 👁️ 图片识别：截屏、图片分析、URL 图片获取 |

---

## 🌐 Chinese Mode（中文模式）

### 功能

强制 AI 使用**简体中文**进行所有推理、思考和回复。支持普通对话模型和推理模型（如 DeepSeek）。

### 架构：智能分层注入

扩展会自动检测当前模型，对不同类型的模型采用不同的注入策略：

#### 非 DeepSeek 模型（GPT、Claude 等）

| 层级 | 事件 | 策略 |
|------|------|------|
| 第 1 层 | `before_agent_start` | 语言指令**前置到 system prompt 开头** |
| 第 2 层 | `context` | 每次 LLM 调用前插入 **system 级**语言指令 |
| 第 3 层 | `before_provider_request` | system 消息顶部 + 每条用户消息追加提醒 |
| 第 4 层 | `session_start` | 启动通知 |

#### DeepSeek 模型（deepseek-v4-flash / deepseek-v4-pro）

DeepSeek 的 `thinking` 字段对 system prompt 不敏感，因此采用**用户消息级**注入：

| 层级 | 事件 | 策略 |
|------|------|------|
| 第 1 层 | `before_agent_start` | 前置语言指令 + **注入隐藏的用户级指令消息** |
| 第 2 层 | `context` | 在第一个用户消息**之前插入 user 角色指令** |
| 第 3 层 | `before_provider_request` | system 消息顶部 + 每条用户消息追加中文提醒 |
| 第 4 层 | `session_start` | 启动通知 |

### 安装

```bash
cp src/chinese-mode.ts ~/.pi/agent/extensions/
```

重启 Pi 后自动生效。

---

## 👁️ Vision Mode（图片识别）

### 功能

让 AI 能够"看见"屏幕内容和图片文件。

### 工具列表

| 工具 | 描述 |
|------|------|
| `capture_screen` | 截取屏幕（全屏 / 指定区域），自动发给模型分析 |
| `analyze_image` | 分析本地图片文件（PNG/JPG/WebP/GIF/BMP） |
| `fetch_image` | 从 URL 下载图片并进行分析 |
| `find_images` | 在目录中搜索所有支持的图片文件 |

### 使用示例

```
# 截取全屏
> capture_screen — 截图并告诉我看到了什么

# 截取特定区域
> capture_screen region=0,0,800,600 — 分析左上角区域

# 分析本地图片
> analyze_image path=./screenshot.png — 这张图里有什么？

# 从 URL 分析图片
> fetch_image url=https://example.com/chart.png — 这个图表的数据趋势是什么？
```

### 安装

```bash
cp src/vision-mode.ts ~/.pi/agent/extensions/
```

重启 Pi 后自动生效。

---

## 项目结构

```
Pi-Agent-Extend/
├── src/
│   ├── chinese-mode.ts      # 🌐 中文模式扩展
│   └── vision-mode.ts       # 👁️ 图片识别扩展
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── .gitignore
```

## 开发

```bash
npm install
npm run lint
```

## 许可证

[MIT](./LICENSE)
