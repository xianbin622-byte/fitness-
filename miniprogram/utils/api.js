const { request } = require("./request.js");

/** 登录：{ email, smsCode } 或 { phone, smsCode }；密码：{ phone, password } 或 { email, password } */
async function login(data) {
  return request({ url: "/api/auth/login", method: "POST", data });
}

/**
 * 发邮箱验证码：
 * - 已注册：传 { email } 或 { phone }
 * - 未注册：传 { phone, email }
 */
async function sendEmailCode(data) {
  return request({ url: "/api/auth/email/send", method: "POST", data: data || {} });
}

/** 注册：{ phone, email, smsCode, nickname, role } */
async function register(body) {
  return request({ url: "/api/auth/register", method: "POST", data: body });
}

/** 微信快捷登录：{ code } 登录；注册页另传 { role, nickname? } */
async function wechatLogin(body) {
  return request({ url: "/api/auth/wechat/login", method: "POST", data: body || {} });
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

async function createVirtualMember() {
  return request({ url: "/api/coaches/members/virtual", method: "POST", data: {} });
}

async function coachMemberDetail(memberId) {
  return request({ url: "/api/coaches/members/" + memberId, method: "GET" });
}

async function daySlots(coachId, date) {
  return request({ url: "/api/schedules/coach/" + coachId + "/day/" + date, method: "GET" });
}

/** weekStart：当周周一 YYYY-MM-DD */
async function weekSlots(coachId, weekStart) {
  return request({
    url: "/api/schedules/coach/" + coachId + "/week/" + weekStart,
    method: "GET",
  });
}

async function updateSlot(id, data) {
  return request({ url: "/api/schedules/slot/" + id, method: "PATCH", data: data || {} });
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

/** 会员自录身体数据 */
async function bodySelf(data) {
  return request({ url: "/api/body/self", method: "POST", data: data || {} });
}

/** 运动等级、经验 */
async function memberFitness() {
  return request({ url: "/api/member/fitness", method: "GET" });
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

/** 会员：首登身体资料与运动偏好（用 POST：微信对 PATCH/PUT 在部分环境异常；后端同时支持 POST+PUT） */
async function saveMemberProfile(data) {
  return request({ url: "/api/member/profile", method: "POST", data: data || {} });
}

/** 教练：会员课后笔记（可合并语音转写），并生成会员端「明日一日」建议 */
async function coachSessionNote(memberId, data) {
  return request({
    url: "/api/courses/coach/member/" + memberId + "/session-note",
    method: "PUT",
    data: data || {},
  });
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

module.exports = {
  login,
  sendEmailCode,
  register,
  wechatLogin,
  me,
  coachList,
  bindCoach,
  myCoach,
  coachMembers,
  createVirtualMember,
  coachMemberDetail,
  daySlots,
  weekSlots,
  updateSlot,
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
  bodySelf,
  memberFitness,
  courseMine,
  courseDetail,
  courseLatestForMember,
  nextAdvice,
  saveMemberProfile,
  coachSessionNote,
  flashStart,
  flashSave,
  flashGenerate,
  courseConfirm,
  generateTrainPlan,
  aiPlan,
};
