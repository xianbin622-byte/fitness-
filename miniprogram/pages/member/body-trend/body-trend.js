const api = require("../../../utils/api.js");

function drawLine(canvas, series, labels, title) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pad = 40;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (!series.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("暂无数据", pad, h / 2);
    return;
  }
  const min = Math.min(...series) * 0.98;
  const max = Math.max(...series) * 1.02;
  const x0 = pad;
  const y0 = h - pad;
  const x1 = w - pad;
  const y1 = pad;
  const n = series.length;
  ctx.strokeStyle = "rgba(37,99,235,0.2)";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.stroke();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + t * (x1 - x0);
    const v = series[i];
    const y = y0 - ((v - min) / (max - min || 1)) * (y0 - y1);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.font = "10px sans-serif";
  labels.forEach((lb, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + t * (x1 - x0);
    ctx.fillText(lb, x - 12, h - 12);
  });
  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  ctx.fillText(title, pad, 24);
}

Page({
  data: {
    metric: "weight",
    raw: [],
    summary: { weight: "-", bodyFat: "-" },
    history: [],
    height: 170,
    weight: 65,
    bodyFat: 18,
    waist: 75,
    hip: 95,
    thigh: 55,
  },
  onMetric(e) {
    this.setData({ metric: e.currentTarget.dataset.m });
    this.redraw();
  },
  onReady() {
    this.redraw();
  },
  async onShow() {
    try {
      const res = await api.bodyMine();
      if (res.ok) {
        const raw = (res.data || []).slice().sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
        const latest = raw[0];
        this.setData({
          raw,
          summary: {
            weight: latest && latest.weight != null ? String(latest.weight) : "-",
            bodyFat: latest && latest.bodyFat != null ? String(latest.bodyFat) : "-",
          },
          height: latest && latest.height != null ? Number(latest.height) : 170,
          weight: latest && latest.weight != null ? Number(latest.weight) : 65,
          bodyFat: latest && latest.bodyFat != null ? Number(latest.bodyFat) : 18,
          waist: latest && latest.waist != null ? Number(latest.waist) : 75,
          hip: latest && latest.hip != null ? Number(latest.hip) : 95,
          thigh: latest && latest.thigh != null ? Number(latest.thigh) : 55,
          history: raw.slice(0, 8).map((x) => ({
            date: String(x.recordDate).slice(0, 10),
            weight: x.weight != null ? x.weight : "-",
            bodyFat: x.bodyFat != null ? x.bodyFat : "-",
          })),
        });
        wx.nextTick(() => this.redraw());
      }
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  redraw() {
    const query = wx.createSelectorQuery();
    query
      .select("#lineCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width * dpr;
        const height = res[0].height * dpr;
        canvas.width = width;
        canvas.height = height;
        const metric = this.data.metric;
        const raw = (this.data.raw || []).slice().sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate));
        const pairs = raw
          .map((r) => ({ v: r[metric], d: r.recordDate }))
          .filter((p) => p.v != null && !Number.isNaN(Number(p.v)));
        const series = pairs.map((p) => Number(p.v));
        const labels = pairs.map((p) => String(p.d).slice(5, 10));
        const titles = { weight: "体重 kg", bodyFat: "体脂率 %", waist: "腰围 cm" };
        drawLine(canvas, series, labels, titles[metric] || "");
      });
  },
});
