import fs from "fs/promises";
import path from "path";

function norm(v: unknown): string {
  return String(v || "").trim().replace(/^["']|["']$/g, "");
}

function isMoonshotHost(url: string): boolean {
  return /moonshot\.(ai|cn)/i.test(url);
}

/**
 * 选择用于 Whisper 类「POST /v1/audio/transcriptions」的密钥与 baseUrl。
 * Moonshot/Kimi 开放平台不提供该接口，仅用 KIMI_API_KEY 无法完成真实语音转文字。
 */
function resolveOpenAiCompatibleAsr(): { baseUrl: string; apiKey: string } | null {
  const asrKey = norm(process.env.ASR_API_KEY);
  const asrBase = norm(process.env.ASR_BASE_URL);
  const openaiKey = norm(process.env.OPENAI_API_KEY);
  const openaiBase = norm(process.env.OPENAI_API_BASE) || norm(process.env.OPENAI_BASE_URL);

  if (asrKey) {
    const base = (asrBase || "https://api.openai.com/v1").replace(/\/$/, "");
    if (isMoonshotHost(base)) {
      console.warn(
        "[ASR] ASR_BASE_URL 指向 Moonshot/Kimi，该平台不提供 /v1/audio/transcriptions。请改用 OPENAI_API_KEY，或将 ASR_BASE_URL 设为支持该接口的服务（如 https://api.openai.com/v1）。",
      );
      return null;
    }
    return { baseUrl: base, apiKey: asrKey };
  }
  if (openaiKey) {
    const base = (openaiBase || "https://api.openai.com/v1").replace(/\/$/, "");
    return { baseUrl: base, apiKey: openaiKey };
  }
  const kimiOnly = norm(process.env.KIMI_API_KEY) || norm(process.env.MOONSHOT_API_KEY);
  if (kimiOnly) {
    console.warn(
      "[ASR] 已配置 KIMI/MOONSHOT 密钥，但该平台不提供语音转文字 HTTP 接口。请在 server/.env 增加 OPENAI_API_KEY（推荐），或配置 ASR_API_KEY + ASR_BASE_URL（须支持 POST /v1/audio/transcriptions）。开发演示可设 MOCK_ASR_TEXT。",
    );
  }
  return null;
}

async function transcribeBlob(blob: Blob, filename: string): Promise<string | null> {
  if (process.env.MOCK_ASR_TEXT) return process.env.MOCK_ASR_TEXT.trim();

  const cfg = resolveOpenAiCompatibleAsr();
  if (!cfg) return null;

  const model = norm(process.env.ASR_MODEL) || "whisper-1";
  const language = norm(process.env.ASR_LANGUAGE) || "zh";

  const safeName = path.basename(filename || "voice.mp3") || "voice.mp3";
  const fd = new FormData();
  fd.append("file", blob, safeName);
  fd.append("model", model);
  fd.append("language", language);

  try {
    const resp = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      body: fd,
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.warn("[ASR] transcription failed:", resp.status, detail.slice(0, 500));
      return null;
    }
    const data = (await resp.json()) as { text?: string };
    const text = norm(data?.text);
    return text || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR] transcription error:", msg);
    return null;
  }
}

async function fetchAudioBlob(voiceUrl: string): Promise<{ blob: Blob; filename: string } | null> {
  if (!/^https?:\/\//i.test(voiceUrl)) return null;
  const resp = await fetch(voiceUrl);
  if (!resp.ok) return null;
  const buf = await resp.arrayBuffer();
  const filename = path.basename(new URL(voiceUrl).pathname || "voice.mp3") || "voice.mp3";
  const contentType = resp.headers.get("content-type") || "audio/mpeg";
  return { blob: new Blob([buf], { type: contentType }), filename };
}

/**
 * 同进程刚落盘的录音：直接读文件转写，不依赖 PUBLIC_BASE_URL 与本机端口一致。
 */
export async function speechToTextFromLocalPath(localPath: string, originalName?: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(localPath);
    const ext = path.extname(originalName || localPath) || ".mp3";
    const name = (originalName && path.basename(originalName)) || `voice${ext}`;
    const blob = new Blob([buf]);
    return transcribeBlob(blob, name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR] read local file error:", msg);
    return null;
  }
}

/**
 * 语音转文字：仅支持 OpenAI 兼容的 POST /v1/audio/transcriptions（如 OpenAI 官方或其它代理）。
 * 未配置有效密钥或调用失败时返回 null。
 */
export async function speechToTextFromUrl(voiceUrl: string): Promise<string | null> {
  if (process.env.MOCK_ASR_TEXT) return process.env.MOCK_ASR_TEXT.trim();
  if (!resolveOpenAiCompatibleAsr()) return null;
  try {
    const audio = await fetchAudioBlob(voiceUrl);
    if (!audio) return null;
    return transcribeBlob(audio.blob, audio.filename);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR] transcription error:", msg);
    return null;
  }
}
