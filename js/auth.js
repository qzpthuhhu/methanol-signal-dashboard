(() => {
  const SESSION_KEY = "ma-dash-authed-v1";
  const cfg = window.DASH_AUTH;
  if (!cfg || !cfg.hash || !cfg.salt) {
    console.error("DASH_AUTH missing");
    return;
  }

  const gate = document.getElementById("auth-gate");
  const form = document.getElementById("auth-form");
  const input = document.getElementById("auth-password");
  const err = document.getElementById("auth-error");

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function unlock() {
    document.documentElement.classList.add("authed");
    if (gate) gate.hidden = true;
    window.__DASH_UNLOCKED = true;
    window.dispatchEvent(new Event("dash-auth-ok"));
  }

  async function checkPassword(pw) {
    const h = await sha256Hex(cfg.salt + pw);
    return h === cfg.hash;
  }

  async function trySession() {
    if (sessionStorage.getItem(SESSION_KEY) === cfg.hash) {
      unlock();
      return true;
    }
    return false;
  }

  if (!gate || !form || !input) {
    console.error("auth DOM missing");
    return;
  }

  trySession().then((ok) => {
    if (ok) return;
    gate.hidden = false;
    input.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const pw = input.value;
    const ok = await checkPassword(pw);
    if (!ok) {
      err.hidden = false;
      input.select();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, cfg.hash);
    input.value = "";
    unlock();
  });
})();
