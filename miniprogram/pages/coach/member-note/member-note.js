const api = require("../../../utils/api.js");

Page({
  data: {
    memberId: "",
    memberLabel: "会员",
    notes: "",
    canSave: false,
    recording: false,
    uploading: false,
    saving: false,
    /** 微信同声传译可用时展示 */
    asrHint: "",
  },
  onLoad(q) {
    const memberId = (q && q.memberId) || "";
    this.setData({ memberId });
    this._prefillDone = false;
    this._preferLegacyRecorder = false;
    this._activeRecorderKind = null;
    this._lastSiPartial = "";

    const rm = wx.getRecorderManager();
    rm.onStop((res) => {
      if (this._activeRecorderKind !== "rm") return;
      this._activeRecorderKind = null;
      if (res.tempFilePath) this.handleVoiceFile(res.tempFilePath);
    });
    rm.onError(() => {
      if (this._activeRecorderKind !== "rm") return;
      this._activeRecorderKind = null;
      this.setData({ recording: false });
      wx.showToast({ title: "录音失败", icon: "none" });
    });
    this._rm = rm;

    this.initWechatSI();
  },

  /** A：微信同声传译插件（需在公众平台添加插件；个人主体可能无法添加） */
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
        asrHint: "优先使用微信听写，失败时自动走云端识别",
      });
    } catch (e) {
      this._siManager = null;
      this.setData({
        asrHint: "未加载微信听写插件，将使用录音上传云端识别",
      });
    }
  },

  onSiStop(res) {
    if (this._activeRecorderKind !== "si") return;
    this._activeRecorderKind = null;
    this.setData({ recording: false });

    const text = (res && res.result && String(res.result).trim()) || this._lastSiPartial.trim();
    const tmp = res && res.tempFilePath;

    if (text) {
      const cur = (this.data.notes || "").trim();
      const block = (cur ? cur + "\n" : "") + text;
      this.setData({ notes: block, canSave: !!block.trim() });
      wx.showToast({ title: "已写入听写结果", icon: "success" });
      return;
    }
    if (tmp) {
      this.handleVoiceFile(tmp);
      return;
    }
    wx.showToast({ title: "未识别到语音，可重试或手写", icon: "none" });
  },

  onSiError(res) {
    if (this._activeRecorderKind !== "si") return;
    try {
      this._siManager && this._siManager.stop();
    } catch (e) {}
    this._activeRecorderKind = null;
    this.setData({ recording: false });
    this._preferLegacyRecorder = true;
    const msg = (res && (res.msg || res.retcode)) ? String(res.msg || res.retcode) : "听写失败";
    wx.showToast({ title: msg + "，已切换云端识别", icon: "none", duration: 2800 });
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
    if (this.data.saving || this.data.uploading) return;

    if (this._siManager && !this._preferLegacyRecorder) {
      this._lastSiPartial = "";
      this.setData({ recording: true });
      this._activeRecorderKind = "si";
      try {
        this._siManager.start({ duration: 60000, lang: "zh_CN" });
      } catch (e) {
        this._preferLegacyRecorder = true;
        this._activeRecorderKind = null;
        this.setData({ recording: false });
        this.startLegacyRecorder();
      }
      return;
    }

    this.startLegacyRecorder();
  },

  startLegacyRecorder() {
    this._activeRecorderKind = "rm";
    this.setData({ recording: true });
    try {
      this._rm.start({ format: "mp3" });
    } catch (e) {
      this._activeRecorderKind = null;
      this.setData({ recording: false });
    }
  },

  onRecEnd() {
    if (!this.data.recording) return;
    this.setData({ recording: false });

    if (this._activeRecorderKind === "si") {
      try {
        this._siManager.stop();
      } catch (e) {}
      return;
    }
    if (this._activeRecorderKind === "rm") {
      try {
        this._rm.stop();
      } catch (e) {}
    }
  },
  onRecCancel() {
    this.onRecEnd();
  },

  /** B：上传后由服务端腾讯云 / OpenAI 转写 */
  async handleVoiceFile(tempFilePath) {
    this.setData({ uploading: true });
    try {
      const up = await api.uploadVoice(tempFilePath);
      if (!up.ok) throw new Error("上传失败");
      const t = (up.data && up.data.transcript) || "";
      if (t) {
        const cur = (this.data.notes || "").trim();
        const block = (cur ? cur + "\n" : "") + t;
        this.setData({ notes: block, canSave: !!block.trim() });
        wx.showToast({ title: "已合并云端转写", icon: "success" });
      } else {
        wx.showToast({ title: up.message || "云端未识别到文字，可手写补充", icon: "none", duration: 3200 });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "转写失败", icon: "none" });
    } finally {
      this.setData({ uploading: false });
    }
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
