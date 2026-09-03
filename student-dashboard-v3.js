const HOME_API = "https://energy-school-api.energypublishing.workers.dev";
const homeToken = sessionStorage.getItem("energySchoolToken") || localStorage.getItem("energySchoolToken");
const homeEsc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const bgDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("bg-BG") : "";

function empty(text) {
  return `<div class="dashboard-empty">${homeEsc(text)}</div>`;
}

function renderToday(rows) {
  homeTodayLessons.innerHTML = rows.map(row => `
    <div class="dashboard-list-row">
      <i>${Number(row.period_number)}</i>
      <span><b>${homeEsc(row.subject_name)}</b><small>${homeEsc(row.teacher_name)}${row.room ? ` · Кабинет ${homeEsc(row.room)}` : ""}</small></span>
      <strong>${homeEsc(row.starts_at || "")}</strong>
    </div>`).join("") || empty("За днес няма публикувани часове.");
}

function renderLatestGrades(rows) {
  const colors = { 2: "#ef5060", 3: "#f47a45", 4: "#f3bc19", 5: "#329bd5", 6: "#24be7d" };
  homeLatestGrades.innerHTML = rows.map(row => `
    <div class="dashboard-list-row" style="--row-color:${homeEsc(row.color || "#f97316")}">
      <strong class="grade-square" style="--grade-color:${colors[Number(row.value)] || "#329bd5"}">${Number(row.value)}</strong>
      <span><b>${homeEsc(row.subject_name)}</b><small>Въведена на ${bgDate(row.graded_on)}</small></span>
      <strong>Оценка</strong>
    </div>`).join("") || empty("Все още няма въведени оценки.");
}

function renderUpcoming(rows) {
  const names = { test: "Контролна", classwork: "Класна", oral: "Устно", exam: "Изпит" };
  homeUpcomingAssessments.innerHTML = rows.map(row => `
    <div class="dashboard-list-row" style="--row-color:${homeEsc(row.color || "#9145ad")}">
      <i>◫</i>
      <span><b>${homeEsc(row.title)}</b><small>${homeEsc(row.subject_name)} · ${names[row.type] || "Изпитване"}</small></span>
      <strong>${bgDate(row.scheduled_on)}</strong>
    </div>`).join("") || empty("Няма предстоящи изпитвания.");
}

async function loadStudentHome() {
  try {
    const response = await fetch(`${HOME_API}/api/dashboard`, {
      headers: { Authorization: `Bearer ${homeToken}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Началната страница не може да се зареди.");

    const user = JSON.parse(sessionStorage.getItem("energySchoolUser") || localStorage.getItem("energySchoolUser") || "null") || {};
    homeSchoolName.textContent = user.schoolName || "Energy School";
    homeStudentName.textContent = [user.firstName, user.lastName].filter(Boolean).join(" ").toUpperCase() || "УЧЕНИК";
    homeStudentClass.textContent = data.className ? `· ${data.className.toUpperCase()}` : "";
    homeAcademicYear.textContent = data.academicYear?.name || "Активна учебна година";

    homeAverage.textContent = data.stats.average ? data.stats.average.toFixed(2) : "—";
    homeGrades.textContent = data.stats.grades;
    homeAbsences.textContent = data.stats.absences;
    homeUnexcusedMetric.textContent = data.stats.unexcused;
    homeTests.textContent = data.stats.upcoming;
    homeMessages.textContent = data.stats.unread;
    homeLessons.textContent = data.stats.lessons;
    homeUnexcused.textContent = data.stats.unexcused;
    shortcutGrades.textContent = data.stats.grades;
    shortcutAbsences.textContent = data.stats.absences;
    shortcutTests.textContent = data.stats.upcoming;
    shortcutMessages.textContent = data.stats.unread;

    homeClassRank.textContent = data.ranking.classPosition
      ? `${data.ranking.classPosition} / ${data.ranking.classTotal}` : "—";
    homeSchoolRank.textContent = data.ranking.schoolPosition
      ? `${data.ranking.schoolPosition} / ${data.ranking.schoolTotal}` : "—";

    homeBestSubjects.innerHTML = (data.subjectAverages || []).map(subject => `
      <div class="best-subject" style="--subject-color:${homeEsc(subject.color)}">
        <b>${homeEsc(subject.subject_name)}</b>
        <div><i style="width:${Math.max(0, Math.min(100, Number(subject.average) / 6 * 100))}%"></i></div>
        <strong>${Number(subject.average).toFixed(2)}</strong>
      </div>`).join("") || empty("Все още няма въведени оценки.");

    renderToday(data.today || []);
    renderLatestGrades(data.latestGrades || []);
    renderUpcoming(data.upcoming || []);
  } catch (error) {
    document.querySelector(".student-profile-strip").innerHTML = `<strong>${homeEsc(error.message)}</strong>`;
  }
}

loadStudentHome();
