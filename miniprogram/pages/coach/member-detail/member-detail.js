const api = require("../../../utils/api.js");

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function defaultBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 28);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

/** 按「记录日期」计算周岁（与体检/体测习惯一致） */
function calcAge(birthYmd, recordYmd) {
  if (!birthYmd || !recordYmd) return "";
  const bs = birthYmd.split("-");
  const rs = recordYmd.split("-");
  if (bs.length !== 3 || rs.length !== 3) return "";
  const b = bs.map(Number);
  const r = rs.map(Number);
  let age = r[0] - b[0];
  if (r[1] < b[1] || (r[1] === b[1] && r[2] < b[2])) age--;
  if (age < 0 || age > 150) return "";
  return String(age);
}

Page({
  data: {
    memberId: "",
    member: null,
    panel: "body",
    genders: ["男", "女"],
    genderIndex: 0,
    genderLabel: "男",
    recordDate: todayStr(),
    birthDate: defaultBirthDate(),
    ageDisplay: "",
    height: "",
    weight: "",
    bodyFat: "",
    waist: "",
    hip: "",
    thigh: "",
    chest: "",
    arm: "",
    skeletalMuscle: "",
    notes: "",
    nextText: "暂无",
    courseRecordId: "",
    dietAdvice: "",
  },
  async onLoad(q) {
    const id = q.id;
    if (!id) return;
    const tab = q.tab;
    const panel = tab === "next" || tab === "diet" ? tab : "body";
    this.setData({ memberId: id, panel });
    try {
      const res = await api.coachMemberDetail(id);
      if (!res.ok) throw new Error(res.message);
      const member = res.data.member;
      const latest = res.data.latestBody;
      let genderIndex = 0;
      if (latest && latest.gender === "女") genderIndex = 1;
      const birthDate = defaultBirthDate();
      const recordDate = this.data.recordDate;
      const ageDisplay = calcAge(birthDate, recordDate);
      this.setData({
        member,
        genderIndex,
        genderLabel: genderIndex === 1 ? "女" : "男",
        birthDate,
        ageDisplay,
      });
      if (panel === "next") this.loadNext();
      if (panel === "diet") this.loadDiet();
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  onTab(e) {
    const p = e.currentTarget.dataset.p;
    if (!p || p === this.data.panel) return;
    this.setData({ panel: p });
    if (p === "next") this.loadNext();
    if (p === "diet") this.loadDiet();
  },
  async loadNext() {
    const { memberId } = this.data;
    if (!memberId) return;
    try {
      const res = await api.courseLatestForMember(memberId);
      if (res.ok && res.data && res.data.nextCoursePlan) {
        this.setData({ nextText: res.data.nextCoursePlan });
      } else {
        this.setData({ nextText: "暂无，请先在课程中生成建议。" });
      }
    } catch (e) {
      this.setData({ nextText: "加载失败" });
    }
  },
  async loadDiet() {
    const { memberId } = this.data;
    if (!memberId) return;
    try {
      const res = await api.courseLatestForMember(memberId);
      if (res.ok && res.data) {
        this.setData({
          courseRecordId: res.data.id || "",
          dietAdvice: res.data.dietAdvice || "",
        });
      }
    } catch (e) {}
  },
  onGender(e) {
    const idx = Number(e.detail.value);
    this.setData({
      genderIndex: idx,
      genderLabel: this.data.genders[idx],
    });
  },
  onRecordDate(e) {
    const recordDate = e.detail.value;
    const { birthDate } = this.data;
    this.setData({
      recordDate,
      ageDisplay: calcAge(birthDate, recordDate),
    });
  },
  onBirthDate(e) {
    const birthDate = e.detail.value;
    const { recordDate } = this.data;
    this.setData({
      birthDate,
      ageDisplay: calcAge(birthDate, recordDate),
    });
  },
  onH(e) {
    this.setData({ height: e.detail.value });
  },
  onW(e) {
    this.setData({ weight: e.detail.value });
  },
  onBf(e) {
    this.setData({ bodyFat: e.detail.value });
  },
  onWa(e) {
    this.setData({ waist: e.detail.value });
  },
  onHi(e) {
    this.setData({ hip: e.detail.value });
  },
  onTh(e) {
    this.setData({ thigh: e.detail.value });
  },
  onCh(e) {
    this.setData({ chest: e.detail.value });
  },
  onAr(e) {
    this.setData({ arm: e.detail.value });
  },
  onSk(e) {
    this.setData({ skeletalMuscle: e.detail.value });
  },
  onN(e) {
    this.setData({ notes: e.detail.value });
  },
  onDiet(e) {
    this.setData({ dietAdvice: e.detail.value });
  },
  num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  },
  async onSaveBody() {
    const d = this.data;
    if (!d.memberId) {
      wx.showToast({ title: "缺少会员", icon: "none" });
      return;
    }
    const ageNum = d.ageDisplay ? parseInt(d.ageDisplay, 10) : NaN;
    if (!d.ageDisplay || !Number.isFinite(ageNum) || ageNum < 0) {
      wx.showToast({ title: "请选择出生日期（须不晚于记录日期）", icon: "none" });
      return;
    }
    const payload = {
      memberId: d.memberId,
      recordDate: d.recordDate,
      gender: d.genders[d.genderIndex],
      age: ageNum,
      height: this.num(d.height),
      weight: this.num(d.weight),
      bodyFat: this.num(d.bodyFat),
      waist: this.num(d.waist),
      hip: this.num(d.hip),
      thigh: this.num(d.thigh),
      chest: this.num(d.chest),
      arm: this.num(d.arm),
      skeletalMuscle: this.num(d.skeletalMuscle),
      notes: d.notes || undefined,
    };
    wx.showLoading({ title: "保存中" });
    try {
      const res = await api.bodyCreate(payload);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
  async onSaveDiet() {
    const { courseRecordId, dietAdvice } = this.data;
    if (!courseRecordId) {
      wx.showToast({ title: "暂无课程记录", icon: "none" });
      return;
    }
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
