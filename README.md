# Pi-Agent-Extend

Pi Coding Agent 扩展集合，增强 AI 助手的各项能力。

## 扩展列表

| 扩展 | 描述 |
|------|------|
| [Chinese Mode](./src/chinese-mode.ts) | 强制 AI 使用中文（简体中文）进行思考和回复，包括内部推理过程 |

---

## Chinese Mode (中文模式)

### 功能

本扩展通过 **四层注入策略** 确保 AI 使用中文思考和回复：

| 层级 | 钩子 | 策略 |
|------|------|------|
| 🥇 第 1 层 | `before_agent_start` | **前置**语言指令到 system prompt **开头**（非追加末尾），模型更重视开头内容 |
| 🥇 第 2 层 | `session_start` | 启动通知，提示中文模式已激活 |
| 🥇 第 3 层 | `before_provider_request` | 在 system 消息开头**再次前置**语言指令，覆盖 provider 请求 |
| 🥇 第 4 层 | `before_provider_request` | 在每个用户消息末尾追加提醒，专门针对推理模型的 reasoning 字段 |

### 保留英文不变的内容

- 技术术语（JavaScript、Promise、HTTP、API、JSON 等）
- 变量名、函数名、类名
- 库/框架/工具名称
- 文件路径、URL、命令行参数

### 安装方法

```bash
cp src/chinese-mode.ts ~/.pi/agent/extensions/
```

### 开发

```bash
npm install
npm run lint
```

## 许可证

[MIT](./LICENSE)
