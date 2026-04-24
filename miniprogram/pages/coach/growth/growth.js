Page({
  data: {
    currentTab: "growth",
    level: 5,
    exp: 420,
    nextExp: 600,
    major: "力量训练",
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
