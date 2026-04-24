const api = require("../../../utils/api.js");

function toTS(item) {
  return new Date(item.appointmentDate + " " + item.startTime).getTime();
}

Page({
  data: {
    userName: "",
    coachName: "未绑定教练",
    nextClass: null,
    recentCourse: null,
    oneDayTraining: "",
    coachNotePreview: "",
    aiDietAdvice: "",
    fitness: {
      level: 1,
      exp: 0,
      nextExp: 100,
      completedClasses: 0,
      bodyRecords: 0,
    },
  },
  onTabSwitch(e) {
    const t = e.currentTarget.dataset.t;
    if (t === "home") return;
    if (t === "book") wx.reLaunch({ url: "/pages/member/booking-center/booking-center" });
    if (t === "mine") wx.reLaunch({ url: "/pages/member/mine/mine" });
  },
  async onShow() {
    const u = getApp().globalData.user;
    if (!u || u.role !== "MEMBER") {
      wx.showModal({
        title: "提示",
        content: "请以会员身份登录",
        success: (r) => {
          if (r.confirm) wx.reLaunch({ url: "/pages/entry/role-select/role-select" });
        },
      });
      return;
    }
    if (!u.memberProfileAt) {
      wx.reLaunch({ url: "/pages/member/onboarding/onboarding" });
      return;
    }
    this.setData({ userName: u.nickname || "会员" });
    await this.loadHomeData();
  },
  async loadHomeData() {
    try {
      const [coachRes, apptRes, nextRes, courseRes, fitRes] = await Promise.all([
        api.myCoach(),
        api.myAppointments(),
        api.nextAdvice().catch(() => ({ ok: false })),
        api.courseMine(),
        api.memberFitness().catch(() => ({ ok: false })),
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

      if (courseRes.ok) {
        const first = (courseRes.data || [])[0] || null;
        this.setData({ recentCourse: first });
      } else if (nextRes.ok && nextRes.data && nextRes.data.summary) {
        this.setData({ recentCourse: { summary: nextRes.data.summary } });
      }

      if (nextRes.ok && nextRes.data) {
        this.setData({
          oneDayTraining: nextRes.data.oneDayTraining || nextRes.data.nextCoursePlan || "",
          coachNotePreview: nextRes.data.coachNotePreview || "",
          aiDietAdvice: nextRes.data.dietAdvice || "",
        });
      } else {
        this.setData({
          oneDayTraining: "等待上一节课的教练总结或课后笔记，即可显示明日一日建议。",
          coachNotePreview: "",
          aiDietAdvice: "均衡饮食，足量蛋白质与蔬菜。",
        });
      }

      if (fitRes && fitRes.ok && fitRes.data) {
        const d = fitRes.data;
        this.setData({
          fitness: {
            level: d.level ?? 1,
            exp: d.exp ?? 0,
            nextExp: d.nextExp ?? 100,
            completedClasses: d.completedClasses ?? 0,
            bodyRecords: d.bodyRecords ?? 0,
          },
        });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "首页加载失败", icon: "none" });
    }
  },
});
