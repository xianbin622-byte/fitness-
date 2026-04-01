/** 已合并到「会员详情」底部 Tab，此处仅作旧链接跳转 */
Page({
  onLoad(q) {
    const mid = q.memberId;
    if (mid) {
      wx.redirectTo({
        url: "/pages/coach/member-detail/member-detail?id=" + encodeURIComponent(mid) + "&tab=body",
      });
    } else {
      wx.showToast({ title: "缺少会员信息", icon: "none" });
    }
  },
});
