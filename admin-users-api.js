const USERS_API = "https://energy-school-api.energypublishing.workers.dev";
const usersToken = sessionStorage.getItem("energySchoolToken") || localStorage.getItem("energySchoolToken");
let dbUsers = [];
const body = document.querySelector("#dbUsersBody");
const message = document.querySelector("#dbUsersMessage");
const search = document.querySelector("#dbUserSearch");
const globalSearch = document.querySelector("#dbGlobalSearch");
const roleFilter = document.querySelector("#dbRoleFilter");
const statusFilter = document.querySelector("#dbStatusFilter");
const modal = document.querySelector("#dbUserModal");
const form = document.querySelector("#dbUserForm");
const formError = document.querySelector("#dbFormError");
const roleNames = {
  student: "Ученик",
  teacher: "Учител",
  director: "Директор",
  deputy_director: "Заместник-директор",
  school_administrator: "Училищен администратор"
};

function effectiveRole(user) {
  return user.job_role || (user.role === "school_admin" ? "director" : user.role);
}

function addAdministrativeRoleOptions() {
  const createRole = document.querySelector("#dbRole");
  createRole.insertAdjacentHTML("beforeend", `
    <option value="deputy_director">Заместник-директор</option>
    <option value="school_administrator">Училищен администратор</option>`);
  roleFilter.innerHTML = `
    <option value="all">Всички роли</option>
    <option value="student">Ученици</option>
    <option value="teacher">Учители</option>
    <option value="director">Директор</option>
    <option value="deputy_director">Заместник-директори</option>
    <option value="school_administrator">Училищни администратори</option>`;
}

async function api(path, options = {}) {
  const response = await fetch(USERS_API + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + usersToken,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Грешка при заявката.");
  return data;
}

async function loadDbUsers() {
  message.hidden = false;
  message.textContent = "Зареждане на потребителите...";
  try {
    const data = await api("/api/admin/users");
    dbUsers = data.users;
    message.hidden = true;
    renderDbUsers();
  } catch (error) {
    message.hidden = false;
    message.className = "api-state error";
    message.textContent = error.message;
  }
}

function renderDbUsers() {
  const q = search.value.toLowerCase();
  const shown = dbUsers.filter(user => {
    const matchesText = `${user.first_name} ${user.last_name} ${user.email} ${user.username || ""}`.toLowerCase().includes(q);
    const matchesRole = roleFilter.value === "all" || effectiveRole(user) === roleFilter.value;
    const matchesStatus = statusFilter.value === "all" || user.status === statusFilter.value;
    return matchesText && matchesRole && matchesStatus;
  });

  body.innerHTML = shown.map(user => {
    const jobRole = effectiveRole(user);
    const protectedDirector = jobRole === "director";
    return `<tr>
      <td><div class="person"><i>${user.first_name[0]}${user.last_name[0]}</i><span><b>${user.first_name} ${user.last_name}</b><small>${user.email}</small></span></div></td>
      <td><span class="role role-${user.role === "school_admin" ? "admin" : user.role}">${roleNames[jobRole] || jobRole}</span></td>
      <td>${user.username || "—"}</td>
      <td><span class="status ${user.status}">${user.status === "active" ? "Активен" : "Неактивен"}</span></td>
      <td>${protectedDirector ? "" : `<button class="row-action" data-db-edit="${user.id}">Редактирай</button><button class="row-action" data-db-reset="${user.id}">Нова парола</button>`}</td>
    </tr>`;
  }).join("");

  document.querySelector("#dbAllCount").textContent = dbUsers.length;
  document.querySelector("#dbStudentCount").textContent = dbUsers.filter(u => effectiveRole(u) === "student").length;
  document.querySelector("#dbTeacherCount").textContent = dbUsers.filter(u => effectiveRole(u) === "teacher").length;
  document.querySelector("#dbActiveCount").textContent = dbUsers.filter(u => u.status === "active").length;
}

function openDbModal(user = null) {
  form.reset();
  formError.hidden = true;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.querySelector("#dbEditId").value = user?.id || "";
  document.querySelector("#dbFirstName").value = user?.first_name || "";
  document.querySelector("#dbLastName").value = user?.last_name || "";
  document.querySelector("#dbModalTitle").textContent = user ? "Редактиране на потребител" : "Нов потребител";
  document.querySelector("#dbSaveUser").textContent = user ? "Запази промените" : "Създай акаунта";
  document.querySelectorAll(".create-only").forEach(x => x.hidden = Boolean(user));
  document.querySelectorAll(".edit-only").forEach(x => x.hidden = !user);
  document.querySelectorAll(".create-only input,.create-only select").forEach(x => x.disabled = Boolean(user));
  if (user) document.querySelector("#dbStatus").value = user.status;
  else {
    document.querySelector("#dbPassword").value = "Energy2026!";
    document.querySelector("#dbEmail").required = true;
    document.querySelector("#dbUsername").required = true;
    document.querySelector("#dbPassword").required = true;
  }
}

function closeDbModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

document.querySelector("#dbAddUser").onclick = () => openDbModal();
document.querySelectorAll(".db-dismiss").forEach(x => x.onclick = closeDbModal);
body.addEventListener("click", event => {
  const editId = event.target.dataset.dbEdit;
  const resetId = event.target.dataset.dbReset;
  if (editId) openDbModal(dbUsers.find(user => user.id === Number(editId)));
  if (resetId) openResetPassword(Number(resetId));
});
[search, roleFilter, statusFilter].forEach(x => x.addEventListener("input", renderDbUsers));
globalSearch.addEventListener("input", () => { search.value = globalSearch.value; renderDbUsers(); });

form.addEventListener("submit", async event => {
  event.preventDefault();
  const id = document.querySelector("#dbEditId").value;
  const button = document.querySelector("#dbSaveUser");
  formError.hidden = true;
  button.disabled = true;
  try {
    if (id) {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({
        firstName: document.querySelector("#dbFirstName").value,
        lastName: document.querySelector("#dbLastName").value,
        status: document.querySelector("#dbStatus").value
      }) });
    } else {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify({
        firstName: document.querySelector("#dbFirstName").value,
        lastName: document.querySelector("#dbLastName").value,
        email: document.querySelector("#dbEmail").value,
        username: document.querySelector("#dbUsername").value,
        role: document.querySelector("#dbRole").value,
        temporaryPassword: document.querySelector("#dbPassword").value
      }) });
    }
    closeDbModal();
    await loadDbUsers();
  } catch (error) {
    formError.hidden = false;
    formError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const resetModal = document.querySelector("#dbResetPasswordModal");
const resetForm = document.querySelector("#dbResetPasswordForm");
const resetError = document.querySelector("#dbResetPasswordError");
function openResetPassword(id) {
  const user = dbUsers.find(item => item.id === id);
  document.querySelector("#dbResetUserId").value = id;
  document.querySelector("#dbResetPasswordTitle").textContent = `Нова парола за ${user.first_name} ${user.last_name}`;
  document.querySelector("#dbTemporaryPassword").value = "Energy2026!";
  resetError.textContent = "";
  resetModal.hidden = false;
}
document.querySelectorAll(".db-reset-dismiss").forEach(button => button.onclick = () => resetModal.hidden = true);
resetForm.onsubmit = async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await api(`/api/admin/users/${document.querySelector("#dbResetUserId").value}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ temporaryPassword: document.querySelector("#dbTemporaryPassword").value })
    });
    resetModal.hidden = true;
    message.hidden = false;
    message.className = "api-state";
    message.textContent = "Временната парола е зададена. Потребителят трябва да я смени при следващото влизане.";
  } catch (error) {
    resetError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
};

addAdministrativeRoleOptions();
loadDbUsers();
