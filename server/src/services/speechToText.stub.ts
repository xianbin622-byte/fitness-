import fs from "fs/promises";
import path from "path";
import { transcribeBufferWithTencent, transcribeLocalFileWithTencent } from "./tencentSentenceAsr";

function norm(v: unknown): string {
  return String(v || "").trim().replace(/^["']|["']$/g, "");
}

function isMoonshotHost(url: string): boolean {
  return /moonshot\.(ai|cn)/i.test(url);
}

/**
 * OpenAI 兼容的 POST /v1/audio/transcriptions（如 OpenAI 官方或代理）。
 * Moonshot/Kimi 不提供该接口。
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
        "[ASR] ASR_BASE_URL 指向 Moonshot/Kimi，该平台不提供 /v1/audio/transcriptions。请改用 OPENAI_API_KEY，或将 ASR_BASE_URL 设为支持该接口的服务。",
      );
      return null;
    }
    return { baseUrl: base, apiKey: asrKey };
  }
  if (openaiKey) {
    const base = (openaiBase || "https://api.openai.com/v1").replace(/\/$/, "");
    return { baseUrl: base, apiKey: openaiKey };
  }
  return null;
}

async function transcribeOpenAiCompatibleBlob(blob: Blob, filename: string): Promise<string | null> {
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
      console.warn("[ASR][OpenAI兼容] transcription failed:", resp.status, detail.slice(0, 500));
      return null;
    }
    const data = (await resp.json()) as { text?: string };
    const text = norm(data?.text);
    return text || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR][OpenAI兼容] transcription error:", msg);
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
 * 同进程刚落盘的录音：腾讯云一句话识别 → OpenAI 兼容转写。
 */
export async function speechToTextFromLocalPath(localPath: string, originalName?: string): Promise<string | null> {
  if (process.env.MOCK_ASR_TEXT) return process.env.MOCK_ASR_TEXT.trim();

  const tencentText = await transcribeLocalFileWithTencent(localPath, originalName);
  if (tencentText) return tencentText;

  try {
    const buf = await fs.readFile(localPath);
    const ext = path.extname(originalName || localPath) || ".mp3";
    const name = (originalName && path.basename(originalName)) || `voice${ext}`;
    const blob = new Blob([buf]);
    const openaiText = await transcribeOpenAiCompatibleBlob(blob, name);
    if (openaiText) return openaiText;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR] read local file error:", msg);
  }

  const kimiOnly = norm(process.env.KIMI_API_KEY) || norm(process.env.MOONSHOT_API_KEY);
  if (kimiOnly) {
    console.warn(
      "[ASR] 未得到转写结果。Kimi 不能做听写；请配置 TENCENTCLOUD_SECRET_ID+KEY（推荐国内）或 OPENAI_API_KEY，或小程序端使用微信同声传译插件。开发可设 MOCK_ASR_TEXT。",
    );
  }
  return null;
}

/**
 * 通过 URL 拉取音频后：腾讯云 → OpenAI 兼容。
 */
export async function speechToTextFromUrl(voiceUrl: string): Promise<string | null> {
  if (process.env.MOCK_ASR_TEXT) return process.env.MOCK_ASR_TEXT.trim();

  const audio = await fetchAudioBlob(voiceUrl);
  if (!audio) return null;

  const ab = await audio.blob.arrayBuffer();
  const buf = Buffer.from(ab);
  const tencentText = await transcribeBufferWithTencent(buf, audio.filename);
  if (tencentText) return tencentText;

  return transcribeOpenAiCompatibleBlob(audio.blob, audio.filename);
}
