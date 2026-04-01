/**
 * 语音转文字占位：未来接入微信同声传译插件、阿里云 ASR、Azure Speech 等。
 * 调用方：上传接口或异步任务，将 voiceUrl 转为文本后写入 course_records。
 */
export async function speechToTextFromUrl(_voiceUrl: string): Promise<string | null> {
  return null;
}
