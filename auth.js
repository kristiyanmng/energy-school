const ENERGY_API = "https://energy-school-api.energypublishing.workers.dev";
const realLoginForm = document.querySelector("#loginForm");

if (realLoginForm) {
  const identifierLabel = document.querySelector("#email")?.closest("label");
  const schoolLabel = document.createElement("label");
  schoolLabel.innerHTML = `Код на училището
    <input id="schoolCode" name="schoolCode" autocomplete="organization"
      placeholder="Например: ENERGY-DEMO" required>`;
  realLoginForm.insertBefore(schoolLabel, identifierLabel);

  const schoolInput = document.querySelector("#schoolCode");
  schoolInput.value = localStorage.getItem("energySchoolCode") || "ENERGY-DEMO";

  realLoginForm.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const button = document.querySelector("#loginButton");
    const message = document.querySelector("#message");
    const identifier = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const schoolCode = schoolInput.value.trim().toUpperCase();

    message.className = "login-message";
    message.textContent = "Проверка на данните...";
    button.disabled = true;
    button.textContent = "Влизане...";

    try {
      const response = await fetch(`${ENERGY_API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, schoolCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Входът е неуспешен.");

      const storage = document.querySelector("#rememberLogin").checked
        ? localStorage
        : sessionStorage;
      localStorage.removeItem("energySchoolToken");
      sessionStorage.removeItem("energySchoolToken");
      localStorage.setItem("energySchoolCode", schoolCode);
      storage.setItem("energySchoolToken", data.token);
      storage.setItem("energySchoolUser", JSON.stringify(data.user));
      storage.setItem("energySchoolAfterPassword", data.redirect);
      location.href = data.user.mustChangePassword
        ? "change-password.html"
        : data.redirect;
    } catch (error) {
      message.className = "login-message error";
      message.textContent = error.message || "Няма връзка със сървъра.";
      button.disabled = false;
      button.textContent = "Вход в Energy School →";
    }
  }, true);
}
