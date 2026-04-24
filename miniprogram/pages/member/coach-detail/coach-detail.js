const api = require("../../../utils/api.js");
const { themeClass } = require("../../../utils/classPresets.js");

function pad(n) {
  return String(n).padStart(2, "0");
}
function formatYMD(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function parseYMD(s) {
  const p = (s || "").split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}
function todayStr() {
  return formatYMD(new Date());
}
function mondayOfWeek(ymd) {
  const dt = parseYMD(ymd || todayStr());
  const wd = dt.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  dt.setDate(dt.getDate() + diff);
  return formatYMD(dt);
}

function slotStatus(s, dayClosed) {
  if (s.isClosed || dayClosed) return "closed";
  if (s.bookedByMe) return "mine";
  if (s.isFull) return "full";
  if (s.canBook) return "available";
  return "full";
}

Page({
  data: {
    coachId: "",
    coachInfo: null,
    slotTab: "course",
    weekStart: mondayOfWeek(todayStr()),
    weekTitle: "",
    weekDaysRaw: [],
    weekDays: [],
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
    if (coachId) {
      this.loadCoachInfo();
      this.loadWeek();
    }
  },
  onShow() {
    if (this.data.coachId) {
      this.loadCoachInfo();
      this.loadWeek();
    }
  },
  async loadCoachInfo() {
    const { coachId } = this.data;
    if (!coachId) return;
    try {
      const res = await api.coachList();
      if (!res.ok) return;
      const c = (res.data || []).find((x) => x.id === coachId);
      if (c) {
        const name = c.nickname || "教练";
        this.setData({
          coachInfo: {
            name,
            initial: (name || "教").slice(0, 1),
            phone: c.phone || "",
            rating: "5.0",
          },
        });
      } else {
        this.setData({
          coachInfo: {
            name: "我的教练",
            initial: "教",
            phone: "",
            rating: "5.0",
          },
        });
      }
    } catch (e) {}
  },
  filterByTab(slots, tab) {
    return (slots || []).filter((s) =>
      tab === "private" ? s.slotKind === "PRIVATE" : s.slotKind !== "PRIVATE"
    );
  },
  refreshDisplaySlots() {
    const { weekDaysRaw, slotTab } = this.data;
    let available = 0;
    let mine = 0;
    let full = 0;
    let closed = 0;
    const days = (weekDaysRaw || []).map((d) => {
      const filtered = this.filterByTab(d.slots, slotTab)
        .slice()
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      const displaySlots = filtered.map((s) => {
        const status = slotStatus(s, d.dayClosed);
        if (status === "available") available++;
        else if (status === "mine") mine++;
        else if (status === "full") full++;
        else closed++;
        return {
          ...s,
          status,
          themeCls: themeClass(s.theme),
        };
      });
      return {
        ...d,
        dateShort: d.date.slice(5),
        displaySlots,
      };
    });
    this.setData({
      weekDays: days,
      summary: { available, mine, full, closed },
    });
  },
  async loadWeek() {
    const { coachId, weekStart } = this.data;
    if (!coachId) {
      wx.showToast({ title: "请先绑定教练", icon: "none" });
      return;
    }
    try {
      const res = await api.weekSlots(coachId, weekStart);
      if (!res.ok) throw new Error(res.message || "加载失败");
      const days = res.data.days || [];
      const dt = parseYMD(weekStart);
      const weekTitle = dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月";
      this.setData({ weekDaysRaw: days, weekTitle }, () => this.refreshDisplaySlots());
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.slotTab) return;
    this.setData({ slotTab: tab }, () => this.refreshDisplaySlots());
  },
  prevWeek() {
    const dt = parseYMD(this.data.weekStart);
    dt.setDate(dt.getDate() - 7);
    this.setData({ weekStart: formatYMD(dt) }, () => this.loadWeek());
  },
  nextWeek() {
    const dt = parseYMD(this.data.weekStart);
    dt.setDate(dt.getDate() + 7);
    this.setData({ weekStart: formatYMD(dt) }, () => this.loadWeek());
  },
  async onBook(e) {
    const scheduleId = e.currentTarget.dataset.id;
    if (!scheduleId) return;
    try {
      const res = await api.book(scheduleId);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "预约成功", icon: "success" });
      this.loadWeek();
    } catch (err) {
      wx.showToast({ title: err.message || "预约失败", icon: "none" });
    }
  },
  onTabSwitch(e) {
    const t = e.currentTarget.dataset.t;
    if (t === "book") {
      wx.reLaunch({ url: "/pages/member/booking-center/booking-center" });
      return;
    }
    if (t === "home") wx.reLaunch({ url: "/pages/member/home/home" });
    if (t === "mine") wx.reLaunch({ url: "/pages/member/mine/mine" });
  },
});
