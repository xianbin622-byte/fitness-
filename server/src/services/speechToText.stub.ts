import fs from "fs/promises";
import path from "path";

function norm(v: unknown): string {
  return String(v || "").trim().replace(/^["']|["']$/g, "");
}

function resolveAsrConfig() {
  const apiKey = norm(process.env.ASR_API_KEY) || norm(process.env.KIMI_API_KEY) || norm(process.env.MOONSHOT_API_KEY);
  const baseUrl = norm(process.env.ASR_BASE_URL) || norm(process.env.KIMI_BASE_URL) || "https://api.moonshot.cn/v1";
  const model = norm(process.env.ASR_MODEL) || "whisper-1";
  const language = norm(process.env.ASR_LANGUAGE) || "zh";
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ""), model, language };
}

async function transcribeBlob(blob: Blob, filename: string): Promise<string | null> {
  if (process.env.MOCK_ASR_TEXT) return process.env.MOCK_ASR_TEXT.trim();
  const cfg = resolveAsrConfig();
  if (!cfg.apiKey) return null;

  const safeName = path.basename(filename || "voice.mp3") || "voice.mp3";
  const fd = new FormData();
  fd.append("file", blob, safeName);
  fd.append("model", cfg.model);
  fd.append("language", cfg.language);

  try {
    const resp = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      body: fd,
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.warn("[ASR] transcription failed:", resp.status, detail);
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
 * 语音转文字：
 * - 若配置 ASR_API_KEY（或 KIMI_API_KEY）则调用 OpenAI 兼容的 /audio/transcriptions
 * - 若未配置或调用失败，返回 null（前端提示手写补充）
 */
export async function speechToTextFromUrl(voiceUrl: string): Promise<string | null> {
  if (process.env.MOCK_ASR_TEXT) return process.env.MOCK_ASR_TEXT.trim();
  const cfg = resolveAsrConfig();
  if (!cfg.apiKey) return null;

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
