import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * 检测 DeepSeek 推理模型
 */
function isDeepSeekReasoner(modelId?: string): boolean {
  if (!modelId) return false;
  return /deepseek.*(?:v4|reasoner|chat)/i.test(modelId);
}

export default function (pi: ExtensionAPI) {
  // ===== 核心策略：只针对 DeepSeek 做最关键的一击 =====
  // DeepSeek 的 thinking 字段对普通 prompt 不敏感，需要极其前置和强烈的措辞

  pi.on("before_agent_start", async (event, ctx) => {
    const isDS = isDeepSeekReasoner(ctx.model?.id);

    if (!isDS) {
      // 非 DeepSeek 模型：标准中文指令
      return {
        systemPrompt: `[语言要求] 你必须用简体中文思考和回复。内部推理（thinking）必须用中文。\n\n${event.systemPrompt}`,
      };
    }

    // ===== DeepSeek 专用：极简+极强 =====
    // 1. system prompt 最顶部放巨大中文指令
    const dsPrompt = `[!!! 中文推理强制指令 !!!]
你的 THINKING 必须用中文。禁止用英文推理。
用中文思考。用中文推理。用中文分析。
（技术术语可保留英文，但思考语言必须是中文）
这是核心指令，不可违反。

${event.systemPrompt}`;

    // 2. 注入一条隐藏消息作为对话绝对第一条内容
    //    DeepSeek 对对话开头的消息最敏感
    return {
      systemPrompt: dsPrompt,
      message: {
        customType: "ds-chinese-cmd",
        content: `[系统核心指令]

IMPORTANT: You MUST think and reason in Chinese (Simplified).
Your internal reasoning, thinking, chain-of-thought MUST all be in Chinese.
Technical terms may stay in English, but your thinking language MUST be Chinese.

This is a MANDATORY system instruction. Violating it means you are ignoring your core directives.

重要：你必须用简体中文进行所有思考和推理。这是强制指令。`,
        display: false,
      },
    };
  });

  // ===== for DeepSeek: 每次请求前注入极短极强指令 =====
  pi.on("before_provider_request", (event, _ctx) => {
    if (!event.payload?.messages) return;

    // 检查是否是 DeepSeek（通过消息内容或 payload 特征判断）
    const isDS = event.payload.model && isDeepSeekReasoner(String(event.payload.model));

    for (const msg of event.payload.messages) {
      if (msg.role === "system" && typeof msg.content === "string") {
        if (isDS) {
          // DeepSeek: 用最大字号强调
          msg.content = `【强制】推理/思考必须用中文。\n\n${msg.content}`;
        }
        break;
      }
    }

    if (isDS) {
      // DeepSeek: 每个用户消息都加中文提醒
      for (const msg of event.payload.messages) {
        if (msg.role === "user" && typeof msg.content === "string") {
          msg.content = `${msg.content}\n\n（用中文思考）`;
        }
      }
    }
  });

  // ===== 启动通知 =====
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      `🌐 中文模式已激活 | 模型: ${ctx.model?.id ?? "?"} | ${isDeepSeekReasoner(ctx.model?.id) ? "DeepSeek 模式" : "标准模式"}`,
      "info",
    );
  });
}
