# Pi-Agent-Extend

Pi Coding Agent 扩展集合，增强 AI 助手的各项能力。

## 扩展列表

| 扩展 | 描述 |
|------|------|
| [Chinese Mode](./src/chinese-mode.ts) | 强制 AI 使用中文（简体中文）进行思考和回复，包括内部推理过程 |

---

## Chinese Mode (中文模式)

### 功能

本扩展为 Pi Coding Agent 添加了完整的中文语言支持：

- **全中文回复** — 所有对话输出使用简体中文
- **中文推理链** — 强制 AI 的内部思维/推理过程使用中文
- **代码注释中文** — 代码注释、解释、调试信息均为中文
- **Provider 级注入** — 在 `before_provider_request` 钩子中额外注入语言指令，确保推理模型也能收到
- **启动通知** — 会话启动时显示中文模式已激活的通知

### 保留英文不变的内容

- 技术术语（JavaScript、Promise、HTTP、API、JSON 等）
- 变量名、函数名、类名
- 库/框架/工具名称

### 安装方法

#### 方式一：复制到扩展目录

```bash
cp src/chinese-mode.ts ~/.pi/agent/extensions/
```

#### 方式二：安装为 npm 包（待发布后）

```bash
npm install pi-agent-extend
```

### 开发

```bash
# 安装依赖
npm install

# TypeScript 类型检查
npm run lint
```

## 许可证

[MIT](./LICENSE)
