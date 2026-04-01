const api = require("../../../utils/api.js");

Page({
  data: {
    memberId: "",
    courseRecordId: "",
    dietAdvice: "",
  },
  async onLoad(q) {
    const memberId = q.memberId;
    if (!memberId) return;
    this.setData({ memberId });
    try {
      const res = await api.courseLatestForMember(memberId);
      if (res.ok && res.data) {
        this.setData({
          courseRecordId: res.data.id,
          dietAdvice: res.data.dietAdvice || "",
        });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  onD(e) {
    this.setData({ dietAdvice: e.detail.value });
  },
  async onSave() {
    const { courseRecordId, dietAdvice } = this.data;
    if (!courseRecordId) return;
    try {
      const res = await api.courseConfirm(courseRecordId, {
        dietAdvice,
        completeAppointment: false,
      });
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
});
