const api = require("../../../utils/api.js");
const { computeBodyScore } = require("../../../utils/bodyScore.js");
const app = getApp();

function today() {
  const t = new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}

function ymd(s) {
  if (!s) return "";
  return String(s).slice(0, 10);
}

function drawLine(ctx, width, height, values, color) {
  if (!width || !height) return;
  const pad = 10;
  const arr = values || [];
  const nums = arr.filter((v) => v != null && !isNaN(v));
  if (nums.length < 1) {
    ctx.clearRect(0, 0, width, height);
    ctx.setFillStyle("#9ca3af");
    ctx.setFontSize(12);
    ctx.fillText("无数据", pad, height / 2);
    ctx.draw();
    return;
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1e-6;
  const n = arr.length;
  ctx.clearRect(0, 0, width, height);
  if (nums.length === 1) {
    const v = nums[0];
    const y = height - pad - ((v - min) / range) * (height - 2 * pad);
    const x = width / 2;
    ctx.setFillStyle(color);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.draw();
    return;
  }
  ctx.beginPath();
  let has = false;
  arr.forEach((v, i) => {
    if (v == null || isNaN(v)) return;
    const x = n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - 2 * pad);
    const y = height - pad - ((v - min) / range) * (height - 2 * pad);
    if (!has) {
      ctx.moveTo(x, y);
      has = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  if (has) {
    ctx.setStrokeStyle(color);
    ctx.setLineWidth(2);
    ctx.stroke();
  }
  ctx.draw();
}

Page({
  data: {
    today: today(),
    formDate: today(),
    formW: "",
    formF: "",
    formM: "",
    formNote: "",
    saving: false,
    hasChart: false,
    loaded: false,
    trendText: "",
    cWidth: 320,
  },
  onShow() {
    const u = app.globalData.user || wx.getStorageSync("user");
    if (!u || u.role !== "MEMBER") {
      wx.reLaunch({ url: "/pages/entry/role-select/role-select" });
      return;
    }
    if (!u.memberProfileAt) {
      wx.reLaunch({ url: "/pages/member/onboarding/onboarding" });
      return;
    }
    this._u = u;
    this.load();
  },
  onTab(e) {
    const t = e.currentTarget.dataset.t;
    if (t === "mine") return;
    if (t === "home") wx.reLaunch({ url: "/pages/member/home/home" });
    if (t === "book") wx.reLaunch({ url: "/pages/member/booking-center/booking-center" });
  },
  onFormDate(e) {
    this.setData({ formDate: e.detail.value || today() });
  },
  onInW(e) {
    this.setData({ formW: e.detail.value });
  },
  onInF(e) {
    this.setData({ formF: e.detail.value });
  },
  onInM(e) {
    this.setData({ formM: e.detail.value });
  },
  onInNote(e) {
    this.setData({ formNote: e.detail.value });
  },
  async load() {
    const sys = wx.getSystemInfoSync();
    const cWidth = Math.floor((sys.windowWidth || 375) - 64);
    this.setData({ cWidth, loaded: false });
    try {
      const [bodyRes, nextRes] = await Promise.all([
        api.bodyMine().catch(() => ({ ok: false, data: [] })),
        api.nextAdvice().catch(() => ({ ok: false })),
      ]);
      let list = (bodyRes.ok && bodyRes.data) || [];
      list = (list || []).map((r) => ({
        ...r,
        d: ymd(r.recordDate),
        weight: r.weight,
        bodyFat: r.bodyFat,
        skeletalMuscle: r.skeletalMuscle,
        height: r.height,
      }));
      if (this._u && this._u.heightCm && this._u.weightKg && !list.length) {
        list = [
          {
            d: ymd(this._u.memberProfileAt) || today(),
            weight: this._u.weightKg,
            bodyFat: this._u.bodyFatPct,
            skeletalMuscle: this._u.skeletalMusclePct,
            height: this._u.heightCm,
          },
        ];
      }
      const u = this._u || app.globalData.user;
      const wVals = list.map((x) => (x.weight != null ? x.weight : null));
      const fVals = list.map((x) => (x.bodyFat != null ? x.bodyFat : null));
      const mVals = list.map((x) => (x.skeletalMuscle != null ? x.skeletalMuscle : null));
      const sVals = list.map((x) => {
        const s = computeBodyScore({
          heightCm: x.height || u.heightCm,
          weightKg: x.weight,
          bodyFat: x.bodyFat,
          skeletalMuscle: x.skeletalMuscle,
        });
        return s;
      });
      const hasData = wVals.some((v) => v != null) || fVals.some((v) => v != null) || mVals.some((v) => v != null);
      let note = "";
      if (nextRes.ok && nextRes.data && (nextRes.data.coachNotePreview || nextRes.data.summary)) {
        note = "上节相关：" + (nextRes.data.coachNotePreview || nextRes.data.summary).slice(0, 200);
        if (note.length > 200) note += "…";
      }
      this.setData({
        hasChart: hasData && list.length > 0,
        loaded: true,
        trendText: note,
      });
      this._wVals = wVals;
      this._fVals = fVals;
      this._mVals = mVals;
      this._sVals = sVals;
      wx.nextTick(() => {
        this.drawAll(cWidth, 90);
      });
    } catch (e) {
      this.setData({ loaded: true });
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  drawAll(width, height) {
    if (!this.data.hasChart) return;
    try {
      drawLine(wx.createCanvasContext("cW", this), width, height, this._wVals, "#2563eb");
      drawLine(wx.createCanvasContext("cF", this), width, height, this._fVals, "#dc2626");
      drawLine(wx.createCanvasContext("cM", this), width, height, this._mVals, "#16a34a");
      drawLine(wx.createCanvasContext("cS", this), width, height, this._sVals, "#7c3aed");
    } catch (e) {
      console.warn("draw chart", e);
    }
  },
  async onSaveRow() {
    const w = this.data.formW ? parseFloat(this.data.formW) : undefined;
    const f = this.data.formF ? parseFloat(this.data.formF) : undefined;
    const m = this.data.formM ? parseFloat(this.data.formM) : undefined;
    if (w == null && f == null && m == null) {
      wx.showToast({ title: "请至少填一项", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      const res = await api.bodySelf({
        recordDate: this.data.formDate,
        weight: w,
        bodyFat: f,
        skeletalMuscle: m,
        height: this._u && this._u.heightCm,
        notes: (this.data.formNote || "").trim() || undefined,
      });
      if (!res.ok) throw new Error(res.message || "失败");
      wx.showToast({ title: "已保存", icon: "success" });
      this.setData({ formW: "", formF: "", formM: "", formNote: "" });
      await this.load();
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
