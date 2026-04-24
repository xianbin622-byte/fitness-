const api = require("../../../utils/api.js");
const { CLASS_PRESETS } = require("../../../utils/classPresets.js");

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

function countWeekSlots(days) {
  return (days || []).reduce((sum, d) => sum + (d.slots || []).length, 0);
}

function hhmmToMins(v) {
  const [h, m] = String(v || "00:00")
    .split(":")
    .map((x) => Number(x));
  return (h || 0) * 60 + (m || 0);
}

function minsToHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad(h)}:${pad(m)}`;
}

function buildTimes(startHH, startMM, count) {
  const res = [];
  const s = Number(startHH) * 60 + Number(startMM);
  for (let i = 0; i < count; i += 1) {
    const st = s + i * 60;
    const et = st + 60;
    if (et > 24 * 60) break;
    res.push({ startTime: minsToHHMM(st), endTime: minsToHHMM(et) });
  }
  return res;
}

function splitHHMM(v) {
  const p = String(v || "06:15").split(":");
  return {
    hh: p[0] || "06",
    mm: p[1] || "15",
  };
}

function nearestMinute(mm, minuteOptions) {
  const cur = Number(mm || 0);
  let best = minuteOptions[0] || "00";
  let bestDiff = 999;
  for (let i = 0; i < minuteOptions.length; i += 1) {
    const v = Number(minuteOptions[i]);
    const diff = Math.abs(v - cur);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = minuteOptions[i];
    }
  }
  return best;
}

Page({
  data: {
    currentTab: "schedule",
    mainTab: "schedule",
    selectedPresetIndex: 0,
    statCatalog: 0,
    statSlots: 0,
    weekStart: mondayOfWeek(todayStr()),
    weekTitle: "",
    weekDaysRaw: [],
    weekDaysView: [],
    settingMask: false,
    settingDate: "",
    settingHourText: "06",
    settingMinuteText: "15",
    settingHourIndex: 1,
    settingMinuteIndex: 1,
    settingCount: 8,
    settingCountIndex: 7,
    hourOptions: Array.from({ length: 17 }).map((_, i) => pad(i + 5)),
    minuteOptions: ["00", "15", "30", "45"],
    countOptions: Array.from({ length: 17 }).map((_, i) => String(i + 1)),
    previewTimes: [],
    CLASS_PRESETS,
  },
  onShow() {
    this.setData({ statCatalog: CLASS_PRESETS.length });
    this.loadWeek();
  },
  onMainTab(e) {
    const t = e.currentTarget.dataset.tab;
    if (t && t !== this.data.mainTab) this.setData({ mainTab: t });
  },
  noop() {},
  refreshWeekView() {
    const days = (this.data.weekDaysRaw || []).map((d) => {
      const slots = (d.slots || []).slice().sort((a, b) => hhmmToMins(a.startTime) - hhmmToMins(b.startTime));
      return {
        ...d,
        dateLabel: `${d.date.slice(5)} 周${d.weekdayLabel}`,
        slots,
      };
    });
    this.setData({ weekDaysView: days });
  },
  async loadWeek() {
    const u = getApp().globalData.user;
    if (!u || u.role !== "COACH") return;
    const { weekStart } = this.data;
    try {
      const res = await api.weekSlots(u.id, weekStart);
      if (!res.ok) throw new Error(res.message || "加载失败");
      const days = res.data.days || [];
      const dt = parseYMD(weekStart);
      const weekTitle = dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月";
      this.setData(
        { weekDaysRaw: days, weekTitle, statSlots: countWeekSlots(days) },
        () => this.refreshWeekView()
      );
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  onPickPreset(e) {
    const i = Number(e.currentTarget.dataset.index);
    if (!Number.isNaN(i)) this.setData({ selectedPresetIndex: i });
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
  async onCloseDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    try {
      const res = await api.closeDay(date);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已关闭该日", icon: "success" });
      this.loadWeek();
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
  async onOpenDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    try {
      const res = await api.openDay(date);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已开放该日", icon: "success" });
      this.loadWeek();
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
  async onToggleDaySlot(e) {
    const id = e.currentTarget.dataset.id;
    const rawClosed = e.currentTarget.dataset.closed;
    const isClosed = rawClosed === true || rawClosed === "true";
    if (!id) return;
    const nextClosed = !isClosed;
    const days = (this.data.weekDaysView || []).map((d) => ({
      ...d,
      slots: (d.slots || []).map((s) =>
        s.id === id
          ? {
              ...s,
              isClosed: nextClosed,
            }
          : s
      ),
    }));
    this.setData({ weekDaysView: days });
    wx.showLoading({ title: "切换中", mask: true });
    try {
      const res = await api.updateSlot(id, { isClosed: nextClosed });
      if (!res.ok) throw new Error(res.message || "切换失败");
      wx.showToast({ title: nextClosed ? "已关闭时段" : "已开放时段", icon: "success" });
      await this.loadWeek();
    } catch (e) {
      await this.loadWeek();
      wx.showToast({ title: e.message || "切换失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
  openSetting(e) {
    const date = e.currentTarget.dataset.date;
    const day = (this.data.weekDaysRaw || []).find((d) => d.date === date);
    const slots = ((day && day.slots) || []).slice().sort((a, b) => hhmmToMins(a.startTime) - hhmmToMins(b.startTime));
    const first = (slots[0] && slots[0].startTime) || "06:15";
    const tm = splitHHMM(first);
    const hour = this.data.hourOptions.indexOf(tm.hh) >= 0 ? tm.hh : "06";
    const minute = nearestMinute(tm.mm, this.data.minuteOptions);
    const hourIndex = Math.max(this.data.hourOptions.indexOf(hour), 0);
    const minuteIndex = Math.max(this.data.minuteOptions.indexOf(minute), 0);
    this.setData({
      settingMask: true,
      settingDate: date,
      settingHourText: hour,
      settingMinuteText: minute,
      settingHourIndex: hourIndex,
      settingMinuteIndex: minuteIndex,
      settingCount: slots.length || 8,
      settingCountIndex: Math.max(this.data.countOptions.indexOf(String(slots.length || 8)), 0),
    }, () => this.refreshPreviewTimes());
  },
  closeSetting() {
    this.setData({ settingMask: false });
  },
  onHourChange(e) {
    const i = Number(e.detail.value);
    const v = this.data.hourOptions[i] || "06";
    this.setData({ settingHourText: v, settingHourIndex: i }, () => this.refreshPreviewTimes());
  },
  onMinuteChange(e) {
    const i = Number(e.detail.value);
    const v = this.data.minuteOptions[i] || "15";
    this.setData({ settingMinuteText: v, settingMinuteIndex: i }, () => this.refreshPreviewTimes());
  },
  onCountChange(e) {
    const i = Number(e.detail.value);
    const v = Number(this.data.countOptions[i] || 8);
    this.setData({ settingCount: v, settingCountIndex: i }, () => this.refreshPreviewTimes());
  },
  refreshPreviewTimes() {
    const { settingHourText, settingMinuteText, settingCount } = this.data;
    const previewTimes = buildTimes(settingHourText, settingMinuteText, Number(settingCount || 8)).map((t) => ({
      ...t,
      enabled: true,
    }));
    this.setData({ previewTimes });
  },
  onTogglePreviewTime(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const list = this.data.previewTimes || [];
    if (!Number.isFinite(idx) || !list[idx]) return;
    const next = !list[idx].enabled;
    this.setData({ [`previewTimes[${idx}].enabled`]: next });
  },
  async applySettingToday() {
    this.setData({ settingMask: false });
    await this.applySettingToDates([this.data.settingDate]);
  },
  async applySettingWeek() {
    this.setData({ settingMask: false });
    const dates = (this.data.weekDaysRaw || []).map((d) => d.date);
    await this.applySettingToDates(dates);
  },
  async applySettingToDates(dates) {
    const { previewTimes, selectedPresetIndex, CLASS_PRESETS } = this.data;
    const preset = CLASS_PRESETS[selectedPresetIndex] || CLASS_PRESETS[0];
    const enabledTimes = (previewTimes || []).filter((t) => t.enabled);
    if (!preset || !enabledTimes.length) return;
    wx.showLoading({ title: "应用中", mask: true });
    try {
      for (let di = 0; di < dates.length; di += 1) {
        const date = dates[di];
        const day = (this.data.weekDaysRaw || []).find((d) => d.date === date);
        const daySlots = ((day && day.slots) || []).slice();
        const desired = new Set(enabledTimes.map((t) => `${t.startTime}-${t.endTime}`));
        const existing = new Set(daySlots.map((s) => `${s.startTime}-${s.endTime}`));

        for (let i = 0; i < daySlots.length; i += 1) {
          const s = daySlots[i];
          const key = `${s.startTime}-${s.endTime}`;
          if (!desired.has(key) && Number(s.bookedCount || 0) === 0) {
            await api.deleteSlot(s.id);
          }
        }

        for (let ti = 0; ti < enabledTimes.length; ti += 1) {
          const t = enabledTimes[ti];
          const key = `${t.startTime}-${t.endTime}`;
          if (existing.has(key)) continue;
          await api.addSlot({
            date,
            startTime: t.startTime,
            endTime: t.endTime,
            title: preset.title,
            slotKind: preset.slotKind,
            maxBookings: preset.maxBookings,
            theme: preset.theme,
          });
        }
      }
      wx.showToast({ title: "已应用", icon: "success" });
      await this.loadWeek();
    } catch (e) {
      wx.showToast({ title: e.message || "应用失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
  async clearDaySlots(e) {
    const date = e.currentTarget.dataset.date;
    const day = (this.data.weekDaysRaw || []).find((d) => d.date === date);
    const slots = (day && day.slots) || [];
    if (!slots.length) return;
    wx.showLoading({ title: "清空中", mask: true });
    try {
      for (let i = 0; i < slots.length; i += 1) {
        const s = slots[i];
        if (Number(s.bookedCount || 0) > 0) continue;
        await api.deleteSlot(s.id);
      }
      wx.showToast({ title: "已清空空闲时段", icon: "success" });
      await this.loadWeek();
    } catch (e) {
      wx.showToast({ title: e.message || "清空失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
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
