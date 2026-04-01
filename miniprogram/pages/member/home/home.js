const api = require("../../../utils/api.js");

function toTS(item) {
  return new Date(item.appointmentDate + " " + item.startTime).getTime();
}

Page({
  data: {
    userName: "",
    coachName: "未绑定教练",
    nextClass: null,
    bodySummary: { weight: "-", bodyFat: "-" },
    recentCourse: null,
    aiTrainingPlan: "",
    aiDietAdvice: "",
  },
  async onShow() {
    const u = getApp().globalData.user;
    if (!u || u.role !== "MEMBER") {
      wx.showModal({
        title: "提示",
        content: "请以会员身份登录",
        success: (r) => {
          if (r.confirm) wx.reLaunch({ url: "/pages/login/login" });
        },
      });
      return;
    }
    this.setData({ userName: u.nickname || "会员" });
    await this.loadHomeData();
  },
  async loadHomeData() {
    try {
      const [coachRes, apptRes, bodyRes, nextRes, courseRes, aiPlanRes] = await Promise.all([
        api.myCoach(),
        api.myAppointments(),
        api.bodyMine(),
        api.nextAdvice(),
        api.courseMine(),
        api.aiPlan({ goal: "维持" }),
      ]);

      if (coachRes.ok && coachRes.data) {
        this.setData({ coachName: coachRes.data.nickname || "我的教练" });
      } else {
        this.setData({ coachName: "未绑定教练" });
      }

      if (apptRes.ok) {
        const booked = (apptRes.data || [])
          .filter((x) => x.status === "BOOKED")
          .sort((a, b) => toTS(a) - toTS(b));
        this.setData({ nextClass: booked[0] || null });
      }

      if (bodyRes.ok) {
        const list = (bodyRes.data || []).slice().sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
        const last = list[0];
        this.setData({
          bodySummary: {
            weight: last && last.weight != null ? String(last.weight) : "-",
            bodyFat: last && last.bodyFat != null ? String(last.bodyFat) : "-",
          },
        });
      }

      if (courseRes.ok) {
        const first = (courseRes.data || [])[0] || null;
        this.setData({ recentCourse: first });
      } else if (nextRes.ok && nextRes.data && nextRes.data.summary) {
        this.setData({ recentCourse: { summary: nextRes.data.summary } });
      }

      if (aiPlanRes && aiPlanRes.ok && aiPlanRes.data) {
        this.setData({
          aiTrainingPlan: aiPlanRes.data.trainingPlan || "",
          aiDietAdvice: aiPlanRes.data.dietAdvice || "",
        });
      } else {
        this.setData({
          aiTrainingPlan: "每周3-4次训练，复合动作为主，每次45-60分钟。",
          aiDietAdvice: "每日蛋白质1.6-2.0g/kg体重，主食粗细搭配，减少高糖饮料。",
        });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "首页加载失败", icon: "none" });
    }
  },
});
