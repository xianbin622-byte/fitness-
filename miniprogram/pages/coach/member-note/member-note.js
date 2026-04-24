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
  },
  onLoad(q) {
    const memberId = (q && q.memberId) || "";
    this.setData({ memberId });
    this._prefillDone = false;
    const rm = wx.getRecorderManager();
    rm.onStop((res) => {
      if (res.tempFilePath) this.handleVoiceFile(res.tempFilePath);
    });
    rm.onError(() => {
      this.setData({ recording: false });
      wx.showToast({ title: "录音失败", icon: "none" });
    });
    this._rm = rm;
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
    this.setData({ recording: true });
    try {
      this._rm.start({ format: "mp3" });
    } catch (e) {
      this.setData({ recording: false });
    }
  },
  onRecEnd() {
    if (!this.data.recording) return;
    this.setData({ recording: false });
    try {
      this._rm.stop();
    } catch (e) {}
  },
  onRecCancel() {
    this.onRecEnd();
  },
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
        wx.showToast({ title: "已合并转写", icon: "success" });
      } else {
        wx.showToast({ title: up.message || "未识别到文字，可手写补充", icon: "none" });
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
