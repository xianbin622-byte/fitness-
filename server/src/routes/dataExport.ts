import { Router } from "express";
import { buildAiExportDataset, getExportOptionsFromEnv } from "../services/aiExportDataset";

const r = Router();

/**
 * 微信外拉数：用 HEADER `X-Export-Key: <与 .env 中 EXPORT_API_KEY 相同>` 鉴权
 * 返回 JSON，含 `json` 大字段的嵌套在 data 中，另附 `jsonlText` 方便直接存文件喂模型
 */
r.get("/ai-dataset", async (req, res) => {
  const k = (req.get("X-Export-Key") || req.get("x-export-key") || "").trim();
  const expected = process.env.EXPORT_API_KEY;
  if (!expected || k !== expected) {
    return res.status(401).json({ ok: false, message: "缺少或错误的 X-Export-Key" });
  }
  try {
    const opts = getExportOptionsFromEnv();
    const raw = await buildAiExportDataset(opts);
    const { jsonlText, ...rest } = raw;
    return res.json({ ok: true, data: { ...rest, jsonl: jsonlText } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: (e as Error).message || "导出失败" });
  }
});

export const dataExportRouter = r;
