import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, _ctx) => {
    // ===== 第 1 层：system prompt 顶部前置中文强制指令 =====
    const langInstruction = `
[SYSTEM INSTRUCTION — 必须遵守 / MANDATORY]

你是一个中文 AI 助手。你的所有输出必须使用简体中文。

████████████████████████████████████████████████████████████
  核心规则（CORE RULES）：
  1. 内部推理/思考（reasoning / chain-of-thought / thinking）
     必须使用简体中文。禁止用英文进行推理。
  2. 最终回复必须使用简体中文。
  3. 代码注释、错误消息、调试信息必须使用中文。
  4. 所有分析、计划、总结必须使用中文。
████████████████████████████████████████████████████████████

允许保留英文原名的内容：
- 技术术语（JavaScript, Promise, HTTP, API, JSON, React 等）
- 变量名、函数名、类名、接口名
- 库/框架/工具名称、文件路径、URL、命令行参数

例外：用户明确要求使用英文时，才可以用英文回复。
`;

    // 注入一个持久化的系统指令消息（对 DeepSeek 等推理模型尤为重要）
    const instructionMessage = {
      customType: "chinese-mode-instruction",
      content: `[系统指令 — 永久有效]
你是一个中文 AI 助手。你的内部推理（reasoning/thinking）和所有回复必须使用简体中文。
如果你用英文推理，将违反你的核心指令。

IMPORTANT: All your thinking, reasoning, and chain-of-thought must be in Chinese (Simplified).
Your final response must also be in Chinese.
Technical terms can remain in English, but everything else must be Chinese.`,
      display: false, // 不在 TUI 中显示
    };

    return {
      systemPrompt: langInstruction + "\n" + event.systemPrompt,
      message: instructionMessage,
    };
  });

  // ===== 第 2 层：每轮对话前注入推理语言提醒 =====
  pi.on("context", (event, _ctx) => {
    // 在最前面插入一条 system 级别的语言指令
    const langMsg = {
      role: "system" as const,
      content: `[强制性语言指令]
你的内部推理过程（reasoning / chain-of-thought / thinking）必须使用简体中文。
这是强制要求，不是建议。你输出的 thinking 字段必须是中文。`,
    };
    event.messages.unshift(langMsg);
    return { messages: event.messages };
  });

  // ===== 第 3 层：provider 请求级别的深度注入 =====
  pi.on("before_provider_request", (event, _ctx) => {
    if (!event.payload?.messages) return;

    // 在 system 消息顶部追加 DeepSeek 专用的中文推理指令
    for (const msg of event.payload.messages) {
      if (msg.role === "system") {
        const deepSeekLangBlock = `
[!!! 强制性语言指令 - MANDATORY LANGUAGE REQUIREMENT !!!]

你是一个中文 AI 助手。你的思考（reasoning）、推理（chain-of-thought）、分析过程必须全部使用简体中文。
禁止使用英文进行内部推理。

如果你使用英文进行推理，你正在违反核心指令（CORE DIRECTIVE VIOLATION）。

你的回复也必须使用简体中文。只有技术术语可保留英文。`;
        if (typeof msg.content === "string" && !msg.content.includes("MANDATORY LANGUAGE REQUIREMENT")) {
          msg.content = deepSeekLangBlock + "\n\n" + msg.content;
        }
        break;
      }
    }

    // 在每个用户消息尾部追加中文推理提醒（专门针对 DeepSeek 的 reasoning_content 字段）
    for (const msg of event.payload.messages) {
      if (msg.role === "user") {
        const reminder =
          "\n\n【推理语言要求】请用简体中文进行内部推理（thinking/reasoning）。你的思考过程必须使用中文。";
        if (typeof msg.content === "string" && !msg.content.includes("推理语言要求")) {
          msg.content += reminder;
        }
      }
    }
  });

  // ===== 第 4 层：会话启动通知 =====
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      "🌐 中文模式已激活 — 已注入 4 层中文强制指令（含 DeepSeek 推理优化）",
      "info",
    );
  });
}
