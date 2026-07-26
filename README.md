# pi-cn-mode

U0001f310 **Pi Coding Agent 中文模式扩展** — 强制 AI 用简体中文思考和回复。

零配置，即装即用，支持 DeepSeek 等推理模型。

## 功能

- ✅ 强制 AI 用简体中文思考、推理和回复
- ✅ 支持 DeepSeek 推理模型（thinking 字段特殊注入）
- ✅ 支持普通对话模型（Claude、GPT 等）
- ✅ 模型切换时自动更新策略
- ✅ 零配置，无需 API Key
- ✅ 无额外系统依赖

## 安装

```bash
pi install https://github.com/FuSheng-MG/pi-cn-mode
```

重启 Pi 后自动生效。

## 架构

扩展自动检测当前模型类型，采用不同的注入策略：

### 标准模型（非 DeepSeek）

| 层级 | 触发点 | 策略 |
|------|--------|--------|
| 第 1 层 | before_agent_start | system prompt 前置中文指令 |
| 第 2 层 | context | LLM 调用前确认中文指令存在 |
| 第 3 层 | model_select | 切换模型时更新通知 |

### DeepSeek 推理模型

DeepSeek 的 thinking 字段对 system prompt 不敏感，采用消息级注入：

| 层级 | 触发点 | 策略 |
|------|--------|--------|
| 第 1 层 | before_agent_start | system prompt + 隐藏用户指令消息 |
| 第 2 层 | before_provider_request | 每条用户消息追加中文提醒 |
| 第 3 层 | context | system 消息确认 |
| 第 4 层 | model_select | 切换模型时更新 |

## 命令

→ `/cn` 或 `/chinese` 查看当前中文模式和注入策略

## 开发

```bash
git clone https://github.com/FuSheng-MG/pi-cn-mode
cd pi-cn-mode
npm install
npm run lint
```

## 许可证

[MIT](./LICENSE)
