import dotenv from "dotenv";
const port = process.env.PORT;
dotenv.config({ override: true });
if (port) process.env.PORT = port;
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { buildAiExportDataset, getExportOptionsFromEnv } from "../services/aiExportDataset";
import { prisma } from "../lib/prisma";

/**
 * 在部署机本地执行，写出 JSON + JSONL，无需经过 HTTP。
 * 用法：cd server && npm run export:ai
 */
async function main() {
  const opts = getExportOptionsFromEnv();
  const data = await buildAiExportDataset(opts);
  const outDir = path.resolve(process.cwd(), "data", "ai-exports");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `ai-dataset-${stamp}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const jnlPath = path.join(outDir, `${base}.jsonl`);
  const { jsonlText, ...rest } = data;
  writeFileSync(jsonPath, JSON.stringify({ ok: true, data: { ...rest, jsonl: jsonlText } }, null, 2), "utf8");
  writeFileSync(jnlPath, jsonlText, "utf8");
  console.log("已写出:", jsonPath, jnlPath);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
