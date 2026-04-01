const api = require("../../../utils/api.js");
const LEGACY_MOCK_ISSUE = "深蹲动作不稳定，核心不足";

Page({
  data: {
    appointmentId: "",
    memberId: "",
    courseRecordId: "",
    issues: "",
    coachNotes: "",
    exercises: [{ actionName: "", weight: "", reps: "", sets: "" }],
    voiceUrl: "",
    transcriptText: "",
    recording: false,
    durationMs: 0,
    formatDuration: "00:00",
    uploading: false,
    playing: false,
    recordStatusText: "",
  },
  recManager: null,
  audioCtx: null,
  _timer: null,
  async loadDraft(courseRecordId) {
    try {
      const res = await api.courseDetail(courseRecordId);
      if (!res.ok || !res.data) return;
      const rec = res.data;
      let exercises = [{ actionName: "", weight: "", reps: "", sets: "" }];
      if (rec.exerciseItems && rec.exerciseItems.length) {
        exercises = rec.exerciseItems.map((e) => ({
          actionName: e.actionName || "",
          weight: e.weight != null ? String(e.weight) : "",
          reps: e.reps != null ? String(e.reps) : "",
          sets: e.sets != null ? String(e.sets) : "",
        }));
      } else if (rec.flashDraftJson) {
        try {
          const flash = JSON.parse(rec.flashDraftJson);
          if (flash.exercises && flash.exercises.length) {
            exercises = flash.exercises.map((e) => ({
              actionName: e.actionName || "",
              weight: e.weight != null ? String(e.weight) : "",
              reps: e.reps != null ? String(e.reps) : "",
              sets: e.sets != null ? String(e.sets) : "",
            }));
          }
        } catch (err) {}
      }
      let issues = rec.issues || "";
      let coachNotes = rec.coachNotes || "";
      if (rec.flashDraftJson) {
        try {
          const flash = JSON.parse(rec.flashDraftJson);
          if (!issues && flash.issues) issues = flash.issues;
          if (!coachNotes && flash.coachNotes) coachNotes = flash.coachNotes;
        } catch (err) {}
      }
      this.setData({
        issues,
        coachNotes,
        voiceUrl: rec.voiceNoteUrl || "",
        exercises: exercises.length ? exercises : [{ actionName: "", weight: "", reps: "", sets: "" }],
      });
    } catch (e) {}
  },
  async onLoad(q) {
    // 录音能力初始化必须先做，避免参数缺失时提前 return 导致无响应
    this.recManager = wx.getRecorderManager();
    this.recManager.onStop((r) => {
      this.uploadFile(r.tempFilePath);
    });
    this.recManager.onError((err) => {
      const msg = (err && (err.errMsg || err.message)) || "录音失败";
      this.setData({ recording: false, uploading: false, recordStatusText: msg });
      wx.showToast({ title: msg, icon: "none" });
    });

    this.setData({
      appointmentId: q.appointmentId || "",
      memberId: q.memberId || "",
    });
    if (!q.appointmentId || !q.memberId) {
      this.setData({ recordStatusText: "提示：当前页面缺少预约参数，仅可测试录音与上传" });
    } else {
    try {
      const res = await api.flashStart(q.appointmentId, q.memberId);
      if (res.ok && res.data) {
        const cid = res.data.id;
        this.setData({ courseRecordId: cid });
        if (res.data.voiceNoteUrl) this.setData({ voiceUrl: res.data.voiceNoteUrl });
        await this.loadDraft(cid);
      }
    } catch (e) {
      wx.showToast({ title: e.message || "初始化失败", icon: "none" });
    }
    }
    this.audioCtx = wx.createInnerAudioContext();
    this.audioCtx.onEnded(() => this.setData({ playing: false }));
    this.audioCtx.onStop(() => this.setData({ playing: false }));
    this.audioCtx.onError(() => {
      this.setData({ playing: false });
      wx.showToast({ title: "音频播放失败", icon: "none" });
    });
  },
  onUnload() {
    this.stopDurationTimer();
    if (this.audioCtx) {
      try {
        this.audioCtx.stop();
        this.audioCtx.destroy();
      } catch (e) {}
      this.audioCtx = null;
    }
  },
  onIssues(e) {
    this.setData({ issues: e.detail.value });
  },
  onNotes(e) {
    this.setData({ coachNotes: e.detail.value });
  },
  onExName(e) {
    const i = e.currentTarget.dataset.i;
    const exercises = this.data.exercises.slice();
    exercises[i].actionName = e.detail.value;
    this.setData({ exercises });
  },
  onExField(e) {
    const i = e.currentTarget.dataset.i;
    const f = e.currentTarget.dataset.f;
    const exercises = this.data.exercises.slice();
    exercises[i][f] = e.detail.value;
    this.setData({ exercises });
  },
  addEx() {
    const exercises = this.data.exercises.concat([{ actionName: "", weight: "", reps: "", sets: "" }]);
    this.setData({ exercises });
  },
  formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return mm + ":" + ss;
  },
  startDurationTimer() {
    if (this._timer) clearInterval(this._timer);
    const start = Date.now();
    this._timer = setInterval(() => {
      const ms = Date.now() - start;
      this.setData({ durationMs: ms, formatDuration: this.formatTime(ms) });
    }, 300);
  },
  stopDurationTimer() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },
  startRecord() {
    if (!this.recManager) {
      wx.showToast({ title: "录音器未初始化", icon: "none" });
      return;
    }
    wx.authorize({
      scope: "scope.record",
      success: () => {
        this.doStartRecord();
      },
      fail: () => {
        wx.showModal({
          title: "需要录音权限",
          content: "请在小程序设置里允许麦克风权限后重试。",
          showCancel: false,
        });
      },
    });
  },
  doStartRecord() {
    try {
      this.recManager.start({ format: "mp3" });
      this.stopDurationTimer();
      this.setData({ recording: true, durationMs: 0, formatDuration: "00:00" });
      this.startDurationTimer();
      this.setData({ recordStatusText: "录音中..." });
      wx.showToast({ title: "录音中", icon: "none" });
    } catch (e) {
      const msg = (e && (e.errMsg || e.message)) || "无法开始录音";
      this.setData({ recordStatusText: msg });
      wx.showToast({ title: msg, icon: "none" });
    }
  },
  stopAndUpload() {
    if (!this.recManager) return;
    try {
      this.recManager.stop();
      this.stopDurationTimer();
      this.setData({ recording: false });
      this.setData({ recordStatusText: "录音已结束，上传中..." });
    } catch (e) {
      const msg = (e && (e.errMsg || e.message)) || "停止失败";
      this.setData({ recordStatusText: msg });
      wx.showToast({ title: msg, icon: "none" });
    }
  },
  async persistVoiceUrl() {
    const id = this.data.courseRecordId;
    if (!id || !this.data.voiceUrl) return;
    const payload = this.buildPayload();
    try {
      const res = await api.flashSave(id, payload);
      if (!res.ok) throw new Error(res.message || "保存失败");
    } catch (e) {
      wx.showToast({ title: e.message || "录音URL保存失败", icon: "none" });
    }
  },
  async uploadFile(filePath) {
    this.setData({ uploading: true });
    wx.showLoading({ title: "上传中" });
    try {
      const res = await api.uploadVoice(filePath);
      if (res.ok && res.data && res.data.voiceUrl) {
        const transcript = res.data.transcript || "";
        const transcriptText = transcript || "";
        const voiceUrl = res.data.voiceUrl;
        // 仅当拿到真实转写文本时，才自动回填问题点，避免固定 mock 覆盖真实内容
        // 兼容历史数据：若仍是旧固定文案且本次无转写，则清空，避免误判为“还在写死”
        const shouldClearLegacyMock = !transcriptText && (this.data.issues || "").trim() === LEGACY_MOCK_ISSUE;
        const nextIssues = transcriptText ? transcriptText : shouldClearLegacyMock ? "" : this.data.issues;
        this.setData({
          voiceUrl,
          transcriptText,
          issues: nextIssues,
        });
        await this.persistVoiceUrl();
        if (transcriptText) {
          this.setData({ recordStatusText: "录音上传成功，已自动转写并回填问题点" });
          wx.showToast({ title: "已回填问题点", icon: "success" });
          wx.nextTick(() => {
            wx.pageScrollTo({
              selector: "#issuesCard",
              duration: 280,
            });
          });
        } else {
          this.setData({ recordStatusText: "录音上传成功，但自动转写暂不可用，请手动补充问题点" });
          wx.showToast({ title: "请手动补充问题点", icon: "none" });
        }
      }
    } catch (e) {
      const msg = (e && (e.errMsg || e.message)) || "上传失败";
      this.setData({ recordStatusText: msg });
      wx.showToast({ title: msg, icon: "none" });
    } finally {
      this.setData({ uploading: false });
      wx.hideLoading();
    }
  },
  playVoice() {
    if (!this.data.voiceUrl || !this.audioCtx) {
      wx.showToast({ title: "暂无录音", icon: "none" });
      return;
    }
    try {
      this.audioCtx.src = this.data.voiceUrl;
      this.audioCtx.play();
      this.setData({ playing: true });
    } catch (e) {
      wx.showToast({ title: "播放失败", icon: "none" });
    }
  },
  stopVoice() {
    if (!this.audioCtx) return;
    try {
      this.audioCtx.stop();
    } catch (e) {}
    this.setData({ playing: false });
  },
  buildPayload() {
    const exercises = this.data.exercises
      .filter((x) => x.actionName)
      .map((x) => ({
        actionName: x.actionName,
        weight: x.weight ? parseFloat(x.weight) : undefined,
        reps: x.reps ? parseInt(x.reps, 10) : undefined,
        sets: x.sets ? parseInt(x.sets, 10) : undefined,
      }));
    return {
      issues: this.data.issues,
      coachNotes: this.data.coachNotes,
      exercises,
      voiceNoteUrl: this.data.voiceUrl || undefined,
    };
  },
  async onSave() {
    const id = this.data.courseRecordId;
    if (!id) {
      wx.showToast({ title: "缺少课程记录", icon: "none" });
      return;
    }
    try {
      const res = await api.flashSave(id, this.buildPayload());
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
  async onGen() {
    const id = this.data.courseRecordId;
    if (!id) return;
    await this.onSave();
    try {
      const res = await api.flashGenerate(id);
      if (!res.ok) throw new Error(res.message);
      wx.navigateTo({
        url: "/pages/coach/course-confirm/course-confirm?id=" + id,
      });
    } catch (e) {
      wx.showToast({ title: e.message || "生成失败", icon: "none" });
    }
  },
});
