/**
 * 临时启动 API 并检测 /api/member/health 与 POST /api/member/profile（无 token 应 401）
 * 用法：cd server && node scripts/smoke-api.cjs
 */
const { spawn } = require("child_process");
const http = require("http");

const PORT = String(process.env.SMOKE_PORT || "3099");
const host = "127.0.0.1";

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: host, port: PORT, path, agent: false },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve({ status: res.statusCode, body: b }));
      },
    );
    req.on("error", reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: host,
        port: PORT,
        path,
        method: "POST",
        agent: false,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve({ status: res.statusCode, body: b }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const child = spawn(process.execPath, ["dist/index.js"], {
    env: { ...process.env, PORT },
    stdio: "ignore",
  });
  const deadline = Date.now() + 15000;
  let ok = false;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const r = await get("/api/member/health");
      if (r.status === 200 && r.body.includes("memberProfile")) {
        last = "health: ok";
        const p = await post("/api/member/profile", {});
        if (p.status !== 401) throw new Error("POST /api/member/profile 无 token 时期望 401，实际 " + p.status);
        last += "; POST(无 token): 401 ok";
        ok = true;
        break;
      }
    } catch (e) {
      last = String((e && e.message) || e);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill("SIGTERM");
  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch (_) {}
  }, 2000);
  if (!ok) {
    console.error("smoke-api 失败:", last);
    process.exit(1);
  }
  console.log("smoke-api 通过:", last);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
