const api = require("../../../utils/api.js");

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

Page({
  data: {
    coachId: "",
    date: todayStr(),
    slots: [],
    dayClosed: false,
    summary: { available: 0, mine: 0, full: 0, closed: 0 },
  },
  async onLoad(q) {
    let coachId = q.coachId;
    if (!coachId) {
      try {
        const mc = await api.myCoach();
        if (mc.ok && mc.data) coachId = mc.data.id;
      } catch (e) {}
    }
    this.setData({ coachId: coachId || "" });
    if (coachId) this.loadDay();
  },
  onDate(e) {
    this.setData({ date: e.detail.value });
    this.loadDay();
  },
  async loadDay() {
    const { coachId, date } = this.data;
    if (!coachId) {
      wx.showToast({ title: "请先绑定教练", icon: "none" });
      return;
    }
    try {
      const res = await api.daySlots(coachId, date);
      if (!res.ok) throw new Error(res.message);
      const raw = res.data.slots || [];
      const slots = raw.map((s) => {
        let status = "available";
        if (s.isClosed || res.data.dayClosed) status = "closed";
        else if (s.bookedByMe) status = "mine";
        else if (s.isBooked) status = "full";
        return { ...s, status };
      });
      const summary = {
        available: slots.filter((x) => x.status === "available").length,
        mine: slots.filter((x) => x.status === "mine").length,
        full: slots.filter((x) => x.status === "full").length,
        closed: slots.filter((x) => x.status === "closed").length,
      };
      this.setData({
        slots,
        dayClosed: res.data.dayClosed,
        summary,
      });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  async onBook(e) {
    const scheduleId = e.currentTarget.dataset.id;
    if (!scheduleId) return;
    try {
      const res = await api.book(scheduleId);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "预约成功", icon: "success" });
      this.loadDay();
    } catch (err) {
      wx.showToast({ title: err.message || "预约失败", icon: "none" });
    }
  },
});
