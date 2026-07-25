import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, _ctx) => {
    return {
      systemPrompt:
        event.systemPrompt +
        `

## 语言要求

你必须始终用中文（简体中文）思考和回复。

**覆盖所有输出形式：**
- 最终的对话回复必须用中文
- **内部推理/思维链过程（reasoning / chain-of-thought）必须用中文**
- 代码解释、错误消息、调试信息必须用中文
- 代码注释必须用中文
- 所有分析、计划、总结都必须用中文

**保留以下内容的英文原名不变：**
- 技术术语（如 JavaScript、Promise、HTTP、API、JSON）
- 变量名、函数名、类名
- 库/框架/工具名称

**例外：**
只有在用户明确要求使用英文时，才可以使用英文回复。`,
    };
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      "🌐 中文模式已激活 — AI 将用中文思考和回复（含推理过程）",
      "info",
    );
  });

  // 在 provider 请求层面额外注入语言指令，确保推理模型也能收到
  pi.on("before_provider_request", (event, _ctx) => {
    if (!event.payload?.messages) return;

    // 在系统消息末尾追加语言指令（如果系统消息存在）
    for (const msg of event.payload.messages) {
      if (msg.role === "system") {
        const langInstruction = "\n\n重要：你的整个推理过程（reasoning chain）必须用中文（简体中文）书写。你的内部思维链、分析和所有中间步骤都必须使用中文。";
        if (typeof msg.content === "string" && !msg.content.includes("推理过程")) {
          msg.content += langInstruction;
        }
        break;
      }
    }
  });
}
