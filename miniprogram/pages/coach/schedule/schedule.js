const api = require("../../../utils/api.js");

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

Page({
  data: {
    date: todayStr(),
    slots: [],
    dayClosed: false,
    st: "14:00",
    et: "15:00",
  },
  onDate(e) {
    this.setData({ date: e.detail.value });
    this.load();
  },
  onSt(e) {
    this.setData({ st: e.detail.value });
  },
  onEt(e) {
    this.setData({ et: e.detail.value });
  },
  onShow() {
    this.load();
  },
  async load() {
    const u = getApp().globalData.user;
    if (!u || u.role !== "COACH") return;
    try {
      const res = await api.daySlots(u.id, this.data.date);
      if (res.ok)
        this.setData({
          slots: res.data.slots || [],
          dayClosed: !!res.data.dayClosed,
        });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  async addTemplate() {
    try {
      const res = await api.addTemplateSlots({
        date: this.data.date,
        slots: [
          { startTime: "07:30", endTime: "08:30" },
          { startTime: "08:30", endTime: "09:30" },
          { startTime: "09:30", endTime: "10:30" },
        ],
      });
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已添加", icon: "success" });
      this.load();
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
  async addCustom() {
    const { date, st, et } = this.data;
    try {
      const res = await api.addSlot({ date, startTime: st, endTime: et });
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已添加", icon: "success" });
      this.load();
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
  async onDel(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await api.deleteSlot(id);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已删除", icon: "success" });
      this.load();
    } catch (err) {
      wx.showToast({ title: err.message || "失败", icon: "none" });
    }
  },
});
