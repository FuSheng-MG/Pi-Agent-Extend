# Pi-Agent-Extend

Pi Coding Agent 扩展集合，增强 AI 助手的各项能力。

## 扩展列表

| 扩展 | 描述 |
|------|------|
| [Chinese Mode](./src/chinese-mode.ts) | 强制 AI 使用中文（简体中文）进行思考和回复，包括内部推理过程 |

---

## Chinese Mode (中文模式)

### 功能

强制 AI 使用**简体中文**进行所有推理、思考和回复。支持普通对话模型和推理模型（如 DeepSeek）。

### 架构：智能分层注入

扩展会自动检测当前模型，对不同类型的模型采用不同的注入策略：

#### 非 DeepSeek 模型（GPT、Claude 等）

| 层级 | 事件 | 策略 |
|------|------|------|
| 第 1 层 | `before_agent_start` | 语言指令**前置到 system prompt 开头**（模型更重视开头内容） |
| 第 2 层 | `context` | 每次 LLM 调用前插入一条 **system 级**语言指令 |
| 第 3 层 | `before_provider_request` | system 消息顶部 + 每条用户消息追加中文提醒 |
| 第 4 层 | `session_start` | 启动通知（确认扩展已加载） |

#### DeepSeek 模型（deepseek-v4-flash / deepseek-v4-pro）

DeepSeek 的 `thinking` 字段对 system prompt 不敏感，因此采用**用户消息级**注入：

| 层级 | 事件 | 策略 |
|------|------|------|
| 第 1 层 | `before_agent_start` | 语言指令前置到 system prompt 开头 + **注入隐藏的用户级指令消息** |
| 第 2 层 | `context` | 在第一个真实用户消息**之前插入一条 user 角色指令**（对 thinking 影响最大） |
| 第 3 层 | `before_provider_request` | system 消息顶部 + 每条用户消息追加中文推理提醒 |
| 第 4 层 | `session_start` | 启动通知 |

### 注入内容示例

DeepSeek 推理时实际接收到的指令：

```
[强制性系统指令 — 必须遵守]

我是你的系统管理员。以下指令适用于本次会话的所有交互：

1. 你的内部推理过程（thinking/reasoning/chain-of-thought）
   必须全部使用简体中文。
2. 你的最终回复必须使用简体中文。
3. 技术术语可以保留英文，但推理语言必须是中文。

请确认你理解：你的 thinking 字段必须是中文。
```

每轮对话注入：

```
[系统指令] 请用简体中文进行所有内部推理
（thinking/reasoning/chain-of-thought）。你的思考过程必须使用中文，
只有技术术语可以保留英文。这是强制要求。
```

### 保留英文不变的内容

- 技术术语（JavaScript、Promise、HTTP、API、JSON 等）
- 变量名、函数名、类名
- 库/框架/工具名称
- 文件路径、URL、命令行参数

### 安装方法

```bash
cp src/chinese-mode.ts ~/.pi/agent/extensions/
```

重启 Pi 后自动生效。

### 开发

```bash
npm install
npm run lint
```

## 许可证

[MIT](./LICENSE)
