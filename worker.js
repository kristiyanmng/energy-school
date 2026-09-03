const ALLOWED_ORIGINS = new Set([
  "https://kristiyanmng.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (path === "/" || path === "/api/health") {
        return json({ ok: true, service: "Energy School API" }, 200, cors);
      }

      if (path === "/api/setup" && request.method === "POST") {
        return setup(request, env, cors);
      }

      if (path === "/api/login" && request.method === "POST") {
        return login(request, env, cors);
      }

      if (path === "/api/logout" && request.method === "POST") {
        return logout(request, env, cors);
      }

      if (path === "/api/me" && request.method === "GET") {
        const auth = await authenticate(request, env);
        if (!auth) return json({ error: "Не сте влезли в системата." }, 401, cors);
        return json({ user: publicUser(auth.user) }, 200, cors);
      }

      if (path === "/api/change-password" && request.method === "POST") {
        return changePassword(request, env, cors);
      }

      if (path.startsWith('/api/')) {
        const passwordGate=await authenticate(request,env);
        if(passwordGate?.user?.must_change_password)return json({error:'Трябва да смените временната си парола.',code:'PASSWORD_CHANGE_REQUIRED'},403,cors);
      }

      if (path === "/api/admin/users" && request.method === "GET") {
        const auth = await requireRole(request, env, "school_admin");
        if (auth.error) return json({ error: auth.error }, auth.status, cors);

        const result = await env.DB.prepare(
          `SELECT id, email, username, first_name, last_name, role, status, created_at
           FROM users WHERE school_id = ? ORDER BY role, first_name, last_name`
        ).bind(auth.user.school_id).all();

        return json({ users: result.results }, 200, cors);
      }

      if (path === "/api/admin/users" && request.method === "POST") {
        return createUser(request, env, cors);
      }

      const userMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
      if (userMatch && request.method === "PATCH") {
        return updateUser(request, env, cors, Number(userMatch[1]));
      }

      const resetPasswordMatch = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (resetPasswordMatch && request.method === "POST") {
        return resetUserPassword(request, env, cors, Number(resetPasswordMatch[1]));
      }

      if (path === "/api/admin/parents" && request.method === "GET") return listParents(request, env, cors);
      if (path === "/api/admin/parents" && request.method === "POST") return createParent(request, env, cors);
      const parentMatch = path.match(/^\/api\/admin\/parents\/(\d+)$/);
      if (parentMatch && request.method === "PATCH") return updateParent(request, env, cors, Number(parentMatch[1]));
      const parentLinkMatch = path.match(/^\/api\/admin\/parents\/(\d+)\/children$/);
      if (parentLinkMatch && request.method === "POST") return linkParentChild(request, env, cors, Number(parentLinkMatch[1]));
      const parentUnlinkMatch = path.match(/^\/api\/admin\/parents\/(\d+)\/children\/(\d+)$/);
      if (parentUnlinkMatch && request.method === "DELETE") return unlinkParentChild(request, env, cors, Number(parentUnlinkMatch[1]), Number(parentUnlinkMatch[2]));
      const parentResetMatch = path.match(/^\/api\/admin\/parents\/(\d+)\/reset-password$/);
      if (parentResetMatch && request.method === "POST") return resetParentPassword(request, env, cors, Number(parentResetMatch[1]));

      if (path === "/api/parent/children" && request.method === "GET") return parentChildren(request, env, cors);
      if (path === "/api/parent/overview" && request.method === "GET") return parentOverview(request, env, cors);

      if (path === "/api/admin/classes" && request.method === "GET") {
        return listClasses(request, env, cors);
      }

      if (path === "/api/admin/classes" && request.method === "POST") {
        return createClass(request, env, cors);
      }

      const classMatch = path.match(/^\/api\/admin\/classes\/(\d+)$/);
      if (classMatch && request.method === "PATCH") {
        return updateClass(request, env, cors, Number(classMatch[1]));
      }

      const rosterMatch = path.match(/^\/api\/admin\/classes\/(\d+)\/students$/);
      if (rosterMatch && request.method === "GET") {
        return classRoster(request, env, cors, Number(rosterMatch[1]));
      }
      if (rosterMatch && request.method === "POST") {
        return enrollStudent(request, env, cors, Number(rosterMatch[1]));
      }

      const removeStudentMatch = path.match(/^\/api\/admin\/classes\/(\d+)\/students\/(\d+)$/);
      if (removeStudentMatch && request.method === "DELETE") {
        return removeStudent(request, env, cors, Number(removeStudentMatch[1]), Number(removeStudentMatch[2]));
      }

      if (path === "/api/admin/schedule/bootstrap" && request.method === "GET") {
        return scheduleBootstrap(request, env, cors);
      }

      if (path === "/api/admin/schedule/periods" && request.method === "PUT") {
        return saveSchedulePeriods(request, env, cors);
      }

      if (path === "/api/admin/schedule" && request.method === "GET") {
        return weeklyAdminSchedule(request, env, cors);
      }

      if (path === "/api/admin/schedule/lesson" && request.method === "PUT") {
        return saveWeeklyScheduleLesson(request, env, cors);
      }

      const scheduleLessonMatch = path.match(/^\/api\/admin\/schedule\/lesson\/(\d+)$/);
      if (scheduleLessonMatch && request.method === "DELETE") {
        return deleteWeeklyScheduleLesson(request, env, cors, Number(scheduleLessonMatch[1]));
      }

      if (path === "/api/admin/schedule/publish" && request.method === "POST") {
        return publishWeeklySchedule(request, env, cors);
      }

      if (path === "/api/admin/schedule/copy" && request.method === "POST") {
        return copyWeeklySchedule(request, env, cors);
      }

      if (path === "/api/schedule" && request.method === "GET") {
        return myWeeklySchedule(request, env, cors);
      }

      if (path === "/api/teacher/journal/bootstrap" && request.method === "GET") {
        return journalBootstrap(request, env, cors);
      }

      if (path === "/api/teacher/journal" && request.method === "GET") {
        return loadJournal(request, env, cors);
      }

      if (path === "/api/teacher/journal" && request.method === "POST") {
        return saveJournal(request, env, cors);
      }

      if(path==="/api/teacher/final-grades"&&request.method==="GET")return teacherFinalGrades(request,env,cors);
      if(path==="/api/teacher/final-grades"&&request.method==="POST")return saveFinalGrade(request,env,cors);

      if (path === "/api/student/diary" && request.method === "GET") {
        return studentDiary(request, env, cors);
      }

      if(path==="/api/teacher/homeworks"&&request.method==="GET")return teacherHomeworks(request,env,cors);
      if(path==="/api/teacher/homeworks"&&request.method==="POST")return createHomework(request,env,cors);
      const teacherHomeworkMatch=path.match(/^\/api\/teacher\/homeworks\/(\d+)$/);
      if(teacherHomeworkMatch&&request.method==="GET")return teacherHomeworkDetail(request,env,cors,Number(teacherHomeworkMatch[1]));
      if(teacherHomeworkMatch&&request.method==="PATCH")return updateHomework(request,env,cors,Number(teacherHomeworkMatch[1]));
      if(path==="/api/student/homeworks"&&request.method==="GET")return studentHomeworks(request,env,cors);
      const submitHomeworkMatch=path.match(/^\/api\/student\/homeworks\/(\d+)\/submit$/);
      if(submitHomeworkMatch&&request.method==="POST")return submitHomework(request,env,cors,Number(submitHomeworkMatch[1]));
      if(path==="/api/parent/homeworks"&&request.method==="GET")return parentHomeworks(request,env,cors);

      if(path==="/api/teacher/assessments"&&request.method==="GET")return teacherAssessments(request,env,cors);
      if(path==="/api/teacher/assessments"&&request.method==="POST")return createAssessment(request,env,cors);
      const assessmentMatch=path.match(/^\/api\/teacher\/assessments\/(\d+)$/);
      if(assessmentMatch&&request.method==="PATCH")return updateAssessment(request,env,cors,Number(assessmentMatch[1]));
      if(path==="/api/student/assessments"&&request.method==="GET")return studentAssessments(request,env,cors);
      if(path==="/api/parent/assessments"&&request.method==="GET")return parentAssessments(request,env,cors);
      if(path==="/api/admin/assessments"&&request.method==="GET")return adminAssessments(request,env,cors);
      if(path==="/api/announcements"&&request.method==="GET")return visibleAnnouncements(request,env,cors);
      if(path==="/api/announcements/manage"&&request.method==="GET")return manageAnnouncements(request,env,cors);
      if(path==="/api/announcements"&&request.method==="POST")return createAnnouncement(request,env,cors);
      const announcementMatch=path.match(/^\/api\/announcements\/(\d+)$/);
      if(announcementMatch&&request.method==="PATCH")return updateAnnouncement(request,env,cors,Number(announcementMatch[1]));
      if(path==="/api/admin/documents"&&request.method==="GET")return adminDocuments(request,env,cors);
      if(path==="/api/admin/document-templates"&&request.method==="POST")return createDocumentTemplate(request,env,cors);
      const applicationMatch=path.match(/^\/api\/admin\/applications\/(\d+)$/);
      if(applicationMatch&&request.method==="PATCH")return reviewApplication(request,env,cors,Number(applicationMatch[1]));
      if(path==="/api/documents"&&request.method==="GET")return userDocuments(request,env,cors);
      if(path==="/api/applications"&&request.method==="POST")return submitApplication(request,env,cors);
      if(path==="/api/notifications"&&request.method==="GET")return listNotifications(request,env,cors);
      if(path==="/api/notifications/read-all"&&request.method==="POST")return readAllNotifications(request,env,cors);
      const notificationMatch=path.match(/^\/api\/notifications\/(\d+)\/read$/);
      if(notificationMatch&&request.method==="PATCH")return readNotification(request,env,cors,Number(notificationMatch[1]));

      if (path === "/api/attendance/manage" && request.method === "GET") {
        return manageAttendance(request, env, cors);
      }

      if (path === "/api/admin/assignments" && request.method === "GET") {
        return listAssignments(request, env, cors);
      }

      if (path === "/api/admin/subjects" && request.method === "GET") {
        return listSubjects(request, env, cors);
      }

      if (path === "/api/admin/academic-years" && request.method === "GET") {
        return listAcademicYears(request, env, cors);
      }

      if (path === "/api/admin/academic-years" && request.method === "POST") {
        return createAcademicYear(request, env, cors);
      }

      const yearMatch = path.match(/^\/api\/admin\/academic-years\/(\d+)$/);
      if (yearMatch && request.method === "PATCH") {
        return updateAcademicYear(request, env, cors, Number(yearMatch[1]));
      }

      if (path === "/api/admin/holidays" && request.method === "POST") {
        return createHoliday(request, env, cors);
      }

      if (path === "/api/messages/bootstrap" && request.method === "GET") {
        return messagesBootstrap(request, env, cors);
      }

      if (path === "/api/dashboard" && request.method === "GET") {
        return dashboard(request, env, cors);
      }

      if (path === "/api/conversations" && request.method === "POST") {
        return createConversation(request, env, cors);
      }

      const parentConversationMessagesMatch = path.match(/^\/api\/parent-conversations\/(\d+)\/messages$/);
      if (parentConversationMessagesMatch && request.method === "GET") return parentConversationMessages(request,env,cors,Number(parentConversationMessagesMatch[1]));
      if (parentConversationMessagesMatch && request.method === "POST") return sendParentConversationMessage(request,env,cors,Number(parentConversationMessagesMatch[1]));

      const conversationMessagesMatch = path.match(/^\/api\/conversations\/(\d+)\/messages$/);
      if (conversationMessagesMatch && request.method === "GET") {
        return conversationMessages(request, env, cors, Number(conversationMessagesMatch[1]));
      }
      if (conversationMessagesMatch && request.method === "POST") {
        return sendConversationMessage(request, env, cors, Number(conversationMessagesMatch[1]));
      }

      const holidayMatch = path.match(/^\/api\/admin\/holidays\/(\d+)$/);
      if (holidayMatch && request.method === "DELETE") {
        return deleteHoliday(request, env, cors, Number(holidayMatch[1]));
      }

      if (path === "/api/admin/subjects" && request.method === "POST") {
        return createSubject(request, env, cors);
      }

      const subjectMatch = path.match(/^\/api\/admin\/subjects\/(\d+)$/);
      if (subjectMatch && request.method === "PATCH") {
        return updateSubject(request, env, cors, Number(subjectMatch[1]));
      }

      if (path === "/api/admin/assignments" && request.method === "POST") {
        return createAssignment(request, env, cors);
      }

      const assignmentMatch = path.match(/^\/api\/admin\/assignments\/(\d+)$/);
      if (assignmentMatch && request.method === "DELETE") {
        return deleteAssignment(request, env, cors, Number(assignmentMatch[1]));
      }

      const excuseMatch = path.match(/^\/api\/attendance\/(\d+)\/excuse$/);
      if (excuseMatch && request.method === "PATCH") {
        return excuseAttendance(request, env, cors, Number(excuseMatch[1]));
      }

      return json({ error: "Адресът не е намерен." }, 404, cors);
    } catch (error) {
      console.error(error);
      return json({ error: "Вътрешна грешка на сървъра." }, 500, cors);
    }
  }
};

async function setup(request, env, cors) {
  if (!env.SETUP_SECRET) {
    return json({ error: "SETUP_SECRET не е конфигуриран." }, 500, cors);
  }

  const suppliedSecret = request.headers.get("X-Setup-Secret") || "";
  if (!safeEqual(suppliedSecret, env.SETUP_SECRET)) {
    return json({ error: "Невалиден ключ за настройка." }, 403, cors);
  }

  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
  if (Number(existing?.count || 0) > 0) {
    return json({ error: "Първоначалната настройка вече е изпълнена." }, 409, cors);
  }

  const school = await env.DB.prepare(
    "SELECT id FROM schools WHERE code = ?"
  ).bind("ENERGY-DEMO").first();

  if (!school) {
    return json({ error: "Демо училището липсва в базата." }, 500, cors);
  }

  const accounts = [
    {
      email: "student@energy-school.bg",
      username: "student",
      passwordHash: "pbkdf2_sha256$150000$L+Wf/MrsipszXM4NOwqmkg==$u1BC331eVsgS9YtBttsdOaw1Q1JLlG9HVH2FuYN/vSM=",
      firstName: "Кристиян",
      lastName: "Марков",
      role: "student"
    },
    {
      email: "teacher@energy-school.bg",
      username: "teacher",
      passwordHash: "pbkdf2_sha256$150000$WAicQgo6KISG4fDQm7M0SA==$OqbLe0PjstxbqSTdvFGJNVB59A15WCWJsaS3mGfLOrY=",
      firstName: "Анна",
      lastName: "Петрова",
      role: "teacher"
    },
    {
      email: "director@energy-school.bg",
      username: "director",
      passwordHash: "pbkdf2_sha256$150000$dPqrx0FkfskF9SX/wAXmgQ==$1/vspkMUlQgBMOp/vqsloQKCqPNia7z3VLIZMX1QcvM=",
      firstName: "Иван",
      lastName: "Димитров",
      role: "school_admin"
    }
  ];

  const statements = [];
  for (const account of accounts) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO users
          (school_id, email, username, password_hash, first_name, last_name, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
      ).bind(
        school.id,
        account.email,
        account.username,
        account.passwordHash,
        account.firstName,
        account.lastName,
        account.role
      )
    );
  }

  await env.DB.batch(statements);

  return json({
    ok: true,
    message: "Трите тестови акаунта са създадени.",
    accounts: accounts.map(({ email, username, role }) => ({ email, username, role }))
  }, 201, cors);
}

async function login(request, env, cors) {
  const body = await readJson(request);
  const identifier = String(body.identifier || "").trim().toLowerCase();
  const password = String(body.password || "");
  const schoolCode = String(body.schoolCode || "ENERGY-DEMO").trim().toUpperCase();

  if (!identifier || !password) {
    return json({ error: "Въведете потребител и парола." }, 400, cors);
  }

  let user = await env.DB.prepare(
    `SELECT u.*, s.code AS school_code, s.name AS school_name
     FROM users u
     JOIN schools s ON s.id = u.school_id
     WHERE s.code = ? AND (LOWER(u.email) = ? OR LOWER(u.username) = ?)
     LIMIT 1`
  ).bind(schoolCode, identifier, identifier).first();

  let accountType = "user";
  if (!user) {
    await ensureParentTables(env);
    user = await env.DB.prepare(
      `SELECT p.*, s.code AS school_code, s.name AS school_name, 'parent' AS role
       FROM parents p JOIN schools s ON s.id=p.school_id
       WHERE s.code=? AND (LOWER(p.email)=? OR LOWER(p.username)=?) LIMIT 1`
    ).bind(schoolCode, identifier, identifier).first();
    accountType = "parent";
  }

  if (!user || user.status !== "active" || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "Невалидно потребителско име или парола." }, 401, cors);
  }

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (accountType === "parent") {
    await env.DB.prepare("INSERT INTO parent_sessions (id, parent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)").bind(sessionId, user.id, tokenHash, expiresAt).run();
  } else {
    await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)").bind(sessionId, user.id, tokenHash, expiresAt).run();
  }

  return json({
    ok: true,
    token,
    expiresAt,
    user: publicUser(user),
    redirect: roleRedirect(user.role)
  }, 200, cors);
}

async function logout(request, env, cors) {
  const token = bearerToken(request);
  if (token) {
    const hash=await sha256(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(hash).run();
    await ensureParentTables(env);
    await env.DB.prepare("DELETE FROM parent_sessions WHERE token_hash = ?").bind(hash).run();
  }
  return json({ ok: true }, 200, cors);
}

function strongPassword(password){return password.length>=10&&/[A-ZА-Я]/.test(password)&&/[a-zа-я]/.test(password)&&/\d/.test(password)&&/[^A-Za-zА-Яа-я0-9]/.test(password)}

async function changePassword(request, env, cors) {
  const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);const b=await readJson(request),current=String(b.currentPassword||''),next=String(b.newPassword||'');if(!(await verifyPassword(current,auth.user.password_hash)))return json({error:'Текущата парола е неправилна.'},400,cors);if(!strongPassword(next))return json({error:'Новата парола трябва да е поне 10 знака и да съдържа главна, малка буква, цифра и специален знак.'},400,cors);if(current===next)return json({error:'Новата парола трябва да бъде различна от текущата.'},400,cors);const hash=await hashPassword(next);if(auth.user.role==='parent'){await env.DB.batch([env.DB.prepare(`UPDATE parents SET password_hash=?,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(hash,auth.user.id),env.DB.prepare(`DELETE FROM parent_sessions WHERE parent_id=?`).bind(auth.user.id)])}else{await env.DB.batch([env.DB.prepare(`UPDATE users SET password_hash=?,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(hash,auth.user.id),env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(auth.user.id)])}return json({ok:true,message:'Паролата е сменена. Влезте отново.'},200,cors)
}

async function resetUserPassword(request, env, cors, userId) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);const user=await env.DB.prepare(`SELECT id,role FROM users WHERE id=? AND school_id=?`).bind(userId,auth.user.school_id).first();if(!user)return json({error:'Потребителят не е намерен.'},404,cors);if(user.role==='school_admin')return json({error:'Директорската парола се сменя от личния профил.'},403,cors);const b=await readJson(request),temporary=String(b.temporaryPassword||'');if(!strongPassword(temporary))return json({error:'Временната парола трябва да е поне 10 знака и да съдържа главна, малка буква, цифра и специален знак.'},400,cors);const hash=await hashPassword(temporary);await env.DB.batch([env.DB.prepare(`UPDATE users SET password_hash=?,must_change_password=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?`).bind(hash,userId,auth.user.school_id),env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(userId)]);return json({ok:true},200,cors)
}

async function createUser(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);

  const body = await readJson(request);
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const username = String(body.username || "").trim().toLowerCase();
  const role = String(body.role || "");
  const temporaryPassword = String(body.temporaryPassword || "");

  if (!firstName || !lastName || !email || !username || !temporaryPassword) {
    return json({ error: "Попълнете всички задължителни полета." }, 400, cors);
  }
  if (!["student", "teacher"].includes(role)) {
    return json({ error: "Директорът може да създава само ученици и учители." }, 400, cors);
  }
  if (temporaryPassword.length < 10) {
    return json({ error: "Временната парола трябва да е поне 10 символа." }, 400, cors);
  }

  const duplicate = await env.DB.prepare(
    "SELECT id FROM users WHERE school_id = ? AND (LOWER(email) = ? OR LOWER(username) = ?) LIMIT 1"
  ).bind(auth.user.school_id, email, username).first();
  if (duplicate) return json({ error: "Имейлът или потребителското име вече се използва." }, 409, cors);

  const passwordHash = await hashPassword(temporaryPassword);
  const result = await env.DB.prepare(
    `INSERT INTO users
      (school_id, email, username, password_hash, first_name, last_name, role, status, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1)`
  ).bind(auth.user.school_id, email, username, passwordHash, firstName, lastName, role).run();

  return json({
    ok: true,
    user: {
      id: result.meta.last_row_id,
      email, username, first_name: firstName, last_name: lastName,
      role, status: "active"
    }
  }, 201, cors);
}

async function updateUser(request, env, cors, userId) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);

  const target = await env.DB.prepare(
    "SELECT id, role FROM users WHERE id = ? AND school_id = ?"
  ).bind(userId, auth.user.school_id).first();
  if (!target) return json({ error: "Потребителят не е намерен." }, 404, cors);
  if (target.role === "school_admin") {
    return json({ error: "Директорският акаунт не може да бъде редактиран от този екран." }, 403, cors);
  }

  const body = await readJson(request);
  const status = body.status === "inactive" ? "inactive" : "active";
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();

  if (!firstName || !lastName) {
    return json({ error: "Името и фамилията са задължителни." }, 400, cors);
  }

  await env.DB.prepare(
    `UPDATE users SET first_name = ?, last_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND school_id = ?`
  ).bind(firstName, lastName, status, userId, auth.user.school_id).run();

  return json({ ok: true }, 200, cors);
}

async function listClasses(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);

  const result = await env.DB.prepare(
    `SELECT c.id, c.grade, c.letter, c.profile, c.room, c.status,
            c.homeroom_teacher_id,
            ay.name AS academic_year,
            u.first_name || ' ' || u.last_name AS teacher_name,
            COUNT(cs.student_id) AS student_count
     FROM classes c
     JOIN academic_years ay ON ay.id = c.academic_year_id
     LEFT JOIN users u ON u.id = c.homeroom_teacher_id
     LEFT JOIN class_students cs ON cs.class_id = c.id AND cs.left_at IS NULL
     WHERE c.school_id = ? AND ay.status = 'active'
     GROUP BY c.id
     ORDER BY c.status, c.grade, c.letter`
  ).bind(auth.user.school_id).all();

  const teachers = await env.DB.prepare(
    `SELECT id, first_name, last_name
     FROM users WHERE school_id = ? AND role = 'teacher' AND status = 'active'
     ORDER BY first_name, last_name`
  ).bind(auth.user.school_id).all();

  return json({ classes: result.results, teachers: teachers.results }, 200, cors);
}

async function createClass(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const body = await readJson(request);
  const grade = Number(body.grade);
  const letter = String(body.letter || "").trim().toLowerCase();
  const profile = String(body.profile || "").trim();
  const room = String(body.room || "").trim();
  const teacherId = body.teacherId ? Number(body.teacherId) : null;

  if (!Number.isInteger(grade) || grade < 1 || grade > 12 || !letter) {
    return json({ error: "Въведете валиден клас и паралелка." }, 400, cors);
  }
  const year = await env.DB.prepare(
    "SELECT id FROM academic_years WHERE school_id = ? AND status = 'active' LIMIT 1"
  ).bind(auth.user.school_id).first();
  if (!year) return json({ error: "Няма активна учебна година." }, 409, cors);

  if (teacherId) {
    const teacher = await env.DB.prepare(
      "SELECT id FROM users WHERE id = ? AND school_id = ? AND role = 'teacher' AND status = 'active'"
    ).bind(teacherId, auth.user.school_id).first();
    if (!teacher) return json({ error: "Избраният класен ръководител е невалиден." }, 400, cors);
  }

  const duplicate = await env.DB.prepare(
    "SELECT id FROM classes WHERE academic_year_id = ? AND grade = ? AND LOWER(letter) = ?"
  ).bind(year.id, grade, letter).first();
  if (duplicate) return json({ error: "Тази паралелка вече съществува." }, 409, cors);

  const result = await env.DB.prepare(
    `INSERT INTO classes
      (school_id, academic_year_id, grade, letter, profile, room, homeroom_teacher_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
  ).bind(auth.user.school_id, year.id, grade, letter, profile || null, room || null, teacherId).run();
  return json({ ok: true, id: result.meta.last_row_id }, 201, cors);
}

async function updateClass(request, env, cors, classId) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const body = await readJson(request);
  const target = await env.DB.prepare(
    "SELECT id FROM classes WHERE id = ? AND school_id = ?"
  ).bind(classId, auth.user.school_id).first();
  if (!target) return json({ error: "Класът не е намерен." }, 404, cors);

  const grade = Number(body.grade);
  const letter = String(body.letter || "").trim().toLowerCase();
  const teacherId = body.teacherId ? Number(body.teacherId) : null;
  const status = body.status === "archived" ? "archived" : "active";
  if (!Number.isInteger(grade) || grade < 1 || grade > 12 || !letter) {
    return json({ error: "Невалидни данни за класа." }, 400, cors);
  }
  await env.DB.prepare(
    `UPDATE classes
     SET grade = ?, letter = ?, profile = ?, room = ?, homeroom_teacher_id = ?, status = ?
     WHERE id = ? AND school_id = ?`
  ).bind(
    grade, letter, String(body.profile || "").trim() || null,
    String(body.room || "").trim() || null, teacherId, status,
    classId, auth.user.school_id
  ).run();
  return json({ ok: true }, 200, cors);
}

async function classRoster(request, env, cors, classId) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const classRow = await env.DB.prepare(
    `SELECT c.id, c.grade, c.letter, c.profile, c.room,
            u.first_name || ' ' || u.last_name AS teacher_name
     FROM classes c LEFT JOIN users u ON u.id = c.homeroom_teacher_id
     WHERE c.id = ? AND c.school_id = ?`
  ).bind(classId, auth.user.school_id).first();
  if (!classRow) return json({ error: "Класът не е намерен." }, 404, cors);

  const students = await env.DB.prepare(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.username, cs.joined_at
     FROM class_students cs JOIN users u ON u.id = cs.student_id
     WHERE cs.class_id = ? AND cs.left_at IS NULL
     ORDER BY u.first_name, u.last_name`
  ).bind(classId).all();
  const available = await env.DB.prepare(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.username,
            c.grade || c.letter AS current_class
     FROM users u
     LEFT JOIN class_students cs ON cs.student_id = u.id AND cs.left_at IS NULL
     LEFT JOIN classes c ON c.id = cs.class_id AND c.status = 'active'
     WHERE u.school_id = ? AND u.role = 'student' AND u.status = 'active'
       AND (cs.class_id IS NULL OR cs.class_id != ?)
     ORDER BY u.first_name, u.last_name`
  ).bind(auth.user.school_id, classId).all();
  return json({ class: classRow, students: students.results, available: available.results }, 200, cors);
}

async function enrollStudent(request, env, cors, classId) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const body = await readJson(request);
  const studentId = Number(body.studentId);
  const valid = await env.DB.prepare(
    `SELECT u.id FROM users u JOIN classes c ON c.school_id = u.school_id
     WHERE u.id = ? AND u.school_id = ? AND u.role = 'student'
       AND u.status = 'active' AND c.id = ?`
  ).bind(studentId, auth.user.school_id, classId).first();
  if (!valid) return json({ error: "Невалиден ученик или клас." }, 400, cors);
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE class_students SET left_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND left_at IS NULL AND class_id != ?`
    ).bind(studentId, classId),
    env.DB.prepare(
      `INSERT INTO class_students (class_id, student_id, joined_at, left_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, NULL)
       ON CONFLICT(class_id, student_id) DO UPDATE SET joined_at = CURRENT_TIMESTAMP, left_at = NULL`
    ).bind(classId, studentId)
  ]);
  return json({ ok: true }, 200, cors);
}

async function removeStudent(request, env, cors, classId, studentId) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  await env.DB.prepare(
    `UPDATE class_students SET left_at = CURRENT_TIMESTAMP
     WHERE class_id = ? AND student_id = ? AND class_id IN
       (SELECT id FROM classes WHERE school_id = ?)`
  ).bind(classId, studentId, auth.user.school_id).run();
  return json({ ok: true }, 200, cors);
}

async function scheduleBootstrap(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  await ensureSchedulePeriods(env,auth.user.school_id);
  const [classes, subjects, teachers, year, periods] = await Promise.all([
    env.DB.prepare(`SELECT c.id,c.grade,c.letter,c.room FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id WHERE c.school_id=? AND c.status='active' AND ay.status='active' ORDER BY c.grade,c.letter`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT id, name, short_name, color FROM subjects WHERE school_id = ? AND status = 'active' ORDER BY name`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT id, first_name, last_name FROM users WHERE school_id = ? AND role = 'teacher' AND status = 'active' ORDER BY first_name, last_name`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT id,name,starts_on,ends_on FROM academic_years WHERE school_id = ? AND status = 'active' LIMIT 1`).bind(auth.user.school_id).first(),
    env.DB.prepare(`SELECT sp.period_number,sp.starts_at,sp.ends_at FROM schedule_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id WHERE sp.school_id=? AND ay.status='active' ORDER BY sp.period_number`).bind(auth.user.school_id).all()
  ]);
  return json({ classes: classes.results, subjects: subjects.results, teachers: teachers.results, academicYear: year, periods:periods.results }, 200, cors);
}

async function adminSchedule(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const classId = Number(new URL(request.url).searchParams.get("classId"));
  const validClass = await env.DB.prepare(`SELECT id FROM classes WHERE id = ? AND school_id = ?`).bind(classId, auth.user.school_id).first();
  if (!validClass) return json({ error: "Изберете валиден клас." }, 400, cors);
  const result = await env.DB.prepare(
    `SELECT sl.id, sl.class_id, sl.subject_id, sl.teacher_id, sl.weekday, sl.period_number,
            sl.starts_at, sl.room, sl.is_published, s.name AS subject_name, s.color,
            u.first_name || ' ' || u.last_name AS teacher_name
     FROM schedule_lessons sl JOIN subjects s ON s.id = sl.subject_id JOIN users u ON u.id = sl.teacher_id
     WHERE sl.school_id = ? AND sl.class_id = ? ORDER BY sl.weekday, sl.period_number`
  ).bind(auth.user.school_id, classId).all();
  return json({ lessons: result.results, published: result.results.length > 0 && result.results.every(x => Number(x.is_published) === 1) }, 200, cors);
}

async function saveScheduleLesson(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const body = await readJson(request), classId = Number(body.classId), subjectId = Number(body.subjectId), teacherId = Number(body.teacherId), weekday = Number(body.weekday), period = Number(body.periodNumber);
  const startsAt = String(body.startsAt || "").trim(), room = String(body.room || "").trim();
  if (![weekday, period].every(Number.isInteger) || weekday < 1 || weekday > 5 || period < 1 || period > 10 || !startsAt) return json({ error: "Невалиден ден, час или начален час." }, 400, cors);
  const valid = await env.DB.prepare(
    `SELECT c.academic_year_id FROM classes c JOIN subjects s ON s.school_id = c.school_id JOIN users u ON u.school_id = c.school_id
     WHERE c.id = ? AND c.school_id = ? AND s.id = ? AND s.status = 'active' AND u.id = ? AND u.role = 'teacher' AND u.status = 'active'`
  ).bind(classId, auth.user.school_id, subjectId, teacherId).first();
  if (!valid) return json({ error: "Класът, предметът или учителят е невалиден." }, 400, cors);
  const conflict = await env.DB.prepare(
    `SELECT sl.id, c.grade || c.letter AS class_name, u.first_name || ' ' || u.last_name AS teacher_name, sl.room
     FROM schedule_lessons sl JOIN classes c ON c.id = sl.class_id JOIN users u ON u.id = sl.teacher_id
     WHERE sl.academic_year_id = ? AND sl.weekday = ? AND sl.period_number = ? AND sl.class_id != ?
       AND (sl.teacher_id = ? OR (TRIM(COALESCE(sl.room,'')) != '' AND LOWER(sl.room) = LOWER(?))) LIMIT 1`
  ).bind(valid.academic_year_id, weekday, period, classId, teacherId, room).first();
  if (conflict) return json({ error: conflict.teacher_name === `${auth.user.first_name} ${auth.user.last_name}` ? "Учителят вече има час тогава." : `Конфликт: учителят или кабинетът вече е зает от ${conflict.class_name} клас.` }, 409, cors);
  await env.DB.prepare(
    `INSERT INTO schedule_lessons (school_id, academic_year_id, class_id, subject_id, teacher_id, weekday, period_number, starts_at, room, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(academic_year_id, class_id, weekday, period_number) DO UPDATE SET subject_id=excluded.subject_id, teacher_id=excluded.teacher_id, starts_at=excluded.starts_at, room=excluded.room, is_published=0`
  ).bind(auth.user.school_id, valid.academic_year_id, classId, subjectId, teacherId, weekday, period, startsAt, room || null).run();
  return json({ ok: true }, 200, cors);
}

async function deleteScheduleLesson(request, env, cors, lessonId) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  await env.DB.prepare(`DELETE FROM schedule_lessons WHERE id = ? AND school_id = ?`).bind(lessonId, auth.user.school_id).run();
  return json({ ok: true }, 200, cors);
}

async function publishSchedule(request, env, cors) {
  const auth = await requireRole(request, env, "school_admin");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const body = await readJson(request), classId = Number(body.classId);
  const target = await env.DB.prepare(`SELECT id FROM classes WHERE id = ? AND school_id = ?`).bind(classId, auth.user.school_id).first();
  if (!target) return json({ error: "Класът не е намерен." }, 404, cors);
  await env.DB.prepare(`UPDATE schedule_lessons SET is_published = 1 WHERE class_id = ? AND school_id = ?`).bind(classId, auth.user.school_id).run();
  return json({ ok: true }, 200, cors);
}

async function mySchedule(request, env, cors) {
  const auth = await authenticate(request, env);
  if (!auth) return json({ error: "Не сте влезли в системата." }, 401, cors);
  let where = "sl.teacher_id = ?", value = auth.user.id, context = "Моята учителска програма";
  if (auth.user.role === "student") {
    where = `sl.class_id IN (SELECT class_id FROM class_students WHERE student_id = ? AND left_at IS NULL)`;
    context = "Моята програма";
  } else if (auth.user.role !== "teacher") return json({ error: "Този изглед е за ученици и учители." }, 403, cors);
  const result = await env.DB.prepare(
    `SELECT sl.id, sl.weekday, sl.period_number, sl.starts_at, sl.room, s.name AS subject_name, s.color,
            u.first_name || ' ' || u.last_name AS teacher_name, c.grade || c.letter AS class_name
     FROM schedule_lessons sl JOIN subjects s ON s.id=sl.subject_id JOIN users u ON u.id=sl.teacher_id JOIN classes c ON c.id=sl.class_id
     WHERE sl.school_id = ? AND sl.is_published = 1 AND ${where} ORDER BY sl.weekday, sl.period_number`
  ).bind(auth.user.school_id, value).all();
  return json({ lessons: result.results, context }, 200, cors);
}

async function ensureWeeklySchedule(env){await env.DB.batch([env.DB.prepare(`CREATE TABLE IF NOT EXISTS schedule_week_lessons(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,academic_year_id INTEGER NOT NULL,class_id INTEGER NOT NULL,week_start TEXT NOT NULL,subject_id INTEGER NOT NULL,teacher_id INTEGER NOT NULL,weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 5),period_number INTEGER NOT NULL CHECK(period_number BETWEEN 1 AND 10),starts_at TEXT NOT NULL,room TEXT,is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN(0,1)),UNIQUE(academic_year_id,class_id,week_start,weekday,period_number))`),env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_schedule_week ON schedule_week_lessons(school_id,week_start,class_id,is_published)`)])}
async function ensureSchedulePeriods(env,schoolId){await env.DB.prepare(`CREATE TABLE IF NOT EXISTS schedule_periods(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,academic_year_id INTEGER NOT NULL,period_number INTEGER NOT NULL CHECK(period_number BETWEEN 1 AND 10),starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,UNIQUE(academic_year_id,period_number))`).run();const year=await env.DB.prepare(`SELECT id FROM academic_years WHERE school_id=? AND status='active' LIMIT 1`).bind(schoolId).first();if(!year)return;const defaults=[['08:00','08:45'],['08:55','09:40'],['10:00','10:45'],['10:55','11:40'],['11:50','12:35'],['12:55','13:40'],['13:50','14:35'],['14:45','15:30'],['15:40','16:25'],['16:35','17:20']];await env.DB.batch(defaults.map((t,i)=>env.DB.prepare(`INSERT OR IGNORE INTO schedule_periods(school_id,academic_year_id,period_number,starts_at,ends_at) VALUES(?,?,?,?,?)`).bind(schoolId,year.id,i+1,t[0],t[1])))}
async function saveSchedulePeriods(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureSchedulePeriods(env,auth.user.school_id);const body=await readJson(request),rows=Array.isArray(body.periods)?body.periods:[],year=await env.DB.prepare(`SELECT id FROM academic_years WHERE school_id=? AND status='active' LIMIT 1`).bind(auth.user.school_id).first();if(!year)return json({error:'Няма активна учебна година.'},409,cors);if(!rows.length||rows.length>10)return json({error:'Добавете между 1 и 10 учебни часа.'},400,cors);const normalized=rows.map((r,i)=>({number:i+1,start:String(r.startsAt||''),end:String(r.endsAt||'')}));for(let i=0;i<normalized.length;i++){const r=normalized[i];if(!/^\d{2}:\d{2}$/.test(r.start)||!/^\d{2}:\d{2}$/.test(r.end)||r.start>=r.end)return json({error:`Проверете началото и края на ${r.number}. час.`},400,cors);if(i&&normalized[i-1].end>r.start)return json({error:`${r.number}. час се застъпва с предходния.`},409,cors)}const statements=[env.DB.prepare(`DELETE FROM schedule_periods WHERE academic_year_id=?`).bind(year.id),...normalized.map(r=>env.DB.prepare(`INSERT INTO schedule_periods(school_id,academic_year_id,period_number,starts_at,ends_at) VALUES(?,?,?,?,?)`).bind(auth.user.school_id,year.id,r.number,r.start,r.end)),...normalized.map(r=>env.DB.prepare(`UPDATE schedule_week_lessons SET starts_at=?,is_published=0 WHERE academic_year_id=? AND period_number=?`).bind(r.start,year.id,r.number))];await env.DB.batch(statements);return json({ok:true,periods:normalized},200,cors)}
function mondayOf(value){const date=new Date(String(value||'')+'T12:00:00Z');if(Number.isNaN(date.getTime()))return'';const day=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-day);return date.toISOString().slice(0,10)}
async function validScheduleWeek(env,schoolId,weekStart){const year=await env.DB.prepare(`SELECT id,name,starts_on,ends_on FROM academic_years WHERE school_id=? AND status='active' LIMIT 1`).bind(schoolId).first();if(!year)return{error:'Няма активна учебна година.'};const week=mondayOf(weekStart);if(!week)return{error:'Изберете валидна седмица.'};const friday=new Date(week+'T12:00:00Z');friday.setUTCDate(friday.getUTCDate()+4);if(friday.toISOString().slice(0,10)<year.starts_on||week>year.ends_on)return{error:'Седмицата е извън активната учебна година.'};return{year,week}}
async function weeklyAdminSchedule(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const q=new URL(request.url).searchParams,classId=Number(q.get('classId')),check=await validScheduleWeek(env,auth.user.school_id,q.get('weekStart'));if(check.error)return json({error:check.error},400,cors);const validClass=await env.DB.prepare(`SELECT id FROM classes WHERE id=? AND school_id=? AND academic_year_id=?`).bind(classId,auth.user.school_id,check.year.id).first();if(!validClass)return json({error:'Изберете валиден клас.'},400,cors);const weeklyCount=await env.DB.prepare(`SELECT COUNT(*) AS count FROM schedule_week_lessons WHERE school_id=? AND class_id=?`).bind(auth.user.school_id,classId).first();if(!Number(weeklyCount?.count)){await env.DB.prepare(`INSERT INTO schedule_week_lessons(school_id,academic_year_id,class_id,week_start,subject_id,teacher_id,weekday,period_number,starts_at,room,is_published) SELECT school_id,academic_year_id,class_id,?,subject_id,teacher_id,weekday,period_number,starts_at,room,is_published FROM schedule_lessons WHERE school_id=? AND class_id=?`).bind(check.week,auth.user.school_id,classId).run()}const result=await env.DB.prepare(`SELECT sw.*,COALESCE(sp.starts_at,sw.starts_at) AS starts_at,sp.ends_at,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name FROM schedule_week_lessons sw LEFT JOIN schedule_periods sp ON sp.academic_year_id=sw.academic_year_id AND sp.period_number=sw.period_number JOIN subjects s ON s.id=sw.subject_id JOIN users u ON u.id=sw.teacher_id WHERE sw.school_id=? AND sw.class_id=? AND sw.week_start=? ORDER BY sw.weekday,sw.period_number`).bind(auth.user.school_id,classId,check.week).all();return json({lessons:result.results,weekStart:check.week,academicYear:check.year,published:result.results.length>0&&result.results.every(x=>Number(x.is_published)===1)},200,cors)}
async function saveWeeklyScheduleLesson(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const b=await readJson(request),classId=Number(b.classId),subjectId=Number(b.subjectId),teacherId=Number(b.teacherId),weekday=Number(b.weekday),period=Number(b.periodNumber),startsAt=String(b.startsAt||'').trim(),room=String(b.room||'').trim(),check=await validScheduleWeek(env,auth.user.school_id,b.weekStart);if(check.error)return json({error:check.error},400,cors);if(!Number.isInteger(weekday)||weekday<1||weekday>5||!Number.isInteger(period)||period<1||period>10||!startsAt)return json({error:'Невалиден ден или учебен час.'},400,cors);const valid=await env.DB.prepare(`SELECT c.id FROM classes c JOIN subjects s ON s.school_id=c.school_id JOIN users u ON u.school_id=c.school_id WHERE c.id=? AND c.school_id=? AND c.academic_year_id=? AND s.id=? AND s.status='active' AND u.id=? AND u.role='teacher' AND u.status='active'`).bind(classId,auth.user.school_id,check.year.id,subjectId,teacherId).first();if(!valid)return json({error:'Класът, предметът или учителят е невалиден.'},400,cors);const conflict=await env.DB.prepare(`SELECT c.grade||c.letter AS class_name FROM schedule_week_lessons sw JOIN classes c ON c.id=sw.class_id WHERE sw.academic_year_id=? AND sw.week_start=? AND sw.weekday=? AND sw.period_number=? AND sw.class_id!=? AND(sw.teacher_id=? OR(TRIM(COALESCE(sw.room,''))!='' AND LOWER(sw.room)=LOWER(?))) LIMIT 1`).bind(check.year.id,check.week,weekday,period,classId,teacherId,room).first();if(conflict)return json({error:`Конфликт с ${conflict.class_name} клас за тази седмица.`},409,cors);await env.DB.prepare(`INSERT INTO schedule_week_lessons(school_id,academic_year_id,class_id,week_start,subject_id,teacher_id,weekday,period_number,starts_at,room,is_published) VALUES(?,?,?,?,?,?,?,?,?,?,0) ON CONFLICT(academic_year_id,class_id,week_start,weekday,period_number) DO UPDATE SET subject_id=excluded.subject_id,teacher_id=excluded.teacher_id,starts_at=excluded.starts_at,room=excluded.room,is_published=0`).bind(auth.user.school_id,check.year.id,classId,check.week,subjectId,teacherId,weekday,period,startsAt,room||null).run();return json({ok:true},200,cors)}
async function deleteWeeklyScheduleLesson(request,env,cors,id){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureWeeklySchedule(env);await env.DB.prepare(`DELETE FROM schedule_week_lessons WHERE id=? AND school_id=?`).bind(id,auth.user.school_id).run();return json({ok:true},200,cors)}
async function publishWeeklySchedule(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const b=await readJson(request),classId=Number(b.classId),check=await validScheduleWeek(env,auth.user.school_id,b.weekStart);if(check.error)return json({error:check.error},400,cors);await env.DB.prepare(`UPDATE schedule_week_lessons SET is_published=1 WHERE school_id=? AND class_id=? AND week_start=?`).bind(auth.user.school_id,classId,check.week).run();return json({ok:true},200,cors)}
async function copyWeeklySchedule(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const b=await readJson(request),classId=Number(b.classId),check=await validScheduleWeek(env,auth.user.school_id,b.weekStart);if(check.error)return json({error:check.error},400,cors);const previous=new Date(check.week+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-7);const previousWeek=previous.toISOString().slice(0,10),exists=await env.DB.prepare(`SELECT COUNT(*) AS count FROM schedule_week_lessons WHERE school_id=? AND class_id=? AND week_start=?`).bind(auth.user.school_id,classId,check.week).first();if(Number(exists?.count))return json({error:'Избраната седмица вече има програма. Изтрийте часовете преди копиране.'},409,cors);const source=await env.DB.prepare(`SELECT COUNT(*) AS count FROM schedule_week_lessons WHERE school_id=? AND class_id=? AND week_start=?`).bind(auth.user.school_id,classId,previousWeek).first();if(!Number(source?.count))return json({error:'Предходната седмица няма въведена програма.'},409,cors);await env.DB.prepare(`INSERT INTO schedule_week_lessons(school_id,academic_year_id,class_id,week_start,subject_id,teacher_id,weekday,period_number,starts_at,room,is_published) SELECT school_id,academic_year_id,class_id,?,subject_id,teacher_id,weekday,period_number,starts_at,room,0 FROM schedule_week_lessons WHERE school_id=? AND class_id=? AND week_start=?`).bind(check.week,auth.user.school_id,classId,previousWeek).run();return json({ok:true},201,cors)}
async function myWeeklySchedule(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);if(!['student','teacher'].includes(auth.user.role))return json({error:'Този изглед е за ученици и учители.'},403,cors);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const q=new URL(request.url).searchParams;let check=await validScheduleWeek(env,auth.user.school_id,q.get('weekStart')||sofiaNow().date);if(check.error){const active=await env.DB.prepare(`SELECT starts_on FROM academic_years WHERE school_id=? AND status='active' LIMIT 1`).bind(auth.user.school_id).first();if(!active)return json({error:check.error},400,cors);check=await validScheduleWeek(env,auth.user.school_id,active.starts_on)}let where='sw.teacher_id=?',value=auth.user.id;if(auth.user.role==='student'){where=`sw.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL)`}const result=await env.DB.prepare(`SELECT sw.id,sw.class_id,sw.subject_id,sw.weekday,sw.period_number,COALESCE(sp.starts_at,sw.starts_at) AS starts_at,sp.ends_at,sw.room,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name,c.grade||c.letter AS class_name FROM schedule_week_lessons sw LEFT JOIN schedule_periods sp ON sp.academic_year_id=sw.academic_year_id AND sp.period_number=sw.period_number JOIN subjects s ON s.id=sw.subject_id JOIN users u ON u.id=sw.teacher_id JOIN classes c ON c.id=sw.class_id WHERE sw.school_id=? AND sw.week_start=? AND sw.is_published=1 AND ${where} ORDER BY sw.weekday,sw.period_number`).bind(auth.user.school_id,check.week,value).all();return json({lessons:result.results,weekStart:check.week,academicYear:check.year,context:auth.user.role==='student'?'Моята програма':'Моята учителска програма'},200,cors)}

async function journalBootstrap(request, env, cors) {
  const auth = await requireRole(request, env, "teacher");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const assignments = await env.DB.prepare(`SELECT ta.id, c.id AS class_id,c.grade,c.letter,s.id AS subject_id,s.name AS subject_name,s.color FROM teacher_assignments ta JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.school_id=? AND ta.teacher_id=? AND ay.status='active' AND c.status='active' AND s.status='active' ORDER BY c.grade,c.letter,s.name`).bind(auth.user.school_id,auth.user.id).all();
  return json({ assignments: assignments.results }, 200, cors);
}

async function loadJournal(request, env, cors) {
  const auth = await requireRole(request, env, "teacher");
  if (auth.error) return json({ error: auth.error }, auth.status, cors);
  const q = new URL(request.url).searchParams, classId=Number(q.get("classId")), subjectId=Number(q.get("subjectId")), date=String(q.get("date")||""), period=Number(q.get("period"));
  const valid = await env.DB.prepare(`SELECT ta.id FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.class_id=? AND ta.subject_id=? AND ta.teacher_id=? AND ta.school_id=? AND ay.status='active'`).bind(classId,subjectId,auth.user.id,auth.user.school_id).first();
  if(!valid) return json({error:"Нямате назначение за този клас и предмет."},403,cors);
  const students=await env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,u.email FROM class_students cs JOIN users u ON u.id=cs.student_id WHERE cs.class_id=? AND cs.left_at IS NULL ORDER BY u.first_name,u.last_name`).bind(classId).all();
  const lesson=await env.DB.prepare(`SELECT id,topic FROM journal_lessons WHERE class_id=? AND subject_id=? AND lesson_date=? AND period_number=? LIMIT 1`).bind(classId,subjectId,date,period).first();
  let entries=[];
  if(lesson){const result=await env.DB.prepare(`SELECT u.id AS student_id,COALESCE(a.status,'present') AS attendance,COALESCE(a.excused,0) AS excused,g.value AS grade,COALESCE(g.grade_type,'current') AS grade_type,COALESCE(g.note,a.note,'') AS note FROM class_students cs JOIN users u ON u.id=cs.student_id LEFT JOIN attendance a ON a.student_id=u.id AND a.journal_lesson_id=? LEFT JOIN grades g ON g.student_id=u.id AND g.journal_lesson_id=? WHERE cs.class_id=? AND cs.left_at IS NULL`).bind(lesson.id,lesson.id,classId).all();entries=result.results}
  return json({students:students.results,lesson:lesson||null,entries},200,cors);
}

async function saveJournal(request, env, cors) {
  const auth=await requireRole(request,env,"teacher");if(auth.error)return json({error:auth.error},auth.status,cors);
  const b=await readJson(request),classId=Number(b.classId),subjectId=Number(b.subjectId),date=String(b.date||""),period=Number(b.period),topic=String(b.topic||"").trim(),entries=Array.isArray(b.entries)?b.entries:[];
  if(!classId||!subjectId||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(period)||period<1||period>10||!topic)return json({error:"Попълнете дата, час и тема."},400,cors);
  const valid=await env.DB.prepare(`SELECT ta.id,ay.starts_on,ay.ends_on,ay.first_term_ends_on,ay.second_term_starts_on FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.class_id=? AND ta.school_id=? AND ta.subject_id=? AND ta.teacher_id=? AND ay.status='active'`).bind(classId,auth.user.school_id,subjectId,auth.user.id).first();if(!valid)return json({error:"Не сте назначени да преподавате този предмет на избрания клас."},403,cors);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const scheduledWeek=mondayOf(date),scheduledDay=new Date(date+'T12:00:00Z').getUTCDay(),scheduled=await env.DB.prepare(`SELECT id FROM schedule_week_lessons WHERE school_id=? AND class_id=? AND subject_id=? AND teacher_id=? AND week_start=? AND weekday=? AND period_number=? AND is_published=1`).bind(auth.user.school_id,classId,subjectId,auth.user.id,scheduledWeek,scheduledDay,period).first();if(!scheduled)return json({error:'Можете да попълвате само час от публикуваната Ви програма.'},403,cors);const today=sofiaNow().date;if((date<=valid.first_term_ends_on&&today>valid.first_term_ends_on)||(date>=valid.second_term_starts_on&&date<=valid.ends_on&&today>valid.ends_on))return json({error:'Срокът е приключил и дневникът за този период е заключен.'},409,cors);
  await env.DB.prepare(`INSERT INTO journal_lessons(school_id,class_id,subject_id,teacher_id,lesson_date,period_number,topic) VALUES(?,?,?,?,?,?,?) ON CONFLICT(class_id,subject_id,lesson_date,period_number) DO UPDATE SET teacher_id=excluded.teacher_id,topic=excluded.topic`).bind(auth.user.school_id,classId,subjectId,auth.user.id,date,period,topic).run();
  const lesson=await env.DB.prepare(`SELECT id FROM journal_lessons WHERE class_id=? AND subject_id=? AND lesson_date=? AND period_number=?`).bind(classId,subjectId,date,period).first();
  const validStudents=await env.DB.prepare(`SELECT student_id FROM class_students WHERE class_id=? AND left_at IS NULL`).bind(classId).all(),allowed=new Set(validStudents.results.map(x=>Number(x.student_id)));
  const statements=[env.DB.prepare(`DELETE FROM attendance WHERE journal_lesson_id=?`).bind(lesson.id),env.DB.prepare(`DELETE FROM grades WHERE journal_lesson_id=?`).bind(lesson.id)];
  for(const e of entries){const studentId=Number(e.studentId);if(!allowed.has(studentId))continue;const status=["present","absent","late"].includes(e.attendance)?e.attendance:"present",note=String(e.note||"").trim()||null;statements.push(env.DB.prepare(`INSERT INTO attendance(school_id,student_id,journal_lesson_id,status,excused,note) VALUES(?,?,?,?,?,?)`).bind(auth.user.school_id,studentId,lesson.id,status,e.excused?1:0,note));const grade=Number(e.grade),gradeType=['current','oral','test','classwork','exam'].includes(e.gradeType)?e.gradeType:'current';if([2,3,4,5,6].includes(grade))statements.push(env.DB.prepare(`INSERT INTO grades(school_id,student_id,teacher_id,subject_id,journal_lesson_id,value,grade_type,note,graded_on) VALUES(?,?,?,?,?,?,?,?,?)`).bind(auth.user.school_id,studentId,auth.user.id,subjectId,lesson.id,grade,gradeType,note,date));}
  await env.DB.batch(statements);return json({ok:true,lessonId:lesson.id},200,cors);
}

async function studentDiary(request, env, cors) {
  const auth=await requireRole(request,env,"student");if(auth.error)return json({error:auth.error},auth.status,cors);
  await ensureFinalGradeTables(env);const [grades,attendance,finalGrades,profile]=await Promise.all([
    env.DB.prepare(`SELECT g.id,g.value,g.grade_type,g.note,g.graded_on,s.id AS subject_id,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name FROM grades g JOIN subjects s ON s.id=g.subject_id JOIN users u ON u.id=g.teacher_id WHERE g.student_id=? ORDER BY g.graded_on DESC,g.id DESC`).bind(auth.user.id).all(),
    env.DB.prepare(`SELECT a.id,a.status,a.excused,a.note,j.lesson_date,j.period_number,s.id AS subject_id,s.name AS subject_name,u.first_name||' '||u.last_name AS teacher_name FROM attendance a JOIN journal_lessons j ON j.id=a.journal_lesson_id JOIN subjects s ON s.id=j.subject_id JOIN users u ON u.id=j.teacher_id WHERE a.student_id=? AND a.status!='present' ORDER BY j.lesson_date DESC,j.period_number`).bind(auth.user.id).all()
    ,env.DB.prepare(`SELECT fg.value,fg.term,fg.subject_id,s.name AS subject_name FROM final_grades fg JOIN subjects s ON s.id=fg.subject_id JOIN academic_years ay ON ay.id=fg.academic_year_id WHERE fg.student_id=? AND ay.status='active' ORDER BY fg.term,s.name`).bind(auth.user.id).all(),
    env.DB.prepare(`SELECT u.first_name||' '||u.last_name AS student_name,sc.name AS school_name,c.grade||c.letter AS class_name,ay.name AS academic_year,ay.first_term_ends_on,ay.second_term_starts_on,ht.first_name||' '||ht.last_name AS homeroom_teacher FROM users u JOIN schools sc ON sc.id=u.school_id LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id AND c.status='active' LEFT JOIN academic_years ay ON ay.id=c.academic_year_id AND ay.status='active' LEFT JOIN users ht ON ht.id=c.homeroom_teacher_id WHERE u.id=? LIMIT 1`).bind(auth.user.id).first()
  ]);
  return json({grades:grades.results,attendance:attendance.results,finalGrades:finalGrades.results,profile},200,cors);
}

async function attendanceManagerAuth(request, env) {
  const auth = await authenticate(request, env);
  if (!auth) return { error: "Не сте влезли в системата.", status: 401 };
  if (!['school_admin','teacher'].includes(auth.user.role)) return { error: "Нямате право за това действие.", status: 403 };
  return auth;
}

async function listAssignments(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const [assignments,teachers,classes,subjects,year]=await Promise.all([
    env.DB.prepare(`SELECT ta.id,ta.teacher_id,ta.class_id,ta.subject_id,u.first_name||' '||u.last_name AS teacher_name,c.grade||c.letter AS class_name,s.name AS subject_name,s.color FROM teacher_assignments ta JOIN users u ON u.id=ta.teacher_id JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.school_id=? AND ay.status='active' ORDER BY u.first_name,u.last_name,c.grade,c.letter,s.name`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT id,first_name,last_name FROM users WHERE school_id=? AND role='teacher' AND status='active' ORDER BY first_name,last_name`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT c.id,c.grade,c.letter FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id WHERE c.school_id=? AND c.status='active' AND ay.status='active' ORDER BY c.grade,c.letter`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT id,name,color FROM subjects WHERE school_id=? AND status='active' ORDER BY name`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT id,name FROM academic_years WHERE school_id=? AND status='active' LIMIT 1`).bind(auth.user.school_id).first()
  ]);
  return json({assignments:assignments.results,teachers:teachers.results,classes:classes.results,subjects:subjects.results,academicYear:year},200,cors);
}

async function listSubjects(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const result=await env.DB.prepare(`SELECT s.id,s.name,s.short_name,s.color,s.status,COUNT(DISTINCT ta.id) AS assignment_count,COUNT(DISTINCT sl.id) AS schedule_count,COUNT(DISTINCT g.id) AS grade_count FROM subjects s LEFT JOIN teacher_assignments ta ON ta.subject_id=s.id LEFT JOIN schedule_lessons sl ON sl.subject_id=s.id LEFT JOIN grades g ON g.subject_id=s.id WHERE s.school_id=? GROUP BY s.id ORDER BY s.status,s.name`).bind(auth.user.school_id).all();
  return json({subjects:result.results},200,cors);
}

async function listAcademicYears(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const requestedId=Number(new URL(request.url).searchParams.get('yearId')||0);
  const years=await env.DB.prepare(`SELECT ay.id,ay.name,ay.starts_on,ay.ends_on,ay.first_term_ends_on,ay.second_term_starts_on,ay.status,COUNT(DISTINCT c.id) AS class_count FROM academic_years ay LEFT JOIN classes c ON c.academic_year_id=ay.id WHERE ay.school_id=? GROUP BY ay.id ORDER BY ay.starts_on DESC`).bind(auth.user.school_id).all();
  const selected=years.results.find(y=>Number(y.id)===requestedId)||years.results.find(y=>y.status==='active')||years.results[0]||null;
  let holidays=[];if(selected){const result=await env.DB.prepare(`SELECT id,name,starts_on,ends_on FROM holidays WHERE school_id=? AND academic_year_id=? ORDER BY starts_on`).bind(auth.user.school_id,selected.id).all();holidays=result.results}
  return json({years:years.results,selected,holidays},200,cors);
}

function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))}

async function createAcademicYear(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const b=await readJson(request),name=String(b.name||'').trim(),start=String(b.startsOn||''),end=String(b.endsOn||''),termEnd=String(b.firstTermEndsOn||''),termStart=String(b.secondTermStartsOn||'');
  if(!name||![start,end,termEnd,termStart].every(validDate)||!(start<=termEnd&&termEnd<termStart&&termStart<=end))return json({error:'Проверете името и хронологичния ред на датите.'},400,cors);
  try{const result=await env.DB.prepare(`INSERT INTO academic_years(school_id,name,starts_on,ends_on,first_term_ends_on,second_term_starts_on,status) VALUES(?,?,?,?,?,?,'draft')`).bind(auth.user.school_id,name,start,end,termEnd,termStart).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}catch{return json({error:'Учебна година с това име вече съществува.'},409,cors)}
}

async function updateAcademicYear(request, env, cors, yearId) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const current=await env.DB.prepare(`SELECT * FROM academic_years WHERE id=? AND school_id=?`).bind(yearId,auth.user.school_id).first();if(!current)return json({error:'Учебната година не е намерена.'},404,cors);
  const b=await readJson(request),action=String(b.action||'update');
  if(action==='activate'){await env.DB.batch([env.DB.prepare(`UPDATE academic_years SET status='archived' WHERE school_id=? AND status='active'`).bind(auth.user.school_id),env.DB.prepare(`UPDATE academic_years SET status='active' WHERE id=? AND school_id=?`).bind(yearId,auth.user.school_id)]);return json({ok:true},200,cors)}
  if(action==='archive'){if(current.status==='active')return json({error:'Първо активирайте друга учебна година.'},409,cors);await env.DB.prepare(`UPDATE academic_years SET status='archived' WHERE id=? AND school_id=?`).bind(yearId,auth.user.school_id).run();return json({ok:true},200,cors)}
  if(current.status==='archived')return json({error:'Архивирана година не може да се редактира.'},409,cors);
  const name=String(b.name||'').trim(),start=String(b.startsOn||''),end=String(b.endsOn||''),termEnd=String(b.firstTermEndsOn||''),termStart=String(b.secondTermStartsOn||'');if(!name||![start,end,termEnd,termStart].every(validDate)||!(start<=termEnd&&termEnd<termStart&&termStart<=end))return json({error:'Проверете името и датите.'},400,cors);
  await env.DB.prepare(`UPDATE academic_years SET name=?,starts_on=?,ends_on=?,first_term_ends_on=?,second_term_starts_on=? WHERE id=? AND school_id=?`).bind(name,start,end,termEnd,termStart,yearId,auth.user.school_id).run();return json({ok:true},200,cors);
}

async function createHoliday(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const b=await readJson(request),yearId=Number(b.yearId),name=String(b.name||'').trim(),start=String(b.startsOn||''),end=String(b.endsOn||'');const year=await env.DB.prepare(`SELECT id,starts_on,ends_on,status FROM academic_years WHERE id=? AND school_id=?`).bind(yearId,auth.user.school_id).first();if(!year)return json({error:'Учебната година не е намерена.'},404,cors);if(year.status==='archived')return json({error:'Архивирана година не може да се променя.'},409,cors);if(!name||!validDate(start)||!validDate(end)||start>end||start<year.starts_on||end>year.ends_on)return json({error:'Периодът трябва да бъде в рамките на учебната година.'},400,cors);
  const result=await env.DB.prepare(`INSERT INTO holidays(school_id,academic_year_id,name,starts_on,ends_on) VALUES(?,?,?,?,?)`).bind(auth.user.school_id,yearId,name,start,end).run();return json({ok:true,id:result.meta.last_row_id},201,cors);
}

async function deleteHoliday(request, env, cors, holidayId) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);const holiday=await env.DB.prepare(`SELECT h.id,ay.status FROM holidays h JOIN academic_years ay ON ay.id=h.academic_year_id WHERE h.id=? AND h.school_id=?`).bind(holidayId,auth.user.school_id).first();if(!holiday)return json({error:'Периодът не е намерен.'},404,cors);if(holiday.status==='archived')return json({error:'Архивирана година не може да се променя.'},409,cors);await env.DB.prepare(`DELETE FROM holidays WHERE id=? AND school_id=?`).bind(holidayId,auth.user.school_id).run();return json({ok:true},200,cors);
}

async function messagesBootstrap(request, env, cors) {
  const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);
  await ensureParentTables(env);
  if(auth.user.role==='parent')return parentMessagesBootstrap(auth,env,cors);
  const recipientRoleSql=auth.user.role==='student'?`AND u.role IN ('teacher','school_admin')`:'';
  const [recipients,conversations]=await Promise.all([
    env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,u.role,c.grade||c.letter AS class_name FROM users u LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id WHERE u.school_id=? AND u.id!=? AND u.status='active' ${recipientRoleSql} ORDER BY u.role,u.first_name,u.last_name`).bind(auth.user.school_id,auth.user.id).all(),
    env.DB.prepare(`SELECT c.id,c.title,c.created_at,other.id AS other_user_id,other.first_name||' '||other.last_name AS other_name,other.role AS other_role,(SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) AS last_message,(SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) AS last_message_at,(SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id AND m.sender_id!=? AND (me.last_read_at IS NULL OR m.created_at>me.last_read_at)) AS unread_count FROM conversations c JOIN conversation_members me ON me.conversation_id=c.id AND me.user_id=? LEFT JOIN conversation_members om ON om.conversation_id=c.id AND om.user_id!=? LEFT JOIN users other ON other.id=om.user_id WHERE c.school_id=? ORDER BY COALESCE(last_message_at,c.created_at) DESC`).bind(auth.user.id,auth.user.id,auth.user.id,auth.user.school_id).all()
  ]);
  let allRecipients=recipients.results.map(r=>({...r,id:String(r.id)})),allConversations=conversations.results.map(c=>({...c,id:String(c.id),conversation_type:'user'}));
  if(['teacher','school_admin'].includes(auth.user.role)){
    const teacherFilter=auth.user.role==='teacher'?`AND (c.homeroom_teacher_id=? OR EXISTS(SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id=? AND ta.class_id=c.id))`:'';
    const binds=auth.user.role==='teacher'?[auth.user.school_id,auth.user.id,auth.user.id]:[auth.user.school_id];
    const parentRecipients=await env.DB.prepare(`SELECT p.id AS parent_id,p.first_name,p.last_name,'parent' AS role,u.id AS student_id,u.first_name||' '||u.last_name AS class_name FROM parents p JOIN parent_students ps ON ps.parent_id=p.id JOIN users u ON u.id=ps.student_id JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL JOIN classes c ON c.id=cs.class_id WHERE p.school_id=? AND p.status='active' AND u.status='active' ${teacherFilter} ORDER BY p.first_name,p.last_name,u.first_name`).bind(...binds).all();
    allRecipients.push(...parentRecipients.results.map(r=>({...r,id:`parent:${r.parent_id}:${r.student_id}`})));
    const pc=await env.DB.prepare(`SELECT pc.id,p.first_name||' '||p.last_name AS other_name,'parent' AS other_role,u.first_name||' '||u.last_name AS title,pc.created_at,(SELECT body FROM parent_messages pm WHERE pm.conversation_id=pc.id ORDER BY pm.created_at DESC,pm.id DESC LIMIT 1) AS last_message,(SELECT created_at FROM parent_messages pm WHERE pm.conversation_id=pc.id ORDER BY pm.created_at DESC,pm.id DESC LIMIT 1) AS last_message_at,(SELECT COUNT(*) FROM parent_messages pm WHERE pm.conversation_id=pc.id AND pm.sender_kind='parent' AND (pc.staff_last_read_at IS NULL OR pm.created_at>pc.staff_last_read_at)) AS unread_count FROM parent_conversations pc JOIN parents p ON p.id=pc.parent_id JOIN users u ON u.id=pc.student_id WHERE pc.school_id=? AND pc.staff_user_id=?`).bind(auth.user.school_id,auth.user.id).all();
    allConversations.push(...pc.results.map(c=>({...c,id:`p-${c.id}`,conversation_type:'parent',other_name:`${c.other_name} · за ${c.title}`})));
  }
  allConversations.sort((a,b)=>String(b.last_message_at||b.created_at).localeCompare(String(a.last_message_at||a.created_at)));
  return json({user:publicUser(auth.user),recipients:allRecipients,conversations:allConversations},200,cors);
}

async function parentMessagesBootstrap(auth,env,cors){
  const [recipientRows,conversations]=await Promise.all([
    env.DB.prepare(`SELECT DISTINCT staff.id,staff.first_name,staff.last_name,staff.role,ch.id AS student_id,ch.first_name AS child_first,ch.last_name AS child_last FROM parent_students ps JOIN users ch ON ch.id=ps.student_id LEFT JOIN class_students cs ON cs.student_id=ch.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id JOIN users staff ON staff.school_id=ch.school_id AND staff.status='active' AND (staff.role='school_admin' OR (staff.role='teacher' AND (c.homeroom_teacher_id=staff.id OR EXISTS(SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id=staff.id AND ta.class_id=c.id)))) WHERE ps.parent_id=? AND ch.status='active' ORDER BY ch.first_name,ch.last_name,staff.role,staff.first_name,staff.last_name`).bind(auth.user.id).all(),
    env.DB.prepare(`SELECT pc.id,u.first_name||' '||u.last_name AS other_name,u.role AS other_role,ch.first_name||' '||ch.last_name AS title,pc.created_at,(SELECT body FROM parent_messages pm WHERE pm.conversation_id=pc.id ORDER BY pm.created_at DESC,pm.id DESC LIMIT 1) AS last_message,(SELECT created_at FROM parent_messages pm WHERE pm.conversation_id=pc.id ORDER BY pm.created_at DESC,pm.id DESC LIMIT 1) AS last_message_at,(SELECT COUNT(*) FROM parent_messages pm WHERE pm.conversation_id=pc.id AND pm.sender_kind='staff' AND (pc.parent_last_read_at IS NULL OR pm.created_at>pc.parent_last_read_at)) AS unread_count FROM parent_conversations pc JOIN users u ON u.id=pc.staff_user_id JOIN users ch ON ch.id=pc.student_id WHERE pc.parent_id=? AND pc.school_id=?`).bind(auth.user.id,auth.user.school_id).all()
  ]);
  const recipients=recipientRows.results.map(r=>({...r,id:`staff:${r.id}:${r.student_id}`,class_name:`за ${r.child_first} ${r.child_last}`}));
  return json({user:publicUser(auth.user),recipients,conversations:conversations.results.map(c=>({...c,id:`p-${c.id}`,conversation_type:'parent',other_name:`${c.other_name} · за ${c.title}`}))},200,cors);
}

function sofiaNow(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t)?.value||'';const weekdays={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};return{date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`,weekday:weekdays[get('weekday')]||1}}

async function unreadMessages(env,userId){await ensureParentTables(env);const [row,parentRow]=await Promise.all([env.DB.prepare(`SELECT COUNT(*) AS count FROM messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id AND cm.user_id=? WHERE m.sender_id!=? AND (cm.last_read_at IS NULL OR m.created_at>cm.last_read_at)`).bind(userId,userId).first(),env.DB.prepare(`SELECT COUNT(*) AS count FROM parent_messages pm JOIN parent_conversations pc ON pc.id=pm.conversation_id WHERE pc.staff_user_id=? AND pm.sender_kind='parent' AND (pc.staff_last_read_at IS NULL OR pm.created_at>pc.staff_last_read_at)`).bind(userId).first()]);return Number(row?.count||0)+Number(parentRow?.count||0)}

async function dashboard(request, env, cors) {
  const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);await ensureAssessmentTables(env);await ensureWeeklySchedule(env);await ensureSchedulePeriods(env,auth.user.school_id);const now=sofiaNow(),nowWeek=mondayOf(now.date),unread=await unreadMessages(env,auth.user.id);
  if(auth.user.role==='school_admin'){
    const [students,teachers,classes,attendance,average]=await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE school_id=? AND role='student' AND status='active'`).bind(auth.user.school_id).first(),env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE school_id=? AND role='teacher' AND status='active'`).bind(auth.user.school_id).first(),env.DB.prepare(`SELECT COUNT(*) AS count FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id WHERE c.school_id=? AND c.status='active' AND ay.status='active'`).bind(auth.user.school_id).first(),env.DB.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN a.excused=0 THEN 1 ELSE 0 END) AS unexcused FROM attendance a JOIN journal_lessons j ON j.id=a.journal_lesson_id WHERE a.school_id=? AND j.lesson_date=? AND a.status='absent'`).bind(auth.user.school_id,now.date).first(),env.DB.prepare(`SELECT AVG(g.value) AS average FROM grades g JOIN journal_lessons j ON j.id=g.journal_lesson_id JOIN classes c ON c.id=j.class_id JOIN academic_years ay ON ay.id=c.academic_year_id WHERE g.school_id=? AND ay.status='active'`).bind(auth.user.school_id).first()
    ]);const upcoming=await env.DB.prepare(`${assessmentSelect} WHERE a.school_id=? AND a.status='scheduled' AND a.scheduled_on>=? ORDER BY a.scheduled_on,a.period_number LIMIT 5`).bind(auth.user.school_id,now.date).all();return json({role:auth.user.role,date:now.date,stats:{students:Number(students?.count||0),teachers:Number(teachers?.count||0),classes:Number(classes?.count||0),absences:Number(attendance?.total||0),unexcused:Number(attendance?.unexcused||0),average:Number(average?.average||0),unread},upcoming:upcoming.results},200,cors)
  }
  if(auth.user.role==='teacher'){
    const [assignmentStats,today,missing]=await Promise.all([
      env.DB.prepare(`SELECT COUNT(DISTINCT ta.class_id) AS classes,COUNT(DISTINCT cs.student_id) AS students FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id LEFT JOIN class_students cs ON cs.class_id=ta.class_id AND cs.left_at IS NULL WHERE ta.teacher_id=? AND ay.status='active'`).bind(auth.user.id).first(),env.DB.prepare(`SELECT sl.starts_at,sl.period_number,sl.room,s.name AS subject_name,c.grade||c.letter AS class_name,(SELECT COUNT(*) FROM class_students cs WHERE cs.class_id=c.id AND cs.left_at IS NULL) AS student_count FROM schedule_week_lessons sl JOIN subjects s ON s.id=sl.subject_id JOIN classes c ON c.id=sl.class_id JOIN academic_years ay ON ay.id=sl.academic_year_id WHERE sl.teacher_id=? AND sl.week_start=? AND ay.status='active' AND sl.weekday=? AND sl.is_published=1 ORDER BY sl.period_number`).bind(auth.user.id,nowWeek,now.weekday).all(),env.DB.prepare(`SELECT COUNT(*) AS count FROM schedule_week_lessons sl JOIN academic_years ay ON ay.id=sl.academic_year_id WHERE sl.teacher_id=? AND sl.week_start=? AND ay.status='active' AND sl.weekday=? AND sl.is_published=1 AND NOT EXISTS(SELECT 1 FROM journal_lessons j WHERE j.teacher_id=? AND j.lesson_date=? AND j.period_number=sl.period_number AND j.class_id=sl.class_id AND j.subject_id=sl.subject_id)`).bind(auth.user.id,nowWeek,now.weekday,auth.user.id,now.date).first()
    ]);const lessons=today.results,next=lessons.find(l=>String(l.starts_at).slice(0,5)>=now.time)||null,upcoming=await env.DB.prepare(`${assessmentSelect} WHERE a.school_id=? AND a.teacher_id=? AND a.status='scheduled' AND a.scheduled_on>=? ORDER BY a.scheduled_on,a.period_number LIMIT 5`).bind(auth.user.school_id,auth.user.id,now.date).all();return json({role:auth.user.role,date:now.date,stats:{classes:Number(assignmentStats?.classes||0),students:Number(assignmentStats?.students||0),lessons:lessons.length,missingTopics:Number(missing?.count||0),unread},today:lessons,next,upcoming:upcoming.results},200,cors)
  }
  const [gradeStats,attendance,today,latest,classRow]=await Promise.all([
    env.DB.prepare(`SELECT AVG(value) AS average,COUNT(*) AS count FROM grades WHERE student_id=?`).bind(auth.user.id).first(),env.DB.prepare(`SELECT SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absences,SUM(CASE WHEN status='absent' AND excused=0 THEN 1 ELSE 0 END) AS unexcused FROM attendance WHERE student_id=?`).bind(auth.user.id).first(),env.DB.prepare(`SELECT sl.starts_at,sl.period_number,sl.room,s.name AS subject_name,u.first_name||' '||u.last_name AS teacher_name FROM schedule_week_lessons sl JOIN subjects s ON s.id=sl.subject_id JOIN users u ON u.id=sl.teacher_id JOIN academic_years ay ON ay.id=sl.academic_year_id WHERE sl.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) AND sl.week_start=? AND ay.status='active' AND sl.weekday=? AND sl.is_published=1 ORDER BY sl.period_number`).bind(auth.user.id,nowWeek,now.weekday).all(),env.DB.prepare(`SELECT g.value,g.graded_on,s.name AS subject_name,s.color FROM grades g JOIN subjects s ON s.id=g.subject_id WHERE g.student_id=? ORDER BY g.graded_on DESC,g.id DESC LIMIT 5`).bind(auth.user.id).all(),env.DB.prepare(`SELECT c.id AS class_id,c.grade||c.letter AS class_name FROM class_students cs JOIN classes c ON c.id=cs.class_id JOIN academic_years ay ON ay.id=c.academic_year_id WHERE cs.student_id=? AND cs.left_at IS NULL AND ay.status='active' LIMIT 1`).bind(auth.user.id).first()
  ]);const [upcoming,subjectAverages,classRank,schoolRank]=await Promise.all([
    env.DB.prepare(`${assessmentSelect} WHERE a.school_id=? AND a.status='scheduled' AND a.scheduled_on>=? AND a.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) ORDER BY a.scheduled_on,a.period_number LIMIT 5`).bind(auth.user.school_id,now.date,auth.user.id).all(),
    env.DB.prepare(`SELECT s.name AS subject_name,s.color,AVG(g.value) AS average,COUNT(*) AS grade_count FROM grades g JOIN subjects s ON s.id=g.subject_id WHERE g.student_id=? GROUP BY g.subject_id,s.name,s.color ORDER BY average DESC,s.name LIMIT 6`).bind(auth.user.id).all(),
    classRow?.class_id?env.DB.prepare(`SELECT position,total FROM(SELECT g.student_id,RANK() OVER(ORDER BY AVG(g.value) DESC) AS position,COUNT(*) OVER() AS total FROM grades g WHERE g.student_id IN(SELECT student_id FROM class_students WHERE class_id=? AND left_at IS NULL) GROUP BY g.student_id) WHERE student_id=?`).bind(classRow.class_id,auth.user.id).first():Promise.resolve(null),
    env.DB.prepare(`SELECT position,total FROM(SELECT g.student_id,RANK() OVER(ORDER BY AVG(g.value) DESC) AS position,COUNT(*) OVER() AS total FROM grades g JOIN users u ON u.id=g.student_id WHERE u.school_id=? AND u.role='student' AND u.status='active' GROUP BY g.student_id) WHERE student_id=?`).bind(auth.user.school_id,auth.user.id).first()
  ]);return json({role:auth.user.role,date:now.date,className:classRow?.class_name||'',stats:{average:Number(gradeStats?.average||0),grades:Number(gradeStats?.count||0),absences:Number(attendance?.absences||0),unexcused:Number(attendance?.unexcused||0),lessons:today.results.length,unread,upcoming:upcoming.results.length},ranking:{classPosition:Number(classRank?.position||0),classTotal:Number(classRank?.total||0),schoolPosition:Number(schoolRank?.position||0),schoolTotal:Number(schoolRank?.total||0)},today:today.results,latestGrades:latest.results,subjectAverages:subjectAverages.results,upcoming:upcoming.results},200,cors)
}

async function createConversation(request, env, cors) {
  const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);
  const b=await readJson(request),recipientKey=String(b.recipientId||''),body=String(b.body||'').trim();if(!recipientKey||!body||body.length>4000)return json({error:'Изберете получател и въведете съобщение до 4000 знака.'},400,cors);
  if(auth.user.role==='parent'||recipientKey.startsWith('parent:'))return createParentConversation(auth,env,cors,recipientKey,body);
  const recipientId=Number(recipientKey);
  const recipient=await env.DB.prepare(`SELECT id,role FROM users WHERE id=? AND school_id=? AND status='active'`).bind(recipientId,auth.user.school_id).first();if(!recipient||recipient.id===auth.user.id)return json({error:'Невалиден получател.'},400,cors);if(auth.user.role==='student'&&!['teacher','school_admin'].includes(recipient.role))return json({error:'Учениците могат да пишат само на учители и директора.'},403,cors);
  let conversation=await env.DB.prepare(`SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=? JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=? WHERE c.school_id=? AND (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id=c.id)=2 LIMIT 1`).bind(auth.user.id,recipientId,auth.user.school_id).first();
  if(!conversation){const result=await env.DB.prepare(`INSERT INTO conversations(school_id,title,created_by) VALUES(?,NULL,?)`).bind(auth.user.school_id,auth.user.id).run();conversation={id:result.meta.last_row_id};await env.DB.batch([env.DB.prepare(`INSERT INTO conversation_members(conversation_id,user_id,last_read_at) VALUES(?,?,CURRENT_TIMESTAMP)`).bind(conversation.id,auth.user.id),env.DB.prepare(`INSERT INTO conversation_members(conversation_id,user_id,last_read_at) VALUES(?,?,NULL)`).bind(conversation.id,recipientId)])}
  await env.DB.prepare(`INSERT INTO messages(conversation_id,sender_id,body) VALUES(?,?,?)`).bind(conversation.id,auth.user.id,body).run();return json({ok:true,conversationId:conversation.id},201,cors);
}

async function createParentConversation(auth,env,cors,recipientKey,body){
  await ensureParentTables(env);let parentId,staffId,studentId,senderKind;
  if(auth.user.role==='parent'){
    const parts=recipientKey.split(':');if(parts[0]!=='staff')return json({error:'Невалиден получател.'},400,cors);staffId=Number(parts[1]);studentId=Number(parts[2]);parentId=auth.user.id;senderKind='parent';
    const allowed=await env.DB.prepare(`SELECT ps.parent_id FROM parent_students ps JOIN class_students cs ON cs.student_id=ps.student_id AND cs.left_at IS NULL JOIN classes c ON c.id=cs.class_id JOIN users u ON u.id=? AND u.school_id=? AND u.status='active' AND (u.role='school_admin' OR (u.role='teacher' AND (c.homeroom_teacher_id=u.id OR EXISTS(SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id=u.id AND ta.class_id=c.id)))) WHERE ps.parent_id=? AND ps.student_id=?`).bind(staffId,auth.user.school_id,parentId,studentId).first();if(!allowed)return json({error:'Можете да пишете само на директора или на учителите на детето.'},403,cors);
  }else{
    if(!['teacher','school_admin'].includes(auth.user.role))return json({error:'Нямате право за това действие.'},403,cors);const parts=recipientKey.split(':');parentId=Number(parts[1]);studentId=Number(parts[2]);staffId=auth.user.id;senderKind='staff';
    let sql=`SELECT p.id FROM parents p JOIN parent_students ps ON ps.parent_id=p.id JOIN users ch ON ch.id=ps.student_id JOIN class_students cs ON cs.student_id=ch.id AND cs.left_at IS NULL JOIN classes c ON c.id=cs.class_id WHERE p.id=? AND p.school_id=? AND ps.student_id=? AND p.status='active'`;const binds=[parentId,auth.user.school_id,studentId];if(auth.user.role==='teacher'){sql+=` AND (c.homeroom_teacher_id=? OR EXISTS(SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id=? AND ta.class_id=c.id))`;binds.push(auth.user.id,auth.user.id)}const allowed=await env.DB.prepare(sql).bind(...binds).first();if(!allowed)return json({error:'Нямате достъп до този родител.'},403,cors);
  }
  let conversation=await env.DB.prepare(`SELECT id FROM parent_conversations WHERE parent_id=? AND staff_user_id=? AND student_id=?`).bind(parentId,staffId,studentId).first();if(!conversation){const result=await env.DB.prepare(`INSERT INTO parent_conversations(school_id,parent_id,staff_user_id,student_id,parent_last_read_at,staff_last_read_at) VALUES(?,?,?,?,?,?)`).bind(auth.user.school_id,parentId,staffId,studentId,senderKind==='parent'?new Date().toISOString():null,senderKind==='staff'?new Date().toISOString():null).run();conversation={id:result.meta.last_row_id}}
  await env.DB.prepare(`INSERT INTO parent_messages(conversation_id,sender_kind,sender_parent_id,sender_user_id,body) VALUES(?,?,?,?,?)`).bind(conversation.id,senderKind,senderKind==='parent'?parentId:null,senderKind==='staff'?staffId:null,body).run();return json({ok:true,conversationId:`p-${conversation.id}`},201,cors);
}

async function parentConversationAccess(request,env,conversationId){const auth=await authenticate(request,env);if(!auth)return{error:'Не сте влезли в системата.',status:401};await ensureParentTables(env);const row=await env.DB.prepare(`SELECT pc.*,p.first_name AS parent_first,p.last_name AS parent_last,u.first_name AS staff_first,u.last_name AS staff_last,u.role AS staff_role,ch.first_name AS child_first,ch.last_name AS child_last FROM parent_conversations pc JOIN parents p ON p.id=pc.parent_id JOIN users u ON u.id=pc.staff_user_id JOIN users ch ON ch.id=pc.student_id WHERE pc.id=? AND pc.school_id=?`).bind(conversationId,auth.user.school_id).first();if(!row)return{error:'Разговорът не е намерен.',status:404};if(auth.user.role==='parent'&&Number(row.parent_id)!==Number(auth.user.id))return{error:'Нямате достъп до разговора.',status:403};if(auth.user.role!=='parent'&&Number(row.staff_user_id)!==Number(auth.user.id))return{error:'Нямате достъп до разговора.',status:403};return{...auth,conversation:row}}
async function parentConversationMessages(request,env,cors,conversationId){const auth=await parentConversationAccess(request,env,conversationId);if(auth.error)return json({error:auth.error},auth.status,cors);const r=auth.conversation,isParent=auth.user.role==='parent',currentUserId=isParent?`parent-${auth.user.id}`:String(auth.user.id),other=isParent?{id:String(r.staff_user_id),first_name:r.staff_first,last_name:r.staff_last,role:r.staff_role}:{id:`parent-${r.parent_id}`,first_name:r.parent_first,last_name:r.parent_last,role:'parent'};const result=await env.DB.prepare(`SELECT id,sender_kind,sender_parent_id,sender_user_id,body,created_at FROM parent_messages WHERE conversation_id=? ORDER BY created_at,id`).bind(conversationId).all();const messages=result.results.map(m=>({...m,sender_id:m.sender_kind==='parent'?`parent-${m.sender_parent_id}`:String(m.sender_user_id)}));await env.DB.prepare(`UPDATE parent_conversations SET ${isParent?'parent_last_read_at':'staff_last_read_at'}=CURRENT_TIMESTAMP WHERE id=?`).bind(conversationId).run();return json({messages,members:[{id:currentUserId,first_name:auth.user.first_name,last_name:auth.user.last_name,role:auth.user.role},other],currentUserId,contextStudent:`${r.child_first} ${r.child_last}`},200,cors)}
async function sendParentConversationMessage(request,env,cors,conversationId){const auth=await parentConversationAccess(request,env,conversationId);if(auth.error)return json({error:auth.error},auth.status,cors);const body=String((await readJson(request)).body||'').trim();if(!body||body.length>4000)return json({error:'Съобщението трябва да бъде между 1 и 4000 знака.'},400,cors);const parent=auth.user.role==='parent';const result=await env.DB.prepare(`INSERT INTO parent_messages(conversation_id,sender_kind,sender_parent_id,sender_user_id,body) VALUES(?,?,?,?,?)`).bind(conversationId,parent?'parent':'staff',parent?auth.user.id:null,parent?null:auth.user.id,body).run();await env.DB.prepare(`UPDATE parent_conversations SET ${parent?'parent_last_read_at':'staff_last_read_at'}=CURRENT_TIMESTAMP WHERE id=?`).bind(conversationId).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}

async function requireConversationMember(request,env,conversationId){const auth=await authenticate(request,env);if(!auth)return{error:'Не сте влезли в системата.',status:401};const member=await env.DB.prepare(`SELECT cm.conversation_id FROM conversation_members cm JOIN conversations c ON c.id=cm.conversation_id WHERE cm.conversation_id=? AND cm.user_id=? AND c.school_id=?`).bind(conversationId,auth.user.id,auth.user.school_id).first();if(!member)return{error:'Разговорът не е намерен или нямате достъп.',status:404};return auth}

async function conversationMessages(request, env, cors, conversationId) {
  const auth=await requireConversationMember(request,env,conversationId);if(auth.error)return json({error:auth.error},auth.status,cors);
  const [messages,members]=await Promise.all([env.DB.prepare(`SELECT m.id,m.sender_id,m.body,m.created_at,u.first_name||' '||u.last_name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ORDER BY m.created_at,m.id`).bind(conversationId).all(),env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,u.role FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=?`).bind(conversationId).all()]);
  await env.DB.prepare(`UPDATE conversation_members SET last_read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND user_id=?`).bind(conversationId,auth.user.id).run();return json({messages:messages.results,members:members.results,currentUserId:auth.user.id},200,cors);
}

async function sendConversationMessage(request, env, cors, conversationId) {
  const auth=await requireConversationMember(request,env,conversationId);if(auth.error)return json({error:auth.error},auth.status,cors);const b=await readJson(request),body=String(b.body||'').trim();if(!body||body.length>4000)return json({error:'Съобщението трябва да бъде между 1 и 4000 знака.'},400,cors);const result=await env.DB.prepare(`INSERT INTO messages(conversation_id,sender_id,body) VALUES(?,?,?)`).bind(conversationId,auth.user.id,body).run();await env.DB.prepare(`UPDATE conversation_members SET last_read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND user_id=?`).bind(conversationId,auth.user.id).run();return json({ok:true,id:result.meta.last_row_id},201,cors);
}

function normalizeColor(value){const color=String(value||'').trim();return /^#[0-9a-fA-F]{6}$/.test(color)?color:'#f97316'}

async function createSubject(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const b=await readJson(request),name=String(b.name||'').trim(),shortName=String(b.shortName||'').trim().toUpperCase().slice(0,12),color=normalizeColor(b.color);
  if(name.length<2||!shortName)return json({error:'Въведете име и кратко име на предмета.'},400,cors);
  try{const result=await env.DB.prepare(`INSERT INTO subjects(school_id,name,short_name,color,status) VALUES(?,?,?,?,'active')`).bind(auth.user.school_id,name,shortName,color).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}catch{return json({error:'Предмет с това име вече съществува.'},409,cors)}
}

async function updateSubject(request, env, cors, subjectId) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const current=await env.DB.prepare(`SELECT id FROM subjects WHERE id=? AND school_id=?`).bind(subjectId,auth.user.school_id).first();if(!current)return json({error:'Предметът не е намерен.'},404,cors);
  const b=await readJson(request),name=String(b.name||'').trim(),shortName=String(b.shortName||'').trim().toUpperCase().slice(0,12),color=normalizeColor(b.color),status=b.status==='inactive'?'inactive':'active';
  if(name.length<2||!shortName)return json({error:'Въведете име и кратко име на предмета.'},400,cors);
  try{await env.DB.prepare(`UPDATE subjects SET name=?,short_name=?,color=?,status=? WHERE id=? AND school_id=?`).bind(name,shortName,color,status,subjectId,auth.user.school_id).run();return json({ok:true},200,cors)}catch{return json({error:'Друг предмет вече използва това име.'},409,cors)}
}

async function createAssignment(request, env, cors) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  const b=await readJson(request),teacherId=Number(b.teacherId),classId=Number(b.classId),subjectId=Number(b.subjectId);
  const year=await env.DB.prepare(`SELECT id FROM academic_years WHERE school_id=? AND status='active' LIMIT 1`).bind(auth.user.school_id).first();if(!year)return json({error:'Няма активна учебна година.'},409,cors);
  const valid=await env.DB.prepare(`SELECT u.id FROM users u JOIN classes c ON c.school_id=u.school_id JOIN subjects s ON s.school_id=u.school_id WHERE u.id=? AND u.school_id=? AND u.role='teacher' AND u.status='active' AND c.id=? AND c.status='active' AND s.id=? AND s.status='active'`).bind(teacherId,auth.user.school_id,classId,subjectId).first();if(!valid)return json({error:'Избрани са невалидни данни.'},400,cors);
  try{const result=await env.DB.prepare(`INSERT INTO teacher_assignments(school_id,academic_year_id,teacher_id,class_id,subject_id) VALUES(?,?,?,?,?)`).bind(auth.user.school_id,year.id,teacherId,classId,subjectId).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}catch{return json({error:'Това назначение вече съществува.'},409,cors)}
}

async function deleteAssignment(request, env, cors, assignmentId) {
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);
  await env.DB.prepare(`DELETE FROM teacher_assignments WHERE id=? AND school_id=?`).bind(assignmentId,auth.user.school_id).run();return json({ok:true},200,cors);
}

async function manageAttendance(request, env, cors) {
  const auth=await attendanceManagerAuth(request,env);if(auth.error)return json({error:auth.error},auth.status,cors);
  const q=new URL(request.url).searchParams,classId=Number(q.get('classId')||0),status=String(q.get('status')||'all'),student=String(q.get('student')||'').trim().toLowerCase();
  const teacherOnly=auth.user.role==='teacher';
  const classes=await env.DB.prepare(`SELECT c.id,c.grade,c.letter FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id WHERE c.school_id=? AND c.status='active' AND ay.status='active' ${teacherOnly?'AND c.homeroom_teacher_id=?':''} ORDER BY c.grade,c.letter`).bind(...(teacherOnly?[auth.user.school_id,auth.user.id]:[auth.user.school_id])).all();
  const allowedIds=classes.results.map(c=>Number(c.id));
  if(teacherOnly&&!allowedIds.length)return json({classes:[],records:[],canManage:false,message:'Не сте класен ръководител на активен клас.'},200,cors);
  const selected=classId&&allowedIds.includes(classId)?classId:0;
  let sql=`SELECT a.id,a.status,a.excused,a.note,a.excused_at,j.lesson_date,j.period_number,s.name AS subject_name,c.id AS class_id,c.grade||c.letter AS class_name,u.id AS student_id,u.first_name,u.last_name,u.email,ex.first_name||' '||ex.last_name AS excused_by_name FROM attendance a JOIN journal_lessons j ON j.id=a.journal_lesson_id JOIN subjects s ON s.id=j.subject_id JOIN classes c ON c.id=j.class_id JOIN users u ON u.id=a.student_id LEFT JOIN users ex ON ex.id=a.excused_by WHERE a.school_id=? AND a.status='absent'`;
  const binds=[auth.user.school_id];
  if(teacherOnly){sql+=` AND c.homeroom_teacher_id=?`;binds.push(auth.user.id)}
  if(selected){sql+=` AND c.id=?`;binds.push(selected)}
  if(status==='excused'){sql+=` AND a.excused=1`}else if(status==='unexcused'){sql+=` AND a.excused=0`}
  if(student){sql+=` AND LOWER(u.first_name||' '||u.last_name||' '||u.email) LIKE ?`;binds.push('%'+student+'%')}
  sql+=` ORDER BY j.lesson_date DESC,j.period_number DESC,u.first_name,u.last_name`;
  const records=await env.DB.prepare(sql).bind(...binds).all();return json({classes:classes.results,records:records.results,canManage:true},200,cors);
}

async function excuseAttendance(request, env, cors, attendanceId) {
  const auth=await attendanceManagerAuth(request,env);if(auth.error)return json({error:auth.error},auth.status,cors);
  const row=await env.DB.prepare(`SELECT a.id,c.homeroom_teacher_id FROM attendance a JOIN journal_lessons j ON j.id=a.journal_lesson_id JOIN classes c ON c.id=j.class_id WHERE a.id=? AND a.school_id=? AND a.status='absent'`).bind(attendanceId,auth.user.school_id).first();
  if(!row)return json({error:'Отсъствието не е намерено.'},404,cors);
  if(auth.user.role==='teacher'&&Number(row.homeroom_teacher_id)!==Number(auth.user.id))return json({error:'Можете да извинявате само отсъствията на своя клас.'},403,cors);
  const body=await readJson(request),excused=Boolean(body.excused),note=String(body.note||'').trim()||null;
  await env.DB.prepare(`UPDATE attendance SET excused=?,note=?,excused_by=?,excused_at=? WHERE id=?`).bind(excused?1:0,note,auth.user.id,excused?new Date().toISOString():null,attendanceId).run();
  return json({ok:true},200,cors);
}

async function ensureFinalGradeTables(env){await env.DB.prepare(`CREATE TABLE IF NOT EXISTS final_grades(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,academic_year_id INTEGER NOT NULL,class_id INTEGER NOT NULL,subject_id INTEGER NOT NULL,student_id INTEGER NOT NULL,teacher_id INTEGER NOT NULL,term TEXT NOT NULL CHECK(term IN('1','2','year')),value INTEGER NOT NULL CHECK(value BETWEEN 2 AND 6),proposed_average REAL,locked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,UNIQUE(academic_year_id,subject_id,student_id,term))`).run()}
function gradeWeight(type){return{current:1,oral:1,test:2,classwork:3,exam:2}[type]||1}
async function teacherFinalGrades(request,env,cors){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureFinalGradeTables(env);const q=new URL(request.url).searchParams,classId=Number(q.get('classId')),subjectId=Number(q.get('subjectId')),term=String(q.get('term')||'1');if(!['1','2','year'].includes(term))return json({error:'Невалиден срок.'},400,cors);const assignment=await env.DB.prepare(`SELECT ta.academic_year_id,ay.starts_on,ay.first_term_ends_on,ay.second_term_starts_on,ay.ends_on,c.grade||c.letter AS class_name,s.name AS subject_name FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.teacher_id=? AND ta.school_id=? AND ta.class_id=? AND ta.subject_id=? AND ay.status='active'`).bind(auth.user.id,auth.user.school_id,classId,subjectId).first();if(!assignment)return json({error:'Нямате назначение за този клас и предмет.'},403,cors);let start=assignment.starts_on,end=assignment.first_term_ends_on;if(term==='2'){start=assignment.second_term_starts_on;end=assignment.ends_on}const students=await env.DB.prepare(`SELECT u.id,u.first_name,u.last_name FROM class_students cs JOIN users u ON u.id=cs.student_id WHERE cs.class_id=? AND cs.left_at IS NULL ORDER BY u.first_name,u.last_name`).bind(classId).all();let gradeRows=[];if(term==='year'){const r=await env.DB.prepare(`SELECT student_id,value,term FROM final_grades WHERE academic_year_id=? AND subject_id=? AND class_id=? AND term IN('1','2')`).bind(assignment.academic_year_id,subjectId,classId).all();gradeRows=r.results}else{const r=await env.DB.prepare(`SELECT student_id,value,grade_type FROM grades WHERE school_id=? AND subject_id=? AND student_id IN(SELECT student_id FROM class_students WHERE class_id=? AND left_at IS NULL) AND graded_on BETWEEN ? AND ?`).bind(auth.user.school_id,subjectId,classId,start,end).all();gradeRows=r.results}const finals=await env.DB.prepare(`SELECT student_id,value,proposed_average,locked FROM final_grades WHERE academic_year_id=? AND subject_id=? AND class_id=? AND term=?`).bind(assignment.academic_year_id,subjectId,classId,term).all(),finalMap=new Map(finals.results.map(x=>[Number(x.student_id),x])),today=sofiaNow().date,periodClosed=today>end;const rows=students.results.map(s=>{const own=gradeRows.filter(g=>Number(g.student_id)===Number(s.id));let sum=0,weights=0;if(term==='year'){for(const g of own){sum+=Number(g.value);weights++}}else for(const g of own){const w=gradeWeight(g.grade_type);sum+=Number(g.value)*w;weights+=w}const proposed=weights?sum/weights:null,final=finalMap.get(Number(s.id));return{...s,grade_count:own.length,proposed_average:proposed,final_value:final?.value||null,locked:Boolean(final?.locked)||periodClosed}});return json({assignment:{...assignment,term,period_start:start,period_end:end,period_closed:periodClosed},students:rows},200,cors)}
async function saveFinalGrade(request,env,cors){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureFinalGradeTables(env);const b=await readJson(request),classId=Number(b.classId),subjectId=Number(b.subjectId),studentId=Number(b.studentId),term=String(b.term||''),value=Number(b.value),proposed=b.proposedAverage==null?null:Number(b.proposedAverage),lock=Boolean(b.lock);if(!['1','2','year'].includes(term)||![2,3,4,5,6].includes(value))return json({error:'Изберете валидна оценка.'},400,cors);const assignment=await env.DB.prepare(`SELECT ta.academic_year_id,ay.first_term_ends_on,ay.ends_on FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id JOIN class_students cs ON cs.class_id=ta.class_id AND cs.student_id=? AND cs.left_at IS NULL WHERE ta.teacher_id=? AND ta.school_id=? AND ta.class_id=? AND ta.subject_id=? AND ay.status='active'`).bind(studentId,auth.user.id,auth.user.school_id,classId,subjectId).first();if(!assignment)return json({error:'Нямате право да оформите тази оценка.'},403,cors);const end=term==='1'?assignment.first_term_ends_on:assignment.ends_on;if(sofiaNow().date>end)return json({error:'Периодът е приключил и оценките са заключени.'},409,cors);const current=await env.DB.prepare(`SELECT locked FROM final_grades WHERE academic_year_id=? AND subject_id=? AND student_id=? AND term=?`).bind(assignment.academic_year_id,subjectId,studentId,term).first();if(current?.locked)return json({error:'Оценката вече е заключена.'},409,cors);await env.DB.prepare(`INSERT INTO final_grades(school_id,academic_year_id,class_id,subject_id,student_id,teacher_id,term,value,proposed_average,locked) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(academic_year_id,subject_id,student_id,term) DO UPDATE SET value=excluded.value,proposed_average=excluded.proposed_average,locked=excluded.locked,teacher_id=excluded.teacher_id,updated_at=CURRENT_TIMESTAMP`).bind(auth.user.school_id,assignment.academic_year_id,classId,subjectId,studentId,auth.user.id,term,value,Number.isFinite(proposed)?proposed:null,lock?1:0).run();return json({ok:true},200,cors)}

async function ensureHomeworkTables(env){await env.DB.batch([
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS homeworks(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,teacher_id INTEGER NOT NULL,class_id INTEGER NOT NULL,subject_id INTEGER NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,due_at TEXT NOT NULL,resource_url TEXT,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','closed')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE)`),
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS homework_submissions(id INTEGER PRIMARY KEY AUTOINCREMENT,homework_id INTEGER NOT NULL,student_id INTEGER NOT NULL,note TEXT,submission_url TEXT,submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,UNIQUE(homework_id,student_id))`)
])}

function validHttpUrl(value){if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'}catch{return false}}
async function teacherHomeworks(request,env,cors){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const [assignments,homeworks]=await Promise.all([
  env.DB.prepare(`SELECT ta.class_id,ta.subject_id,c.grade||c.letter AS class_name,s.name AS subject_name FROM teacher_assignments ta JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.teacher_id=? AND ta.school_id=? AND ay.status='active' AND c.status='active' AND s.status='active' ORDER BY c.grade,c.letter,s.name`).bind(auth.user.id,auth.user.school_id).all(),
  env.DB.prepare(`SELECT h.id,h.title,h.description,h.due_at,h.resource_url,h.status,h.created_at,c.grade||c.letter AS class_name,s.name AS subject_name,(SELECT COUNT(*) FROM class_students cs WHERE cs.class_id=h.class_id AND cs.left_at IS NULL) AS student_count,(SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id=h.id) AS submitted_count FROM homeworks h JOIN classes c ON c.id=h.class_id JOIN subjects s ON s.id=h.subject_id WHERE h.teacher_id=? AND h.school_id=? ORDER BY CASE h.status WHEN 'active' THEN 0 ELSE 1 END,h.due_at DESC`).bind(auth.user.id,auth.user.school_id).all()
]);return json({assignments:assignments.results,homeworks:homeworks.results},200,cors)}
async function createHomework(request,env,cors){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const b=await readJson(request),classId=Number(b.classId),subjectId=Number(b.subjectId),title=String(b.title||'').trim(),description=String(b.description||'').trim(),dueAt=String(b.dueAt||''),resourceUrl=String(b.resourceUrl||'').trim()||null;if(title.length<3||title.length>200||description.length<3||description.length>4000||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueAt))return json({error:'Заглавието трябва да е до 200 знака, описанието до 4000 и срокът да е валиден.'},400,cors);if(!validHttpUrl(resourceUrl))return json({error:'Линкът към материала не е валиден.'},400,cors);const allowed=await env.DB.prepare(`SELECT ta.id FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.teacher_id=? AND ta.school_id=? AND ta.class_id=? AND ta.subject_id=? AND ay.status='active'`).bind(auth.user.id,auth.user.school_id,classId,subjectId).first();if(!allowed)return json({error:'Нямате назначение за избрания клас и предмет.'},403,cors);const result=await env.DB.prepare(`INSERT INTO homeworks(school_id,teacher_id,class_id,subject_id,title,description,due_at,resource_url,status) VALUES(?,?,?,?,?,?,?,?,'active')`).bind(auth.user.school_id,auth.user.id,classId,subjectId,title,description,dueAt,resourceUrl).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}
async function teacherHomeworkDetail(request,env,cors,id){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const homework=await env.DB.prepare(`SELECT h.*,c.grade||c.letter AS class_name,s.name AS subject_name FROM homeworks h JOIN classes c ON c.id=h.class_id JOIN subjects s ON s.id=h.subject_id WHERE h.id=? AND h.teacher_id=? AND h.school_id=?`).bind(id,auth.user.id,auth.user.school_id).first();if(!homework)return json({error:'Домашната работа не е намерена.'},404,cors);const rows=await env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,hs.note,hs.submission_url,hs.submitted_at FROM class_students cs JOIN users u ON u.id=cs.student_id LEFT JOIN homework_submissions hs ON hs.student_id=u.id AND hs.homework_id=? WHERE cs.class_id=? AND cs.left_at IS NULL ORDER BY u.first_name,u.last_name`).bind(id,homework.class_id).all();return json({homework,students:rows.results},200,cors)}
async function updateHomework(request,env,cors,id){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const b=await readJson(request),status=b.status==='closed'?'closed':'active';const result=await env.DB.prepare(`UPDATE homeworks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND teacher_id=? AND school_id=?`).bind(status,id,auth.user.id,auth.user.school_id).run();if(!result.meta.changes)return json({error:'Домашната работа не е намерена.'},404,cors);return json({ok:true},200,cors)}
async function studentHomeworks(request,env,cors){const auth=await requireRole(request,env,'student');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const result=await env.DB.prepare(`SELECT h.id,h.title,h.description,h.due_at,h.resource_url,h.status,h.created_at,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name,hs.note,hs.submission_url,hs.submitted_at FROM homeworks h JOIN subjects s ON s.id=h.subject_id JOIN users u ON u.id=h.teacher_id LEFT JOIN homework_submissions hs ON hs.homework_id=h.id AND hs.student_id=? WHERE h.school_id=? AND h.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) ORDER BY CASE WHEN hs.submitted_at IS NULL AND h.status='active' THEN 0 ELSE 1 END,h.due_at`).bind(auth.user.id,auth.user.school_id,auth.user.id).all();return json({homeworks:result.results,serverNow:new Date().toISOString()},200,cors)}
async function submitHomework(request,env,cors,id){const auth=await requireRole(request,env,'student');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const homework=await env.DB.prepare(`SELECT id,status FROM homeworks WHERE id=? AND school_id=? AND class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL)`).bind(id,auth.user.school_id,auth.user.id).first();if(!homework)return json({error:'Домашната работа не е намерена.'},404,cors);if(homework.status!=='active')return json({error:'Заданието е затворено от учителя.'},409,cors);const b=await readJson(request),note=String(b.note||'').trim(),url=String(b.submissionUrl||'').trim()||null;if(!note&&!url)return json({error:'Добавете кратък отговор или линк към работата.'},400,cors);if(note.length>4000||!validHttpUrl(url))return json({error:'Проверете дължината на отговора и линка.'},400,cors);await env.DB.prepare(`INSERT INTO homework_submissions(homework_id,student_id,note,submission_url,submitted_at,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(homework_id,student_id) DO UPDATE SET note=excluded.note,submission_url=excluded.submission_url,submitted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(id,auth.user.id,note||null,url).run();return json({ok:true},200,cors)}
async function parentHomeworks(request,env,cors){const auth=await requireRole(request,env,'parent');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureHomeworkTables(env);const studentId=Number(new URL(request.url).searchParams.get('studentId'));const allowed=await env.DB.prepare(`SELECT 1 FROM parent_students ps JOIN users u ON u.id=ps.student_id WHERE ps.parent_id=? AND ps.student_id=? AND u.school_id=? AND u.status='active'`).bind(auth.user.id,studentId,auth.user.school_id).first();if(!allowed)return json({error:'Нямате достъп до този ученик.'},403,cors);const result=await env.DB.prepare(`SELECT h.id,h.title,h.description,h.due_at,h.resource_url,h.status,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name,hs.note,hs.submission_url,hs.submitted_at FROM homeworks h JOIN subjects s ON s.id=h.subject_id JOIN users u ON u.id=h.teacher_id LEFT JOIN homework_submissions hs ON hs.homework_id=h.id AND hs.student_id=? WHERE h.school_id=? AND h.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) ORDER BY CASE WHEN hs.submitted_at IS NULL AND h.status='active' THEN 0 ELSE 1 END,h.due_at`).bind(studentId,auth.user.school_id,studentId).all();return json({homeworks:result.results},200,cors)}

async function ensureAssessmentTables(env){await env.DB.batch([
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS assessments(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,academic_year_id INTEGER NOT NULL,teacher_id INTEGER NOT NULL,class_id INTEGER NOT NULL,subject_id INTEGER NOT NULL,type TEXT NOT NULL CHECK(type IN('test','classwork','oral','exam')),title TEXT NOT NULL,description TEXT,scheduled_on TEXT NOT NULL,period_number INTEGER,status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','completed','cancelled')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE)`),
  env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_assessments_class_date ON assessments(class_id,scheduled_on,status)`)
])}
const assessmentSelect=`SELECT a.id,a.type,a.title,a.description,a.scheduled_on,a.period_number,a.status,a.teacher_id,a.class_id,a.subject_id,c.grade||c.letter AS class_name,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name FROM assessments a JOIN classes c ON c.id=a.class_id JOIN subjects s ON s.id=a.subject_id JOIN users u ON u.id=a.teacher_id`;
async function teacherAssessments(request,env,cors){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureAssessmentTables(env);const [assignments,items]=await Promise.all([env.DB.prepare(`SELECT DISTINCT ta.class_id,ta.subject_id,c.grade||c.letter AS class_name,s.name AS subject_name FROM teacher_assignments ta JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.teacher_id=? AND ta.school_id=? AND ay.status='active' ORDER BY c.grade,c.letter,s.name`).bind(auth.user.id,auth.user.school_id).all(),env.DB.prepare(`${assessmentSelect} WHERE a.teacher_id=? AND a.school_id=? ORDER BY a.scheduled_on DESC,a.period_number`).bind(auth.user.id,auth.user.school_id).all()]);return json({assignments:assignments.results,assessments:items.results},200,cors)}
async function createAssessment(request,env,cors){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureAssessmentTables(env);const b=await readJson(request),classId=Number(b.classId),subjectId=Number(b.subjectId),type=String(b.type||''),title=String(b.title||'').trim(),description=String(b.description||'').trim(),scheduledOn=String(b.scheduledOn||''),periodNumber=b.periodNumber?Number(b.periodNumber):null;if(!['test','classwork','oral','exam'].includes(type)||title.length<3||title.length>200||description.length>2000||!/^\d{4}-\d{2}-\d{2}$/.test(scheduledOn)||periodNumber!==null&&(periodNumber<1||periodNumber>12))return json({error:'Проверете вида, заглавието, датата и учебния час.'},400,cors);const allowed=await env.DB.prepare(`SELECT ta.academic_year_id FROM teacher_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.teacher_id=? AND ta.school_id=? AND ta.class_id=? AND ta.subject_id=? AND ay.status='active' LIMIT 1`).bind(auth.user.id,auth.user.school_id,classId,subjectId).first();if(!allowed)return json({error:'Нямате назначение за избрания клас и предмет.'},403,cors);if(type!=='oral'){const conflicts=await env.DB.prepare(`SELECT COUNT(*) AS count FROM assessments WHERE school_id=? AND class_id=? AND scheduled_on=? AND status='scheduled' AND type IN('test','classwork','exam')`).bind(auth.user.school_id,classId,scheduledOn).first();if(Number(conflicts?.count||0)>=2&&!b.override)return json({error:'За този клас вече има две писмени изпитвания на същата дата.',code:'ASSESSMENT_LIMIT',requiresConfirmation:true},409,cors)}const result=await env.DB.prepare(`INSERT INTO assessments(school_id,academic_year_id,teacher_id,class_id,subject_id,type,title,description,scheduled_on,period_number) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(auth.user.school_id,allowed.academic_year_id,auth.user.id,classId,subjectId,type,title,description||null,scheduledOn,periodNumber).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}
async function updateAssessment(request,env,cors,id){const auth=await requireRole(request,env,'teacher');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureAssessmentTables(env);const status=String((await readJson(request)).status||'');if(!['scheduled','completed','cancelled'].includes(status))return json({error:'Невалиден статус.'},400,cors);const result=await env.DB.prepare(`UPDATE assessments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND teacher_id=? AND school_id=?`).bind(status,id,auth.user.id,auth.user.school_id).run();if(!result.meta.changes)return json({error:'Събитието не е намерено.'},404,cors);return json({ok:true},200,cors)}
async function studentAssessments(request,env,cors){const auth=await requireRole(request,env,'student');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureAssessmentTables(env);const rows=await env.DB.prepare(`${assessmentSelect} WHERE a.school_id=? AND a.status!='cancelled' AND a.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) ORDER BY a.scheduled_on,a.period_number`).bind(auth.user.school_id,auth.user.id).all();return json({assessments:rows.results},200,cors)}
async function parentAssessments(request,env,cors){const auth=await requireRole(request,env,'parent');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureAssessmentTables(env);const studentId=Number(new URL(request.url).searchParams.get('studentId'));const allowed=await env.DB.prepare(`SELECT 1 FROM parent_students ps JOIN users u ON u.id=ps.student_id WHERE ps.parent_id=? AND ps.student_id=? AND u.school_id=? AND u.status='active'`).bind(auth.user.id,studentId,auth.user.school_id).first();if(!allowed)return json({error:'Нямате достъп до този ученик.'},403,cors);const rows=await env.DB.prepare(`${assessmentSelect} WHERE a.school_id=? AND a.status!='cancelled' AND a.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) ORDER BY a.scheduled_on,a.period_number`).bind(auth.user.school_id,studentId).all();return json({assessments:rows.results},200,cors)}
async function adminAssessments(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureAssessmentTables(env);const rows=await env.DB.prepare(`${assessmentSelect} JOIN academic_years ay ON ay.id=a.academic_year_id WHERE a.school_id=? AND ay.status='active' ORDER BY a.scheduled_on,a.class_id,a.period_number`).bind(auth.user.school_id).all();return json({assessments:rows.results},200,cors)}

async function ensureAnnouncementTables(env){await env.DB.batch([
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,author_id INTEGER NOT NULL,class_id INTEGER,title TEXT NOT NULL,body TEXT NOT NULL,is_important INTEGER NOT NULL DEFAULT 0,starts_on TEXT NOT NULL,ends_on TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'published' CHECK(status IN('published','archived')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE)`),
  env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_announcements_school_dates ON announcements(school_id,starts_on,ends_on,status)`)
])}
const announcementSelect=`SELECT n.id,n.title,n.body,n.is_important,n.starts_on,n.ends_on,n.status,n.class_id,n.author_id,n.created_at,c.grade||c.letter AS class_name,u.first_name||' '||u.last_name AS author_name,u.role AS author_role FROM announcements n LEFT JOIN classes c ON c.id=n.class_id JOIN users u ON u.id=n.author_id`;
async function announcementClasses(env,auth){if(auth.user.role==='school_admin')return(await env.DB.prepare(`SELECT c.id,c.grade||c.letter AS class_name FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id WHERE c.school_id=? AND c.status='active' AND ay.status='active' ORDER BY c.grade,c.letter`).bind(auth.user.school_id).all()).results;return(await env.DB.prepare(`SELECT DISTINCT c.id,c.grade||c.letter AS class_name FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id WHERE c.school_id=? AND ay.status='active' AND c.status='active' AND (c.homeroom_teacher_id=? OR EXISTS(SELECT 1 FROM teacher_assignments ta WHERE ta.class_id=c.id AND ta.teacher_id=? AND ta.academic_year_id=ay.id)) ORDER BY c.grade,c.letter`).bind(auth.user.school_id,auth.user.id,auth.user.id).all()).results}
async function manageAnnouncements(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);if(!['teacher','school_admin'].includes(auth.user.role))return json({error:'Нямате право за това действие.'},403,cors);await ensureAnnouncementTables(env);const classes=await announcementClasses(env,auth),query=auth.user.role==='school_admin'?env.DB.prepare(`${announcementSelect} WHERE n.school_id=? ORDER BY n.is_important DESC,n.created_at DESC`).bind(auth.user.school_id):env.DB.prepare(`${announcementSelect} WHERE n.school_id=? AND n.author_id=? ORDER BY n.is_important DESC,n.created_at DESC`).bind(auth.user.school_id,auth.user.id),rows=await query.all();return json({classes,announcements:rows.results,canPublishSchoolWide:auth.user.role==='school_admin'},200,cors)}
async function createAnnouncement(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);if(!['teacher','school_admin'].includes(auth.user.role))return json({error:'Нямате право за това действие.'},403,cors);await ensureAnnouncementTables(env);const b=await readJson(request),title=String(b.title||'').trim(),body=String(b.body||'').trim(),startsOn=String(b.startsOn||''),endsOn=String(b.endsOn||''),important=b.isImportant?1:0,classId=b.classId?Number(b.classId):null;if(title.length<3||title.length>180||body.length<3||body.length>5000||!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)||!/^\d{4}-\d{2}-\d{2}$/.test(endsOn)||endsOn<startsOn)return json({error:'Проверете заглавието, текста и периода на публикацията.'},400,cors);if(auth.user.role==='teacher'&&!classId)return json({error:'Учителят трябва да избере клас.'},400,cors);if(classId){const classes=await announcementClasses(env,auth);if(!classes.some(c=>Number(c.id)===classId))return json({error:'Нямате право да публикувате за този клас.'},403,cors)}const result=await env.DB.prepare(`INSERT INTO announcements(school_id,author_id,class_id,title,body,is_important,starts_on,ends_on) VALUES(?,?,?,?,?,?,?,?)`).bind(auth.user.school_id,auth.user.id,classId,title,body,important,startsOn,endsOn).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}
async function updateAnnouncement(request,env,cors,id){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);if(!['teacher','school_admin'].includes(auth.user.role))return json({error:'Нямате право за това действие.'},403,cors);await ensureAnnouncementTables(env);const status=String((await readJson(request)).status||'');if(!['published','archived'].includes(status))return json({error:'Невалиден статус.'},400,cors);const sql=auth.user.role==='school_admin'?`UPDATE announcements SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?`:`UPDATE announcements SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=? AND author_id=?`,binds=auth.user.role==='school_admin'?[status,id,auth.user.school_id]:[status,id,auth.user.school_id,auth.user.id],result=await env.DB.prepare(sql).bind(...binds).run();if(!result.meta.changes)return json({error:'Обявата не е намерена.'},404,cors);return json({ok:true},200,cors)}
async function visibleAnnouncements(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);await ensureAnnouncementTables(env);const today=sofiaNow().date;let classIds=[];if(auth.user.role==='student')classIds=(await env.DB.prepare(`SELECT class_id AS id FROM class_students WHERE student_id=? AND left_at IS NULL`).bind(auth.user.id).all()).results.map(x=>Number(x.id));else if(auth.user.role==='parent'){const studentId=Number(new URL(request.url).searchParams.get('studentId')),allowed=await env.DB.prepare(`SELECT 1 FROM parent_students ps JOIN users u ON u.id=ps.student_id WHERE ps.parent_id=? AND ps.student_id=? AND u.school_id=? AND u.status='active'`).bind(auth.user.id,studentId,auth.user.school_id).first();if(!allowed)return json({error:'Нямате достъп до този ученик.'},403,cors);classIds=(await env.DB.prepare(`SELECT class_id AS id FROM class_students WHERE student_id=? AND left_at IS NULL`).bind(studentId).all()).results.map(x=>Number(x.id))}else classIds=(await announcementClasses(env,auth)).map(x=>Number(x.id));let sql=`${announcementSelect} WHERE n.school_id=? AND n.status='published' AND n.starts_on<=? AND n.ends_on>=?`,binds=[auth.user.school_id,today,today];if(!['school_admin'].includes(auth.user.role)){if(classIds.length)sql+=` AND (n.class_id IS NULL OR n.class_id IN (${classIds.map(()=>'?').join(',')}))`,binds.push(...classIds);else sql+=` AND n.class_id IS NULL`}sql+=` ORDER BY n.is_important DESC,n.created_at DESC`;const rows=await env.DB.prepare(sql).bind(...binds).all();return json({announcements:rows.results},200,cors)}

async function ensureDocumentTables(env){await env.DB.batch([
 env.DB.prepare(`CREATE TABLE IF NOT EXISTS document_templates(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,template_url TEXT,allowed_role TEXT NOT NULL DEFAULT 'both' CHECK(allowed_role IN('student','parent','both')),status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','inactive')),created_by INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
 env.DB.prepare(`CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,template_id INTEGER NOT NULL,submitted_by_kind TEXT NOT NULL CHECK(submitted_by_kind IN('student','parent')),submitted_by_id INTEGER NOT NULL,student_id INTEGER NOT NULL,subject TEXT NOT NULL,content TEXT NOT NULL,attachment_url TEXT,status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN('submitted','in_review','correction','approved','rejected')),director_note TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(template_id) REFERENCES document_templates(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE)`),
 env.DB.prepare(`CREATE TABLE IF NOT EXISTS application_events(id INTEGER PRIMARY KEY AUTOINCREMENT,application_id INTEGER NOT NULL,status TEXT NOT NULL,note TEXT,changed_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE)`)
])}
async function adminDocuments(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureDocumentTables(env);const [templates,apps]=await Promise.all([env.DB.prepare(`SELECT * FROM document_templates WHERE school_id=? ORDER BY status,title`).bind(auth.user.school_id).all(),env.DB.prepare(`SELECT a.*,t.title AS template_title,u.first_name||' '||u.last_name AS student_name,c.grade||c.letter AS class_name FROM applications a JOIN document_templates t ON t.id=a.template_id JOIN users u ON u.id=a.student_id LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id WHERE a.school_id=? ORDER BY CASE a.status WHEN 'submitted' THEN 0 WHEN 'in_review' THEN 1 WHEN 'correction' THEN 2 ELSE 3 END,a.updated_at DESC`).bind(auth.user.school_id).all()]);return json({templates:templates.results,applications:apps.results},200,cors)}
async function createDocumentTemplate(request,env,cors){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureDocumentTables(env);const b=await readJson(request),title=String(b.title||'').trim(),description=String(b.description||'').trim(),url=String(b.templateUrl||'').trim()||null,allowed=['student','parent','both'].includes(b.allowedRole)?b.allowedRole:'both';if(title.length<3||title.length>180||description.length<3||description.length>2000||!validHttpUrl(url))return json({error:'Проверете името, описанието и линка към образеца.'},400,cors);const result=await env.DB.prepare(`INSERT INTO document_templates(school_id,title,description,template_url,allowed_role,created_by) VALUES(?,?,?,?,?,?)`).bind(auth.user.school_id,title,description,url,allowed,auth.user.id).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}
async function userDocuments(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);if(!['student','parent'].includes(auth.user.role))return json({error:'Нямате право за това действие.'},403,cors);await ensureDocumentTables(env);let studentId=auth.user.id;if(auth.user.role==='parent'){studentId=Number(new URL(request.url).searchParams.get('studentId'));const allowed=await env.DB.prepare(`SELECT 1 FROM parent_students ps JOIN users u ON u.id=ps.student_id WHERE ps.parent_id=? AND ps.student_id=? AND u.school_id=?`).bind(auth.user.id,studentId,auth.user.school_id).first();if(!allowed)return json({error:'Нямате достъп до този ученик.'},403,cors)}const [templates,apps]=await Promise.all([env.DB.prepare(`SELECT * FROM document_templates WHERE school_id=? AND status='active' AND allowed_role IN(?,'both') ORDER BY title`).bind(auth.user.school_id,auth.user.role).all(),env.DB.prepare(`SELECT a.*,t.title AS template_title,(SELECT GROUP_CONCAT(status||'|'||COALESCE(note,'')||'|'||created_at,'~') FROM application_events e WHERE e.application_id=a.id) AS history FROM applications a JOIN document_templates t ON t.id=a.template_id WHERE a.school_id=? AND a.student_id=? AND a.submitted_by_kind=? AND a.submitted_by_id=? ORDER BY a.updated_at DESC`).bind(auth.user.school_id,studentId,auth.user.role,auth.user.id).all()]);return json({templates:templates.results,applications:apps.results,studentId},200,cors)}
async function submitApplication(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);if(!['student','parent'].includes(auth.user.role))return json({error:'Нямате право за това действие.'},403,cors);await ensureDocumentTables(env);const b=await readJson(request),templateId=Number(b.templateId),studentId=auth.user.role==='student'?auth.user.id:Number(b.studentId),subject=String(b.subject||'').trim(),content=String(b.content||'').trim(),url=String(b.attachmentUrl||'').trim()||null;if(auth.user.role==='parent'){const allowed=await env.DB.prepare(`SELECT 1 FROM parent_students WHERE parent_id=? AND student_id=?`).bind(auth.user.id,studentId).first();if(!allowed)return json({error:'Нямате достъп до този ученик.'},403,cors)}const template=await env.DB.prepare(`SELECT id FROM document_templates WHERE id=? AND school_id=? AND status='active' AND allowed_role IN(?,'both')`).bind(templateId,auth.user.school_id,auth.user.role).first();if(!template||subject.length<3||subject.length>180||content.length<3||content.length>5000||!validHttpUrl(url))return json({error:'Проверете вида, темата, текста и линка.'},400,cors);const result=await env.DB.prepare(`INSERT INTO applications(school_id,template_id,submitted_by_kind,submitted_by_id,student_id,subject,content,attachment_url) VALUES(?,?,?,?,?,?,?,?)`).bind(auth.user.school_id,templateId,auth.user.role,auth.user.id,studentId,subject,content,url).run();await env.DB.prepare(`INSERT INTO application_events(application_id,status,note) VALUES(?,'submitted','Заявлението е подадено.')`).bind(result.meta.last_row_id).run();return json({ok:true,id:result.meta.last_row_id},201,cors)}
async function reviewApplication(request,env,cors,id){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureDocumentTables(env);const b=await readJson(request),status=String(b.status||''),note=String(b.note||'').trim();if(!['in_review','correction','approved','rejected'].includes(status)||note.length>2000||['correction','rejected'].includes(status)&&!note)return json({error:'Изберете валиден статус и добавете бележка при корекция или отказ.'},400,cors);const result=await env.DB.prepare(`UPDATE applications SET status=?,director_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?`).bind(status,note||null,id,auth.user.school_id).run();if(!result.meta.changes)return json({error:'Заявлението не е намерено.'},404,cors);await env.DB.prepare(`INSERT INTO application_events(application_id,status,note,changed_by) VALUES(?,?,?,?)`).bind(id,status,note||null,auth.user.id).run();return json({ok:true},200,cors)}

async function ensureNotificationTables(env){await ensureParentTables(env);await ensureHomeworkTables(env);await ensureAnnouncementTables(env);await ensureDocumentTables(env);await env.DB.batch([
 env.DB.prepare(`CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,recipient_kind TEXT NOT NULL CHECK(recipient_kind IN('user','parent')),recipient_id INTEGER NOT NULL,type TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,link TEXT,read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
 env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_kind,recipient_id,read_at,created_at)`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_grade AFTER INSERT ON grades WHEN NOT EXISTS(SELECT 1 FROM notifications WHERE recipient_kind='user' AND recipient_id=NEW.student_id AND type='grade' AND body='Получихте нова оценка.' AND link='student-diary.html?notice=grade-'||NEW.journal_lesson_id) BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) VALUES(NEW.school_id,'user',NEW.student_id,'grade','Нова оценка','Получихте нова оценка.','student-diary.html?notice=grade-'||NEW.journal_lesson_id); INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'parent',parent_id,'grade','Нова оценка','Има нова оценка за Вашето дете.','parent.html?notice=grade-'||NEW.journal_lesson_id FROM parent_students WHERE student_id=NEW.student_id; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_attendance AFTER INSERT ON attendance WHEN NEW.status!='present' AND NOT EXISTS(SELECT 1 FROM notifications WHERE recipient_kind='user' AND recipient_id=NEW.student_id AND type='attendance' AND body='В дневника е отбелязано отсъствие или закъснение.' AND link='student-diary.html?tab=attendance&notice='||NEW.journal_lesson_id) BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) VALUES(NEW.school_id,'user',NEW.student_id,'attendance','Отбелязано отсъствие','В дневника е отбелязано отсъствие или закъснение.','student-diary.html?tab=attendance&notice='||NEW.journal_lesson_id); INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'parent',parent_id,'attendance','Отбелязано отсъствие','Има ново отсъствие или закъснение за Вашето дете.','parent.html?notice=attendance-'||NEW.journal_lesson_id FROM parent_students WHERE student_id=NEW.student_id; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_homework AFTER INSERT ON homeworks BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'user',cs.student_id,'homework','Нова домашна работа',NEW.title,'student-homework.html' FROM class_students cs WHERE cs.class_id=NEW.class_id AND cs.left_at IS NULL; INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'parent',ps.parent_id,'homework','Нова домашна работа',NEW.title,'parent-homework.html' FROM parent_students ps JOIN class_students cs ON cs.student_id=ps.student_id WHERE cs.class_id=NEW.class_id AND cs.left_at IS NULL; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_submission AFTER INSERT ON homework_submissions BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT h.school_id,'user',h.teacher_id,'submission','Предадена домашна работа',h.title,'teacher-homework.html' FROM homeworks h WHERE h.id=NEW.homework_id; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_submission_update AFTER UPDATE ON homework_submissions BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT h.school_id,'user',h.teacher_id,'submission','Обновена домашна работа',h.title,'teacher-homework.html' FROM homeworks h WHERE h.id=NEW.homework_id; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_announcement AFTER INSERT ON announcements BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'user',u.id,'announcement','Нова обява',NEW.title,CASE u.role WHEN 'student' THEN 'student-announcements.html' WHEN 'teacher' THEN 'teacher-announcements.html' ELSE 'admin-announcements.html' END FROM users u WHERE u.school_id=NEW.school_id AND u.status='active' AND (NEW.class_id IS NULL OR u.id IN(SELECT student_id FROM class_students WHERE class_id=NEW.class_id AND left_at IS NULL)); INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'parent',p.id,'announcement','Нова обява',NEW.title,'parent-announcements.html' FROM parents p WHERE p.school_id=NEW.school_id AND p.status='active' AND (NEW.class_id IS NULL OR p.id IN(SELECT ps.parent_id FROM parent_students ps JOIN class_students cs ON cs.student_id=ps.student_id WHERE cs.class_id=NEW.class_id AND cs.left_at IS NULL)); END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_application AFTER INSERT ON applications BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT NEW.school_id,'user',id,'application','Ново заявление',NEW.subject,'admin-documents.html' FROM users WHERE school_id=NEW.school_id AND role='school_admin' AND status='active'; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_application_status AFTER INSERT ON application_events WHEN NEW.status!='submitted' BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT a.school_id,CASE a.submitted_by_kind WHEN 'parent' THEN 'parent' ELSE 'user' END,a.submitted_by_id,'application_status','Промяна по заявление',COALESCE(NEW.note,'Статусът на заявлението е променен.'),CASE a.submitted_by_kind WHEN 'parent' THEN 'parent-documents.html' ELSE 'student-documents.html' END FROM applications a WHERE a.id=NEW.application_id; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_message AFTER INSERT ON messages BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT c.school_id,'user',cm.user_id,'message','Ново съобщение',SUBSTR(NEW.body,1,160),'messages.html' FROM conversation_members cm JOIN conversations c ON c.id=cm.conversation_id WHERE cm.conversation_id=NEW.conversation_id AND cm.user_id!=NEW.sender_id; END`),
 env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS notify_parent_message AFTER INSERT ON parent_messages BEGIN INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) SELECT pc.school_id,CASE NEW.sender_kind WHEN 'parent' THEN 'user' ELSE 'parent' END,CASE NEW.sender_kind WHEN 'parent' THEN pc.staff_user_id ELSE pc.parent_id END,'message','Ново съобщение',SUBSTR(NEW.body,1,160),'messages.html' FROM parent_conversations pc WHERE pc.id=NEW.conversation_id; END`)
])}
async function addNotification(env,schoolId,kind,id,type,title,body,link){if(!id)return;await ensureNotificationTables(env);await env.DB.prepare(`INSERT INTO notifications(school_id,recipient_kind,recipient_id,type,title,body,link) VALUES(?,?,?,?,?,?,?)`).bind(schoolId,kind,id,type,String(title).slice(0,180),String(body).slice(0,500),link||null).run()}
async function notifyStudentAndParents(env,schoolId,studentId,type,title,body,studentLink,parentLink){await addNotification(env,schoolId,'user',studentId,type,title,body,studentLink);await ensureParentTables(env);const parents=await env.DB.prepare(`SELECT parent_id FROM parent_students WHERE student_id=?`).bind(studentId).all();for(const p of parents.results)await addNotification(env,schoolId,'parent',p.parent_id,type,title,body,parentLink)}
function notificationIdentity(user){return{kind:user.role==='parent'?'parent':'user',id:user.id}}
async function listNotifications(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);await ensureNotificationTables(env);const who=notificationIdentity(auth.user),q=new URL(request.url).searchParams,limit=Math.min(100,Math.max(5,Number(q.get('limit')||50))),rows=await env.DB.prepare(`SELECT * FROM notifications WHERE school_id=? AND recipient_kind=? AND recipient_id=? ORDER BY created_at DESC,id DESC LIMIT ?`).bind(auth.user.school_id,who.kind,who.id,limit).all(),count=await env.DB.prepare(`SELECT COUNT(*) AS count FROM notifications WHERE school_id=? AND recipient_kind=? AND recipient_id=? AND read_at IS NULL`).bind(auth.user.school_id,who.kind,who.id).first();return json({notifications:rows.results,unread:Number(count?.count||0)},200,cors)}
async function readNotification(request,env,cors,id){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);await ensureNotificationTables(env);const who=notificationIdentity(auth.user);await env.DB.prepare(`UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND school_id=? AND recipient_kind=? AND recipient_id=?`).bind(id,auth.user.school_id,who.kind,who.id).run();return json({ok:true},200,cors)}
async function readAllNotifications(request,env,cors){const auth=await authenticate(request,env);if(!auth)return json({error:'Не сте влезли в системата.'},401,cors);await ensureNotificationTables(env);const who=notificationIdentity(auth.user);await env.DB.prepare(`UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE school_id=? AND recipient_kind=? AND recipient_id=? AND read_at IS NULL`).bind(auth.user.school_id,who.kind,who.id).run();return json({ok:true},200,cors)}

async function ensureParentTables(env){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS parents(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,email TEXT NOT NULL COLLATE NOCASE,username TEXT COLLATE NOCASE,password_hash TEXT NOT NULL,first_name TEXT NOT NULL,last_name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','inactive')),must_change_password INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,UNIQUE(school_id,email),UNIQUE(school_id,username))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS parent_students(parent_id INTEGER NOT NULL,student_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(parent_id,student_id),FOREIGN KEY(parent_id) REFERENCES parents(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS parent_sessions(id TEXT PRIMARY KEY,parent_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(parent_id) REFERENCES parents(id) ON DELETE CASCADE)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS parent_conversations(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id INTEGER NOT NULL,parent_id INTEGER NOT NULL,staff_user_id INTEGER NOT NULL,student_id INTEGER NOT NULL,parent_last_read_at TEXT,staff_last_read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(parent_id) REFERENCES parents(id) ON DELETE CASCADE,FOREIGN KEY(staff_user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,UNIQUE(parent_id,staff_user_id,student_id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS parent_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id INTEGER NOT NULL,sender_kind TEXT NOT NULL CHECK(sender_kind IN('parent','staff')),sender_parent_id INTEGER,sender_user_id INTEGER,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(conversation_id) REFERENCES parent_conversations(id) ON DELETE CASCADE)`)
  ]);
}

async function listParents(request,env,cors){
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureParentTables(env);
  const [parents,students]=await Promise.all([
    env.DB.prepare(`SELECT p.id,p.email,p.username,p.first_name,p.last_name,p.status,p.created_at,ps.student_id,u.first_name AS student_first_name,u.last_name AS student_last_name,c.grade||c.letter AS class_name FROM parents p LEFT JOIN parent_students ps ON ps.parent_id=p.id LEFT JOIN users u ON u.id=ps.student_id LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id WHERE p.school_id=? ORDER BY p.first_name,p.last_name,u.first_name,u.last_name`).bind(auth.user.school_id).all(),
    env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,u.email,c.grade||c.letter AS class_name FROM users u LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id WHERE u.school_id=? AND u.role='student' AND u.status='active' ORDER BY c.grade,c.letter,u.first_name,u.last_name`).bind(auth.user.school_id).all()
  ]);return json({parents:parents.results,students:students.results},200,cors);
}

async function createParent(request,env,cors){
  const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureParentTables(env);const b=await readJson(request),firstName=String(b.firstName||'').trim(),lastName=String(b.lastName||'').trim(),email=String(b.email||'').trim().toLowerCase(),username=String(b.username||'').trim().toLowerCase(),password=String(b.temporaryPassword||'');
  if(!firstName||!lastName||!email||!username)return json({error:'Попълнете всички данни за родителя.'},400,cors);if(!strongPassword(password))return json({error:'Паролата трябва да е поне 10 знака с главна, малка буква, цифра и специален знак.'},400,cors);
  const usedUser=await env.DB.prepare(`SELECT id FROM users WHERE school_id=? AND (LOWER(email)=? OR LOWER(username)=?)`).bind(auth.user.school_id,email,username).first(),usedParent=await env.DB.prepare(`SELECT id FROM parents WHERE school_id=? AND (LOWER(email)=? OR LOWER(username)=?)`).bind(auth.user.school_id,email,username).first();if(usedUser||usedParent)return json({error:'Имейлът или потребителското име вече се използва.'},409,cors);
  const hash=await hashPassword(password);const result=await env.DB.prepare(`INSERT INTO parents(school_id,email,username,password_hash,first_name,last_name,status,must_change_password) VALUES(?,?,?,?,?,?,'active',1)`).bind(auth.user.school_id,email,username,hash,firstName,lastName).run();return json({ok:true,id:result.meta.last_row_id},201,cors);
}

async function updateParent(request,env,cors,parentId){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureParentTables(env);const b=await readJson(request),first=String(b.firstName||'').trim(),last=String(b.lastName||'').trim(),status=b.status==='inactive'?'inactive':'active';if(!first||!last)return json({error:'Името и фамилията са задължителни.'},400,cors);const result=await env.DB.prepare(`UPDATE parents SET first_name=?,last_name=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?`).bind(first,last,status,parentId,auth.user.school_id).run();if(!result.meta.changes)return json({error:'Родителят не е намерен.'},404,cors);return json({ok:true},200,cors)}

async function linkParentChild(request,env,cors,parentId){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureParentTables(env);const studentId=Number((await readJson(request)).studentId);const valid=await env.DB.prepare(`SELECT p.id FROM parents p JOIN users u ON u.school_id=p.school_id WHERE p.id=? AND p.school_id=? AND u.id=? AND u.role='student'`).bind(parentId,auth.user.school_id,studentId).first();if(!valid)return json({error:'Невалиден родител или ученик.'},400,cors);await env.DB.prepare(`INSERT OR IGNORE INTO parent_students(parent_id,student_id) VALUES(?,?)`).bind(parentId,studentId).run();return json({ok:true},201,cors)}
async function unlinkParentChild(request,env,cors,parentId,studentId){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureParentTables(env);await env.DB.prepare(`DELETE FROM parent_students WHERE parent_id=? AND student_id=? AND parent_id IN(SELECT id FROM parents WHERE school_id=?)`).bind(parentId,studentId,auth.user.school_id).run();return json({ok:true},200,cors)}
async function resetParentPassword(request,env,cors,parentId){const auth=await requireRole(request,env,'school_admin');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureParentTables(env);const password=String((await readJson(request)).temporaryPassword||'');if(!strongPassword(password))return json({error:'Паролата трябва да е поне 10 знака с главна, малка буква, цифра и специален знак.'},400,cors);const hash=await hashPassword(password);const result=await env.DB.prepare(`UPDATE parents SET password_hash=?,must_change_password=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?`).bind(hash,parentId,auth.user.school_id).run();if(!result.meta.changes)return json({error:'Родителят не е намерен.'},404,cors);await env.DB.prepare(`DELETE FROM parent_sessions WHERE parent_id=?`).bind(parentId).run();return json({ok:true},200,cors)}

async function parentChildren(request,env,cors){const auth=await requireRole(request,env,'parent');if(auth.error)return json({error:auth.error},auth.status,cors);const result=await env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,u.email,c.grade||c.letter AS class_name FROM parent_students ps JOIN users u ON u.id=ps.student_id LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id WHERE ps.parent_id=? AND u.school_id=? AND u.status='active' ORDER BY u.first_name,u.last_name`).bind(auth.user.id,auth.user.school_id).all();return json({children:result.results},200,cors)}

async function parentOverview(request,env,cors){
  const auth=await requireRole(request,env,'parent');if(auth.error)return json({error:auth.error},auth.status,cors);await ensureFinalGradeTables(env);const studentId=Number(new URL(request.url).searchParams.get('studentId'));const child=await env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,c.grade||c.letter AS class_name FROM parent_students ps JOIN users u ON u.id=ps.student_id LEFT JOIN class_students cs ON cs.student_id=u.id AND cs.left_at IS NULL LEFT JOIN classes c ON c.id=cs.class_id WHERE ps.parent_id=? AND u.id=? AND u.school_id=? AND u.status='active' LIMIT 1`).bind(auth.user.id,studentId,auth.user.school_id).first();if(!child)return json({error:'Нямате достъп до този ученик.'},403,cors);
  const weekday=new Date().getUTCDay();const [grades,attendance,schedule,finalGrades]=await Promise.all([
    env.DB.prepare(`SELECT g.id,g.value,g.grade_type,g.note,g.graded_on,s.id AS subject_id,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name FROM grades g JOIN subjects s ON s.id=g.subject_id JOIN users u ON u.id=g.teacher_id WHERE g.student_id=? ORDER BY g.graded_on DESC,g.id DESC`).bind(studentId).all(),
    env.DB.prepare(`SELECT a.id,a.status,a.excused,a.note,j.lesson_date,j.period_number,s.name AS subject_name FROM attendance a JOIN journal_lessons j ON j.id=a.journal_lesson_id JOIN subjects s ON s.id=j.subject_id WHERE a.student_id=? AND a.status!='present' ORDER BY j.lesson_date DESC,j.period_number`).bind(studentId).all(),
    env.DB.prepare(`SELECT sl.weekday,sl.period_number,sl.starts_at,sl.room,s.name AS subject_name,s.color,u.first_name||' '||u.last_name AS teacher_name FROM schedule_lessons sl JOIN subjects s ON s.id=sl.subject_id JOIN users u ON u.id=sl.teacher_id JOIN academic_years ay ON ay.id=sl.academic_year_id WHERE sl.class_id IN(SELECT class_id FROM class_students WHERE student_id=? AND left_at IS NULL) AND ay.status='active' AND sl.is_published=1 ORDER BY sl.weekday,sl.period_number`).bind(studentId).all(),
    env.DB.prepare(`SELECT fg.value,fg.term,fg.subject_id,s.name AS subject_name FROM final_grades fg JOIN subjects s ON s.id=fg.subject_id JOIN academic_years ay ON ay.id=fg.academic_year_id WHERE fg.student_id=? AND ay.status='active'`).bind(studentId).all()
  ]);return json({child,grades:grades.results,attendance:attendance.results,schedule:schedule.results,finalGrades:finalGrades.results,todayWeekday:weekday},200,cors);
}

async function authenticate(request, env) {
  const token = bearerToken(request);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.*, s.code AS school_code, s.name AS school_name
     FROM sessions se
     JOIN users u ON u.id = se.user_id
     JOIN schools s ON s.id = u.school_id
     WHERE se.token_hash = ? AND se.expires_at > ? AND u.status = 'active'
     LIMIT 1`
  ).bind(tokenHash, new Date().toISOString()).first();

  if(row)return {user:row};
  await ensureParentTables(env);
  const parent=await env.DB.prepare(
    `SELECT p.*,s.code AS school_code,s.name AS school_name,'parent' AS role
     FROM parent_sessions ps JOIN parents p ON p.id=ps.parent_id JOIN schools s ON s.id=p.school_id
     WHERE ps.token_hash=? AND ps.expires_at>? AND p.status='active' LIMIT 1`
  ).bind(tokenHash,new Date().toISOString()).first();
  return parent?{user:parent}:null;
}

async function requireRole(request, env, role) {
  const auth = await authenticate(request, env);
  if (!auth) return { error: "Не сте влезли в системата.", status: 401 };
  if (auth.user.role !== role) return { error: "Нямате право за това действие.", status: 403 };
  return auth;
}

function publicUser(user) {
  return {
    id: user.id,
    schoolId: user.school_id,
    schoolCode: user.school_code,
    schoolName: user.school_name,
    email: user.email,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password)
  };
}

function roleRedirect(role) {
  if (role === "school_admin") return "admin.html";
  if (role === "teacher") return "teacher.html";
  if (role === "parent") return "parent.html";
  return "student.html";
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 10000;
  const hash = await derivePassword(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, iterationsText, saltText, hashText] = String(stored).split("$");
  if (algorithm !== "pbkdf2_sha256") return false;
  const actual = await derivePassword(password, fromBase64(saltText), Number(iterationsText));
  return safeEqual(toBase64(actual), hashText);
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64(new Uint8Array(digest));
}

function randomToken(length) {
  return toBase64(crypto.getRandomValues(new Uint8Array(length)))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function bearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://kristiyanmng.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Setup-Secret",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function safeEqual(a, b) {
  const left = String(a);
  const right = String(b);
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
