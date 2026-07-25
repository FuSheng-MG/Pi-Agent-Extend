import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Pi Vision Mode — 图片识别扩展
 *
 * 提供截屏和图片分析能力，让 AI 能够"看见"屏幕内容和图片文件。
 *
 * 工具：
 *   capture_screen   - 截取屏幕（全屏/窗口/区域）
 *   analyze_image    - 分析本地图片文件
 *   fetch_image      - 从 URL 获取图片并分析
 */

// ========== 工具函数 ==========

/** 生成临时文件路径 */
function tempPath(ext = "png"): string {
  return path.join(os.tmpdir(), `pi-vision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
}

/** 捕获 Windows 屏幕截图 */
function captureScreen(filename: string, region?: string): void {
  let psScript: string;

  if (region) {
    // 区域截图: region="x,y,width,height"
    const parts = region.split(",").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      throw new Error(`区域格式错误，应为: x,y,width,height (例如: 0,0,800,600)`);
    }
    const [x, y, w, h] = parts;
    psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(${w}, ${h})
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(${x}, ${y}, 0, 0, New-Object System.Drawing.Size(${w}, ${h}))
$bitmap.Save('${filename.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;
  } else {
    // 全屏截图
    psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size)
$bitmap.Save('${filename.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;
  }

  try {
    execSync(`powershell.exe -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`, {
      timeout: 15000,
      encoding: "utf-8",
    });
  } catch (e: unknown) {
    const err = e as Error;
    throw new Error(`截图失败: ${err.message}`);
  }

  // 验证文件
  if (!fs.existsSync(filename)) {
    throw new Error("截图失败：未生成文件");
  }

  const stat = fs.statSync(filename);
  if (stat.size === 0) {
    throw new Error("截图失败：文件为空");
  }
}

/** 获取图片信息 */
function getImageInfo(filePath: string): { width: number; height: number; sizeKB: number; format: string } {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const formatMap: Record<string, string> = {
    ".png": "PNG",
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".gif": "GIF",
    ".webp": "WebP",
    ".bmp": "BMP",
  };
  return {
    width: 0,
    height: 0,
    sizeKB: Math.round(stat.size / 1024),
    format: formatMap[ext] || ext.toUpperCase(),
  };
}

/** 支持的图片格式 */
const SUPPORTED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

// ========== 扩展入口 ==========

export default function (pi: ExtensionAPI) {
  // ===== 工具 1：截屏 =====
  pi.registerTool({
    name: "capture_screen",
    label: "Capture Screen",
    description:
      "截取屏幕截图并返回图片路径。支持全屏截图或指定区域。截图会自动发送给模型进行分析。适用于查看界面、调试 UI 问题、读取屏幕上显示的信息等场景。",
    parameters: Type.Object({
      region: Type.Optional(
        Type.String({
          description: '截取区域，格式: "x,y,width,height"。例如 "0,0,800,600" 截取左上角 800x600 区域。留空则截取全屏。',
        }),
      ),
      description: Type.Optional(
        Type.String({
          description: "你想要查看或分析什么？描述一下关注的重点，方便模型有针对性地分析截图内容。",
        }),
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { region, description } = params as { region?: string; description?: string };
      const outputPath = tempPath("png");

      try {
        onUpdate?.({ label: "capture_screen", message: "正在截取屏幕..." });
        captureScreen(outputPath, region);

        const info = getImageInfo(outputPath);
        const regionDesc = region ? `区域 [${region}]` : "全屏";

        return {
          content: [
            {
              type: "text",
              text: `📸 截图完成\n\n文件: ${outputPath}\n格式: ${info.format}\n大小: ${info.sizeKB} KB\n范围: ${regionDesc}\n\n${description ? `分析重点: ${description}` : "请查看截图并分析内容。"}`,
            },
          ],
          details: { filePath: outputPath, region, description },
        };
      } catch (e: unknown) {
        const err = e as Error;
        return {
          content: [{ type: "text", text: `❌ 截图失败: ${err.message}` }],
          isError: true,
          details: {},
        };
      }
    },
  });

  // ===== 工具 2：分析本地图片 =====
  pi.registerTool({
    name: "analyze_image",
    label: "Analyze Image",
    description:
      "分析指定的图片文件（PNG/JPG/WebP/GIF/BMP）。返回图片信息并通过模型视觉能力分析图片内容。适用于读取图片中的文字、识别界面元素、分析图表等场景。",
    parameters: Type.Object({
      path: Type.String({
        description: "图片文件的完整路径",
      }),
      question: Type.Optional(
        Type.String({
          description: "针对图片的具体问题。例如「这张图表显示了什么趋势？」「这个按钮的文字是什么？」",
        }),
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { path: imgPath, question } = params as { path: string; question?: string };

      // 检查文件是否存在
      if (!fs.existsSync(imgPath)) {
        return {
          content: [{ type: "text", text: `❌ 文件不存在: ${imgPath}` }],
          isError: true,
          details: {},
        };
      }

      // 检查格式
      const ext = path.extname(imgPath).toLowerCase();
      if (!SUPPORTED_IMAGE_EXTS.includes(ext)) {
        return {
          content: [{ type: "text", text: `❌ 不支持的图片格式: ${ext}。支持的格式: ${SUPPORTED_IMAGE_EXTS.join(", ")}` }],
          isError: true,
          details: {},
        };
      }

      const info = getImageInfo(imgPath);

      return {
        content: [
          {
            type: "text",
            text: `🖼️ 图片分析请求\n\n文件: ${imgPath}\n格式: ${info.format}\n大小: ${info.sizeKB} KB\n\n${question ? `问题: ${question}` : "请分析这张图片的内容。"}\n\n（请使用 read 工具查看此图片以获取视觉内容）`,
          },
        ],
        details: { filePath: imgPath, question, format: info.format, sizeKB: info.sizeKB },
      };
    },
  });

  // ===== 工具 3：从 URL 获取并分析图片 =====
  pi.registerTool({
    name: "fetch_image",
    label: "Fetch Image",
    description:
      "从 URL 下载图片并保存到本地，然后进行分析。适用于分析网页中的图片、图表、截图等。",
    parameters: Type.Object({
      url: Type.String({
        description: "图片的 URL 地址",
      }),
      question: Type.Optional(
        Type.String({
          description: "针对图片的具体问题。例如「这张图表的数据是什么？」",
        }),
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { url, question } = params as { url: string; question?: string };
      const outputPath = tempPath("png");

      try {
        onUpdate?.({ label: "fetch_image", message: "正在下载图片..." });

        // 使用 curl 下载
        execSync(`curl -s -o "${outputPath}" -L --max-time 30 "${url}"`, {
          timeout: 35000,
          encoding: "utf-8",
        });

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          throw new Error("下载失败：文件为空");
        }

        // 检查是否真的是图片（简单检查文件头）
        const buffer = Buffer.alloc(8);
        const fd = fs.openSync(outputPath, "r");
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);

        const isImage =
          buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 // PNG
          || (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) // JPEG
          || (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) // GIF
          || (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46); // WebP

        if (!isImage) {
          fs.unlinkSync(outputPath);
          return {
            content: [{ type: "text", text: `❌ URL 返回的不是图片（或格式不支持）: ${url}` }],
            isError: true,
            details: { url },
          };
        }

        const info = getImageInfo(outputPath);

        return {
          content: [
            {
              type: "text",
              text: `🌐 图片下载成功\n\n来源: ${url}\n保存到: ${outputPath}\n格式: ${info.format}\n大小: ${info.sizeKB} KB\n\n${question ? `问题: ${question}` : "请分析这张图片的内容。"}\n\n（请使用 read 工具查看此图片以获取视觉内容）`,
            },
          ],
          details: { url, filePath: outputPath, question, format: info.format, sizeKB: info.sizeKB },
        };
      } catch (e: unknown) {
        const err = e as Error;
        return {
          content: [{ type: "text", text: `❌ 获取图片失败: ${err.message}` }],
          isError: true,
          details: { url, error: err.message },
        };
      }
    },
  });

  // ===== 工具 4：列出支持的图片文件 =====
  pi.registerTool({
    name: "find_images",
    label: "Find Images",
    description: "在指定目录中查找所有支持的图片文件（PNG/JPG/WebP/GIF/BMP）。",
    parameters: Type.Object({
      directory: Type.Optional(
        Type.String({
          description: "要搜索的目录路径，默认为当前工作目录",
        }),
      ),
      maxResults: Type.Optional(
        Type.Number({
          description: "最大返回数量（默认 20）",
        }),
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { directory, maxResults } = params as { directory?: string; maxResults?: number };
      const dir = directory || ctx.cwd;
      const max = maxResults || 20;

      if (!fs.existsSync(dir)) {
        return {
          content: [{ type: "text", text: `❌ 目录不存在: ${dir}` }],
          isError: true,
          details: {},
        };
      }

      const results: Array<{ file: string; sizeKB: number }> = [];

      function walk(current: string, depth = 0) {
        if (depth > 3 || results.length >= max) return;
        try {
          const entries = fs.readdirSync(current, { withFileTypes: true });
          for (const entry of entries) {
            if (results.length >= max) return;
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("node_modules")) {
              walk(fullPath, depth + 1);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (SUPPORTED_IMAGE_EXTS.includes(ext)) {
                const stat = fs.statSync(fullPath);
                results.push({ file: fullPath, sizeKB: Math.round(stat.size / 1024) });
              }
            }
          }
        } catch {
          // 跳过无法读取的目录
        }
      }

      walk(dir);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `在 ${dir} 下未找到图片文件。` }],
          details: { directory: dir, count: 0 },
        };
      }

      const list = results
        .map((r) => `  ▸ ${r.file} (${r.sizeKB} KB)`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `在 ${dir} 下找到 ${results.length} 张图片:\n\n${list}\n\n${results.length >= max ? `（仅显示前 ${max} 张）` : ""}`,
          },
        ],
        details: { directory: dir, count: results.length, files: results },
      };
    },
  });

  // ===== 启动通知 =====
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      "👁️ Vision Mode 已加载 — 可用: capture_screen / analyze_image / fetch_image / find_images",
      "info",
    );
  });
}
