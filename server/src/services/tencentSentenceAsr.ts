import fs from "fs/promises";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tencentcloud = require("tencentcloud-sdk-nodejs") as typeof import("tencentcloud-sdk-nodejs");

const AsrClient = tencentcloud.asr.v20190614.Client;

function norm(v: unknown): string {
  return String(v || "").trim().replace(/^["']|["']$/g, "");
}

export function resolveTencentAsrCredential(): { secretId: string; secretKey: string; region: string } | null {
  const secretId = norm(process.env.TENCENTCLOUD_SECRET_ID) || norm(process.env.TENCENT_SECRET_ID);
  const secretKey = norm(process.env.TENCENTCLOUD_SECRET_KEY) || norm(process.env.TENCENT_SECRET_KEY);
  const region = norm(process.env.TENCENT_ASR_REGION) || "ap-guangzhou";
  if (!secretId || !secretKey) return null;
  return { secretId, secretKey, region };
}

function voiceFormatFromName(name: string): string {
  const ext = (name.split(".").pop() || "mp3").toLowerCase();
  const map: Record<string, string> = {
    mp3: "mp3",
    wav: "wav",
    pcm: "pcm",
    m4a: "m4a",
    aac: "aac",
    amr: "amr",
    silk: "silk",
  };
  return map[ext] || "mp3";
}

/** 腾讯云一句话识别（60s 内、≤3MB），适合小程序上传的短录音 */
export async function transcribeBufferWithTencent(buf: Buffer, filenameHint: string): Promise<string | null> {
  const cred = resolveTencentAsrCredential();
  if (!cred) return null;
  if (buf.length > 3 * 1024 * 1024) {
    console.warn("[ASR][Tencent] 音频超过 3MB，SentenceRecognition 不支持");
    return null;
  }

  const client = new AsrClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: cred.region,
    profile: { signMethod: "TC3-HMAC-SHA256", httpProfile: { endpoint: "asr.tencentcloudapi.com" } },
  });

  const engine = norm(process.env.TENCENT_ASR_ENGINE) || "16k_zh";
  const voiceFormat = voiceFormatFromName(filenameHint);

  try {
    const resp = await client.SentenceRecognition({
      EngSerViceType: engine,
      SourceType: 1,
      VoiceFormat: voiceFormat,
      ProjectId: 0,
      SubServiceType: 2,
      Data: buf.toString("base64"),
      DataLen: buf.length,
      ConvertNumMode: 1,
    });
    const text = norm((resp as { Result?: string }).Result);
    return text || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR][Tencent] SentenceRecognition 失败:", msg);
    return null;
  }
}

export async function transcribeLocalFileWithTencent(localPath: string, originalName?: string): Promise<string | null> {
  const cred = resolveTencentAsrCredential();
  if (!cred) return null;
  try {
    const buf = await fs.readFile(localPath);
    const name = originalName || localPath;
    return transcribeBufferWithTencent(buf, name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ASR][Tencent] 读文件失败:", msg);
    return null;
  }
}
