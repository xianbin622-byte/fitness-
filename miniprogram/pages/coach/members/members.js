const api = require("../../../utils/api.js");

Page({
  data: { list: [], currentTab: "members", creatingVirtual: false },
  async onShow() {
    try {
      const res = await api.coachMembers();
      if (res.ok) this.setData({ list: res.data || [] });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  async onCreateVirtualMember() {
    if (this.data.creatingVirtual) return;
    this.setData({ creatingVirtual: true });
    try {
      const res = await api.createVirtualMember();
      if (!res.ok || !res.data || !res.data.id) {
        throw new Error(res.message || "创建失败");
      }
      const item = res.data;
      const nextList = [item].concat(this.data.list || []);
      this.setData({ list: nextList });
      wx.showToast({ title: "已创建测试会员", icon: "success" });
      setTimeout(() => {
        wx.navigateTo({ url: "/pages/coach/member-note/member-note?memberId=" + item.id });
      }, 250);
    } catch (e) {
      wx.showToast({ title: e.message || "创建失败", icon: "none" });
    } finally {
      this.setData({ creatingVirtual: false });
    }
  },
  onOpenNote(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/coach/member-note/member-note?memberId=" + id });
  },
  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    const routes = {
      home: "/pages/coach/home/home",
      members: "/pages/coach/members/members",
      schedule: "/pages/coach/schedule/schedule",
      growth: "/pages/coach/growth/growth",
    };
    const target = routes[tab];
    if (!target || tab === this.data.currentTab) return;
    wx.reLaunch({ url: target });
  },
});
