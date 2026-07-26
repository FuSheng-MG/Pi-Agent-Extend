# Pi-Agent-Extend

🌐 **Pi Coding Agent 中文模式扩展** — 强制 AI 用简体中文思考和回复。

## 功能

- ✅ 强制 AI 用中文推理（thinking 字段）
- ✅ 支持 DeepSeek 推理模型（特殊注入策略）
- ✅ 支持普通对话模型（Claude、GPT 等）
- ✅ 无额外依赖，零配置

## 安装

```bash
pi install https://github.com/FuSheng-MG/Pi-Agent-Extend
```

重启 Pi 后自动生效。

## 架构：智能分层注入

### 标准模型（非 DeepSeek）
| 层级 | 事件 | 策略 |
|------|------|------|
| 第 1 层 | before_agent_start | system prompt 前置中文指令 |
| 第 2 层 | context | LLM 调用前确认中文指令 |
| 第 3 层 | model_select | 切换模型时更新 |

### DeepSeek 推理模型
| 层级 | 事件 | 策略 |
|------|------|------|
| 第 1 层 | before_agent_start | system prompt + 隐藏用户指令消息 |
| 第 2 层 | before_provider_request | 每条用户消息追加中文提醒 |
| 第 3 层 | context | system 消息确认 |
| 第 4 层 | model_select | 切换模型时更新 |

## 命令

| 命令 | 说明 |
|------|------|
| `/chinese` | 查看当前中文模式状态 |

## 许可证

[MIT](./LICENSE)
