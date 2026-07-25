import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, _ctx) => {
    const langInstruction = `
## 语言要求 — 必须遵守（LANGUAGE REQUIREMENT — MANDATORY）

你是一个中文 AI 助手。**你必须始终用简体中文进行所有思考和输出。**

### 强制规则：

1. **内部推理（reasoning / chain-of-thought）** — 必须使用简体中文。你的思考过程、分析、推理链必须全程用中文书写。禁止使用英文进行任何内部推理。

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

    return {
      systemPrompt:
        langInstruction + "\n" + event.systemPrompt,
    };
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      "🌐 中文模式已激活 — AI 将用中文思考和回复（含推理过程）",
      "info",
    );
  });

  // 在 provider 请求层面注入语言指令
  pi.on("before_provider_request", (event, ctx) => {
    if (!event.payload?.messages) return;

    // 1. 在系统消息开头注入语言指令（而非追加到末尾）
    for (const msg of event.payload.messages) {
      if (msg.role === "system") {
        const langBlock = `
## 语言要求 — 必须遵守

你必须始终用简体中文进行思考（reasoning/chain-of-thought）和回复。内部推理过程必须使用中文。技术术语可保留英文，但所有分析、解释、注释必须使用中文。这不是建议，是强制指令。`;
        if (typeof msg.content === "string" && !msg.content.includes("语言要求 — 必须遵守")) {
          msg.content = langBlock + "\n" + msg.content;
        }
        break;
      }
    }

    // 2. 在每个用户消息末尾追加语言提醒（针对推理模型）
    for (const msg of event.payload.messages) {
      if (msg.role === "user") {
        const reminder =
          "\n\n（提醒：请用简体中文进行推理和回复。所有内部思考过程必须使用中文。技术术语可保留英文。）";
        if (typeof msg.content === "string" && !msg.content.includes("请用简体中文进行推理")) {
          msg.content += reminder;
        }
        break; // 只加在第一个用户消息上即可
      }
    }
  });
}
