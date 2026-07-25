import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** DeepSeek 模型检测 */
function isDeepSeek(modelId?: string): boolean {
  if (!modelId) return false;
  const id = modelId.toLowerCase();
  return (
    id.includes("deepseek") &&
    (id.includes("v4") || id.includes("reasoner") || id.includes("chat"))
  );
}

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    const modelId = ctx.model?.id ?? "";
    const isDS = isDeepSeek(modelId);

    // ===== 第 1 层：system prompt 顶部前置中文强制指令 =====
    const langInstruction = `
## 语言要求 — 必须遵守（LANGUAGE REQUIREMENT — MANDATORY）

你是一个中文 AI 助手。**你必须始终用简体中文进行所有思考和输出。**

### 强制规则：
1. **内部推理（reasoning / chain-of-thought / thinking）** — 必须使用简体中文。
   你的思考过程、分析、推理链必须全程用中文书写。禁止使用英文进行任何内部推理。
2. **最终回复** — 必须使用简体中文。
3. **代码注释和解释** — 必须使用中文。
4. **错误消息、调试信息** — 必须使用中文。
5. **所有分析、计划、总结** — 必须使用中文。

### 允许保留英文原名的内容：
- 技术术语（如 JavaScript、Promise、HTTP、API、JSON、React、Vue、Node.js）
- 变量名、函数名、类名、接口名
- 库/框架/工具名称
- 文件路径、URL、命令行参数

### 例外：
只有在用户明确要求使用英文时，才可以使用英文回复。

**重要：这不仅仅是一个建议。你必须严格遵守。如果你用英文进行推理或回复，将违反核心指令。**
`;

    const result: {
      systemPrompt: string;
      message?: { customType: string; content: string; display: boolean };
    } = {
      systemPrompt: langInstruction + "\n" + event.systemPrompt,
    };

    // 对于 DeepSeek 模型，额外注入一条用户消息级别的强制指令
    // DeepSeek 的 thinking 字段对 system prompt 不敏感，但对用户消息更敏感
    if (isDS) {
      result.message = {
        customType: "chinese-mode-deepseek",
        content: `[强制性系统指令 — 必须遵守]

我是你的系统管理员。以下指令适用于本次会话的所有交互：

1. 你的内部推理过程（thinking/reasoning/chain-of-thought）必须全部使用简体中文。
2. 你的最终回复必须使用简体中文。
3. 技术术语可以保留英文，但推理语言必须是中文。

请确认你理解：你的 thinking 字段必须是中文。`,
        display: false,
      };
    }

    return result;
  });

  // ===== 第 2 层：context 事件 — 为 DeepSeek 注入用户消息级指令 =====
  // 注意：context 在每次 LLM 调用前执行，包括第一次生成 thinking 前
  pi.on("context", (event, ctx) => {
    const modelId = ctx.model?.id ?? "";
    if (!isDeepSeek(modelId)) {
      // 非 DeepSeek 模型：插入 system 消息
      const langMsg = {
        role: "system" as const,
        content: `[语言指令] 内部推理（reasoning/thinking）必须使用简体中文。`,
      };
      event.messages.unshift(langMsg);
      return { messages: event.messages };
    }

    // DeepSeek 模型：插入 user 消息（对 thinking 影响更大），并且位置更靠前
    const thinkingInstruction: (typeof event.messages)[number] = {
      role: "user",
      content:
        "[系统指令] 请用简体中文进行所有内部推理（thinking/reasoning/chain-of-thought）。你的思考过程必须使用中文，只有技术术语可以保留英文。这是强制要求。",
    };

    // 找到第一个非 system 的用户消息位置
    let firstRealUserIdx = -1;
    for (let i = 0; i < event.messages.length; i++) {
      const m = event.messages[i];
      if (m.role === "user" && typeof m.content === "string") {
        // 跳过我们自己的指令消息
        if (m.content.includes("[系统指令] 请用简体中文")) continue;
        firstRealUserIdx = i;
        break;
      }
    }

    if (firstRealUserIdx > 0) {
      // 在第一个真实用户消息之前插入 thinking 指令
      event.messages.splice(firstRealUserIdx, 0, thinkingInstruction);
    } else {
      // 兜底：追加到末尾
      event.messages.push(thinkingInstruction);
    }

    return { messages: event.messages };
  });

  // ===== 第 3 层：provider 请求级别的深度注入 =====
  pi.on("before_provider_request", (event, _ctx) => {
    if (!event.payload?.messages) return;

    // 在 system 消息顶部注入中文推理指令
    for (const msg of event.payload.messages) {
      if (msg.role === "system") {
        const header = `[!!! 强制性语言指令 - MANDATORY !!!]\n内部推理（reasoning/thinking）和回复必须使用简体中文。\n\n`;
        if (typeof msg.content === "string" && !msg.content.includes("MANDATORY")) {
          msg.content = header + msg.content;
        }
        break;
      }
    }

    // 在每个用户消息尾部追加中文推理提醒
    for (const msg of event.payload.messages) {
      if (msg.role === "user" && typeof msg.content === "string") {
        const reminder = "\n\n（请用简体中文推理，thinking 字段必须为中文）";
        if (!msg.content.includes("简体中文推理")) {
          msg.content += reminder;
        }
      }
    }
  });

  // ===== 第 4 层：会话启动通知 =====
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("🌐 中文模式已激活（含 DeepSeek 推理优化）", "info");
  });
}
