const api = require("../../../utils/api.js");

Page({
  data: {
    memberId: "",
    memberLabel: "会员",
    notes: "",
    canSave: false,
    recording: false,
    saving: false,
    /** 同声传译插件是否已 require 成功 */
    siReady: false,
    asrHint: "",
  },
  onLoad(q) {
    const memberId = (q && q.memberId) || "";
    this.setData({ memberId });
    this._prefillDone = false;
    this._lastSiPartial = "";
    this._siSession = false;
    this.initWechatSI();
  },

  /** 仅使用微信同声传译插件听写（不上传录音、不走服务端 ASR） */
  initWechatSI() {
    try {
      const plugin = requirePlugin("WechatSI");
      const mgr = plugin.getRecordRecognitionManager();
      mgr.onRecognize = (res) => {
        this._lastSiPartial = (res && res.result) || "";
      };
      mgr.onStart = () => {};
      mgr.onStop = (res) => this.onSiStop(res);
      mgr.onError = (res) => this.onSiError(res);
      this._siManager = mgr;
      this.setData({
        siReady: true,
        asrHint: "听写由微信同声传译插件完成；请已在公众平台添加该插件。识别结果仅写入本条笔记。",
      });
    } catch (e) {
      this._siManager = null;
      this.setData({
        siReady: false,
        asrHint: "未加载同声传译插件：微信公众平台 → 设置 → 第三方设置 → 插件管理 → 添加「微信同声传译」。",
      });
    }
  },

  onSiStop(res) {
    if (!this._siSession) return;
    this._siSession = false;
    this.setData({ recording: false });

    const text =
      (res && res.result && String(res.result).trim()) || (this._lastSiPartial || "").trim();
    if (text) {
      const cur = (this.data.notes || "").trim();
      const block = (cur ? cur + "\n" : "") + text;
      this.setData({ notes: block, canSave: !!block.trim() });
      wx.showToast({ title: "已写入听写", icon: "success" });
      return;
    }
    wx.showToast({ title: "未识别到语音，请重试或手写", icon: "none" });
  },

  onSiError(res) {
    if (!this._siSession) return;
    this._siSession = false;
    this.setData({ recording: false });
    const msg = res && res.msg ? String(res.msg) : "听写失败";
    wx.showToast({ title: msg, icon: "none" });
  },

  async onShow() {
    if (!this.data.memberId) {
      wx.showToast({ title: "缺少会员", icon: "none" });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    try {
      const res = await api.coachMemberDetail(this.data.memberId);
      if (res.ok && res.data && res.data.member) {
        const m = res.data.member;
        this.setData({
          memberLabel: m.nickname || m.phone || "会员",
        });
      }
    } catch (e) {}
    if (!this._prefillDone) {
      this._prefillDone = true;
      try {
        const latest = await api.courseLatestForMember(this.data.memberId);
        if (latest.ok && latest.data && (latest.data.coachNotes || "").trim()) {
          const n = latest.data.coachNotes;
          this.setData({ notes: n, canSave: true });
        }
      } catch (e) {}
    }
  },

  onNotesInput(e) {
    const v = e.detail.value || "";
    this.setData({ notes: v, canSave: !!v.trim() });
  },

  onRecStart() {
    if (this.data.saving) return;
    if (!this._siManager) {
      wx.showModal({
        title: "听写不可用",
        content: "请先在微信公众平台 → 插件管理 中添加「微信同声传译」（个人主体小程序可能无法添加）。",
        showCancel: false,
      });
      return;
    }
    this._lastSiPartial = "";
    this._siSession = true;
    this.setData({ recording: true });
    try {
      this._siManager.start({ duration: 60000, lang: "zh_CN" });
    } catch (e) {
      this._siSession = false;
      this.setData({ recording: false });
      wx.showToast({ title: "无法启动听写", icon: "none" });
    }
  },

  onRecEnd() {
    if (!this.data.recording || !this._siManager) return;
    this.setData({ recording: false });
    try {
      this._siManager.stop();
    } catch (e) {}
  },

  onRecCancel() {
    this.onRecEnd();
  },

  async onSave() {
    const text = (this.data.notes || "").trim();
    if (!text) {
      wx.showToast({ title: "请先填写或朗读笔记", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      const res = await api.coachSessionNote(this.data.memberId, { coachNotes: text, append: false });
      if (!res.ok) throw new Error(res.message || "保存失败");
      wx.showToast({ title: "已保存，会员可查看明日建议", icon: "success" });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
