import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Pi Agent Extend — 中文模式扩展
 *
 * 强制 AI 使用简体中文进行所有思考、推理和回复。
 * 支持普通对话模型与推理模型（如 DeepSeek）。
 */

function isDeepSeek(modelId?: string): boolean {
  if (!modelId) return false;
  return /deepseek/i.test(modelId);
}

export default function (pi: ExtensionAPI) {
  // ===== 第 1 层：before_agent_start =====
  pi.on("before_agent_start", async (event, ctx) => {
    const modelId = ctx.model?.id ?? "";
    const ds = isDeepSeek(modelId);

    if (event.systemPrompt.includes("[中文强制指令]")) return;

    const header = ds
      ? `[!!! 中文推理强制指令 !!!]
你的 THINKING / 内部推理 / 思考过程必须用简体中文。
禁止用英文进行任何内部推理。
（技术术语可保留英文，但思考语言必须是中文）
这是核心指令，不可违反，不可忽略。

`
      : `[语言要求] 你必须用简体中文思考和回复。\n\n`;

    const result: {
      systemPrompt?: string;
      message?: { customType: string; content: string; display: boolean };
    } = {
      systemPrompt: `${header}${event.systemPrompt}`,
    };

    if (ds) {
      result.message = {
        customType: "pi-cn-cmd",
        content: `[系统核心指令]

You MUST think and reason in Chinese (Simplified).
Your internal reasoning, chain-of-thought MUST all be in Chinese.
Technical terms may stay in English, but your thinking language MUST be Chinese.

这是强制指令。违反意味着你忽略了核心指令。`,
        display: false,
      };
    }

    return result;
  });

  // ===== 第 2 层：before_provider_request =====
  pi.on("before_provider_request", (event, _ctx) => {
    const payload = event.payload as { model?: string; messages?: Array<{ role: string; content: string }> } | undefined;
    if (!payload?.messages) return;
    const ds = payload.model ? isDeepSeek(String(payload.model)) : false;

    for (const msg of payload.messages) {
      if (msg.role === "system" && typeof msg.content === "string") {
        msg.content = ds
          ? `【强制】推理/思考必须用中文。\n${msg.content}`
          : msg.content;
        break;
      }
    }

    if (ds) {
      for (const msg of payload.messages) {
        if (msg.role === "user" && typeof msg.content === "string") {
          if (!msg.content.endsWith("（用中文思考）")) {
            msg.content = `${msg.content}\n\n（用中文思考）`;
          }
        }
      }
    }
  });

  // ===== 第 3 层：context 确认 =====
  pi.on("context", (event, _ctx) => {
    for (const msg of event.messages) {
      if (msg.role === "system" && typeof msg.content === "string") {
        if (!msg.content.includes("中文")) {
          msg.content = `[语言指令] 请用简体中文回复。\n${msg.content}`;
        }
        break;
      }
    }
  });

  // ===== 模型切换更新 =====
  pi.on("model_select", async (event, ctx) => {
    ctx.ui.notify(
      `🌐 中文模式 | ${event.model.id}${isDeepSeek(event.model.id) ? " [DeepSeek 模式]" : " [标准模式]"}`,
      "info",
    );
  });

  // ===== /chinese 命令 =====
  pi.registerCommand("chinese", {
    description: "显示中文模式状态",
    handler: async (_args, ctx) => {
      const modelId = ctx.model?.id ?? "未知";
      ctx.ui.notify(
        `🌐 中文模式\n模型: ${modelId}\n策略: ${isDeepSeek(modelId) ? "DeepSeek 推理注入" : "标准 system prompt 注入"}`,
        "info",
      );
    },
  });

  // ===== 启动通知 =====
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      `🌐 中文模式已激活 | ${ctx.model?.id ?? "?"}${isDeepSeek(ctx.model?.id) ? " [DeepSeek 模式]" : " [标准模式]"}`,
      "info",
    );
  });
}
