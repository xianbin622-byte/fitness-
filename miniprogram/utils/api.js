const { request } = require("./request.js");

const app = getApp();

/** 登录：传 { phone, smsCode } 或 { phone, password }（演示种子账号） */
async function login(data) {
  return request({ url: "/api/auth/login", method: "POST", data });
}

async function sendSms(phone) {
  return request({ url: "/api/auth/sms/send", method: "POST", data: { phone } });
}

/** 注册：{ phone, smsCode, nickname, role } */
async function register(body) {
  return request({ url: "/api/auth/register", method: "POST", data: body });
}

async function me() {
  return request({ url: "/api/auth/me", method: "GET" });
}

async function coachList() {
  return request({ url: "/api/coaches/list", method: "GET" });
}

async function bindCoach(coachId) {
  return request({ url: "/api/coaches/bind", method: "POST", data: { coachId } });
}

async function myCoach() {
  return request({ url: "/api/coaches/my-coach", method: "GET" });
}

async function coachMembers() {
  return request({ url: "/api/coaches/members", method: "GET" });
}

async function coachMemberDetail(memberId) {
  return request({ url: "/api/coaches/members/" + memberId, method: "GET" });
}

async function daySlots(coachId, date) {
  return request({ url: "/api/schedules/coach/" + coachId + "/day/" + date, method: "GET" });
}

async function addSlot(body) {
  return request({ url: "/api/schedules/slot", method: "POST", data: body });
}

async function addTemplateSlots(body) {
  return request({ url: "/api/schedules/templates", method: "POST", data: body });
}

async function deleteSlot(id) {
  return request({ url: "/api/schedules/slot/" + id, method: "DELETE" });
}

async function closeDay(date) {
  return request({ url: "/api/schedules/close-day", method: "POST", data: { date } });
}

async function openDay(date) {
  return request({ url: "/api/schedules/open-day", method: "POST", data: { date } });
}

async function book(scheduleId) {
  return request({ url: "/api/appointments/book", method: "POST", data: { scheduleId } });
}

async function cancelAppointment(id) {
  return request({ url: "/api/appointments/cancel/" + id, method: "POST" });
}

async function myAppointments() {
  return request({ url: "/api/appointments/mine", method: "GET" });
}

async function coachAppointments() {
  return request({ url: "/api/appointments/coach", method: "GET" });
}

async function bodyMine() {
  return request({ url: "/api/body/mine", method: "GET" });
}

async function bodyMember(memberId) {
  return request({ url: "/api/body/member/" + memberId, method: "GET" });
}

async function bodyCreate(data) {
  return request({ url: "/api/body/", method: "POST", data });
}

async function courseMine() {
  return request({ url: "/api/courses/mine", method: "GET" });
}

async function courseDetail(id) {
  return request({ url: "/api/courses/" + id, method: "GET" });
}

async function courseLatestForMember(memberId) {
  return request({ url: "/api/courses/coach/by-member/" + memberId, method: "GET" });
}

async function nextAdvice() {
  return request({ url: "/api/courses/next-advice", method: "GET" });
}

async function flashStart(appointmentId, memberId) {
  return request({ url: "/api/courses/flash/start", method: "POST", data: { appointmentId, memberId } });
}

async function flashSave(courseRecordId, data) {
  return request({ url: "/api/courses/flash/" + courseRecordId, method: "PUT", data });
}

async function flashGenerate(courseRecordId) {
  return request({ url: "/api/courses/flash/" + courseRecordId + "/generate", method: "POST" });
}

async function courseConfirm(courseRecordId, data) {
  return request({ url: "/api/courses/" + courseRecordId + "/confirm", method: "PUT", data });
}

async function generateTrainPlan(data) {
  return request({ url: "/api/ai/generate-plan", method: "POST", data });
}

async function aiPlan(data) {
  return request({ url: "/api/ai/plan", method: "POST", data: data || {} });
}

function uploadVoice(filePath) {
  const base = app.globalData.apiBase || "";
  const token = app.globalData.token || wx.getStorageSync("token");
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: base + "/api/upload/voice",
      filePath,
      name: "file",
      header: token ? { Authorization: "Bearer " + token } : {},
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data.ok) resolve(data);
          else reject(new Error(data.message || "上传失败"));
        } catch (e) {
          reject(e);
        }
      },
      fail: reject,
    });
  });
}

module.exports = {
  login,
  sendSms,
  register,
  me,
  coachList,
  bindCoach,
  myCoach,
  coachMembers,
  coachMemberDetail,
  daySlots,
  addSlot,
  addTemplateSlots,
  deleteSlot,
  closeDay,
  openDay,
  book,
  cancelAppointment,
  myAppointments,
  coachAppointments,
  bodyMine,
  bodyMember,
  bodyCreate,
  courseMine,
  courseDetail,
  courseLatestForMember,
  nextAdvice,
  flashStart,
  flashSave,
  flashGenerate,
  courseConfirm,
  generateTrainPlan,
  aiPlan,
  uploadVoice,
};
