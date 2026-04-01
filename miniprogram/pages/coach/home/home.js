const api = require("../../../utils/api.js");

function isToday(d) {
  const t = new Date();
  const dd = String(d).slice(0, 10);
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  const ymd = t.getFullYear() + "-" + mm + "-" + day;
  return dd === ymd;
}

Page({
  data: { appts: [], stats: { total: 0, booked: 0, completed: 0 } },
  onShow() {
    const u = getApp().globalData.user;
    if (!u || u.role !== "COACH") {
      wx.showModal({
        title: "提示",
        content: "请以教练身份登录",
        success: (r) => {
          if (r.confirm) wx.reLaunch({ url: "/pages/login/login" });
        },
      });
      return;
    }
    this.loadAppts();
  },
  async loadAppts() {
    try {
      const res = await api.coachAppointments();
      if (res.ok) {
        const list = (res.data || []).map((a) => ({
          ...a,
          appointmentDate: String(a.appointmentDate).slice(0, 10),
        }));
        const today = list.filter((x) => isToday(x.appointmentDate));
        const booked = today.filter((x) => x.status === "BOOKED");
        const completed = today.filter((x) => x.status === "COMPLETED");
        this.setData({
          appts: today.slice(0, 20),
          stats: { total: today.length, booked: booked.length, completed: completed.length },
        });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  goFlash(e) {
    const appointmentId = e.currentTarget.dataset.aid;
    const memberId = e.currentTarget.dataset.mid;
    wx.navigateTo({
      url: "/pages/coach/flash/flash?appointmentId=" + appointmentId + "&memberId=" + memberId,
    });
  },
});
