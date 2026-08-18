const FLOW_BOOT_ID = Math.random();
export function bootFlow() {
  if (window.__flowScriptLoaded === FLOW_BOOT_ID) return window.__flowBootPromise || Promise.resolve();
  window.__flowScriptLoaded = FLOW_BOOT_ID;
  window.__flowBooted = false;
const SESSION_KEY = "flow.signedIn";
  const SAMPLE_KEY = "flow.sampleOn";
  const STORE_KEY = "flow.workspace.v1";
  const DESKTOP = /[?&]desktop=1(?:&|$)/.test(location.search) || /FLOWVANTI/i.test(navigator.userAgent) || !!(window.flowvanti || (window.pywebview && window.pywebview.api));
  let persistReady = false;
  let persistTimer = 0;
  let persistIdle = 0;
  let persistEpoch = 0;
  let persistInFlight = 0;
  let sampleBusy = false;
  let activeView = "";
  let statsRaf = 0;
  let statsHeavy = false;
  let notifListDirty = true;
  let projCardObserver = null;
  let calendarAllProjects = false;
  let calPopAllProjects = false;
  let TODAY_Y, TODAY_M, TODAY_D, TODAY_KEY;
  function refreshToday() {
    const d = new Date();
    TODAY_Y = d.getFullYear();
    TODAY_M = d.getMonth() + 1;
    TODAY_D = d.getDate();
    TODAY_KEY = TODAY_M * 100 + TODAY_D;
  }
  refreshToday();
  let calViewYear = TODAY_Y;
  let calViewMonth = TODAY_M;
  let datePickInput = null;
  let datePickYear = TODAY_Y;
  let datePickMonth = TODAY_M;
  function todayIso() {
    return TODAY_Y + "-" + String(TODAY_M).padStart(2, "0") + "-" + String(TODAY_D).padStart(2, "0");
  }
  function todayLabel() {
    return fmtIso(todayIso());
  }
  const CAL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function todayMonthLabel() {
    return CAL_MONTH_NAMES[TODAY_M - 1] + " " + TODAY_Y;
  }
  const EMPTY_IDS = [];
  const taskIdsByProject = Object.create(null);
  (function lockAsDesktopApp() {
    const asApp = () => !!(window.pywebview || DESKTOP);
    const apply = () => {
      if (!asApp()) return;
      document.documentElement.classList.add("app-native");
    };
    apply();
    window.addEventListener("pywebviewready", apply, { once: true });
    document.addEventListener("contextmenu", (e) => {
      if (!asApp()) return;
      if (e.target && e.target.closest && e.target.closest("input, textarea")) return;
      e.preventDefault();
    });
    document.addEventListener("keydown", (e) => {
      if (!asApp()) return;
      const k = (e.key || "").toLowerCase();
      if (e.key === "F5" || e.key === "F12" || e.key === "F11") e.preventDefault();
      if (!(e.ctrlKey || e.metaKey)) return;
      if (["c", "v", "x", "a", "z"].includes(k) && e.target && e.target.closest && e.target.closest("input, textarea, select")) return;
      if (["r", "p", "s", "u", "j", "o", "n", "t", "w", "f", "+", "-", "=", "0", "p"].includes(k)) e.preventDefault();
    }, true);
    document.addEventListener("wheel", (e) => {
      if (asApp() && e.ctrlKey) e.preventDefault();
    }, { passive: false });
    window.addEventListener("dragover", (e) => {
      if (!asApp()) return;
      if (e.dataTransfer && [...e.dataTransfer.types].includes("Files") && !e.target.closest("#attachPanel, #teamModal, .task-pane")) e.preventDefault();
    });
    window.addEventListener("drop", (e) => {
      if (!asApp()) return;
      if (e.dataTransfer && [...e.dataTransfer.types].includes("Files") && !e.target.closest("#attachPanel, #teamModal, .task-pane")) e.preventDefault();
    });
  })();
  const ADMIN = {
    user: "admin",
    email: "admin@flowvanti.app",
    name: "Admin",
    role: "FLOWVANTI Admin",
    initials: "A",
    salt: "flowvanti.admin.v1",
    passHash: "6357a1662346f11724202efa5d0874862c1257e57a22e01648d2f4826c213cfa"
  };
  const auth = document.getElementById("auth");
  const appShell = document.getElementById("appShell");
  function adminIdentity(value) {
    const n = String(value || "").trim().toLowerCase();
    return n === ADMIN.user || n === ADMIN.email;
  }
  function hashesMatch(a, b) {
    const x = String(a || "");
    const y = String(b || "");
    if (x.length !== y.length) return false;
    let diff = 0;
    for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return diff === 0;
  }
  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    if (crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(buf)].map((n) => n.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("hash");
  }
  async function hashPassword(pass) {
    return sha256Hex(ADMIN.salt + "\n" + String(pass || ""));
  }
  function setLoginError(msg, fields) {
    const box = document.getElementById("loginError");
    const emailWrap = document.getElementById("loginEmailWrap");
    const passWrap = document.getElementById("loginPassWrap");
    const email = document.getElementById("loginEmail");
    const pass = document.getElementById("loginPass");
    if (emailWrap) emailWrap.classList.toggle("invalid", !!(fields && fields.user));
    if (passWrap) passWrap.classList.toggle("invalid", !!(fields && fields.pass));
    if (email) email.classList.toggle("invalid", !!(fields && fields.user));
    if (pass) pass.classList.toggle("invalid", !!(fields && fields.pass));
    if (box) {
      box.textContent = msg || "";
      box.classList.toggle("show", !!msg);
    }
  }
  function enterApp(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setLoginError("");
    if (auth) { auth.hidden = true; auth.style.display = "none"; }
    if (appShell) { appShell.hidden = false; appShell.style.display = "flex"; }
    try {
      const remember = document.getElementById("rememberMe");
      const payload = JSON.stringify({ user: ADMIN.user, at: Date.now() });
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      if (!remember || remember.checked) localStorage.setItem(SESSION_KEY, payload);
      else sessionStorage.setItem(SESSION_KEY, payload);
    } catch (err) {}
    try { if (typeof showView === "function") showView("dashboard"); } catch (err) {}
  }
  async function tryLogin(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const user = document.getElementById("loginEmail");
    const pass = document.getElementById("loginPass");
    const userVal = user ? user.value.trim() : "";
    const passVal = pass ? pass.value : "";
    if (!userVal || !passVal) {
      setLoginError("Enter username and password.", { user: !userVal, pass: !passVal });
      return;
    }
    let hashed = "";
    try {
      hashed = await hashPassword(passVal);
    } catch (err) {
      setLoginError("Password check is unavailable in this browser.", { user: false, pass: true });
      return;
    }
    if (!adminIdentity(userVal) || !hashesMatch(hashed, ADMIN.passHash)) {
      setLoginError("Wrong username or password.", { user: true, pass: true });
      return;
    }
    enterApp();
  }
  function blockExtraAccount(e, msg) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setLoginError(msg || "This standalone app has one admin account.");
    const loginCardNow = document.getElementById("loginCard");
    const signupCardNow = document.getElementById("signupCard");
    const forgotCardNow = document.getElementById("forgotCard");
    if (loginCardNow) loginCardNow.hidden = false;
    if (signupCardNow) signupCardNow.hidden = true;
    if (forgotCardNow) forgotCardNow.hidden = true;
  }
  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (err) {}
    try { if (typeof closePops === "function") closePops(); } catch (err) {}
    if (appShell) { appShell.hidden = true; appShell.style.display = "none"; }
    if (auth) { auth.hidden = false; auth.style.display = ""; }
    const loginCardNow = document.getElementById("loginCard");
    const signupCardNow = document.getElementById("signupCard");
    const forgotCardNow = document.getElementById("forgotCard");
    if (loginCardNow) loginCardNow.hidden = false;
    if (signupCardNow) signupCardNow.hidden = true;
    if (forgotCardNow) forgotCardNow.hidden = true;
    const pass = document.getElementById("loginPass");
    if (pass) pass.value = "";
    setLoginError("");
  }
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", tryLogin);
  const loginCardEl = document.getElementById("loginCard");
  if (loginCardEl) loginCardEl.addEventListener("submit", tryLogin);
  const signupCardEl = document.getElementById("signupCard");
  if (signupCardEl) signupCardEl.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("signupBtn").click();
  });
  const googleBtn = document.getElementById("googleBtn");
  if (googleBtn) googleBtn.addEventListener("click", (e) => blockExtraAccount(e, "Google sign-in is off. Use the admin account."));
  const signupBtn = document.getElementById("signupBtn");
  if (signupBtn) signupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const loginCardNow = document.getElementById("loginCard");
    const signupCardNow = document.getElementById("signupCard");
    if (signupCardNow) signupCardNow.hidden = true;
    if (loginCardNow) loginCardNow.hidden = false;
    setLoginError("This standalone app uses one hashed admin account.");
  });
  document.querySelectorAll(".auth-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.for);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  const projChrome = document.getElementById("projChrome");
  const taskPane = document.getElementById("taskPane");
  const workspaceViews = new Set(["board", "tasks", "calendar", "gantt"]);
  const tasks = {
    qa: { title: "QA on checkout flow", list: "In progress", statusClass: "prog", pri: "Urgent", priClass: "urgent", due: "13 Aug · 5d late", start: "4 Aug", assignee: "SK", avBg: "var(--accent-dim)", avFg: "#7EF0F0", est: "16h", act: "9h 30m", pct: 59, desc: "Reproduce the payment timeout on staging, capture HAR, and unblock checkout before the Website relaunch freeze.", tags: ["Checkout", "QA", "Urgent"] },
    pricing: { title: "Design new pricing page", list: "To do", statusClass: "todo", pri: "High", priClass: "high", due: "22 Aug", start: "12 Aug", assignee: "JL", avBg: "var(--accent-dim)", avFg: "#7EF0F0", est: "16h", act: "4h", pct: 25, desc: "Rebuild the public pricing grid, add annual toggle, and align checkout SKUs with the new plans. Waiting on legal copy for the enterprise tier.", tags: ["Website", "Design", "High"] },
    api: { title: "API rate-limit spike", list: "Blocked", statusClass: "blocked", pri: "High", priClass: "high", due: "18 Aug", start: "8 Aug", assignee: "SK", avBg: "var(--purple-dim)", avFg: "#E9D5FF", est: "12h", act: "7h", pct: 58, desc: "Gateway 429s under load. Waiting on infra to raise the limit; keep a degraded retry path ready.", tags: ["Mobile", "Infra"] },
    copy: { title: "Launch copy review", list: "To do", statusClass: "todo", pri: "Medium", priClass: "med", due: "15 Aug · 3d late", start: "1 Aug", assignee: "MR", avBg: "var(--amber-dim)", avFg: "#FDE68A", est: "8h", act: "3h", pct: 38, desc: "Campaign landing copy is in review. Legal still owes the disclaimer block.", tags: ["Q3", "Copy", "Legal"] },
    nav: { title: "Nav IA pass", list: "In review", statusClass: "review", pri: "Low", priClass: "low", due: "20 Aug", start: "6 Aug", assignee: "JL", avBg: "var(--accent-dim)", avFg: "#7EF0F0", est: "6h", act: "5h", pct: 83, desc: "Information architecture pass on primary nav. Awaiting stakeholder sign-off.", tags: ["Website", "IA"] },
    staging: { title: "Set up staging server", list: "Done", statusClass: "done", pri: "Low", priClass: "low", due: "8 Aug", start: "1 Aug", assignee: "JL", avBg: "var(--success-bg)", avFg: "var(--success-text)", est: "8h", act: "7h 15m", pct: 100, desc: "Staging environment is live and used for checkout QA.", tags: ["Website", "Infra"] },
    hero: { title: "Homepage hero", list: "To do", statusClass: "todo", pri: "Low", priClass: "low", due: "28 Aug", start: "18 Aug", assignee: "JL", avBg: "var(--accent-dim)", avFg: "#7EF0F0", est: "10h", act: "1h", pct: 10, desc: "New hero with product shot and primary CTA for the relaunch.", tags: ["Website", "Design"] },
    footer: { title: "Footer legal links", list: "To do", statusClass: "todo", pri: "Low", priClass: "low", due: "30 Aug", start: "20 Aug", assignee: "MR", avBg: "var(--amber-dim)", avFg: "#FDE68A", est: "3h", act: "0h", pct: 0, desc: "Privacy, terms, and cookie links for the new footer.", tags: ["Website", "Legal"] },
    tokens: { title: "Brand token pass", list: "In review", statusClass: "review", pri: "Medium", priClass: "med", due: "19 Aug", start: "9 Aug", assignee: "JL", avBg: "var(--accent-dim)", avFg: "#7EF0F0", est: "5h", act: "4h", pct: 80, desc: "Align spacing and type tokens with the MedVault dark system.", tags: ["Website", "Design"] },
    cms: { title: "CMS content migrate", list: "Done", statusClass: "done", pri: "Low", priClass: "low", due: "5 Aug", start: "28 Jul", assignee: "MR", avBg: "var(--success-bg)", avFg: "var(--success-text)", est: "12h", act: "11h", pct: 100, desc: "Marketing pages moved to the new CMS.", tags: ["Website", "Content"] }
  };
  Object.assign(tasks, {
    qa: Object.assign(tasks.qa, { project: "website" }),
    pricing: Object.assign(tasks.pricing, { project: "website" }),
    nav: Object.assign(tasks.nav, { project: "website" }),
    staging: Object.assign(tasks.staging, { project: "website" }),
    hero: Object.assign(tasks.hero, { project: "website" }),
    footer: Object.assign(tasks.footer, { project: "website" }),
    tokens: Object.assign(tasks.tokens, { project: "website" }),
    cms: Object.assign(tasks.cms, { project: "website" }),
    api: Object.assign(tasks.api, { project: "mobile" }),
    copy: Object.assign(tasks.copy, { project: "q3" }),
    push: { title: "Push notification pipeline", list: "To do", statusClass: "todo", pri: "High", priClass: "high", due: "25 Aug", start: "12 Aug", assignee: "SK", est: "20h", act: "2h", pct: 10, desc: "Device tokens, topics, and quiet hours for Mobile app v2.", tags: ["Mobile", "Push"], project: "mobile" },
    auth: { title: "Biometric login", list: "In review", statusClass: "review", pri: "High", priClass: "high", due: "21 Aug", start: "4 Aug", assignee: "SK", est: "14h", act: "11h", pct: 78, desc: "Face ID / fingerprint on iOS and Android. Waiting on security sign-off.", tags: ["Mobile", "Auth"], project: "mobile" },
    store: { title: "App Store listing", list: "To do", statusClass: "todo", pri: "Medium", priClass: "med", due: "29 Aug", start: "18 Aug", assignee: "MR", est: "8h", act: "1h", pct: 12, desc: "Screenshots, copy, and privacy nutrition labels for the store page.", tags: ["Mobile", "Store"], project: "mobile" },
    crash: { title: "Crashlytics triage", list: "Done", statusClass: "done", pri: "Low", priClass: "low", due: "9 Aug", start: "1 Aug", assignee: "SK", est: "6h", act: "5h", pct: 100, desc: "Noise floor on crash-free sessions is back above 99.4%.", tags: ["Mobile", "QA"], project: "mobile" },
    ads: { title: "Paid ads setup", list: "In progress", statusClass: "prog", pri: "Urgent", priClass: "urgent", due: "17 Aug", start: "6 Aug", assignee: "MR", est: "10h", act: "6h", pct: 60, desc: "Search and social campaigns for the Q3 launch. Budget still in legal.", tags: ["Q3", "Ads"], project: "q3" },
    landing: { title: "Campaign landing page", list: "To do", statusClass: "todo", pri: "High", priClass: "high", due: "24 Aug", start: "14 Aug", assignee: "JL", est: "16h", act: "3h", pct: 18, desc: "Hero, proof, and form for the Q3 campaign.", tags: ["Q3", "Web"], project: "q3" },
    social: { title: "Social calendar", list: "In review", statusClass: "review", pri: "Medium", priClass: "med", due: "23 Aug", start: "8 Aug", assignee: "MR", est: "8h", act: "6h", pct: 75, desc: "August–September posts queued. Waiting on brand to sign off the last three.", tags: ["Q3", "Social"], project: "q3" },
    brand: { title: "Brand kit export", list: "Done", statusClass: "done", pri: "Low", priClass: "low", due: "7 Aug", start: "28 Jul", assignee: "JL", est: "4h", act: "4h", pct: 100, desc: "Logos and lockups delivered to marketing.", tags: ["Q3", "Brand"], project: "q3" }
  });
  const PROJECT_MASTER = {
    website: { name: "Website relaunch", desc: "New marketing site, pricing, and checkout.", colorName: "teal", hex: "#00D1D1", dot: "var(--accent)", dim: "var(--accent-dim)", fg: "var(--accent-fg)", owner: "JL", range: "12 Jun – 12 Sep", startIso: "2026-06-12", endIso: "2026-09-12", status: "prog", statusLabel: "In progress", pinned: true },
    mobile: { name: "Mobile app v2", desc: "iOS/Android rewrite. Blocked on infra rate limits.", colorName: "purple", hex: "#A855F7", dot: "var(--purple)", dim: "var(--purple-dim)", fg: "var(--purple-fg)", owner: "SK", range: "1 May – 30 Oct", startIso: "2026-05-01", endIso: "2026-10-30", status: "prog", statusLabel: "In progress" },
    q3: { name: "Q3 marketing", desc: "Launch campaign and copy review. Waiting on legal.", colorName: "amber", hex: "#F59E0B", dot: "var(--amber)", dim: "var(--amber-dim)", fg: "var(--amber-fg)", owner: "MR", range: "15 Jul – 30 Sep", startIso: "2026-07-15", endIso: "2026-09-30", status: "hold", statusLabel: "On hold" }
  };
  const SAMPLE_PROJECT_IDS = ["website", "mobile", "q3"];
  const projects = {};
  Object.keys(tasks).forEach((id) => { tasks[id].sample = true; });
  const SAMPLE_TASK_DEFS = JSON.parse(JSON.stringify(tasks));
  const SAMPLE_TASK_IDS = Object.keys(SAMPLE_TASK_DEFS);
  function cloneMasterProject(id) {
    const def = PROJECT_MASTER[id];
    if (!def) return null;
    const copy = JSON.parse(JSON.stringify(def));
    copy.sample = true;
    return copy;
  }
  function ensureAllSampleProjects() {
    SAMPLE_PROJECT_IDS.forEach((id) => {
      const copy = cloneMasterProject(id);
      if (copy) projects[id] = copy;
    });
  }
  function fillProjectMasterFromTasks() {
    Object.keys(tasks).forEach((tid) => {
      const pid = tasks[tid] && tasks[tid].project;
      if (!pid || projects[pid]) return;
      const copy = cloneMasterProject(pid);
      if (copy) projects[pid] = copy;
    });
  }
  function liveProjectIds() {
    fillProjectMasterFromTasks();
    const ids = [];
    const seen = Object.create(null);
    const add = (id) => {
      if (!id || seen[id] || !projects[id]) return;
      seen[id] = true;
      ids.push(id);
    };
    SAMPLE_PROJECT_IDS.forEach(add);
    Object.keys(projects).forEach(add);
    return ids;
  }
  function ensureAllSampleTasks(force) {
    SAMPLE_TASK_IDS.forEach((id) => {
      if (!force && tasks[id]) return;
      tasks[id] = JSON.parse(JSON.stringify(SAMPLE_TASK_DEFS[id]));
      tasks[id].sample = true;
    });
  }
  ensureAllSampleProjects();
  let currentProject = "website";
  function rebuildTaskIndex() {
    Object.keys(taskIdsByProject).forEach((k) => { delete taskIdsByProject[k]; });
    Object.keys(tasks).forEach((id) => {
      const pid = (tasks[id] && tasks[id].project) || "";
      (taskIdsByProject[pid] || (taskIdsByProject[pid] = [])).push(id);
    });
  }
  function indexTask(id) {
    const t = tasks[id];
    if (!t) return;
    const pid = t.project || "";
    const list = taskIdsByProject[pid] || (taskIdsByProject[pid] = []);
    if (list.indexOf(id) === -1) list.push(id);
  }
  function unindexTask(id, pid) {
    const p = pid || (tasks[id] && tasks[id].project) || "";
    const list = taskIdsByProject[p];
    if (!list) return;
    const i = list.indexOf(id);
    if (i !== -1) list.splice(i, 1);
  }
  function projectTaskIds(pid) {
    return taskIdsByProject[pid] || EMPTY_IDS;
  }
  function eachProjectTask(projectId, fn) {
    const ids = projectTaskIds(projectId);
    for (let i = 0; i < ids.length; i++) {
      const t = tasks[ids[i]];
      if (t) fn(ids[i], t);
    }
  }
  function scopedRoot(root) {
    return root && root.querySelectorAll ? root : document;
  }
  rebuildTaskIndex();
  const photos = {};
  const roster = {
    JL: { name: "Jordan Lee", role: "Design lead", bg: "var(--accent-dim)", fg: "var(--accent-fg)", active: true },
    SK: { name: "Sam Kim", role: "Engineering", bg: "var(--purple-dim)", fg: "var(--purple-fg)", active: true },
    MR: { name: "Mira Rao", role: "Marketing", bg: "var(--amber-dim)", fg: "var(--amber-fg)", active: true },
    AC: { name: "Admin", role: "FLOWVANTI Admin", bg: "var(--success-bg)", fg: "var(--success-text)", account: true, active: true }
  };
  function normWho(id) { return !id || id === "A" ? "AC" : id; }
  function tagAvatars(root) {
    scopedRoot(root).querySelectorAll(".av, .avatar").forEach((el) => {
      if (el.classList.contains("team-more")) return;
      if (el.dataset.who) { el.dataset.who = normWho(el.dataset.who); return; }
      const t = el.textContent.trim();
      if (roster[t] || t === "A") el.dataset.who = normWho(t);
    });
  }
  function applyPhotos(root) {
    const scope = scopedRoot(root);
    tagAvatars(scope);
    scope.querySelectorAll(".av, .avatar").forEach((el) => {
      const id = el.dataset.who;
      if (!id || !roster[id]) return;
      const rec = roster[id];
      if (photos[id]) {
        el.classList.add("has-photo");
        el.style.removeProperty("background");
        el.style.backgroundImage = "url(" + photos[id] + ")";
        el.style.backgroundColor = "transparent";
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.style.backgroundRepeat = "no-repeat";
      } else {
        el.classList.remove("has-photo");
        el.style.backgroundImage = "";
        el.style.backgroundSize = "";
        el.style.backgroundPosition = "";
        el.style.backgroundRepeat = "";
        el.style.background = rec.bg;
        el.style.color = rec.fg;
      }
    });
  }
  function avatarHTML(who, size) {
    who = normWho(who);
    const rec = roster[who] || { bg: "var(--surface-raised)", fg: "var(--text)" };
    if (photos[who]) {
      return '<span class="av ' + (size || "sm") + ' has-photo" data-who="' + who + '" style="background-image:url(' + photos[who] + ');background-size:cover;background-position:center;background-repeat:no-repeat"></span>';
    }
    return '<span class="av ' + (size || "sm") + '" data-who="' + who + '" style="background:' + rec.bg + ';color:' + rec.fg + '">' + (who === "AC" ? ADMIN.initials : who) + "</span>";
  }
  const SAMPLE_TEAM_IDS = ["JL", "SK", "MR"];
  const SAMPLE_TEAM = JSON.parse(JSON.stringify({ JL: roster.JL, SK: roster.SK, MR: roster.MR }));
  function visibleTeamIds() {
    return teamMemberIds();
  }
  function renderTeamRail() {
    const row = document.getElementById("teamRow");
    if (!row) return;
    const ids = visibleTeamIds();
    row.innerHTML = ids.length
      ? ids.map((id) => {
          const rec = roster[id];
          const on = isPersonActive(id);
          return '<span class="team-chip' + (on ? "" : " inactive") + '" data-tip="' + rec.name + " · " + rec.role + (on ? "" : " · inactive") + '">' + avatarHTML(id, "sm") + '<span class="team-name">' + rec.name + "</span></span>";
        }).join("")
      : '<span class="page-sub" style="margin:0">No team members · use Manage team</span>';
    applyPhotos(row);
    enrichTips(row);
  }
  function clearTaskPane() {
    if (!taskPane) return;
    taskPane.dataset.currentTask = "";
    const title = document.getElementById("dTitle");
    if (title) title.textContent = "No tasks yet";
    const desc = document.getElementById("dDesc");
    if (desc) desc.textContent = Object.keys(projects).length ? "Add a task to this project." : "Load sample data or create a project.";
    const listEl = document.getElementById("dList");
    if (listEl) fillStatusSelect(listEl, firstStatusLabel());
    const priEl = document.getElementById("dPri");
    if (priEl) fillPrioritySelect(priEl, firstPriorityLabel());
    const who = document.getElementById("dAssignee");
    if (who) who.textContent = "—";
    const start = document.getElementById("dStart");
    if (start) start.textContent = "—";
    const due = document.getElementById("dDue");
    if (due) { due.textContent = "—"; due.classList.remove("late"); due.style.color = ""; }
    const est = document.getElementById("dEst");
    if (est) est.textContent = "0h";
    const act = document.getElementById("dAct");
    if (act) act.textContent = "0h";
    const pct = document.getElementById("dTimePct");
    if (pct) pct.textContent = "0%";
    const bar = document.getElementById("dTimeBar");
    if (bar) bar.style.width = "0%";
    const tags = document.getElementById("dTags");
    if (tags) tags.innerHTML = "";
    const subList = document.getElementById("subtaskList");
    if (subList) subList.innerHTML = "";
    const subCount = document.getElementById("subCount");
    if (subCount) subCount.textContent = "0/0 completed";
    const subBar = document.getElementById("subBar");
    if (subBar) subBar.style.width = "0%";
    ["commentPanel", "attachList", "historyPanel"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    const edit = document.getElementById("editTaskBtn");
    if (edit) edit.disabled = true;
    const cTab = document.querySelector('#detailTabs [data-tab="comments"]');
    if (cTab) cTab.textContent = "Comments (0)";
    const aTab = document.querySelector('#detailTabs [data-tab="attachments"]');
    if (aTab) aTab.textContent = "Attachments (0)";
    const whoSel = document.getElementById("subtaskAssignee");
    if (whoSel) fillPeopleSelect(whoSel, "");
    syncWorkspaceActions();
  }

  function showView(name, opts) {
    closeCalendarPop();
    closeChartZoom();
    const force = !!(opts && opts.force);
    const prev = activeView;
    const same = name === prev && !force;
    activeView = name;
    calendarAllProjects = !!(opts && opts.calendarAll) || (name === "calendar" && (prev === "dashboard" || prev === "reports"));
    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
    document.querySelectorAll("#sideNav a").forEach((a) => a.classList.toggle("active", a.dataset.view === name));
    document.querySelectorAll("#viewToggle button").forEach((b) => b.classList.toggle("on", b.dataset.view === name));
    const inWorkspace = workspaceViews.has(name);
    projChrome.hidden = !inWorkspace;
    taskPane.hidden = !inWorkspace;
    const rail = document.querySelector(".rail");
    if (rail) rail.hidden = (name === "settings");
    if (rail && !rail.hidden) renderTeamRail();
    if (same) {
      if (name === "gantt") paintGantt();
      else if (name === "calendar") paintCalendar(calendarAllProjects);
      else if (name === "dashboard" || name === "reports") queueStats(true);
      else if (name === "settings") {
        holidayYear = TODAY_Y;
        prefs.holidayYear = TODAY_Y;
        collapseSettingsPanels();
        paintHolidayCalendar();
      }
      return;
    }
    if (inWorkspace && projects[currentProject]) paintChrome(projects[currentProject]);
    if (inWorkspace) {
      const entering = !workspaceViews.has(prev);
      if (entering || force) filterWorkspace(name);
      else if (name === "gantt") paintGantt();
      else if (name === "calendar") paintCalendar(calendarAllProjects);
      const openId = taskPane.dataset.currentTask;
      if (openId && tasks[openId] && tasks[openId].project === currentProject) {
        /* already showing the right task — skip a full pane rebuild */
      } else {
        const first = projectTaskIds(currentProject)[0];
        if (first) openTask(first, false);
        else clearTaskPane();
      }
    }
    queueStats(name === "dashboard" || name === "reports");
    if (name === "settings") {
      holidayYear = TODAY_Y;
      prefs.holidayYear = TODAY_Y;
      collapseSettingsPanels();
      paintHolidayCalendar();
    }
  }

  function openTask(id, jumpToBoard) {
    const t = tasks[id];
    if (!t) { clearTaskPane(); return; }
    if (t.project && t.project !== currentProject && projects[t.project]) {
      currentProject = t.project;
      paintChrome(projects[t.project]);
      document.querySelectorAll("#projList .proj-item").forEach((el) => el.classList.toggle("on", el.dataset.project === t.project));
      ensureProjectTasksMounted(currentProject);
      filterWorkspace(activeView);
      queueStats(false);
    }
    const current = document.querySelector(".view:not([hidden])")?.dataset.view;
    if (jumpToBoard && !workspaceViews.has(current)) showView("board");
    else if (workspaceViews.has(current) || jumpToBoard) {
      projChrome.hidden = false;
      taskPane.hidden = false;
    }
    taskPane.dataset.currentTask = id;
    document.getElementById("dTitle").textContent = t.title;
    fillStatusSelect(document.getElementById("dList"), t.list);
    fillPrioritySelect(document.getElementById("dPri"), t.pri);
    document.getElementById("dDesc").textContent = t.desc;
    document.getElementById("dAssignee").innerHTML = isTeamMember(t.assignee)
      ? avatarHTML(t.assignee, "sm") + " " + roster[t.assignee].name
      : "—";
    document.getElementById("dStart").textContent = fmtIso(t.start);
    const due = document.getElementById("dDue");
    due.textContent = formatDue(t.due);
    due.classList.toggle("late", isOverdue(t));
    due.style.color = "";
    document.getElementById("dEst").textContent = t.est;
    document.getElementById("dAct").textContent = t.act;
    document.getElementById("dTimePct").textContent = t.pct + "%";
    document.getElementById("dTimeBar").style.width = t.pct + "%";
    document.getElementById("dTags").innerHTML = t.tags.map((tag) => '<span class="tag outline">' + tag + "</span>").join("");
    renderTaskExtras(id);
    primeSubtaskForm(id);
    document.querySelectorAll(".kcard").forEach((c) => c.classList.toggle("selected", c.dataset.task === id));
    document.querySelectorAll("table.list tbody tr").forEach((r) => r.classList.toggle("selected", r.dataset.task === id));
    const edit = document.getElementById("editTaskBtn");
    if (edit) edit.disabled = false;
    enrichTips(taskPane);
    applyPhotos(taskPane);
    syncWorkspaceActions();
  }

  document.querySelectorAll("#sideNav a").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); showView(a.dataset.view); });
  });
  document.querySelectorAll("#viewToggle button").forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.view));
  });
  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (handleProjectStarClick(e, el.dataset.project)) return;
      e.preventDefault();
      if (el.dataset.project) {
        const current = document.querySelector(".view:not([hidden])")?.dataset.view;
        const keep = workspaceViews.has(current) ? current : (el.dataset.open || "board");
        selectProject(el.dataset.project, keep);
      } else showView(el.dataset.open, { calendarAll: el.dataset.calAll === "1" });
    });
  });
  const topSettings = document.getElementById("topSettings");
  if (topSettings) topSettings.addEventListener("click", () => showView("settings"));
  let justDragged = false;
  function bindTask(el) {
    el.addEventListener("click", (e) => {
      if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault();
      e.stopPropagation();
      closePops();
      hideTip();
      closeCalendarPop();
      const jump = !workspaceViews.has(document.querySelector(".view:not([hidden])")?.dataset.view);
      openTask(el.dataset.task, jump);
    });
  }
  document.querySelectorAll(".kcard[data-task], table.list tr[data-task], .gantt-row[data-task], .chip[data-task], .deadline[data-task], .kpi[data-task], #notifPop [data-task]").forEach(bindTask);

  const STATUS_PALETTE = [
    { cls: "todo", token: "text-2", stroke: "#8B9BB4", color: "#8B9BB4" },
    { cls: "prog", token: "purple", stroke: "#A855F7", color: "#A855F7" },
    { cls: "review", token: "amber", stroke: "#F59E0B", color: "#F59E0B" },
    { cls: "blocked", token: "danger", stroke: "#EF4444", color: "#EF4444" },
    { cls: "done", token: "accent", stroke: "#00D1D1", color: "#00D1D1" },
    { cls: "hold", token: "hold", stroke: "#8B5CF6", color: "#8B5CF6" },
    { cls: "med", token: "amber", stroke: "#F59E0B", color: "#F59E0B" },
    { cls: "urgent", token: "danger", stroke: "#EF4444", color: "#EF4444" },
    { cls: "high", token: "danger", stroke: "#F97316", color: "#F97316" },
    { cls: "low", token: "accent", stroke: "#00D1D1", color: "#00D1D1" },
    { cls: "closed", token: "text-2", stroke: "#64748B", color: "#64748B" }
  ];
  function paletteFor(cls, index) {
    return STATUS_PALETTE.find((p) => p.cls === cls) || STATUS_PALETTE[index % STATUS_PALETTE.length];
  }
  function normCatalogHex(v, fallback) {
    const h = String(v || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return "#" + h.slice(1).toUpperCase();
    if (/^[0-9a-fA-F]{6}$/.test(h)) return "#" + h.toUpperCase();
    const fb = String(fallback || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(fb)) return fb.toUpperCase();
    return "#8B9BB4";
  }
  function catalogCssCls(cls) {
    const c = String(cls || "todo").replace(/[^a-zA-Z0-9_-]/g, "");
    return c || "todo";
  }
  function appearanceIsDark() {
    if (prefs && typeof prefs.dark === "boolean") return !!prefs.dark;
    return !(document.body.classList.contains("theme-light") || document.documentElement.classList.contains("theme-light"));
  }
  function catalogWash(hex) {
    const dark = appearanceIsDark();
    const seed = normCatalogHex(hex, "#8B9BB4");
    const rgb = hexToRgb(seed);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const sat = clamp01(hsl.s * (dark ? 0.88 : 0.72), 0.16, dark ? 0.5 : 0.4);
    let l = dark ? 0.22 : 0.91;
    let bg = hslHex(hsl.h, sat, l);
    let fg = dark
      ? hslHex(hsl.h, clamp01(sat * 0.5, 0.06, 0.32), 0.93)
      : hslHex(hsl.h, clamp01(sat + 0.3, 0.38, 0.74), 0.28);
    let n = 0;
    while (contrastOf(bg, fg) < 5 && n < 12) {
      l = dark ? Math.max(0.1, l - 0.035) : Math.min(0.97, l + 0.025);
      bg = hslHex(hsl.h, sat, l);
      if (contrastOf(bg, fg) < 5) fg = onHexFor(bg);
      n += 1;
    }
    return { bg: bg, fg: fg, stroke: seed };
  }
  function catalogTagHtml(cls, label, cat) {
    return '<span class="tag ' + catalogCssCls(cls) + '" data-cat="' + cat + '">' + escText(label) + "</span>";
  }
  function setCatalogTag(el, cls, cat) {
    if (!el) return;
    el.className = "tag " + catalogCssCls(cls);
    el.dataset.cat = cat;
  }
  function recColor(s) {
    return normCatalogHex(s && s.color, paletteFor(s && s.cls, 0).color);
  }
  function catalogColorRule(selector, hex) {
    const pair = catalogWash(hex);
    return selector + "{--tag-bg:" + pair.bg + ";--tag-fg:" + pair.fg + ";background-color:" + pair.bg + ";color:" + pair.fg + ";-webkit-text-fill-color:" + pair.fg + "}";
  }
  function applyCatalogColors() {
    const bits = [];
    taskStatuses.forEach((s) => {
      const c = catalogCssCls(s.cls);
      const hex = recColor(s);
      bits.push(catalogColorRule('.tag[data-cat="status"].' + c + ',.tag-select[data-cat="status"].' + c + ",#statusCatalog .tag." + c, hex));
    });
    taskPriorities.forEach((s) => {
      const c = catalogCssCls(s.cls);
      const hex = recColor(s);
      bits.push(catalogColorRule('.tag[data-cat="pri"].' + c + ',.tag-select[data-cat="pri"].' + c, hex));
    });
    projectStatuses.forEach((s) => {
      const c = catalogCssCls(s.cls);
      const hex = recColor(s);
      bits.push(catalogColorRule('.tag[data-cat="proj"].' + c + ',.tag-select[data-cat="proj"].' + c + ",#projStatusCatalog .tag." + c, hex));
    });
    let el = document.getElementById("catalogColorStyle");
    if (!el) {
      el = document.createElement("style");
      el.id = "catalogColorStyle";
      document.head.appendChild(el);
    }
    el.textContent = bits.join("");
  }
  function slugIn(store, label) {
    const base = String(label || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
    let id = base, n = 2;
    const used = new Set((store || []).map((s) => s.id));
    while (used.has(id)) { id = base + "-" + n; n += 1; }
    return id;
  }
  function defaultTaskStatuses() {
    return [
      { id: "todo", label: "To do", cls: "todo", token: "text-2", color: "#8B9BB4", active: true, done: false, blocked: false },
      { id: "prog", label: "In progress", cls: "prog", token: "purple", color: "#A855F7", active: true, done: false, blocked: false },
      { id: "review", label: "In review", cls: "review", token: "amber", color: "#F59E0B", active: true, done: false, blocked: false },
      { id: "blocked", label: "Blocked", cls: "blocked", token: "danger", color: "#EF4444", active: true, done: false, blocked: true },
      { id: "done", label: "Done", cls: "done", token: "accent", color: "#00D1D1", active: true, done: true, blocked: false }
    ];
  }
  function defaultPriorities() {
    return [
      { id: "urgent", label: "Urgent", cls: "urgent", token: "danger", color: "#EF4444", active: true },
      { id: "high", label: "High", cls: "high", token: "danger", color: "#F97316", active: true },
      { id: "med", label: "Medium", cls: "med", token: "amber", color: "#F59E0B", active: true },
      { id: "low", label: "Low", cls: "low", token: "accent", color: "#00D1D1", active: true }
    ];
  }
  function defaultProjectStatuses() {
    return [
      { id: "todo", label: "To do", cls: "todo", token: "text-2", color: "#8B9BB4", active: true, closed: false },
      { id: "prog", label: "In progress", cls: "prog", token: "purple", color: "#A855F7", active: true, closed: false },
      { id: "hold", label: "On hold", cls: "hold", token: "hold", color: "#8B5CF6", active: true, closed: false },
      { id: "closed", label: "Closed", cls: "closed", token: "text-2", color: "#64748B", active: true, closed: true }
    ];
  }
  let taskStatuses = defaultTaskStatuses();
  let taskPriorities = defaultPriorities();
  let projectStatuses = defaultProjectStatuses();
  let holidays = [];
  let holidayYear = TODAY_Y;
  function slugStatus(label) { return slugIn(taskStatuses, label); }
  function slugPri(label) { return slugIn(taskPriorities, label); }
  function slugProjStatus(label) { return slugIn(projectStatuses, label); }
  function normalizeTaskStatuses(list) {
    if (!Array.isArray(list) || !list.length) return defaultTaskStatuses();
    const out = [];
    const seen = new Set();
    list.forEach((s) => {
      const label = String((s && s.label) || "").trim();
      if (!label) return;
      const id = String((s && s.id) || slugIn(out, label));
      if (seen.has(id)) return;
      seen.add(id);
      const pal = paletteFor(s && s.cls, out.length);
      out.push({
        id: id,
        label: label,
        cls: pal.cls,
        token: pal.token,
        color: recColor({ cls: pal.cls, color: s && s.color }),
        active: s.active !== false,
        done: !!(s && s.done),
        blocked: !!(s && s.blocked) || /^blocked$/i.test(label)
      });
    });
    return out.length ? out : defaultTaskStatuses();
  }
  function normalizePriorities(list) {
    if (!Array.isArray(list) || !list.length) return defaultPriorities();
    const out = [];
    const seen = new Set();
    list.forEach((s) => {
      const label = String((s && s.label) || "").trim();
      if (!label) return;
      const id = String((s && s.id) || slugIn(out, label));
      if (seen.has(id)) return;
      seen.add(id);
      const pal = paletteFor(s && s.cls, out.length);
      out.push({ id: id, label: label, cls: pal.cls, token: pal.token, color: recColor({ cls: pal.cls, color: s && s.color }), active: s.active !== false });
    });
    return out.length ? out : defaultPriorities();
  }
  function normalizeProjectStatuses(list) {
    if (!Array.isArray(list) || !list.length) return defaultProjectStatuses();
    const out = [];
    const seen = new Set();
    list.forEach((s) => {
      const label = String((s && s.label) || "").trim();
      if (!label) return;
      const id = String((s && s.id) || slugIn(out, label));
      if (seen.has(id)) return;
      seen.add(id);
      const pal = paletteFor(s && s.cls, out.length);
      out.push({
        id: id,
        label: label,
        cls: pal.cls,
        token: pal.token,
        color: recColor({ cls: pal.cls, color: s && s.color }),
        active: s.active !== false,
        closed: !!(s && s.closed) || /^closed$/i.test(label)
      });
    });
    return out.length ? out : defaultProjectStatuses();
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function ymdIso(y, m, d) { return y + "-" + pad2(m) + "-" + pad2(d); }
  const DATE_MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function formatWallClock(d) {
    d = d || new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const date = pad2(d.getDate()) + "-" + DATE_MONS[d.getMonth()] + "-" + d.getFullYear();
    const time = h + ":" + pad2(d.getMinutes()) + " " + ampm;
    return { date: date, time: time, tip: WEEKDAYS[d.getDay()] + " · " + date + " · " + time };
  }
  function paintTopClock() {
    refreshToday();
    const timeEl = document.getElementById("topClockTime");
    const dateEl = document.getElementById("topClockDate");
    const btn = document.getElementById("topClock");
    if (!timeEl && !dateEl && !btn) return;
    const now = formatWallClock();
    if (timeEl) timeEl.textContent = now.time;
    if (dateEl) dateEl.textContent = now.date;
    if (btn) btn.dataset.tip = now.tip;
  }
  paintTopClock();
  setInterval(paintTopClock, 1000);
  function monIndex(s) {
    const k = String(s || "").slice(0, 3).toLowerCase();
    return DATE_MONS.findIndex((m) => m.toLowerCase() === k);
  }
  function makeParsedDate(y, mo, d) {
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return { y: y, mo: mo, d: d, iso: ymdIso(y, mo, d), dow: dt.getUTCDay() };
  }
  function parseIsoDate(value) {
    let raw = String(value || "").trim();
    if (!raw || raw === "—") return null;
    raw = raw.replace(/\s*·\s*\d+d late.*$/i, "").trim();
    let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})\b/);
    if (m) return makeParsedDate(+m[1], +m[2], +m[3]);
    m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})\b/);
    if (m) {
      const mo = monIndex(m[2]) + 1;
      if (mo) {
        let y = +m[3];
        if (String(m[3]).length === 2) y += y >= 50 ? 1900 : 2000;
        return makeParsedDate(y, mo, +m[1]);
      }
    }
    m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?/);
    if (m) {
      const mo = monIndex(m[2]) + 1;
      if (mo) return makeParsedDate(m[3] ? +m[3] : TODAY_Y, mo, +m[1]);
    }
    return null;
  }
  function dateIso(value) {
    const p = parseIsoDate(value);
    return p ? p.iso : "";
  }
  function dateFieldText(value) {
    const p = parseIsoDate(value);
    return p ? pad2(p.d) + "-" + DATE_MONS[p.mo - 1] + "-" + p.y : "";
  }
  function fillDateField(el, value) {
    if (el) el.value = dateFieldText(value);
  }
  const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function weekendDows() {
    return prefs.weekStart === "Sun" ? [5, 6] : [6, 0];
  }
  function isWeekendDow(dow) {
    return weekendDows().indexOf(dow) >= 0;
  }
  function weekendNames() {
    return prefs.weekStart === "Sun" ? "Friday & Saturday" : "Saturday & Sunday";
  }
  function weekStartName() {
    return prefs.weekStart === "Sun" ? "Sunday" : "Monday";
  }
  function weekDowLabels() {
    return prefs.weekStart === "Sun"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }
  function weekColOf(utcDow) {
    return prefs.weekStart === "Sun" ? utcDow : (utcDow + 6) % 7;
  }
  function attachMaxMb() {
    const n = parseInt(prefs.attachMaxMb, 10);
    return n >= 1 && n <= 500 ? n : 10;
  }
  function attachMaxBytes() {
    return attachMaxMb() * 1048576;
  }
  function hoursPerDay() {
    const n = parseFloat(prefs.hoursPerDay);
    return n >= 1 && n <= 24 ? n : 8;
  }
  function roundHours(n) {
    return Math.round(Number(n) * 100) / 100;
  }
  function holidayOn(iso) {
    return holidays.find((h) => h.date === iso) || null;
  }
  function isNonWorking(iso) {
    const p = parseIsoDate(iso);
    if (!p) return false;
    return isWeekendDow(p.dow) || !!holidayOn(iso);
  }
  function nonWorkingReason(iso) {
    const h = holidayOn(iso);
    if (h) return "holiday (“" + h.name + "”)";
    const p = parseIsoDate(iso);
    if (p && isWeekendDow(p.dow)) return "weekend (" + DOW_FULL[p.dow] + ")";
    return "";
  }
  function addCalendarDays(iso, n) {
    const p = parseIsoDate(iso);
    if (!p) return "";
    const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d + n));
    return ymdIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function nextWorkingOnOrAfter(iso) {
    let cur = parseIsoDate(iso);
    if (!cur) return "";
    for (let i = 0; i < 400; i++) {
      if (!isNonWorking(cur.iso)) return cur.iso;
      cur = parseIsoDate(addCalendarDays(cur.iso, 1));
      if (!cur) break;
    }
    return iso;
  }
  function prevWorkingOnOrBefore(iso) {
    let cur = parseIsoDate(iso);
    if (!cur) return "";
    for (let i = 0; i < 400; i++) {
      if (!isNonWorking(cur.iso)) return cur.iso;
      cur = parseIsoDate(addCalendarDays(cur.iso, -1));
      if (!cur) break;
    }
    return iso;
  }
  function addWorkingDays(iso, extra) {
    let cur = nextWorkingOnOrAfter(iso);
    if (!cur) return "";
    const n = Math.max(0, Math.round(Number(extra) || 0));
    for (let i = 0; i < n; i++) {
      const nxt = parseIsoDate(addCalendarDays(cur, 1));
      if (!nxt) return cur;
      cur = nextWorkingOnOrAfter(nxt.iso);
    }
    return cur;
  }
  function subWorkingDays(iso, extra) {
    let cur = prevWorkingOnOrBefore(iso);
    if (!cur) return "";
    const n = Math.max(0, Math.round(Number(extra) || 0));
    for (let i = 0; i < n; i++) {
      const prev = parseIsoDate(addCalendarDays(cur, -1));
      if (!prev) return cur;
      cur = prevWorkingOnOrBefore(prev.iso);
    }
    return cur;
  }
  function workingDaysInclusive(startIso, endIso) {
    const a = parseIsoDate(startIso);
    const b = parseIsoDate(endIso);
    if (!a || !b || b.iso < a.iso) return 0;
    let n = 0;
    let cur = a.iso;
    for (let i = 0; i < 800 && cur <= b.iso; i++) {
      if (!isNonWorking(cur)) n++;
      cur = addCalendarDays(cur, 1);
    }
    return n;
  }
  function estSpanDays(hours) {
    const hpd = hoursPerDay();
    const days = hours / hpd;
    return Math.max(1, Math.ceil(days - 1e-9));
  }
  function projectDateRange() {
    const p = projects[currentProject];
    if (!p) return null;
    const start = p.startIso || toIso(p.range);
    const end = p.endIso || "";
    if (!parseIsoDate(start) || !parseIsoDate(end)) return null;
    return { start: start, end: end };
  }
  function holidayDateLabel(iso) {
    const p = parseIsoDate(iso);
    if (!p) return iso || "—";
    return fmtIso(p.iso);
  }
  function holidayDayLabel(iso) {
    const p = parseIsoDate(iso);
    if (!p) return "—";
    return DOW_FULL[p.dow] + (isWeekendDow(p.dow) ? " · weekend" : "");
  }
  function normalizeHolidays(list) {
    const out = [];
    const seen = new Set();
    (Array.isArray(list) ? list : []).forEach((h) => {
      const parsed = parseIsoDate(h && h.date);
      const name = String((h && h.name) || "").replace(/[<>]/g, "").trim();
      if (!parsed || !name) return;
      const id = String((h && h.id) || ("h-" + parsed.iso)).replace(/[^\w-]/g, "") || ("h-" + parsed.iso);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ id: id, date: parsed.iso, name: name });
    });
    out.sort((a, b) => a.date > b.date ? -1 : a.date < b.date ? 1 : a.name.localeCompare(b.name));
    return out;
  }
  function holidayYears() {
    const years = {};
    years[TODAY_Y] = 1;
    holidays.forEach((h) => {
      const y = parseInt(String(h.date).slice(0, 4), 10);
      if (y >= 1970 && y <= 2100) years[y] = 1;
    });
    return Object.keys(years).map(Number).sort((a, b) => b - a);
  }
  function holidaysInYear(year) {
    const prefix = String(year) + "-";
    return holidays.filter((h) => h.date.indexOf(prefix) === 0)
      .sort((a, b) => a.date > b.date ? -1 : a.date < b.date ? 1 : a.name.localeCompare(b.name));
  }
  function slugHoliday(date, name) {
    const base = ("h-" + date + "-" + String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/-+$/g, "").slice(0, 48);
    let id = base || ("h-" + date);
    let n = 2;
    while (holidays.some((h) => h.id === id)) { id = base + "-" + n; n++; }
    return id;
  }
  function paintHolidayCalendar() {
    const sel = document.getElementById("holidayYearSelect");
    const years = holidayYears();
    if (years.indexOf(holidayYear) < 0) holidayYear = TODAY_Y;
    prefs.holidayYear = holidayYear;
    if (sel) {
      sel.innerHTML = years.map((y) => '<option value="' + y + '"' + (y === holidayYear ? " selected" : "") + ">" + y + "</option>").join("");
    }
    const rows = holidaysInYear(holidayYear);
    const host = document.getElementById("holidayTableHost");
    if (host) {
      const body = rows.length
        ? rows.map((h) => {
            const parsed = parseIsoDate(h.date);
            const weekend = parsed && isWeekendDow(parsed.dow);
            return '<tr class="' + (weekend ? "is-weekend" : "") + '" data-holiday-id="' + escAttr(h.id) + '"><td>' + escText(holidayDateLabel(h.date)) + "</td><td>" + escText(holidayDayLabel(h.date)) + "</td><td>" + escText(h.name) + '</td><td><button class="btn btn-ghost btn-sm" type="button" data-del-holiday="' + escAttr(h.id) + '" data-tip="Remove this holiday">Remove</button></td></tr>';
          }).join("")
        : '<tr><td class="holiday-empty" colspan="4">No holidays in ' + holidayYear + "</td></tr>";
      host.innerHTML = '<table class="holiday-table"><thead><tr><th>Date</th><th>Day</th><th>Holiday name</th><th></th></tr></thead><tbody>' + body + "</tbody></table>";
    }
    const count = document.getElementById("holidayCount");
    if (count) count.textContent = rows.length + " holiday" + (rows.length === 1 ? "" : "s");
    const panelDesc = document.getElementById("holidayPanelDesc");
    if (panelDesc) panelDesc.textContent = "Current year is added automatically · weekends " + weekendNames();
    const note = document.getElementById("holidayWeekendNote");
    if (note) note.textContent = "Week starts " + weekStartName() + " · weekends " + weekendNames() + " · dates you pick can stay on that day · estimate-filled dues skip weekends and holidays";
    const dateEl = document.getElementById("holidayDate");
    if (dateEl && document.activeElement !== dateEl && !dateEl.value) fillDateField(dateEl, todayIso());
    paintHolidayDayPreview();
  }
  function paintHolidayDayPreview() {
    const dateEl = document.getElementById("holidayDate");
    const preview = document.getElementById("holidayDayPreview");
    if (!preview) return;
    const parsed = parseIsoDate(dateEl && dateEl.value);
    preview.textContent = parsed ? holidayDayLabel(parsed.iso) : "Pick a date";
  }
  function applyHolidaysOpen() {
    const on = !!prefs.holidaysOpen;
    const panel = document.getElementById("holidayPanel");
    const btn = document.getElementById("holidayToggle");
    if (panel) panel.classList.toggle("is-collapsed", !on);
    if (btn) btn.setAttribute("aria-expanded", String(on));
  }
  function listStatusOf(label) {
    const hit = taskStatuses.find((s) => s.label === label);
    if (hit) return hit;
    return { id: "custom", label: label || firstStatusLabel(), cls: "todo", token: "text-2", active: true, done: false, blocked: false };
  }
  function priorityOf(label) {
    const hit = taskPriorities.find((s) => s.label === label);
    if (hit) return hit;
    return { id: "custom", label: label || firstPriorityLabel(), cls: "med", token: "amber", active: true };
  }
  function projectStatusOf(idOrLabel) {
    const hit = projectStatuses.find((s) => s.id === idOrLabel || s.label === idOrLabel);
    if (hit) return hit;
    return projectStatuses[0] || { id: "todo", label: "To do", cls: "todo", token: "text-2", active: true, closed: false };
  }
  function firstStatusLabel() {
    const on = taskStatuses.find((s) => s.active) || taskStatuses[0];
    return (on && on.label) || "To do";
  }
  function firstPriorityLabel() {
    const on = taskPriorities.find((s) => s.active) || taskPriorities[0];
    return (on && on.label) || "Medium";
  }
  function firstProjectStatusId() {
    const open = projectStatuses.find((s) => s.active && !s.closed);
    const on = open || projectStatuses.find((s) => s.active) || projectStatuses[0];
    return (on && on.id) || "todo";
  }
  function isDoneStatus(label) {
    return !!listStatusOf(label).done;
  }
  function isBlockedStatus(label) {
    return !!listStatusOf(label).blocked;
  }
  function statusHasTasks(label) {
    return Object.keys(tasks).some((id) => tasks[id] && tasks[id].list === label);
  }
  function priorityHasTasks(label) {
    return Object.keys(tasks).some((id) => tasks[id] && tasks[id].pri === label);
  }
  function projectStatusHasProjects(id) {
    return Object.keys(projects).some((pid) => projects[pid] && projects[pid].status === id);
  }
  function ensureBlockedStatus() {
    const hit = taskStatuses.find((s) => s.blocked || /^blocked$/i.test(s.label));
    if (hit) { hit.blocked = true; if (!hit.cls) hit.cls = "blocked"; return hit; }
    const def = defaultTaskStatuses().find((s) => s.blocked);
    const rec = Object.assign({}, def, { id: slugStatus(def.label) });
    const doneIdx = taskStatuses.findIndex((s) => s.done);
    if (doneIdx >= 0) taskStatuses.splice(doneIdx, 0, rec);
    else taskStatuses.push(rec);
    return rec;
  }
  function migrateBlockedTagToStatus() {
    const rec = ensureBlockedStatus();
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t) return;
      const tags = t.tags || [];
      if (tags.indexOf("Blocked") < 0) return;
      if (!isDoneStatus(t.list)) {
        t.list = rec.label;
        t.statusClass = rec.cls;
      }
      t.tags = tags.filter((n) => n !== "Blocked");
    });
  }
  function adoptStatusesFromTasks() {
    const defaults = defaultTaskStatuses();
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t || !t.list || taskStatuses.some((s) => s.label === t.list)) return;
      const def = defaults.find((s) => s.label === t.list);
      if (def) {
        taskStatuses.push(Object.assign({}, def, { id: slugStatus(def.label) }));
        return;
      }
      const pal = paletteFor(t.statusClass, taskStatuses.length);
      taskStatuses.push({ id: slugStatus(t.list), label: t.list, cls: pal.cls, token: pal.token, color: pal.color, active: true, done: false, blocked: false });
    });
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (t && t.list) t.statusClass = listStatusOf(t.list).cls;
    });
  }
  function adoptPrioritiesFromTasks() {
    const defaults = defaultPriorities();
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t || !t.pri || taskPriorities.some((s) => s.label === t.pri)) return;
      const def = defaults.find((s) => s.label === t.pri);
      if (def) {
        taskPriorities.push(Object.assign({}, def, { id: slugPri(def.label) }));
        return;
      }
      const pal = paletteFor(t.priClass, taskPriorities.length);
      taskPriorities.push({ id: slugPri(t.pri), label: t.pri, cls: pal.cls, token: pal.token, color: pal.color, active: true });
    });
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (t && t.pri) t.priClass = priorityOf(t.pri).cls;
    });
  }
  function adoptProjectStatusesFromProjects() {
    const defaults = defaultProjectStatuses();
    Object.keys(projects).forEach((id) => {
      const p = projects[id];
      if (!p || !p.status) return;
      if (projectStatuses.some((s) => s.id === p.status || s.label === p.status || s.label === p.statusLabel)) return;
      const def = defaults.find((s) => s.id === p.status || s.label === p.statusLabel || s.label === p.status);
      if (def) {
        projectStatuses.push(Object.assign({}, def, { id: slugProjStatus(def.label) }));
        return;
      }
      const pal = paletteFor(null, projectStatuses.length);
      const rec = { id: slugProjStatus(p.statusLabel || p.status), label: p.statusLabel || p.status, cls: pal.cls, token: pal.token, color: pal.color, active: true, closed: false };
      projectStatuses.push(rec);
      p.status = rec.id;
    });
    Object.keys(projects).forEach((id) => {
      const p = projects[id];
      if (!p) return;
      const st = projectStatusOf(p.status || p.statusLabel);
      p.status = st.id;
      p.statusLabel = st.label;
    });
  }
  function visibleBoardStatuses() {
    return taskStatuses.filter((s) => s.active || statusHasTasks(s.label));
  }
  function statusSelectLabels(current) {
    const labels = taskStatuses.filter((s) => s.active).map((s) => s.label);
    if (current && labels.indexOf(current) < 0) labels.push(current);
    return labels.length ? labels : [firstStatusLabel()];
  }
  function statusFilterLabels() {
    return visibleBoardStatuses().map((s) => s.label);
  }
  function prioritySelectLabels(current) {
    const labels = taskPriorities.filter((s) => s.active).map((s) => s.label);
    if (current && labels.indexOf(current) < 0) labels.push(current);
    return labels.length ? labels : [firstPriorityLabel()];
  }
  function priFilterLabels() {
    return taskPriorities.filter((s) => s.active || priorityHasTasks(s.label)).map((s) => s.label);
  }
  function projectStatusSelectIds(current) {
    const ids = projectStatuses.filter((s) => s.active).map((s) => s.id);
    if (current && ids.indexOf(current) < 0) ids.push(current);
    return ids.length ? ids : [firstProjectStatusId()];
  }
  function styleTagSelect(el, cls, label) {
    if (!el) return;
    const wrap = el.closest(".tag-select");
    const safeCls = cls || "todo";
    const text = label || "";
    if (wrap) {
      const cat = wrap.dataset.cat || (el.id === "dPri" ? "pri" : el.id === "projStatusTag" ? "proj" : "status");
      wrap.className = "tag-select tag " + safeCls;
      wrap.dataset.cat = cat;
      wrap.dataset.label = text;
      el.className = (el.id === "dList" || el.id === "dPri") ? "pane-select" : "chrome-select";
      return;
    }
    el.className = (el.id === "dList" || el.id === "dPri" ? "pane-select tag " : "tag chrome-select ") + safeCls;
  }
  function fillStatusSelect(el, current) {
    if (!el) return;
    const labels = statusSelectLabels(current);
    const keep = current && labels.indexOf(current) >= 0 ? current : (labels[0] || "");
    el.innerHTML = labels.map((n) => "<option>" + escText(n) + "</option>").join("");
    el.value = keep;
    const st = listStatusOf(keep);
    if (el.id === "dList") styleTagSelect(el, st.cls, keep);
  }
  function fillStatusSelects(current) {
    fillStatusSelect(document.getElementById("dList"), current || firstStatusLabel());
    fillStatusSelect(document.getElementById("taskList"), current || firstStatusLabel());
  }
  function fillPrioritySelect(el, current) {
    if (!el) return;
    const labels = prioritySelectLabels(current);
    const keep = current && labels.indexOf(current) >= 0 ? current : (labels[0] || "");
    el.innerHTML = labels.map((n) => "<option>" + escText(n) + "</option>").join("");
    el.value = keep;
    const st = priorityOf(keep);
    if (el.id === "dPri") styleTagSelect(el, st.cls, keep);
  }
  function fillPrioritySelects(current) {
    fillPrioritySelect(document.getElementById("dPri"), current || firstPriorityLabel());
    fillPrioritySelect(document.getElementById("taskPri"), current || firstPriorityLabel());
  }
  function fillProjectStatusSelect(el, currentId) {
    if (!el) return;
    const ids = projectStatusSelectIds(currentId);
    const keep = currentId && ids.indexOf(currentId) >= 0 ? currentId : (ids[0] || firstProjectStatusId());
    el.innerHTML = ids.map((id) => {
      const s = projectStatusOf(id);
      return '<option value="' + escAttr(s.id) + '">' + escText(s.label) + "</option>";
    }).join("");
    el.value = keep;
    const st = projectStatusOf(keep);
    if (el.id === "projStatusTag") styleTagSelect(el, st.cls, st.label);
  }
  function fillProjectStatusSelects(currentId) {
    const id = currentId || (projects[currentProject] && projects[currentProject].status) || firstProjectStatusId();
    fillProjectStatusSelect(document.getElementById("projStatusTag"), id);
    fillProjectStatusSelect(document.getElementById("projStatusSelect"), id);
  }
  function boardRootEl() {
    return document.getElementById("boardCols") || document.querySelector(".board");
  }
  function boardCol(label) {
    const board = boardRootEl();
    if (!board) return null;
    return [...board.querySelectorAll("[data-col]")].find((el) => el.dataset.col === label) || null;
  }
  function columnHTML(s) {
    return '<div class="col-h">' + escText(s.label) + ' <span class="wip">0</span></div><button class="add-task" type="button" data-list="' + escAttr(s.label) + '" data-tip="Add a card to ' + escAttr(s.label) + '">+ Add task</button>';
  }
  function ensureBoardColumn(label) {
    const board = boardRootEl();
    if (!board || boardCol(label)) return boardCol(label);
    const rec = listStatusOf(label);
    const wrap = document.createElement("div");
    wrap.dataset.col = rec.label;
    wrap.innerHTML = columnHTML(rec);
    board.appendChild(wrap);
    syncWorkspaceActions();
    return wrap;
  }
  function pruneEmptyInactiveColumns() {
    const board = boardRootEl();
    if (!board) return;
    [...board.querySelectorAll("[data-col]")].forEach((col) => {
      const rec = taskStatuses.find((s) => s.label === col.dataset.col);
      if (rec && !rec.active && !col.querySelector(".kcard")) col.remove();
    });
  }
  function paintBoardColumns() {
    const board = boardRootEl();
    if (!board) return;
    const cols = visibleBoardStatuses();
    board.innerHTML = cols.map((s) => {
      return '<div data-col="' + escAttr(s.label) + '">' + columnHTML(s) + "</div>";
    }).join("") || '<p class="page-sub">Turn on a task status in Settings</p>';
    syncWorkspaceActions();
    refreshWip();
  }
  function statusCountTip(label, n) {
    return n + (n === 1 ? " task" : " tasks") + " · " + label;
  }
  const KPI_ICON = {
    list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    pulse: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15h4l3-9 4 14 3-7h4"/></svg>',
    track: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M12 7v5l3 2"/></svg>'
  };
  function statusTone(s) {
    const hex = recColor(s);
    const wash = catalogWash(hex);
    return { bg: wash.bg, fg: wash.fg, stroke: wash.stroke };
  }
  function kpiHTML(opts) {
    return '<article class="kpi" data-open="' + escAttr(opts.open || "board") + '" data-tip="' + escAttr(opts.tip || "") + '"><div class="kpi-top"><div class="kpi-icon" style="background:' + opts.bg + ";color:" + opts.fg + '">' + opts.icon + '</div><span class="trend ' + (opts.good ? "up" : "down") + '">' + escText(opts.trend) + '</span></div><div class="kpi-label">' + escText(opts.label) + '</div><div class="kpi-value">' + escText(String(opts.value)) + "</div></article>";
  }
  function kpiCardsHtml(dash) {
    const total = dash.total || 0;
    const overdue = dash.overdue || 0;
    const blocked = dash.blocked || 0;
    const ontrackN = Math.max(0, total - overdue);
    const ontrack = total ? Math.round((ontrackN / total) * 100) : 0;
    const cycle = avgCycleDays();
    const cards = [];
    cards.push(kpiHTML({
      open: "tasks", label: "Total tasks", value: total, trend: total + " live", good: true,
      tip: total + " tasks on live projects · Closed excluded · open list",
      bg: "var(--accent-dim)", fg: "var(--accent)", icon: KPI_ICON.list
    }));
    taskStatuses.forEach((s) => {
      const n = dash.live[s.label] || 0;
      if (!n) return;
      const tone = statusTone(s);
      cards.push(kpiHTML({
        open: "board", label: s.label, value: n, trend: n + " live", good: !s.done || n > 0,
        tip: statusCountTip(s.label, n) + " · open board",
        bg: tone.bg, fg: tone.fg, icon: s.done ? KPI_ICON.check : KPI_ICON.clock
      }));
    });
    if (overdue) cards.push(kpiHTML({
      open: "tasks", label: "Overdue", value: overdue, trend: overdue + " live", good: false,
      tip: overdue + " overdue · open and past " + todayLabel(),
      bg: "var(--danger-bg)", fg: "var(--danger)", icon: KPI_ICON.alert
    }));
    if (blocked && !taskStatuses.some((s) => s.blocked)) cards.push(kpiHTML({
      open: "board", label: "Blocked", value: blocked, trend: blocked + " live", good: false,
      tip: blocked + " blocked · tagged Blocked",
      bg: "var(--danger-bg)", fg: "var(--danger)", icon: KPI_ICON.pulse
    }));
    cards.push(kpiHTML({
      open: "reports", label: "Cycle time", value: cycle + "d", trend: "Completed", good: true,
      tip: "Average " + cycle + " days start-to-due on completed tasks · open reports",
      bg: "var(--amber-dim)", fg: "var(--amber)", icon: KPI_ICON.clock
    }));
    cards.push(kpiHTML({
      open: "gantt", label: "On track", value: ontrack + "%", trend: ontrackN + "/" + total, good: ontrack >= 80,
      tip: ontrackN + " of " + total + " tasks not overdue · open Gantt",
      bg: "var(--success-bg)", fg: "var(--success)", icon: KPI_ICON.track
    }));
    return cards.join("");
  }
  function paintKpiHost(el, dash) {
    if (!el) return;
    el.innerHTML = kpiCardsHtml(dash);
    el.querySelectorAll("[data-open]").forEach(bindOpen);
  }
  function paintKpiGrids(dash) {
    paintKpiHost(document.getElementById("dashKpis"), dash);
  }
  function paintCatalogBox(boxId, descId, list, countFn, notesFn, lockNoun, catKey) {
    const box = document.getElementById(boxId);
    if (!box) return;
    const activeN = list.filter((s) => s.active).length;
    box.innerHTML = list.map((s) => {
      const n = countFn(s);
      const lock = s.active && activeN <= 1;
      const notes = notesFn(s, n);
      const kind = catKey === "pri" ? "pri" : catKey === "proj" ? "proj" : "status";
      const hex = recColor(s);
      return '<div class="status-row" data-catalog="' + catKey + '" data-cat-id="' + escAttr(s.id) + '"><label class="cat-color" data-tip="Chip color · wash follows Dark or Light"><input type="color" data-cat-color value="' + hex + '" aria-label="Color for ' + escAttr(s.label) + '"></label>' + catalogTagHtml(s.cls, s.label, kind) + '<span class="set-desc">' + notes + '</span><button class="set-toggle' + (s.active ? " on" : "") + '" type="button" data-cat-toggle data-tip="' + (lock ? "Keep at least one active " + lockNoun : (s.active ? "Set inactive" : "Set active")) + '"' + (lock ? " disabled" : "") + ">" + (s.active ? "On" : "Off") + "</button></div>";
    }).join("");
    const desc = document.getElementById(descId);
    if (desc) desc.textContent = activeN + " active";
  }
  function paintStatusCatalog() {
    paintCatalogBox("statusCatalog", "statusCatalogDesc", taskStatuses, (s) => {
      return Object.keys(tasks).filter((id) => tasks[id] && tasks[id].list === s.label && !isClosedProject(projectIdOf(tasks[id]))).length;
    }, (s, n) => {
      return n + " task" + (n === 1 ? "" : "s") + (s.done ? " · completes work" : "") + (s.blocked ? " · blocks work" : "") + (s.active ? "" : " · inactive");
    }, "task status", "task");
  }
  function paintPriorityCatalog() {
    paintCatalogBox("priCatalog", "priCatalogDesc", taskPriorities, (s) => {
      return Object.keys(tasks).filter((id) => tasks[id] && tasks[id].pri === s.label && !isClosedProject(projectIdOf(tasks[id]))).length;
    }, (s, n) => {
      return n + " task" + (n === 1 ? "" : "s") + (s.active ? "" : " · inactive");
    }, "priority", "pri");
  }
  function paintProjectStatusCatalog() {
    paintCatalogBox("projStatusCatalog", "projStatusCatalogDesc", projectStatuses, (s) => {
      return Object.keys(projects).filter((id) => projects[id] && projects[id].status === s.id).length;
    }, (s, n) => {
      return n + " project" + (n === 1 ? "" : "s") + (s.closed ? " · closes project" : "") + (s.active ? "" : " · inactive");
    }, "project status", "proj");
  }
  function paintAllCatalogs() {
    paintStatusCatalog();
    paintPriorityCatalog();
    paintProjectStatusCatalog();
    applyCatalogColors();
  }
  function applyTaskStatusCatalog() {
    boardFilters.status = (boardFilters.status || []).filter((n) => statusFilterLabels().indexOf(n) >= 0);
    filterCatalogSig = "";
    paintBoardColumns();
    const openId = taskPane && taskPane.dataset.currentTask;
    fillStatusSelects(openId && tasks[openId] ? tasks[openId].list : firstStatusLabel());
    paintAllCatalogs();
    document.querySelectorAll(".kcard[data-task], #taskTbody tr[data-task]").forEach((el) => el.remove());
    ensureProjectTasksMounted(currentProject);
    fillFilterOptions();
    queueStats(true);
    schedulePersist();
  }
  function applyPriorityCatalog() {
    boardFilters.pri = (boardFilters.pri || []).filter((n) => priFilterLabels().indexOf(n) >= 0);
    filterCatalogSig = "";
    const openId = taskPane && taskPane.dataset.currentTask;
    fillPrioritySelects(openId && tasks[openId] ? tasks[openId].pri : firstPriorityLabel());
    paintAllCatalogs();
    document.querySelectorAll(".kcard[data-task], #taskTbody tr[data-task]").forEach((el) => el.remove());
    ensureProjectTasksMounted(currentProject);
    fillFilterOptions();
    queueStats(true);
    schedulePersist();
  }
  function applyProjectStatusCatalog() {
    fillProjectStatusSelects();
    paintAllCatalogs();
    Object.keys(projects).forEach((id) => paintProjectSurfaces(id));
    if (projects[currentProject]) paintChrome(projects[currentProject]);
    syncProjStatusLayout();
    queueStats(true);
    schedulePersist();
    syncWorkspaceActions();
  }
  let dragCard = null;

  function refreshWip() {
    document.querySelectorAll(".board > [data-col]").forEach((col) => {
      const n = col.querySelectorAll(".kcard:not([hidden])").length;
      const wip = col.querySelector(".wip");
      wip.textContent = String(n);
      wip.dataset.tip = n + " card" + (n === 1 ? "" : "s") + " in this column";
    });
  }
  const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const CHART_LAYOUT = {
    w: 760,
    h: 248,
    left: 52,
    right: 748,
    top: 16,
    bottom: 210,
    xLabelY: 234,
    type: 14
  };
  function chartSlots() {
    return DATE_MONS.map((mon, i) => ({
      y: TODAY_Y,
      mo: i + 1,
      mon: mon,
      label: mon,
      tip: mon + " " + TODAY_Y
    }));
  }
  function chartBox(svg) {
    const fallback = CHART_LAYOUT;
    if (!svg) return fallback;
    const r = svg.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w < 80 || h < 80) return fallback;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    const zoom = svg.classList.contains("chart-zoom-svg");
    const report = !!(svg.closest && svg.closest("#reportGrid, .report-grid"));
    const left = zoom ? 96 : report ? 80 : 52;
    const rightPad = zoom ? 24 : report ? 18 : 8;
    const top = zoom ? 32 : report ? 22 : 16;
    const bottomPad = zoom ? 56 : report ? 48 : 38;
    return {
      w: w,
      h: h,
      left: left,
      right: Math.max(left + 48, w - rightPad),
      top: top,
      bottom: Math.max(top + 40, h - bottomPad),
      xLabelY: h - (zoom ? 18 : report ? 16 : 12),
      type: zoom ? 16 : 14,
      zoom: zoom,
      report: report,
      innerPad: zoom ? 56 : report ? 42 : null
    };
  }
  function bindChartResize() {
    if (!bindChartResize.bound) {
      bindChartResize.bound = true;
      let t = 0;
      bindChartResize.schedule = () => {
        clearTimeout(t);
        t = setTimeout(() => paintCharts(), 80);
      };
      window.addEventListener("resize", bindChartResize.schedule);
      if (typeof ResizeObserver !== "undefined") {
        bindChartResize.ro = new ResizeObserver(bindChartResize.schedule);
      }
    }
    if (bindChartResize.ro) {
      document.querySelectorAll(".chart-svg, .bar-svg, .chart-zoom-svg").forEach((svg) => bindChartResize.ro.observe(svg));
    }
  }
  function chartXPoints(n, L) {
    const box = L || CHART_LAYOUT;
    const pad = box.innerPad != null ? box.innerPad : (n >= 12 ? 14 : 24);
    const a = box.left + pad;
    const b = box.right - pad;
    if (n <= 1) return [(a + b) / 2];
    return Array.from({ length: n }, (_, i) => a + (i / (n - 1)) * (b - a));
  }
  function chartBarGeom(xs) {
    const slot = xs.length > 1 ? xs[1] - xs[0] : 48;
    const inner = Math.max(12, slot * 0.78);
    const w = Math.max(5, Math.min(14, Math.floor((inner - 2) / 2)));
    const gap = Math.max(1, Math.min(3, slot * 0.06));
    return { w: w, left: -(w + gap / 2), right: gap / 2 };
  }
  function chartXFont(n, L) {
    const box = L || CHART_LAYOUT;
    const slot = (box.right - box.left) / Math.max(1, n);
    if (slot < 32) return 11;
    if (slot < 44) return 12;
    return box.type;
  }
  function chartAxis(maxVal) {
    const n = Math.max(0, Number(maxVal) || 0);
    let top;
    let steps;
    if (n <= 5) { top = 5; steps = 5; }
    else if (n <= 10) { top = 10; steps = 5; }
    else if (n <= 20) { top = 20; steps = 4; }
    else {
      top = Math.ceil(n / 5) * 5;
      steps = 4;
      while (top % steps !== 0) top += 5;
    }
    const step = top / steps;
    const ticks = [];
    for (let i = 0; i <= steps; i++) ticks.push(Math.round(top - i * step));
    return { max: top, ticks: ticks };
  }
  function chartY(value, max, L) {
    const box = L || CHART_LAYOUT;
    const span = box.bottom - box.top;
    return box.bottom - (max ? (value / max) * span : 0);
  }
  function paintChartFrame(gridId, axisId, ticks, xLabels, L) {
    const box = L || CHART_LAYOUT;
    const max = ticks[0] || 1;
    const grid = document.getElementById(gridId);
    if (grid) {
      grid.setAttribute("stroke", "#243040");
      grid.setAttribute("stroke-dasharray", "3 5");
      grid.setAttribute("stroke-width", "1");
      grid.innerHTML = (box.report || box.zoom
        ? '<rect x="' + box.left + '" y="' + box.top + '" width="' + Math.max(8, box.right - box.left) + '" height="' + Math.max(8, box.bottom - box.top) + '" rx="8" fill="rgba(36,48,64,0.035)" stroke="none"/>'
        : "") + ticks.map((t) => {
        const y = chartY(t, max, box).toFixed(1);
        return '<line x1="' + box.left + '" y1="' + y + '" x2="' + box.right + '" y2="' + y + '" />';
      }).join("") + '<line x1="' + box.left + '" y1="' + box.bottom + '" x2="' + box.right + '" y2="' + box.bottom + '" stroke-dasharray="none" stroke-width="1.15"/>';
    }
    const axis = document.getElementById(axisId);
    if (axis) {
      const xs = chartXPoints(xLabels.length, box);
      let html = "";
      ticks.forEach((t) => {
        html += '<text x="' + (box.left - 8) + '" y="' + chartY(t, max, box).toFixed(1) + '" text-anchor="end" dominant-baseline="middle">' + t + "</text>";
      });
      xLabels.forEach((lab, i) => {
        html += '<text x="' + xs[i].toFixed(1) + '" y="' + box.xLabelY + '" text-anchor="middle" font-size="' + chartXFont(xLabels.length, box) + '">' + lab + "</text>";
      });
      axis.setAttribute("fill", themeColor("--text-2", "#8B9BB4"));
      axis.setAttribute("font-family", "Inter");
      axis.setAttribute("font-size", String(box.type));
      axis.setAttribute("font-weight", "600");
      axis.innerHTML = html;
    }
  }
  function parseDueDate(t) {
    const p = parseIsoDate(t && t.due);
    if (!p) return null;
    return { year: p.y, month: p.mo, day: p.d, key: p.mo * 100 + p.d, label: fmtIso(p.iso), mon: DATE_MONS[p.mo - 1] };
  }
  function dueParts(t) {
    const due = parseDueDate(t);
    if (!due) return { key: 9999, label: "—" };
    return { key: due.key, label: due.label };
  }
  const STAR_SVG = '<svg class="star" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M12 3l2.6 6.3L21 10l-5 4.4L17.2 21 12 17.8 6.8 21 8 14.4 3 10l6.4-.7z"/></svg>';
  function projectIdOf(t) { return (t && t.project) || "website"; }
  function isClosedProject(id) {
    const p = projects[id];
    return !!(p && projectStatusOf(p.status).closed);
  }
  function canEditWorkspace() {
    const p = projects[currentProject];
    return !!(p && !projectStatusOf(p.status).closed);
  }
  function workspaceLockReason() {
    if (!projects[currentProject]) return "Create a project first";
    if (projectStatusOf(projects[currentProject].status).closed) return "This project is closed";
    return "";
  }
  function setActionDisabled(el, off, tipOn, tipOff) {
    if (!el) return;
    el.disabled = !!off;
    if (tipOn || tipOff) el.dataset.tip = off ? (tipOff || workspaceLockReason()) : tipOn;
  }
  function syncWorkspaceActions() {
    const ok = canEditWorkspace();
    const hasTask = !!(taskPane && taskPane.dataset.currentTask && tasks[taskPane.dataset.currentTask]);
    const reason = workspaceLockReason();
    const writeOk = ok && hasTask;
    const writeTip = !ok ? reason : "Open a task first";
    setActionDisabled(document.getElementById("newTaskBtn"), !ok, "Create a task on this board · opens a form", reason);
    setActionDisabled(document.getElementById("popNewTask"), !ok, "Create a task on the current board", reason);
    setActionDisabled(document.getElementById("editTaskBtn"), !writeOk, "Edit this task · title, dates, assignee, priority", writeTip);
    setActionDisabled(document.getElementById("editProjectBtn"), !projects[currentProject], "Edit this project · name, owner, dates, color", "Create a project first");
    document.querySelectorAll(".add-task").forEach((b) => {
      setActionDisabled(b, !ok, "Add a card to " + (b.dataset.list || "this column"), reason);
    });
    setActionDisabled(document.getElementById("addSubtaskBtn"), !writeOk, "Add subtask · title, assignee, and due date required", writeTip);
    ["subtaskInput", "subtaskAssignee", "subtaskDue"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !writeOk;
    });
    const subAdd = document.querySelector(".sub-add");
    if (subAdd) subAdd.classList.toggle("locked", !writeOk);
    setActionDisabled(document.getElementById("addAttachBtn"), !writeOk, "Choose a file from your computer", writeTip);
    const commentInput = document.getElementById("commentInput");
    const sendComment = document.getElementById("sendComment");
    if (commentInput) {
      commentInput.disabled = !writeOk;
      commentInput.placeholder = writeOk ? "Add a comment..." : writeTip;
    }
    setActionDisabled(sendComment, !writeOk, "Post this comment on the task", writeTip);
    const composer = document.querySelector(".composer");
    if (composer) composer.classList.toggle("locked", !writeOk);
    ["dList", "dPri"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !writeOk;
    });
  }
  function isOpen(t) { return !isDoneStatus(t.list); }
  function isOverdue(t) { return isOpen(t) && dueParts(t).key < TODAY_KEY; }
  function isBlocked(t) { return isOpen(t) && (isBlockedStatus(t.list) || (t.tags || []).includes("Blocked")); }
  function isDueToday(t) { return isOpen(t) && dueParts(t).key === TODAY_KEY; }
  function isUpcoming(t) { return isOpen(t) && dueParts(t).key > TODAY_KEY && dueParts(t).key < 9000; }
  function collectStats(projectId) {
    const live = {};
    taskStatuses.forEach((s) => { live[s.label] = 0; });
    let overdue = 0, blocked = 0, dueToday = 0, upcoming = 0, count = 0;
    const dueNames = [];
    const tally = (t) => {
      count++;
      live[t.list] = (live[t.list] || 0) + 1;
      if (isOverdue(t)) { overdue++; dueNames.push(t.title); }
      if (isBlocked(t)) blocked++;
      if (isDueToday(t)) { dueToday++; dueNames.push(t.title); }
      if (isUpcoming(t)) upcoming++;
    };
    if (projectId) {
      eachProjectTask(projectId, (_, t) => tally(t));
    } else {
      Object.keys(tasks).forEach((id) => {
        const t = tasks[id];
        if (!t || isClosedProject(projectIdOf(t))) return;
        tally(t);
      });
    }
    let done = 0;
    taskStatuses.forEach((s) => { if (s.done) done += live[s.label] || 0; });
    if (!taskStatuses.some((s) => s.done)) done = live["Done"] || 0;
    const total = count;
    const completed = done;
    const open = Math.max(0, total - completed);
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { live, todo: live["To do"] || 0, progress: open, review: live["In review"] || 0, done, open, total, completed, overdue, overdueShown: overdue, blocked, dueToday, upcoming, dueNames, dueSoon: dueToday, pct, count };
  }
  function monthName(label) {
    const p = parseIsoDate(label);
    if (p) return DATE_MONS[p.mo - 1];
    const m = String(label || "").match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
    return m ? m[1] : "";
  }
  function collectMonthly(projectId) {
    const slots = chartSlots();
    const idx = {};
    slots.forEach((s, i) => { idx[s.y + "-" + s.mo] = i; });
    const created = slots.map(() => 0);
    const completed = slots.map(() => 0);
    Object.values(tasks).forEach((t) => {
      if (isClosedProject(projectIdOf(t))) return;
      if (projectId && projectIdOf(t) !== projectId) return;
      const c = parseIsoDate(t.start);
      if (c && ((c.y + "-" + c.mo) in idx)) created[idx[c.y + "-" + c.mo]]++;
      if (isDoneStatus(t.list)) {
        const d = parseIsoDate(t.due);
        if (d && ((d.y + "-" + d.mo) in idx)) completed[idx[d.y + "-" + d.mo]]++;
      }
    });
    const open = [];
    let runC = 0, runD = 0;
    created.forEach((n, i) => {
      runC += n;
      runD += completed[i];
      open.push(Math.max(0, runC - runD));
    });
    return { created, completed, delivered: completed.slice(), open, slots };
  }
  function niceMax(n) {
    return chartAxis(n).max;
  }
  function setTrend(name, text, good) {
    document.querySelectorAll('[data-trend="' + name + '"]').forEach((el) => {
      el.textContent = text;
      el.classList.toggle("up", !!good);
      el.classList.toggle("down", !good);
    });
  }
  function avgCycleDays() {
    const days = Object.values(tasks).filter((t) => isDoneStatus(t.list) && !isClosedProject(projectIdOf(t))).map((t) => {
      const a = toIso(t.start);
      const b = toIso(t.due);
      if (!a || !b) return null;
      return Math.round((new Date(b) - new Date(a)) / 86400000);
    }).filter((n) => n != null);
    if (!days.length) return 0;
    return Math.round(days.reduce((a, b) => a + b, 0) / days.length * 10) / 10;
  }
  function themeColor(name, fallback) {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  }
  let chartZoomKey = "";
  const CHART_ZOOM_SPECS = {
    dashLine: {
      kind: "line",
      fill: true,
      title: "Completed vs created",
      sub: "January–December " + TODAY_Y + " · purple = created · teal = completed",
      legend: [{ color: "var(--accent)", label: "Completed" }, { color: "var(--purple)", label: "Created" }]
    },
    dashBar: {
      kind: "bar",
      title: "Monthly throughput",
      sub: "January–December " + TODAY_Y + " · delivered that month vs still open",
      legend: [{ color: "var(--amber)", label: "Delivered" }, { color: "var(--accent)", label: "Open" }]
    }
  };
  function isChartZoomOpen() {
    const box = document.getElementById("chartModal");
    return !!(box && !box.hidden);
  }
  function closeChartZoom() {
    const box = document.getElementById("chartModal");
    if (box) box.hidden = true;
    chartZoomKey = "";
    hideTip();
  }
  function openChartZoom(key) {
    if (key && String(key).indexOf("rw:") === 0) {
      const w = findReportWidget(String(key).slice(3));
      if (!w || w.viz === "kpis" || w.viz === "kpi" || w.viz === "table") return;
      chartZoomKey = key;
      const data = queryReport(w);
      const title = document.getElementById("chartZoomTitle");
      const sub = document.getElementById("chartZoomSub");
      const legend = document.getElementById("chartZoomLegend");
      if (title) title.textContent = w.title || "Chart";
      if (sub) sub.textContent = widgetSub(w);
      if (legend) {
        if (vizIsRound(w.viz)) {
          const parts = data.parts || [];
          const sum = parts.reduce((a, p) => a + p.n, 0) || 1;
          legend.innerHTML = parts.map((p) => {
            const pct = Math.round((p.n / sum) * 1000) / 10;
            return "<span><i style=\"background:" + p.stroke + "\"></i>" + escText(p.label) + " " + p.n + " · " + pct + "%</span>";
          }).join("");
        } else {
          const series = data.series || [];
          legend.innerHTML = series.length > 1
            ? series.map((item) => "<span><i style=\"background:" + item.color + "\"></i>" + escText(item.label) + "</span>").join("")
            : "";
        }
      }
      const box = document.getElementById("chartModal");
      if (box) box.hidden = false;
      hideTip();
      requestAnimationFrame(() => paintChartZoom());
      return;
    }
    if (!CHART_ZOOM_SPECS[key]) return;
    chartZoomKey = key;
    const spec = CHART_ZOOM_SPECS[key];
    const title = document.getElementById("chartZoomTitle");
    const sub = document.getElementById("chartZoomSub");
    const legend = document.getElementById("chartZoomLegend");
    if (title) title.textContent = spec.title;
    if (sub) sub.textContent = spec.sub;
    if (legend) {
      legend.innerHTML = spec.legend.map((item) => {
        return "<span><i style=\"background:" + item.color + "\"></i>" + escText(item.label) + "</span>";
      }).join("");
    }
    const box = document.getElementById("chartModal");
    if (box) box.hidden = false;
    hideTip();
    requestAnimationFrame(() => paintChartZoom());
  }
  function chartHitTip(label, value) {
    return ' class="chart-hit" pointer-events="all" data-tip="' + escAttr(label) + '" data-tip-value="' + escAttr(String(value)) + '"';
  }
  function paintLinePlot(id, frame, seriesA, seriesB, axis, withFill) {
    const plot = document.getElementById(id);
    if (!plot) return;
    const L = chartBox(plot.ownerSVGElement);
    const max = axis.max;
    const xs = chartXPoints(Math.max(seriesA.length, seriesB.length), L);
    paintChartFrame(frame.grid, frame.axis, axis.ticks, frame.xLabels, L);
    const purple = themeColor("--purple", "#A855F7");
    const teal = themeColor("--accent", "#00D1D1");
    const purpleFg = themeColor("--purple-fg", "#E9D5FF");
    const tealFg = themeColor("--accent-fg", "#7EF0F0");
    const yOf = (v) => chartY(v, max, L).toFixed(1);
    const base = L.bottom;
    const area = (arr) => "M" + arr.map((v, i) => xs[i] + "," + yOf(v)).join(" L") + " L" + xs[arr.length - 1] + "," + base + " L" + xs[0] + "," + base + " Z";
    const line = (arr) => "M" + arr.map((v, i) => xs[i] + "," + yOf(v)).join(" L");
    const tips = frame.tips || frame.xLabels;
    const fillA = (frame.fills && frame.fills.a) || "url(#gPurple)";
    const fillB = (frame.fills && frame.fills.b) || "url(#gTeal)";
    const strokeW = L.zoom ? 3.2 : 2.2;
    const hitR = L.zoom ? 16 : 12;
    const dotR = L.zoom ? 5.5 : 3.5;
    let html = "";
    if (withFill) {
      html += '<path fill="' + fillA + '" d="' + area(seriesA) + '" pointer-events="none"/>';
      html += '<path fill="' + fillB + '" d="' + area(seriesB) + '" pointer-events="none"/>';
    }
    html += '<path fill="none" stroke="' + purple + '" stroke-width="' + strokeW + '" d="' + line(seriesA) + '" pointer-events="none"/>';
    html += '<path fill="none" stroke="' + teal + '" stroke-width="' + strokeW + '" d="' + line(seriesB) + '" pointer-events="none"/>';
    const type = L.type;
    const lift = L.zoom ? 16 : 12;
    seriesA.forEach((v, i) => {
      html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + hitR + '" fill="transparent"' + chartHitTip("Created · " + (tips[i] || ""), v) + "/>";
    });
    seriesB.forEach((v, i) => {
      html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + hitR + '" fill="transparent"' + chartHitTip("Completed · " + (tips[i] || ""), v) + "/>";
    });
    html += '<g class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none">';
    seriesA.forEach((v, i) => {
      html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + dotR + '" fill="' + purple + '"/>';
      if (L.zoom && v) html += '<text x="' + xs[i] + '" y="' + (parseFloat(yOf(v)) - lift).toFixed(1) + '" text-anchor="middle" fill="' + purpleFg + '">' + v + "</text>";
    });
    seriesB.forEach((v, i) => {
      html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + dotR + '" fill="' + teal + '"/>';
      if (L.zoom && v) html += '<text x="' + xs[i] + '" y="' + (parseFloat(yOf(v)) + lift + 4).toFixed(1) + '" text-anchor="middle" fill="' + tealFg + '">' + v + "</text>";
    });
    html += "</g>";
    plot.innerHTML = html;
  }
  function paintBarPlot(id, frame, delivered, open, axis) {
    const plot = document.getElementById(id);
    if (!plot) return;
    const L = chartBox(plot.ownerSVGElement);
    const max = axis.max;
    const xs = chartXPoints(delivered.length, L);
    paintChartFrame(frame.grid, frame.axis, axis.ticks, frame.xLabels, L);
    const amber = themeColor("--amber", "#F59E0B");
    const teal = themeColor("--accent", "#00D1D1");
    const amberFg = themeColor("--amber-fg", "#FDE68A");
    const tealFg = themeColor("--accent-fg", "#7EF0F0");
    const base = L.bottom;
    const span = base - L.top;
    const geom = chartBarGeom(xs);
    const tips = frame.tips || frame.xLabels;
    const type = L.type;
    const lift = L.zoom ? 8 : 6;
    let html = "";
    delivered.forEach((v, i) => {
      const x = xs[i];
      const h1 = v ? Math.max(4, (v / max) * span) : 0;
      const h2 = open[i] ? Math.max(4, (open[i] / max) * span) : 0;
      const y1 = base - h1;
      const y2 = base - h2;
      const hit1 = Math.max(h1, L.zoom ? 20 : 16);
      const hit2 = Math.max(h2, L.zoom ? 20 : 16);
      html += '<rect x="' + (x + geom.left).toFixed(1) + '" y="' + (base - hit1).toFixed(1) + '" width="' + geom.w + '" height="' + hit1.toFixed(1) + '" fill="transparent"' + chartHitTip("Delivered · " + (tips[i] || ""), v) + "/>";
      html += '<rect x="' + (x + geom.right).toFixed(1) + '" y="' + (base - hit2).toFixed(1) + '" width="' + geom.w + '" height="' + hit2.toFixed(1) + '" fill="transparent"' + chartHitTip("Open · " + (tips[i] || ""), open[i] || 0) + "/>";
      if (h1) html += '<rect x="' + (x + geom.left).toFixed(1) + '" y="' + y1 + '" width="' + geom.w + '" height="' + h1 + '" rx="3" fill="' + amber + '" pointer-events="none"/>';
      if (h2) html += '<rect x="' + (x + geom.right).toFixed(1) + '" y="' + y2 + '" width="' + geom.w + '" height="' + h2 + '" rx="3" fill="' + teal + '" pointer-events="none"/>';
      if (L.zoom && v) html += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + (x + geom.left + geom.w / 2).toFixed(1) + '" y="' + (y1 - lift).toFixed(1) + '" text-anchor="middle" fill="' + amberFg + '">' + v + "</text>";
      if (L.zoom && open[i]) html += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + (x + geom.right + geom.w / 2).toFixed(1) + '" y="' + (y2 - lift).toFixed(1) + '" text-anchor="middle" fill="' + tealFg + '">' + open[i] + "</text>";
    });
    plot.innerHTML = html;
  }
  function chartMonthLabels(slots) {
    return slots.map((s) => s.label);
  }
  function chartMonthTips(slots) {
    return slots.map((s) => s.tip);
  }
  function paintChartZoom() {
    if (!isChartZoomOpen()) return;
    if (chartZoomKey && String(chartZoomKey).indexOf("rw:") === 0) {
      paintReportZoom(String(chartZoomKey).slice(3));
      return;
    }
    if (!CHART_ZOOM_SPECS[chartZoomKey]) return;
    const spec = CHART_ZOOM_SPECS[chartZoomKey];
    const m = collectMonthly();
    const labels = chartMonthLabels(m.slots);
    const tips = chartMonthTips(m.slots);
    const frame = { grid: "zoomGrid", axis: "zoomAxis", xLabels: labels, tips: tips, fills: { a: "url(#gPurpleZ)", b: "url(#gTealZ)" } };
    if (spec.kind === "bar") {
      const barAxis = chartAxis(Math.max.apply(null, m.delivered.concat(m.open)));
      paintBarPlot("zoomPlot", frame, m.delivered, m.open, barAxis);
    } else {
      const lineAxis = chartAxis(Math.max.apply(null, m.created.concat(m.completed)));
      paintLinePlot("zoomPlot", frame, m.created, m.completed, lineAxis, spec.fill);
    }
  }
  function paintCharts() {
    bindChartResize();
    const m = collectMonthly();
    const lineAxis = chartAxis(Math.max.apply(null, m.created.concat(m.completed)));
    const barAxis = chartAxis(Math.max.apply(null, m.delivered.concat(m.open)));
    const labels = chartMonthLabels(m.slots);
    const tips = chartMonthTips(m.slots);
    paintLinePlot("dashLinePlot", { grid: "dashLineGrid", axis: "dashLineY", xLabels: labels, tips: tips }, m.created, m.completed, lineAxis, true);
    paintBarPlot("dashBarPlot", { grid: "dashBarGrid", axis: "dashBarY", xLabels: labels, tips: tips }, m.delivered, m.open, barAxis);
    paintReportWidgets();
    paintChartZoom();
    return m;
  }
  const REPORT_PALETTE = [
    ["--accent", "#00D1D1"],
    ["--purple", "#A855F7"],
    ["--amber", "#F59E0B"],
    ["--success", "#10B981"],
    ["--danger", "#F43F5E"],
    ["--hold-fg", "#3B82F6"]
  ];
  const REPORT_TASK_DIMS = [
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
    { id: "assignee", label: "Assignee" },
    { id: "project", label: "Project" },
    { id: "tag", label: "Tag" },
    { id: "monthStart", label: "Start month" },
    { id: "monthDue", label: "Due month" }
  ];
  const REPORT_PROJ_DIMS = [
    { id: "status", label: "Status" },
    { id: "owner", label: "Owner" },
    { id: "monthStart", label: "Start month" },
    { id: "monthDue", label: "End month" }
  ];
  const REPORT_TASK_YS = [
    { id: "count", label: "Task count" },
    { id: "open", label: "Open count" },
    { id: "done", label: "Completed count" },
    { id: "overdue", label: "Overdue count" },
    { id: "created", label: "Created (start month)" },
    { id: "completed", label: "Completed (due month)" },
    { id: "hours", label: "Estimate hours" }
  ];
  const REPORT_PROJ_YS = [
    { id: "count", label: "Project count" },
    { id: "open", label: "Open tasks" },
    { id: "done", label: "Completed tasks" },
    { id: "overdue", label: "Overdue tasks" }
  ];
  const REPORT_TEMPLATES = [
    { id: "kpis", label: "Delivery KPIs", viz: "kpis", title: "Delivery health", span: 2 },
    { id: "created", label: "Created vs completed", viz: "line", source: "tasks", x: "monthStart", y: "created", y2: "completed", title: "Completed vs created", span: 2 },
    { id: "throughput", label: "Monthly throughput", viz: "bar", source: "tasks", x: "monthDue", y: "completed", y2: "openRun", title: "Monthly throughput", span: 2 },
    { id: "status", label: "By status", viz: "bar", source: "tasks", x: "status", y: "count", title: "Tasks by status", span: 1 },
    { id: "statusH", label: "Horizontal by status", viz: "hbar", source: "tasks", x: "status", y: "count", title: "Tasks by status", span: 1 },
    { id: "assignee", label: "By assignee", viz: "bar", source: "tasks", x: "assignee", y: "count", title: "Tasks by assignee", span: 1 },
    { id: "priority", label: "By priority", viz: "donut", source: "tasks", x: "priority", y: "count", title: "Tasks by priority", span: 1 },
    { id: "priorityPie", label: "Pie by priority", viz: "pie", source: "tasks", x: "priority", y: "count", title: "Tasks by priority", span: 1 },
    { id: "project", label: "By project", viz: "bar", source: "tasks", x: "project", y: "count", title: "Tasks by project", span: 1 },
    { id: "overdue", label: "Overdue by project", viz: "bar", source: "tasks", x: "project", y: "overdue", title: "Overdue by project", span: 1 },
    { id: "projStatus", label: "Projects by status", viz: "donut", source: "projects", x: "status", y: "count", title: "Projects by status", span: 1 }
  ];
  let reportEditId = "";
  let reportDrag = null;
  let reportDraftSpan = 1;
  const REPORT_COLS = 12;
  const REPORT_MIN_W = 3;
  const REPORT_MIN_H = 4;
  const REPORT_MAX_H = 24;
  const REPORT_VIZ = ["bar", "hbar", "stacked", "hstacked", "percent", "hpercent", "line", "area", "stackedarea", "combo", "pie", "donut", "table", "kpi", "kpis"];
  function vizIsH(v) { return v === "hbar" || v === "hstacked" || v === "hpercent"; }
  function vizIsStacked(v) { return v === "stacked" || v === "hstacked" || v === "percent" || v === "hpercent" || v === "stackedarea"; }
  function vizIsPercent(v) { return v === "percent" || v === "hpercent"; }
  function vizIsRound(v) { return v === "pie" || v === "donut"; }
  function vizIsLine(v) { return v === "line" || v === "area" || v === "stackedarea"; }
  function vizIsBarLike(v) { return ["bar", "hbar", "stacked", "hstacked", "percent", "hpercent", "combo"].indexOf(v) >= 0; }
  function extraYsOf(w) {
    const source = w && w.source === "projects" ? "projects" : "tasks";
    const catalog = reportCatalog(source, "y");
    const y = w && w.y;
    const raw = Array.isArray(w && w.ys) ? w.ys : ((w && w.y2) ? [w.y2] : []);
    const ids = [];
    raw.forEach((id) => {
      if (!id || id === y || ids.indexOf(id) >= 0) return;
      if (id === "openRun" && source === "tasks") ids.push(id);
      else if (catalog.some((d) => d.id === id)) ids.push(id);
    });
    return ids;
  }
  function defaultReportSize(viz, span) {
    if (viz === "kpis") return { gw: 12, gh: 7 };
    if (viz === "kpi") return { gw: 4, gh: 5 };
    if (vizIsRound(viz)) return { gw: span === 2 ? 12 : 6, gh: 8 };
    if (viz === "table") return { gw: span === 1 ? 6 : 12, gh: 8 };
    return { gw: span === 1 ? 6 : 12, gh: 9 };
  }
  function clampReportLayout(box) {
    const gw = Math.max(REPORT_MIN_W, Math.min(REPORT_COLS, parseInt(box.gw, 10) || REPORT_MIN_W));
    const gh = Math.max(REPORT_MIN_H, Math.min(REPORT_MAX_H, parseInt(box.gh, 10) || REPORT_MIN_H));
    const gx = Math.max(0, Math.min(REPORT_COLS - gw, parseInt(box.gx, 10) || 0));
    const gy = Math.max(0, parseInt(box.gy, 10) || 0);
    return { gx: gx, gy: gy, gw: gw, gh: gh };
  }
  function layoutsHit(a, b) {
    if (!a || !b || (a.id && b.id && a.id === b.id)) return false;
    return a.gx < b.gx + b.gw && a.gx + a.gw > b.gx && a.gy < b.gy + b.gh && a.gy + a.gh > b.gy;
  }
  function findReportSlot(placed, gw, gh) {
    const sizeW = Math.max(REPORT_MIN_W, Math.min(REPORT_COLS, gw));
    const sizeH = Math.max(REPORT_MIN_H, Math.min(REPORT_MAX_H, gh));
    for (let y = 0; y < 80; y++) {
      for (let x = 0; x <= REPORT_COLS - sizeW; x++) {
        const box = { gx: x, gy: y, gw: sizeW, gh: sizeH };
        if (!placed.some((p) => layoutsHit(p, box))) return box;
      }
    }
    return { gx: 0, gy: 0, gw: sizeW, gh: sizeH };
  }
  function ensureReportLayouts(widgets) {
    const placed = [];
    widgets.forEach((w) => {
      const size = defaultReportSize(w.viz, w.span);
      if (!(w.gw >= REPORT_MIN_W)) w.gw = size.gw;
      if (!(w.gh >= REPORT_MIN_H)) w.gh = size.gh;
      if (w.gx >= 0 && w.gy >= 0) {
        const clamped = clampReportLayout(w);
        w.gx = clamped.gx; w.gy = clamped.gy; w.gw = clamped.gw; w.gh = clamped.gh;
        placed.push(w);
        return;
      }
      const slot = findReportSlot(placed, w.gw, w.gh);
      w.gx = slot.gx; w.gy = slot.gy; w.gw = slot.gw; w.gh = slot.gh;
      placed.push(w);
    });
    return widgets;
  }
  function resolveReportOverlap(list, keepId) {
    const order = list.slice().sort((a, b) => {
      if (a.id === keepId) return -1;
      if (b.id === keepId) return 1;
      return (a.gy - b.gy) || (a.gx - b.gx);
    });
    let changed = true;
    let guard = 0;
    while (changed && guard < 80) {
      changed = false;
      guard++;
      for (let i = 0; i < order.length; i++) {
        for (let j = 0; j < order.length; j++) {
          if (i === j) continue;
          if (!layoutsHit(order[i], order[j])) continue;
          if (order[j].id === keepId) continue;
          order[j].gy = order[i].gy + order[i].gh;
          changed = true;
        }
      }
    }
  }
  function applyReportLayoutStyle(el, w) {
    if (!el || !w) return;
    el.style.gridColumn = (w.gx + 1) + " / span " + w.gw;
    el.style.gridRow = (w.gy + 1) + " / span " + w.gh;
  }
  function reportLayoutSig(widgets) {
    return "r5|" + widgets.map((w) => [w.id, w.viz, w.gx, w.gy, w.gw, w.gh, w.title, w.source, w.x, w.y, (w.ys || []).join(","), w.y2, w.split, w.project, w.sort, w.top, w.labels ? 1 : 0].join(":")).join("|");
  }
  function defaultReportWidgets() {
    return ensureReportLayouts([
      { id: "rw-kpis", viz: "kpis", title: "Delivery health", gx: 0, gy: 0, gw: 12, gh: 7 },
      { id: "rw-created", viz: "line", title: "Completed vs created", source: "tasks", x: "monthStart", y: "created", y2: "completed", gx: 0, gy: 7, gw: 12, gh: 9 }
    ]);
  }
  function reportCatalog(source, kind) {
    if (kind === "y") return source === "projects" ? REPORT_PROJ_YS : REPORT_TASK_YS;
    return source === "projects" ? REPORT_PROJ_DIMS : REPORT_TASK_DIMS;
  }
  function reportLabelOf(list, id, fallback) {
    const hit = (list || []).find((d) => d.id === id);
    return (hit && hit.label) || fallback || id || "";
  }
  function normalizeReportWidget(raw) {
    if (!raw || typeof raw !== "object") return null;
    const viz = REPORT_VIZ.indexOf(raw.viz) >= 0 ? raw.viz : "bar";
    const source = raw.source === "projects" ? "projects" : "tasks";
    const dims = reportCatalog(source, "x");
    const ys = reportCatalog(source, "y");
    const x = dims.some((d) => d.id === raw.x) ? raw.x : (dims[0] && dims[0].id) || "status";
    const y = ys.some((d) => d.id === raw.y) ? raw.y : "count";
    const extras = extraYsOf({ source: source, y: y, ys: raw.ys, y2: raw.y2 });
    if (vizIsRound(viz) || viz === "kpi" || viz === "kpis") extras.length = 0;
    const splitRaw = dims.some((d) => d.id === raw.split && d.id !== x) ? raw.split : "";
    const split = extras.length ? "" : splitRaw;
    const y2 = extras[0] || "";
    const sort = raw.sort === "value" || raw.sort === "valueAsc" ? raw.sort : "category";
    const topN = parseInt(raw.top, 10);
    const top = topN === 5 || topN === 10 || topN === 15 ? topN : 0;
    const labels = raw.labels === true || raw.labels === 1 || raw.labels === "1";
    const span = raw.span === 1 ? 1 : 2;
    const id = String(raw.id || "").trim() || newReportId();
    const title = String(raw.title || "").trim() || (viz === "kpis" ? "Delivery health" : "Chart");
    const project = raw.project && projects[raw.project] ? raw.project : "";
    const size = defaultReportSize(viz, span);
    const hasPos = raw.gx != null && raw.gy != null;
    const out = { id: id, viz: viz, title: title, source: source, x: x, y: y, y2: y2, ys: extras, split: split, project: project, span: span, sort: sort, top: top, labels: labels };
    out.gw = parseInt(raw.gw, 10) >= REPORT_MIN_W ? parseInt(raw.gw, 10) : size.gw;
    out.gh = parseInt(raw.gh, 10) >= REPORT_MIN_H ? parseInt(raw.gh, 10) : size.gh;
    if (hasPos) {
      const clamped = clampReportLayout({ gx: raw.gx, gy: raw.gy, gw: out.gw, gh: out.gh });
      out.gx = clamped.gx; out.gy = clamped.gy; out.gw = clamped.gw; out.gh = clamped.gh;
    }
    return out;
  }
  function reportWidgets() {
    const raw = prefs.reportWidgets;
    const list = (!Array.isArray(raw) || !raw.length) ? defaultReportWidgets() : raw.map(normalizeReportWidget).filter(Boolean);
    return ensureReportLayouts(list);
  }
  function findReportWidget(id) {
    return reportWidgets().find((w) => w.id === id) || null;
  }
  function newReportId() {
    return "rw-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }
  function mutateReportWidgets(fn) {
    const list = reportWidgets().map((w) => Object.assign({}, w));
    fn(list);
    prefs.reportWidgets = list;
    schedulePersist();
    paintReportWidgets(true);
  }
  function whoLabel(id) {
    if (!id) return "Unassigned";
    return (roster[id] && roster[id].name) || id;
  }
  function projectNameOf(id) {
    return (projects[id] && projects[id].name) || id || "—";
  }
  function estHoursOf(t) {
    const n = parseFloat(t && t.est);
    return isFinite(n) ? n : 0;
  }
  function reportPalette(i) {
    const pair = REPORT_PALETTE[i % REPORT_PALETTE.length];
    return themeColor(pair[0], pair[1]);
  }
  function liveReportTasks(projectId) {
    const out = [];
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t || isClosedProject(projectIdOf(t))) return;
      if (projectId && projectIdOf(t) !== projectId) return;
      out.push({ id: id, t: t });
    });
    return out;
  }
  function liveReportProjects() {
    return liveProjectIds().filter((id) => projects[id] && !isClosedProject(id)).map((id) => ({ id: id, p: projects[id] }));
  }
  function monthKeyOf(value) {
    const p = parseIsoDate(value);
    if (!p) return "";
    return p.y + "-" + p.mo;
  }
  function monthLabelOf(key) {
    const slots = chartSlots();
    const hit = slots.find((s) => (s.y + "-" + s.mo) === key);
    return hit ? hit.label : key;
  }
  function dimKeysForTask(t, dim) {
    if (dim === "status") return [t.list || "—"];
    if (dim === "priority") return [t.pri || "—"];
    if (dim === "assignee") return [whoLabel(t.assignee)];
    if (dim === "project") return [projectNameOf(projectIdOf(t))];
    if (dim === "tag") {
      const tags = (t.tags || []).filter(Boolean);
      return tags.length ? tags : ["(none)"];
    }
    if (dim === "monthStart") {
      const k = monthKeyOf(t.start);
      return [k || "(no date)"];
    }
    if (dim === "monthDue") {
      const k = monthKeyOf(t.due);
      return [k || "(no date)"];
    }
    return ["—"];
  }
  function dimKeysForProject(id, p, dim) {
    if (dim === "status") return [(projectStatusOf(p.status).label) || "—"];
    if (dim === "owner") return [whoLabel(p.owner)];
    if (dim === "monthStart") {
      const k = monthKeyOf(p.startIso || p.start || p.range);
      return [k || "(no date)"];
    }
    if (dim === "monthDue") {
      const k = monthKeyOf(p.endIso || p.end);
      return [k || "(no date)"];
    }
    return ["—"];
  }
  function measureTask(t, y) {
    if (y === "open") return isOpen(t) ? 1 : 0;
    if (y === "done" || y === "completed") return isDoneStatus(t.list) ? 1 : 0;
    if (y === "overdue") return isOverdue(t) ? 1 : 0;
    if (y === "hours") return estHoursOf(t);
    return 1;
  }
  function measureProject(id, y) {
    if (y === "count") return 1;
    let n = 0;
    eachProjectTask(id, (_, t) => { n += measureTask(t, y); });
    return n;
  }
  function dimOrder(source, dim, seen) {
    if (dim === "monthStart" || dim === "monthDue") {
      const months = chartSlots().map((s) => s.y + "-" + s.mo);
      if (seen["(no date)"]) months.push("(no date)");
      return months;
    }
    if (dim === "status") {
      const list = source === "projects" ? projectStatuses : taskStatuses;
      const order = list.filter((s) => s.active !== false).map((s) => s.label);
      Object.keys(seen).forEach((k) => { if (order.indexOf(k) < 0) order.push(k); });
      return order;
    }
    if (dim === "priority") {
      const order = taskPriorities.filter((s) => s.active !== false).map((s) => s.label);
      Object.keys(seen).forEach((k) => { if (order.indexOf(k) < 0) order.push(k); });
      return order;
    }
    if (dim === "project") {
      const order = liveReportProjects().map((row) => row.p.name);
      Object.keys(seen).forEach((k) => { if (order.indexOf(k) < 0) order.push(k); });
      return order;
    }
    if (dim === "assignee" || dim === "owner") {
      const order = Object.keys(roster).filter((id) => roster[id] && roster[id].active !== false).map(whoLabel);
      Object.keys(seen).forEach((k) => { if (order.indexOf(k) < 0) order.push(k); });
      return order;
    }
    return Object.keys(seen).sort();
  }
  function dimColor(source, dim, key, index) {
    if (dim === "status") {
      const meta = source === "projects" ? projectStatusOf(key) : listStatusOf(key);
      return statusTone(meta).stroke;
    }
    if (dim === "priority") {
      return statusTone(priorityOf(key)).stroke;
    }
    if (dim === "project") {
      const id = Object.keys(projects).find((pid) => projects[pid] && projects[pid].name === key);
      if (id && projects[id].hex) return projects[id].hex;
    }
    return reportPalette(index);
  }
  function prettyDimKey(dim, key) {
    if (dim === "monthStart" || dim === "monthDue") {
      if (key === "(no date)") return "No date";
      return monthLabelOf(key);
    }
    return key;
  }
  function extraYLabel(source, id) {
    if (id === "openRun") return "Open (running)";
    return reportLabelOf(reportCatalog(source, "y"), id, id);
  }
  function widgetSub(w) {
    if (!w || w.viz === "kpis") return "Live workspace cards · closed projects excluded";
    const src = w.source === "projects" ? "Projects" : "Tasks";
    const x = reportLabelOf(reportCatalog(w.source, "x"), w.x, w.x);
    const y = reportLabelOf(reportCatalog(w.source, "y"), w.y, w.y);
    const extras = extraYsOf(w);
    const split = reportLabelOf(reportCatalog(w.source, "x"), w.split, "");
    const scope = w.project ? projectNameOf(w.project) : "All live projects";
    if (w.viz === "kpi") return y + " · " + src + " · " + scope;
    let s = src + " · X " + x + " · Y " + y;
    extras.forEach((id) => { s += " vs " + extraYLabel(w.source, id); });
    if (split) s += " · split " + split;
    s += " · " + scope;
    return s;
  }
  function sliceReportData(data, w) {
    const n = (data.labels || []).length;
    if (!n) return data;
    let idx = Array.from({ length: n }, (_, i) => i);
    const rank = (i) => (data.series || []).reduce((a, s) => a + (s.values[i] || 0), 0);
    const top = parseInt(w && w.top, 10) || 0;
    if (w.sort === "value" || w.sort === "valueAsc") {
      idx.sort((a, b) => rank(b) - rank(a));
      if (w.sort === "valueAsc") idx.reverse();
    }
    if (top > 0) {
      if (w.sort !== "value" && w.sort !== "valueAsc") {
        idx = idx.slice().sort((a, b) => rank(b) - rank(a)).slice(0, top).sort((a, b) => a - b);
      } else {
        idx = idx.slice(0, top);
      }
    }
    const pick = (arr) => (arr || []).length ? idx.map((i) => arr[i]) : arr;
    const series = (data.series || []).map((s) => Object.assign({}, s, {
      values: pick(s.values || []),
      colors: s.colors ? pick(s.colors) : s.colors
    }));
    if (vizIsPercent(w.viz) && series.length) {
      const m = (series[0].values || []).length;
      for (let i = 0; i < m; i++) {
        const tot = series.reduce((a, s) => a + (s.values[i] || 0), 0) || 1;
        series.forEach((s) => { s.values[i] = Math.round(1000 * (s.values[i] || 0) / tot) / 10; });
      }
    }
    const labels = pick(data.labels);
    const tips = pick(data.tips || data.labels);
    const parts = labels.map((lab, i) => {
      const val = series[0] ? (series[0].values[i] || 0) : 0;
      const stroke = (series[0] && series[0].colors && series[0].colors[i]) || ((series[0] && series[0].color) || reportPalette(i));
      return { label: lab, n: val, stroke: stroke };
    }).filter((p) => p.n > 0);
    const rows = labels.map((lab, i) => ({ label: lab, cells: series.map((s) => s.values[i] || 0) }));
    return { labels: labels, tips: tips, series: series, parts: parts, rows: rows };
  }
  function queryReport(w) {
    if (!w || w.viz === "kpis") return { labels: [], series: [], parts: [], rows: [] };
    const extras = extraYsOf(w);
    const onlyOpenRun = extras.length === 1 && extras[0] === "openRun";
    const pair = extras.length === 1 && ((w.y === "created" && extras[0] === "completed") || (w.y === "completed" && extras[0] === "created"));
    if (pair) {
      const m = collectMonthly(w.project || null);
      return sliceReportData({
        labels: chartMonthLabels(m.slots),
        tips: chartMonthTips(m.slots),
        series: [
          { label: "Created", values: m.created, color: themeColor("--purple", "#A855F7") },
          { label: "Completed", values: m.completed, color: themeColor("--accent", "#00D1D1") }
        ]
      }, w);
    }
    if (onlyOpenRun) {
      const m = collectMonthly(w.project || null);
      return sliceReportData({
        labels: chartMonthLabels(m.slots),
        tips: chartMonthTips(m.slots),
        series: [
          { label: "Delivered", values: m.delivered, color: themeColor("--amber", "#F59E0B") },
          { label: "Open", values: m.open, color: themeColor("--accent", "#00D1D1") }
        ]
      }, w);
    }
    const source = w.source === "projects" ? "projects" : "tasks";
    const items = source === "projects" ? liveReportProjects() : liveReportTasks(w.project || "");
    const xDim = w.x || "status";
    const splitDim = extras.length ? "" : (w.split && w.split !== xDim ? w.split : "");
    const measures = [w.y].concat(extras.filter((id) => id !== "openRun"));
    const seenX = {};
    const seenSplit = {};
    const buckets = {};
    const add = (bucket, field, row) => {
      const v = source === "projects" ? measureProject(row.id, field) : measureTask(row.t, field);
      bucket[field] = (bucket[field] || 0) + v;
    };
    items.forEach((row) => {
      const xKeys = source === "projects" ? dimKeysForProject(row.id, row.p, xDim) : dimKeysForTask(row.t, xDim);
      const sKeys = splitDim
        ? (source === "projects" ? dimKeysForProject(row.id, row.p, splitDim) : dimKeysForTask(row.t, splitDim))
        : ["_all"];
      xKeys.forEach((xk) => {
        seenX[xk] = true;
        sKeys.forEach((sk) => {
          seenSplit[sk] = true;
          const key = sk + "\n" + xk;
          if (!buckets[key]) buckets[key] = {};
          measures.forEach((field) => add(buckets[key], field, row));
        });
      });
    });
    const labelsRaw = dimOrder(source, xDim, seenX).filter((k) => seenX[k] || xDim === "monthStart" || xDim === "monthDue");
    const labels = labelsRaw.map((k) => prettyDimKey(xDim, k));
    const tips = labelsRaw.map((k) => prettyDimKey(xDim, k));
    const series = [];
    if (splitDim) {
      const splits = dimOrder(source, splitDim, seenSplit).filter((k) => seenSplit[k]);
      splits.forEach((sk, i) => {
        series.push({
          label: prettyDimKey(splitDim, sk),
          values: labelsRaw.map((xk) => (buckets[sk + "\n" + xk] && buckets[sk + "\n" + xk][w.y]) || 0),
          color: dimColor(source, splitDim, sk, i)
        });
      });
    } else if (measures.length > 1) {
      measures.forEach((field, i) => {
        series.push({
          label: extraYLabel(source, field),
          values: labelsRaw.map((xk) => (buckets["_all\n" + xk] && buckets["_all\n" + xk][field]) || 0),
          color: reportPalette(i)
        });
      });
    } else {
      series.push({
        label: extraYLabel(source, w.y),
        values: labelsRaw.map((xk) => (buckets["_all\n" + xk] && buckets["_all\n" + xk][w.y]) || 0),
        color: reportPalette(0)
      });
    }
    series.forEach((s) => {
      if (Array.isArray(s.color)) s.color = reportPalette(0);
    });
    const first = series[0];
    if (first && !splitDim && measures.length === 1 && labelsRaw.length) {
      first.colors = labelsRaw.map((xk, i) => dimColor(source, xDim, xk, i));
    }
    return sliceReportData({ labels: labels, tips: tips, series: series }, w);
  }
  function seriesMax(series, stacked) {
    if (!series.length) return 0;
    const n = (series[0].values || []).length;
    let max = 0;
    if (stacked) {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        series.forEach((s) => { sum += s.values[i] || 0; });
        if (sum > max) max = sum;
      }
    } else {
      series.forEach((s) => s.values.forEach((v) => { if (v > max) max = v; }));
    }
    return max;
  }
  function defsKeepHtml(defs) {
    if (!defs) return "";
    return [...defs.querySelectorAll("[data-keep]")].map((n) => n.outerHTML).join("");
  }
  function writeAreaFills(defs, series, prefix) {
    if (!defs) return;
    const extra = defs.dataset.chrome || "";
    defs.innerHTML = defsKeepHtml(defs) + extra + series.map((s, i) => {
      const id = prefix + i;
      return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + s.color + '" stop-opacity="0.38"/><stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>';
    }).join("");
  }
  function writePlotClip(defs, L, prefix) {
    if (!defs) return "";
    const clipId = (prefix || "gR") + "Clip";
    const x = L.left;
    const y = L.top - 1;
    const w = Math.max(8, L.right - L.left);
    const h = Math.max(8, L.bottom - L.top + 2);
    defs.dataset.chrome = '<clipPath id="' + clipId + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath>';
    return clipId;
  }
  function writeBarFills(defs, series, prefix, horiz) {
    if (!defs) return;
    const clip = defs.dataset.chrome || "";
    const x1 = horiz ? "0" : "0";
    const x2 = horiz ? "1" : "0";
    const y1 = horiz ? "0" : "0";
    const y2 = horiz ? "0" : "1";
    const keep = defsKeepHtml(defs);
    defs.innerHTML = keep + clip + series.map((s, i) => {
      const id = prefix + "Bar" + i;
      return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"><stop offset="0%" stop-color="' + (s.color || "#00D1D1") + '" stop-opacity="1"/><stop offset="40%" stop-color="' + (s.color || "#00D1D1") + '" stop-opacity="0.95"/><stop offset="100%" stop-color="' + (s.color || "#00D1D1") + '" stop-opacity="0.68"/></linearGradient>';
    }).join("");
  }
  function barPaintFill(s, si, i, frame, fancy) {
    const solid = (s.colors && s.colors[i]) || s.color || reportPalette(si);
    if (fancy && !(s.colors && s.colors[i])) return "url(#" + (frame.fillPrefix || "gR") + "Bar" + si + ")";
    return solid;
  }
  function paintMultiLine(plotId, frame, seriesList, axis, withFill) {
    const plot = document.getElementById(plotId);
    if (!plot) return;
    const L = chartBox(plot.ownerSVGElement);
    const max = axis.max;
    const n = Math.max.apply(null, [1].concat(seriesList.map((s) => (s.values || []).length)));
    const xs = chartXPoints(n, L);
    paintChartFrame(frame.grid, frame.axis, axis.ticks, frame.xLabels, L);
    const yOf = (v) => chartY(v, max, L).toFixed(1);
    const base = L.bottom;
    const fancy = !!frame.fancy;
    const strokeW = L.zoom ? 3.2 : fancy ? 2.6 : 2.2;
    const hitR = L.zoom ? 16 : 12;
    const dotR = L.zoom ? 5.5 : fancy ? 4 : 3.5;
    const type = L.type;
    const lift = L.zoom ? 16 : 12;
    const tips = frame.tips || frame.xLabels;
    const prefix = frame.fillPrefix || "gR";
    const clipId = writePlotClip(document.getElementById(frame.defs), L, prefix);
    if (withFill && frame.defs) writeAreaFills(document.getElementById(frame.defs), seriesList, prefix);
    else if (document.getElementById(frame.defs) && clipId) {
      const defs = document.getElementById(frame.defs);
      defs.innerHTML = defsKeepHtml(defs) + (defs.dataset.chrome || "");
    }
    let inner = "";
    seriesList.forEach((s, si) => {
      const arr = s.values || [];
      if (!arr.length) return;
      const color = s.color || reportPalette(si);
      if (withFill) {
        const gid = prefix + si;
        inner += '<path fill="url(#' + gid + ')" d="M' + arr.map((v, i) => xs[i] + "," + yOf(v)).join(" L") + " L" + xs[arr.length - 1] + "," + base + " L" + xs[0] + "," + base + ' Z" pointer-events="none"/>';
      }
      if (fancy) inner += '<path fill="none" stroke="' + color + '" stroke-opacity="0.22" stroke-width="' + (strokeW + 5) + '" stroke-linecap="round" stroke-linejoin="round" d="M' + arr.map((v, i) => xs[i] + "," + yOf(v)).join(" L") + '" pointer-events="none"/>';
      inner += '<path fill="none" stroke="' + color + '" stroke-width="' + strokeW + '" stroke-linecap="round" stroke-linejoin="round" d="M' + arr.map((v, i) => xs[i] + "," + yOf(v)).join(" L") + '" pointer-events="none"/>';
    });
    let html = clipId ? '<g clip-path="url(#' + clipId + ')">' + inner + "</g>" : inner;
    seriesList.forEach((s, si) => {
      const arr = s.values || [];
      const color = s.color || reportPalette(si);
      arr.forEach((v, i) => {
        html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + hitR + '" fill="transparent"' + chartHitTip((s.label || "Value") + " · " + (tips[i] || ""), v) + "/>";
      });
      html += '<g class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none">';
      arr.forEach((v, i) => {
        html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + dotR + '" fill="' + color + '"/>';
        if ((L.zoom || frame.labels) && v) html += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + xs[i] + '" y="' + (parseFloat(yOf(v)) - lift).toFixed(1) + '" text-anchor="middle" fill="' + color + '">' + chartValText(v, frame) + "</text>";
      });
      html += "</g>";
    });
    plot.innerHTML = html;
  }
  function chartGroupGeomN(xs, n) {
    const slot = xs.length > 1 ? xs[1] - xs[0] : 48;
    const inner = Math.max(12, slot * 0.78);
    const count = Math.max(1, n);
    const w = Math.max(4, Math.min(16, Math.floor((inner - (count - 1) * 2) / count)));
    const total = count * w + (count - 1) * 2;
    const start = -total / 2;
    const offsets = Array.from({ length: count }, (_, i) => start + i * (w + 2));
    return { w: w, offsets: offsets };
  }
  function paintMultiBar(plotId, frame, seriesList, axis, stacked) {
    const plot = document.getElementById(plotId);
    if (!plot) return;
    const L = chartBox(plot.ownerSVGElement);
    const max = axis.max;
    const n = (seriesList[0] && seriesList[0].values.length) || 0;
    const count = stacked ? 1 : Math.max(1, seriesList.length);
    const labelPad = (L.zoom || frame.labels) ? 20 : 0;
    L.innerPad = Math.max(L.innerPad || 24, 24 + count * 8 + labelPad);
    const xs = chartXPoints(Math.max(1, n), L);
    paintChartFrame(frame.grid, frame.axis, axis.ticks, frame.xLabels, L);
    const base = L.bottom;
    const span = base - L.top;
    const geom = chartGroupGeomN(xs, count);
    const tips = frame.tips || frame.xLabels;
    const type = L.type;
    const lift = L.zoom ? 8 : 6;
    const fancy = !!frame.fancy;
    const prefix = frame.fillPrefix || "gR";
    const defs = document.getElementById(frame.defs);
    const clipId = writePlotClip(defs, L, prefix);
    if (fancy) writeBarFills(defs, seriesList, prefix, false);
    else if (defs) defs.innerHTML = defsKeepHtml(defs) + (defs.dataset.chrome || "");
    const rx = fancy ? 4 : 3;
    let inner = "";
    let labels = "";
    for (let i = 0; i < n; i++) {
      const x = xs[i];
      if (stacked) {
        let yCursor = base;
        seriesList.forEach((s, si) => {
          const v = s.values[i] || 0;
          const h = v ? Math.max(3, (v / max) * span) : 0;
          const color = barPaintFill(s, si, i, frame, fancy);
          const y = yCursor - h;
          const hit = Math.max(h, L.zoom ? 18 : 14);
          inner += '<rect x="' + (x + geom.offsets[0]).toFixed(1) + '" y="' + (yCursor - hit).toFixed(1) + '" width="' + geom.w + '" height="' + hit.toFixed(1) + '" fill="transparent"' + chartHitTip((s.label || "Value") + " · " + (tips[i] || ""), v) + "/>";
          if (h) inner += '<rect x="' + (x + geom.offsets[0]).toFixed(1) + '" y="' + y + '" width="' + geom.w + '" height="' + h + '" rx="' + (si === seriesList.length - 1 ? rx : 1.5) + '" fill="' + color + '" pointer-events="none"/>';
          if ((L.zoom || frame.labels) && v && chartLabelFits(x + geom.offsets[0] + geom.w / 2, L)) labels += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + (x + geom.offsets[0] + geom.w / 2).toFixed(1) + '" y="' + (y - lift).toFixed(1) + '" text-anchor="middle" fill="' + ((s.colors && s.colors[i]) || s.color || reportPalette(si)) + '">' + chartValText(v, frame) + "</text>";
          yCursor = y;
        });
      } else {
        seriesList.forEach((s, si) => {
          const v = s.values[i] || 0;
          const h = v ? Math.max(4, (v / max) * span) : 0;
          const color = barPaintFill(s, si, i, frame, fancy);
          const y = base - h;
          const hit = Math.max(h, L.zoom ? 20 : 16);
          const ox = geom.offsets[Math.min(si, geom.offsets.length - 1)];
          inner += '<rect x="' + (x + ox).toFixed(1) + '" y="' + (base - hit).toFixed(1) + '" width="' + geom.w + '" height="' + hit.toFixed(1) + '" fill="transparent"' + chartHitTip((s.label || "Value") + " · " + (tips[i] || ""), v) + "/>";
          if (h) inner += '<rect x="' + (x + ox).toFixed(1) + '" y="' + y + '" width="' + geom.w + '" height="' + h + '" rx="' + rx + '" fill="' + color + '" pointer-events="none"/>';
          if ((L.zoom || frame.labels) && v && chartLabelFits(x + ox + geom.w / 2, L)) labels += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + (x + ox + geom.w / 2).toFixed(1) + '" y="' + (y - lift).toFixed(1) + '" text-anchor="middle" fill="' + ((s.colors && s.colors[i]) || s.color || reportPalette(si)) + '">' + chartValText(v, frame) + "</text>";
        });
      }
    }
    plot.innerHTML = (clipId ? '<g clip-path="url(#' + clipId + ')">' + inner + "</g>" : inner) + labels;
  }
  function chartValText(v, frame) {
    if (v == null || v === 0) return "";
    if (frame && frame.percent) {
      const n = Math.round(Number(v) * 10) / 10;
      return (n % 1 ? n.toFixed(1) : String(n)) + "%";
    }
    return String(v);
  }
  function chartLabelFits(x, L) {
    return x >= L.left + (L.zoom ? 20 : 14);
  }
  function clipLab(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  function chartBoxH(svg) {
    const L = chartBox(svg);
    L.left = L.zoom ? 152 : L.report ? 118 : 110;
    L.right = Math.max(L.left + 48, L.w - (L.zoom ? 28 : 20));
    return L;
  }
  function paintChartFrameH(gridId, axisId, ticks, yLabels, L) {
    const max = ticks[0] || 1;
    const xOf = (v) => L.left + (max ? (v / max) * (L.right - L.left) : 0);
    const grid = document.getElementById(gridId);
    if (grid) {
      grid.setAttribute("stroke", "#243040");
      grid.setAttribute("stroke-dasharray", "3 5");
      grid.setAttribute("stroke-width", "1");
      grid.innerHTML = ticks.map((t) => {
        const x = xOf(t).toFixed(1);
        return '<line x1="' + x + '" y1="' + L.top + '" x2="' + x + '" y2="' + L.bottom + '" />';
      }).join("") + '<line x1="' + L.left + '" y1="' + L.top + '" x2="' + L.left + '" y2="' + L.bottom + '" stroke-dasharray="none" stroke-width="1.15"/>';
    }
    const axis = document.getElementById(axisId);
    if (axis) {
      const n = Math.max(1, yLabels.length);
      let html = "";
      ticks.forEach((t) => {
        html += '<text x="' + xOf(t).toFixed(1) + '" y="' + L.xLabelY + '" text-anchor="middle">' + t + "</text>";
      });
      yLabels.forEach((lab, i) => {
        const y = L.top + ((i + 0.5) / n) * (L.bottom - L.top);
        html += '<text x="' + (L.left - 8) + '" y="' + y.toFixed(1) + '" text-anchor="end" dominant-baseline="middle" font-size="' + chartXFont(n, L) + '">' + clipLab(lab, 14) + "</text>";
      });
      axis.setAttribute("fill", themeColor("--text-2", "#8B9BB4"));
      axis.setAttribute("font-family", "Inter");
      axis.setAttribute("font-size", String(L.type));
      axis.setAttribute("font-weight", "600");
      axis.innerHTML = html;
    }
  }
  function paintHBar(plotId, frame, seriesList, axis, stacked) {
    const plot = document.getElementById(plotId);
    if (!plot) return;
    const L = chartBoxH(plot.ownerSVGElement);
    const max = axis.max || 1;
    const n = (seriesList[0] && seriesList[0].values.length) || 0;
    paintChartFrameH(frame.grid, frame.axis, axis.ticks, frame.xLabels, L);
    const span = L.right - L.left;
    const band = (L.bottom - L.top) / Math.max(1, n);
    const group = stacked ? 1 : Math.max(1, seriesList.length);
    const inner = band * 0.72;
    const bh = Math.max(3, Math.min(16, Math.floor((inner - (group - 1) * 2) / group)));
    const total = group * bh + (group - 1) * 2;
    const tips = frame.tips || frame.xLabels;
    const type = L.type;
    const fancy = !!frame.fancy;
    const prefix = frame.fillPrefix || "gR";
    const defs = document.getElementById(frame.defs);
    const clipId = writePlotClip(defs, L, prefix);
    if (fancy) writeBarFills(defs, seriesList, prefix, true);
    else if (defs) defs.innerHTML = defsKeepHtml(defs) + (defs.dataset.chrome || "");
    const rx = fancy ? 4 : 3;
    let innerHtml = "";
    let labels = "";
    for (let i = 0; i < n; i++) {
      const mid = L.top + (i + 0.5) * band;
      const startY = mid - total / 2;
      if (stacked) {
        let xCursor = L.left;
        seriesList.forEach((s, si) => {
          const v = s.values[i] || 0;
          const w = v ? Math.max(3, (v / max) * span) : 0;
          const color = barPaintFill(s, si, i, frame, fancy);
          const y = startY;
          const hit = Math.max(w, L.zoom ? 18 : 12);
          innerHtml += '<rect x="' + L.left + '" y="' + y.toFixed(1) + '" width="' + hit.toFixed(1) + '" height="' + bh + '" fill="transparent"' + chartHitTip((s.label || "Value") + " · " + (tips[i] || ""), v) + "/>";
          if (w) innerHtml += '<rect x="' + xCursor.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w + '" height="' + bh + '" rx="' + rx + '" fill="' + color + '" pointer-events="none"/>';
          if ((L.zoom || frame.labels) && v) labels += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + (xCursor + w + 6).toFixed(1) + '" y="' + (y + bh / 2).toFixed(1) + '" dominant-baseline="middle" fill="' + ((s.colors && s.colors[i]) || s.color || reportPalette(si)) + '">' + chartValText(v, frame) + "</text>";
          xCursor += w;
        });
      } else {
        seriesList.forEach((s, si) => {
          const v = s.values[i] || 0;
          const w = v ? Math.max(4, (v / max) * span) : 0;
          const color = barPaintFill(s, si, i, frame, fancy);
          const y = startY + si * (bh + 2);
          const hit = Math.max(w, L.zoom ? 20 : 14);
          innerHtml += '<rect x="' + L.left + '" y="' + y.toFixed(1) + '" width="' + hit.toFixed(1) + '" height="' + bh + '" fill="transparent"' + chartHitTip((s.label || "Value") + " · " + (tips[i] || ""), v) + "/>";
          if (w) innerHtml += '<rect x="' + L.left + '" y="' + y.toFixed(1) + '" width="' + w + '" height="' + bh + '" rx="' + rx + '" fill="' + color + '" pointer-events="none"/>';
          if ((L.zoom || frame.labels) && v) labels += '<text class="chart-val" font-size="' + type + '" font-weight="700" pointer-events="none" x="' + (L.left + w + 6).toFixed(1) + '" y="' + (y + bh / 2).toFixed(1) + '" dominant-baseline="middle" fill="' + ((s.colors && s.colors[i]) || s.color || reportPalette(si)) + '">' + chartValText(v, frame) + "</text>";
        });
      }
    }
    plot.innerHTML = (clipId ? '<g clip-path="url(#' + clipId + ')">' + innerHtml + "</g>" : innerHtml) + labels;
  }
  function paintCombo(plotId, frame, seriesList, axis) {
    if (!seriesList.length) return;
    if (seriesList.length < 2) {
      paintMultiBar(plotId, frame, seriesList, axis, false);
      return;
    }
    const bars = seriesList.slice(0, -1);
    const line = seriesList[seriesList.length - 1];
    paintMultiBar(plotId, frame, bars, axis, false);
    const plot = document.getElementById(plotId);
    if (!plot) return;
    const L = chartBox(plot.ownerSVGElement);
    const max = axis.max || 1;
    const n = (line.values || []).length;
    const xs = chartXPoints(Math.max(1, n), L);
    const yOf = (v) => chartY(v, max, L).toFixed(1);
    const color = line.color || reportPalette(bars.length);
    const strokeW = L.zoom ? 3.2 : 2.2;
    const hitR = L.zoom ? 16 : 12;
    const dotR = L.zoom ? 5.5 : 3.5;
    const tips = frame.tips || frame.xLabels;
    const arr = line.values || [];
    let html = plot.innerHTML;
    html += '<path fill="none" stroke="' + color + '" stroke-width="' + strokeW + '" d="M' + arr.map((v, i) => xs[i] + "," + yOf(v)).join(" L") + '" pointer-events="none"/>';
    arr.forEach((v, i) => {
      html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + hitR + '" fill="transparent"' + chartHitTip((line.label || "Value") + " · " + (tips[i] || ""), v) + "/>";
    });
    html += '<g class="chart-val" font-size="' + L.type + '" font-weight="700" pointer-events="none">';
    arr.forEach((v, i) => {
      html += '<circle cx="' + xs[i] + '" cy="' + yOf(v) + '" r="' + dotR + '" fill="' + color + '"/>';
      if ((L.zoom || frame.labels) && v) html += '<text x="' + xs[i] + '" y="' + (parseFloat(yOf(v)) - (L.zoom ? 16 : 12)).toFixed(1) + '" text-anchor="middle" fill="' + color + '">' + chartValText(v, frame) + "</text>";
    });
    html += "</g>";
    plot.innerHTML = html;
  }
  function stackSeries(series) {
    const n = (series[0] && series[0].values && series[0].values.length) || 0;
    const out = series.map((s) => Object.assign({}, s, { values: (s.values || []).slice() }));
    for (let i = 0; i < n; i++) {
      let run = 0;
      out.forEach((s) => { run += s.values[i] || 0; s.values[i] = run; });
    }
    return out;
  }
  function paintStackedArea(plotId, frame, seriesList, axis) {
    paintMultiLine(plotId, frame, stackSeries(seriesList).slice().reverse(), axis, true);
  }
  function paintReportDonut(arcsId, legendId, parts, mode) {
    const arcs = document.getElementById(arcsId);
    const legend = legendId ? document.getElementById(legendId) : null;
    if (!arcs) return;
    const pie = mode === "pie";
    const r = pie ? 10.5 : 14;
    const sw = pie ? 21 : 7;
    if (!parts.length) {
      arcs.innerHTML = '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="' + sw + '"/>';
      if (legend) legend.innerHTML = '<span class="set-desc">No data</span>';
      return;
    }
    const C = 2 * Math.PI * r;
    const sum = parts.reduce((a, b) => a + b.n, 0) || 1;
    let offset = 0;
    arcs.innerHTML = parts.map((p) => {
      const len = (p.n / sum) * C;
      const html = '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="' + p.stroke + '" stroke-width="' + sw + '" stroke-dasharray="' + len.toFixed(2) + " " + C.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 21 21)" />';
      offset += len;
      return html;
    }).join("");
    if (legend) {
      legend.innerHTML = parts.map((p) => {
        const pct = Math.round((p.n / sum) * 1000) / 10;
        return "<span><i style=\"background:" + p.stroke + "\"></i>" + escText(p.label) + " " + p.n + " · " + pct + "%</span>";
      }).join("");
    }
  }
  function paintZoomDonut(parts, pie) {
    const plot = document.getElementById("zoomPlot");
    const grid = document.getElementById("zoomGrid");
    const axis = document.getElementById("zoomAxis");
    if (grid) grid.innerHTML = "";
    if (axis) axis.innerHTML = "";
    if (!plot) return;
    const L = chartBox(plot.ownerSVGElement);
    const cx = L.w * 0.38;
    const cy = L.h * 0.5;
    const visual = Math.min(L.w, L.h) * 0.28;
    const r = pie ? visual * 0.5 : visual;
    const sw = pie ? visual : Math.max(18, visual * 0.22);
    const C = 2 * Math.PI * r;
    const sum = parts.reduce((a, b) => a + b.n, 0) || 1;
    let offset = 0;
    let html = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="' + sw + '"/>';
    parts.forEach((p) => {
      const len = (p.n / sum) * C;
      html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + p.stroke + '" stroke-width="' + sw + '" stroke-dasharray="' + len.toFixed(2) + " " + C.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cy + ')"/>';
      offset += len;
    });
    plot.innerHTML = html;
  }
  function reportChartAxis(w, series) {
    if (vizIsPercent(w.viz)) return { max: 100, ticks: [100, 75, 50, 25, 0] };
    return chartAxis(seriesMax(series, vizIsStacked(w.viz)));
  }
  function paintReportViz(plotId, frame, w, series) {
    frame.labels = !!w.labels;
    frame.percent = vizIsPercent(w.viz);
    frame.fancy = true;
    const axis = reportChartAxis(w, series);
    if (w.viz === "line" || w.viz === "area") paintMultiLine(plotId, frame, series, axis, w.viz === "area");
    else if (w.viz === "stackedarea") paintStackedArea(plotId, frame, series, axis);
    else if (w.viz === "combo") paintCombo(plotId, frame, series, axis);
    else if (vizIsH(w.viz)) paintHBar(plotId, frame, series, axis, w.viz === "hstacked" || w.viz === "hpercent");
    else paintMultiBar(plotId, frame, series, axis, w.viz === "stacked" || w.viz === "percent");
  }
  function paintReportZoom(id) {
    const w = findReportWidget(id);
    if (!w) return;
    const data = queryReport(w);
    if (vizIsRound(w.viz)) {
      paintZoomDonut(data.parts || [], w.viz === "pie");
      return;
    }
    const frame = { grid: "zoomGrid", axis: "zoomAxis", xLabels: data.labels || [], tips: data.tips || data.labels, defs: "zoomDefs", fillPrefix: "gRZ" };
    let defs = document.getElementById("zoomDefs");
    if (!defs) {
      const svg = document.querySelector("#chartModal .chart-zoom-svg");
      if (svg) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.id = "zoomDefs";
        svg.insertBefore(defs, svg.firstChild);
      }
    }
    paintReportViz("zoomPlot", frame, w, data.series || []);
  }
  function reportToolBtn(attr, tip, svg) {
    return '<button class="icon-btn chart-zoom-btn" type="button" ' + attr + ' aria-label="' + escAttr(tip) + '" data-tip="' + escAttr(tip) + '">' + svg + "</button>";
  }
  const ICO_EDIT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const ICO_DEL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
  const ICO_ZOOM = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/><path d="M11 8v6M8 11h6"/></svg>';
  function widgetCardHtml(w) {
    const tools = [];
    if (w.viz !== "kpis" && w.viz !== "kpi" && w.viz !== "table") {
      tools.push(reportToolBtn('data-chart-zoom="rw:' + escAttr(w.id) + '"', "Open a larger, readable view", ICO_ZOOM));
    }
    tools.push(reportToolBtn('data-report-edit="' + escAttr(w.id) + '"', "Edit chart", ICO_EDIT));
    tools.push(reportToolBtn('data-report-del="' + escAttr(w.id) + '"', "Remove chart", ICO_DEL));
    const handles = '<div class="rw-handles" aria-hidden="true"><i data-rs="n"></i><i data-rs="s"></i><i data-rs="e"></i><i data-rs="w"></i><i data-rs="ne"></i><i data-rs="nw"></i><i data-rs="se" data-tip="Drag to resize"></i><i data-rs="sw"></i></div>';
    const layout = ' style="grid-column:' + (w.gx + 1) + " / span " + w.gw + ";grid-row:" + (w.gy + 1) + " / span " + w.gh + '"';
    if (w.viz === "kpis") {
      return '<article class="card report-kpi-host" data-rw="' + escAttr(w.id) + '"' + layout + '><div class="card-h" data-tip="Drag to move"><div class="card-title">' + escText(w.title) + '</div><div class="chart-tools">' + tools.join("") + '</div></div><div class="kpis" id="rw-' + escAttr(w.id) + '-kpis"></div>' + handles + "</article>";
    }
    let body = "";
    if (w.viz === "kpi") body = '<div class="report-kpi-one" id="rw-' + escAttr(w.id) + '-kpi"></div>';
    else if (w.viz === "table") body = '<div class="report-table-wrap" id="rw-' + escAttr(w.id) + '-table"></div>';
    else if (vizIsRound(w.viz)) {
      body = '<div class="report-donut"><svg class="report-donut-svg" viewBox="0 0 42 42"><g id="rw-' + escAttr(w.id) + '-arcs"></g></svg></div>';
    } else {
      const cls = vizIsBarLike(w.viz) ? "bar-svg" : "chart-svg";
      body = '<svg class="' + cls + '" viewBox="0 0 760 248" preserveAspectRatio="none"><defs id="rw-' + escAttr(w.id) + '-defs"></defs><g id="rw-' + escAttr(w.id) + '-grid"></g><g id="rw-' + escAttr(w.id) + '-axis" fill="#8B9BB4" font-family="Inter" font-size="14" font-weight="600"></g><g id="rw-' + escAttr(w.id) + '-plot"></g></svg>';
    }
    return '<article class="card" data-rw="' + escAttr(w.id) + '"' + layout + '><div class="card-h" data-tip="Drag to move"><div class="card-title">' + escText(w.title) + '</div><div class="chart-tools">' + tools.join("") + '</div></div><div class="legend report-legend" id="rw-' + escAttr(w.id) + '-legend-row"></div>' + body + handles + "</article>";
  }
  function paintWidgetBody(w) {
    if (w.viz === "kpis") {
      paintKpiHost(document.getElementById("rw-" + w.id + "-kpis"), collectStats(w.project || null));
      return;
    }
    if (w.viz === "kpi") {
      const el = document.getElementById("rw-" + w.id + "-kpi");
      if (!el) return;
      const data = queryReport(Object.assign({}, w, { viz: "bar", split: "", y2: "", ys: [] }));
      const total = (data.series[0] && data.series[0].values || []).reduce((a, b) => a + b, 0);
      const yLab = reportLabelOf(reportCatalog(w.source, "y"), w.y, w.y);
      el.innerHTML = kpiHTML({
        open: "reports", label: w.title || yLab, value: w.y === "hours" ? total + "h" : total,
        trend: yLab, good: w.y !== "overdue",
        tip: widgetSub(w), bg: "var(--accent-dim)", fg: "var(--accent)", icon: KPI_ICON.list
      });
      return;
    }
    const data = queryReport(w);
    const legendRow = document.getElementById("rw-" + w.id + "-legend-row");
    if (legendRow) {
      if (vizIsRound(w.viz)) {
        const parts = data.parts || [];
        const sum = parts.reduce((a, p) => a + p.n, 0) || 1;
        legendRow.innerHTML = parts.map((p) => {
          const pct = Math.round((p.n / sum) * 1000) / 10;
          return "<span><i style=\"background:" + p.stroke + "\"></i>" + escText(p.label) + " " + p.n + " · " + pct + "%</span>";
        }).join("");
      } else {
        const series = data.series || [];
        legendRow.innerHTML = series.length > 1
          ? series.map((s) => "<span><i style=\"background:" + s.color + "\"></i>" + escText(s.label) + "</span>").join("")
          : "";
      }
    }
    if (w.viz === "table") {
      const el = document.getElementById("rw-" + w.id + "-table");
      if (!el) return;
      const heads = ["Category"].concat((data.series || []).map((s) => s.label));
      const rows = (data.rows || []).map((r) => {
        return "<tr><td class=\"title\">" + escText(r.label) + "</td>" + r.cells.map((c) => "<td>" + c + "</td>").join("") + "</tr>";
      }).join("") || '<tr><td colspan="' + heads.length + '">No data</td></tr>';
      el.innerHTML = '<table class="list"><thead><tr>' + heads.map((h) => "<th>" + escText(h) + "</th>").join("") + "</tr></thead><tbody>" + rows + "</tbody></table>";
      return;
    }
    if (vizIsRound(w.viz)) {
      paintReportDonut("rw-" + w.id + "-arcs", "", data.parts || [], w.viz);
      return;
    }
    const frame = {
      grid: "rw-" + w.id + "-grid",
      axis: "rw-" + w.id + "-axis",
      xLabels: data.labels || [],
      tips: data.tips || data.labels,
      defs: "rw-" + w.id + "-defs",
      fillPrefix: "gR" + w.id.replace(/[^a-zA-Z0-9]/g, "")
    };
    paintReportViz("rw-" + w.id + "-plot", frame, w, data.series || []);
  }
  function paintReportWidgets(force) {
    const host = document.getElementById("reportGrid");
    if (!host) return;
    const widgets = reportWidgets();
    const sig = reportLayoutSig(widgets);
    if (!reportDrag && (force || host.dataset.sig !== sig)) {
      host.dataset.sig = sig;
      if (!widgets.length) {
        host.innerHTML = '<div class="report-empty"><b>No charts yet</b><p>Add a chart and map X / Y to live tasks or projects.</p><button class="btn btn-primary" type="button" id="reportEmptyAdd">+ Add chart</button></div>';
      } else {
        host.innerHTML = widgets.map(widgetCardHtml).join("");
      }
    }
    widgets.forEach(paintWidgetBody);
    bindChartResize();
    bindReportLayout();
  }
  function reportGridMetrics() {
    const host = document.getElementById("reportGrid");
    if (!host) return null;
    const r = host.getBoundingClientRect();
    const styles = getComputedStyle(host);
    const gap = parseFloat(styles.columnGap || styles.gap) || 12;
    const row = parseFloat(styles.gridAutoRows) || 36;
    const colW = Math.max(8, (r.width - gap * (REPORT_COLS - 1)) / REPORT_COLS);
    return { gap: gap, row: row, colW: colW, left: r.left, top: r.top, width: r.width };
  }
  function persistReportLayouts(list) {
    prefs.reportWidgets = list;
    schedulePersist();
    const host = document.getElementById("reportGrid");
    if (host) host.dataset.sig = reportLayoutSig(list);
    list.forEach((w) => {
      const el = host && host.querySelector('[data-rw="' + w.id + '"]');
      applyReportLayoutStyle(el, w);
    });
  }
  function endReportDrag() {
    if (!reportDrag) return;
    const drag = reportDrag;
    reportDrag = null;
    document.body.classList.remove("is-report-drag");
    document.body.style.cursor = "";
    if (drag.el) drag.el.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onReportPointerMove);
    window.removeEventListener("pointerup", onReportPointerUp);
    window.removeEventListener("pointercancel", onReportPointerUp);
    const list = reportWidgets().map((w) => Object.assign({}, w));
    const hit = list.find((w) => w.id === drag.id);
    if (hit) {
      hit.gx = drag.gx; hit.gy = drag.gy; hit.gw = drag.gw; hit.gh = drag.gh;
      resolveReportOverlap(list, drag.id);
    }
    persistReportLayouts(list);
    requestAnimationFrame(() => paintCharts());
  }
  function onReportPointerMove(e) {
    if (!reportDrag) return;
    const m = reportGridMetrics();
    if (!m) return;
    const dCol = Math.round((e.clientX - reportDrag.startX) / (m.colW + m.gap));
    const dRow = Math.round((e.clientY - reportDrag.startY) / (m.row + m.gap));
    let gx = reportDrag.origin.gx;
    let gy = reportDrag.origin.gy;
    let gw = reportDrag.origin.gw;
    let gh = reportDrag.origin.gh;
    const kind = reportDrag.kind;
    if (kind === "move") {
      gx = reportDrag.origin.gx + dCol;
      gy = reportDrag.origin.gy + dRow;
    } else {
      if (kind.indexOf("e") >= 0) gw = reportDrag.origin.gw + dCol;
      if (kind.indexOf("s") >= 0) gh = reportDrag.origin.gh + dRow;
      if (kind.indexOf("w") >= 0) {
        gx = reportDrag.origin.gx + dCol;
        gw = reportDrag.origin.gw - dCol;
      }
      if (kind.indexOf("n") >= 0) {
        gy = reportDrag.origin.gy + dRow;
        gh = reportDrag.origin.gh - dRow;
      }
    }
    const next = clampReportLayout({ gx: gx, gy: gy, gw: gw, gh: gh });
    reportDrag.gx = next.gx; reportDrag.gy = next.gy; reportDrag.gw = next.gw; reportDrag.gh = next.gh;
    applyReportLayoutStyle(reportDrag.el, next);
  }
  function onReportPointerUp() {
    endReportDrag();
  }
  function bindReportLayout() {
    const host = document.getElementById("reportGrid");
    if (!host || host.dataset.layoutBound) return;
    host.dataset.layoutBound = "1";
    host.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const card = e.target.closest("[data-rw]");
      if (!card || !host.contains(card)) return;
      if (e.target.closest("button, a, input, select, textarea, .chart-hit")) return;
      const handle = e.target.closest("[data-rs]");
      const kind = handle ? handle.getAttribute("data-rs") : (e.target.closest(".card-h") ? "move" : "");
      if (!kind) return;
      const id = card.getAttribute("data-rw");
      const w = findReportWidget(id);
      if (!w) return;
      e.preventDefault();
      hideTip();
      reportDrag = {
        id: id,
        el: card,
        kind: kind,
        startX: e.clientX,
        startY: e.clientY,
        origin: { gx: w.gx, gy: w.gy, gw: w.gw, gh: w.gh },
        gx: w.gx, gy: w.gy, gw: w.gw, gh: w.gh
      };
      card.classList.add("is-dragging");
      document.body.classList.add("is-report-drag");
      const cursors = { move: "grabbing", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
      document.body.style.cursor = cursors[kind] || "grabbing";
      window.addEventListener("pointermove", onReportPointerMove);
      window.addEventListener("pointerup", onReportPointerUp);
      window.addEventListener("pointercancel", onReportPointerUp);
    });
  }
  function fillSelectList(sel, items, value) {
    if (!sel) return;
    sel.innerHTML = items.map((o) => '<option value="' + escAttr(o.id) + '">' + escText(o.label) + "</option>").join("");
    if (value != null && items.some((o) => String(o.id) === String(value))) sel.value = String(value);
  }
  function readReportYs() {
    return Array.from(document.querySelectorAll("#rwYs input:checked")).map((el) => el.value).filter(Boolean);
  }
  function paintReportYs(source, y, selected, splitOn) {
    const box = document.getElementById("rwYs");
    if (!box) return;
    const ys = reportCatalog(source, "y").filter((d) => d.id !== y);
    if (source === "tasks") ys.push({ id: "openRun", label: "Open (running)" });
    const sel = selected || [];
    box.innerHTML = ys.map((d) => {
      const on = sel.indexOf(d.id) >= 0 && !splitOn;
      return '<label><input type="checkbox" value="' + escAttr(d.id) + '"' + (on ? " checked" : "") + (splitOn ? " disabled" : "") + " /> " + escText(d.label) + "</label>";
    }).join("") || '<span class="set-desc">None</span>';
  }
  function reportFormValues() {
    const ys = readReportYs();
    return {
      title: (document.getElementById("rwTitle") && document.getElementById("rwTitle").value || "").trim(),
      viz: document.getElementById("rwViz") && document.getElementById("rwViz").value,
      source: document.getElementById("rwSource") && document.getElementById("rwSource").value,
      x: document.getElementById("rwX") && document.getElementById("rwX").value,
      y: document.getElementById("rwY") && document.getElementById("rwY").value,
      ys: ys,
      y2: ys[0] || "",
      split: document.getElementById("rwSplit") && document.getElementById("rwSplit").value,
      project: document.getElementById("rwProject") && document.getElementById("rwProject").value,
      sort: document.getElementById("rwSort") && document.getElementById("rwSort").value,
      top: document.getElementById("rwTop") && document.getElementById("rwTop").value,
      labels: document.getElementById("rwLabels") && document.getElementById("rwLabels").value === "1"
    };
  }
  function syncReportForm(keepYs) {
    const viz = document.getElementById("rwViz") && document.getElementById("rwViz").value;
    const source = document.getElementById("rwSource") && document.getElementById("rwSource").value;
    const isKpis = viz === "kpis";
    const isKpi = viz === "kpi";
    const hideAxes = isKpis;
    const hideX = isKpis || isKpi;
    const hideSeries = isKpis || isKpi || vizIsRound(viz);
    const hideOpts = isKpis;
    const wrap = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };
    wrap("rwSourceWrap", !isKpis);
    wrap("rwAxisRow", !hideAxes);
    wrap("rwXWrap", !hideX);
    wrap("rwYWrap", !isKpis);
    wrap("rwYsWrap", !hideSeries);
    wrap("rwSeriesRow", !hideSeries);
    wrap("rwOptRow", !hideOpts && !isKpi);
    wrap("rwOptRow2", !isKpis);
    wrap("rwLabelsWrap", !isKpis && !isKpi && viz !== "table");
    wrap("rwProjectWrap", !isKpis && source !== "projects");
    const dims = reportCatalog(source, "x");
    const ys = reportCatalog(source, "y");
    const xEl = document.getElementById("rwX");
    const yEl = document.getElementById("rwY");
    const splitEl = document.getElementById("rwSplit");
    const keepX = xEl && xEl.value;
    const keepY = yEl && yEl.value;
    const keepSplit = splitEl && splitEl.value;
    fillSelectList(xEl, dims, keepX);
    fillSelectList(yEl, ys, keepY);
    const xNow = xEl && xEl.value;
    fillSelectList(splitEl, [{ id: "", label: "None" }].concat(dims.filter((d) => d.id !== xNow)), keepSplit);
    const extras = keepYs != null ? keepYs : readReportYs();
    const splitOn = !!(splitEl && splitEl.value);
    paintReportYs(source, yEl && yEl.value, splitOn ? [] : extras.filter((id) => id !== (yEl && yEl.value)), splitOn);
    const xLab = document.querySelector("#rwXWrap label");
    const yLab = document.querySelector("#rwYWrap label");
    if (xLab) xLab.innerHTML = (vizIsH(viz) ? "Category" : "X axis") + ' <i class="req">*</i>';
    if (yLab) yLab.innerHTML = (vizIsH(viz) ? "Value" : "Y axis") + ' <i class="req">*</i>';
    const projEl = document.getElementById("rwProject");
    const projOpts = [{ id: "", label: "All live projects" }].concat(liveReportProjects().map((row) => ({ id: row.id, label: row.p.name })));
    fillSelectList(projEl, projOpts, projEl && projEl.value);
  }
  function applyReportTemplate(id) {
    const t = REPORT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    const set = (fid, val) => { const el = document.getElementById(fid); if (el && val != null) el.value = String(val); };
    set("rwTitle", t.title || "");
    set("rwViz", t.viz || "bar");
    set("rwSource", t.source || "tasks");
    const extras = t.ys || (t.y2 ? [t.y2] : []);
    syncReportForm(extras);
    set("rwX", t.x || "");
    set("rwY", t.y || "count");
    set("rwSplit", t.split || "");
    set("rwSort", t.sort || "category");
    set("rwTop", t.top || "0");
    set("rwLabels", t.labels ? "1" : "");
    reportDraftSpan = t.span === 1 ? 1 : 2;
    syncReportForm(extras);
    document.querySelectorAll("#rwTemps .pill").forEach((b) => b.classList.toggle("on", b.getAttribute("data-report-template") === id));
  }
  function paintReportTemps() {
    const box = document.getElementById("rwTemps");
    if (!box) return;
    box.innerHTML = REPORT_TEMPLATES.map((t) => {
      return '<button type="button" class="pill" data-report-template="' + escAttr(t.id) + '">' + escText(t.label) + "</button>";
    }).join("");
  }
  function openReportModal(id) {
    reportEditId = id || "";
    const w = id ? findReportWidget(id) : { viz: "bar", source: "tasks", x: "status", y: "count", y2: "", ys: [], split: "", project: "", span: 1, title: "", sort: "category", top: 0, labels: false };
    reportDraftSpan = w.span === 2 ? 2 : 1;
    const title = document.getElementById("reportModalTitle");
    const sub = document.getElementById("reportModalSub");
    const ok = document.getElementById("reportModalOk");
    if (title) title.textContent = id ? "Edit chart" : "Add chart";
    if (sub) sub.textContent = "Map workspace fields to a visual · closed projects stay off Reports";
    if (ok) ok.textContent = id ? "Save chart" : "Add chart";
    paintReportTemps();
    const extras = extraYsOf(w);
    const set = (fid, val) => { const el = document.getElementById(fid); if (el) el.value = val == null ? "" : String(val); };
    set("rwTitle", w.title || "");
    set("rwViz", w.viz || "bar");
    set("rwSource", w.source || "tasks");
    syncReportForm(extras);
    set("rwX", w.x || "status");
    set("rwY", w.y || "count");
    set("rwSplit", w.split || "");
    set("rwProject", w.project || "");
    set("rwSort", w.sort || "category");
    set("rwTop", w.top || 0);
    set("rwLabels", w.labels ? "1" : "");
    syncReportForm(extras);
    const box = document.getElementById("reportModal");
    if (box) box.hidden = false;
    hideTip();
    const input = document.getElementById("rwTitle");
    if (input) setTimeout(() => { try { input.focus(); } catch (err) {} }, 0);
  }
  function closeReportModal() {
    const box = document.getElementById("reportModal");
    if (box) box.hidden = true;
    reportEditId = "";
    hideTip();
  }
  function saveReportModal() {
    const v = reportFormValues();
    if (v.viz !== "kpis" && !v.title) {
      const input = document.getElementById("rwTitle");
      if (input) input.classList.add("invalid");
      return;
    }
    const input = document.getElementById("rwTitle");
    if (input) input.classList.remove("invalid");
    const widget = normalizeReportWidget({
      id: reportEditId || newReportId(),
      viz: v.viz,
      title: v.title || (v.viz === "kpis" ? "Delivery health" : "Chart"),
      source: v.source,
      x: v.x,
      y: v.y,
      ys: v.ys,
      y2: v.y2,
      split: v.split,
      project: v.project,
      sort: v.sort,
      top: v.top,
      labels: v.labels,
      span: v.viz === "kpis" ? 2 : reportDraftSpan
    });
    mutateReportWidgets((list) => {
      const i = list.findIndex((w) => w.id === widget.id);
      if (i >= 0) {
        widget.gx = list[i].gx;
        widget.gy = list[i].gy;
        widget.gw = list[i].gw;
        widget.gh = list[i].gh;
        list[i] = widget;
      } else {
        const size = defaultReportSize(widget.viz, widget.span);
        const slot = findReportSlot(list, size.gw, size.gh);
        widget.gx = slot.gx; widget.gy = slot.gy; widget.gw = slot.gw; widget.gh = slot.gh;
        list.push(widget);
      }
    });
    closeReportModal();
  }
  function setLegend(id, label, n, tip) {
    const el = document.getElementById(id);
    if (!el) return;
    const i = el.querySelector("i");
    el.textContent = "";
    if (i) el.appendChild(i);
    el.appendChild(document.createTextNode(label + " " + n));
    el.dataset.tip = tip;
  }
  function paintDonut(s) {
    const arcs = document.getElementById("donutArcs");
    const legend = document.getElementById("donutLegend");
    if (!arcs || !legend) return;
    const parts = visibleBoardStatuses().map((st) => {
      const tone = statusTone(st);
      return { label: st.label, n: (s.live && s.live[st.label]) || 0, stroke: tone.stroke };
    }).filter((p) => p.n > 0);
    if (!parts.length) {
      arcs.innerHTML = "";
      legend.innerHTML = '<span class="set-desc">No tasks yet</span>';
      return;
    }
    const C = 2 * Math.PI * 14;
    const sum = parts.reduce((a, b) => a + b.n, 0) || 1;
    let offset = 0;
    arcs.innerHTML = parts.map((p) => {
      const len = (p.n / sum) * C;
      const html = '<circle cx="21" cy="21" r="14" fill="none" stroke="' + p.stroke + '" stroke-width="7" stroke-dasharray="' + len.toFixed(2) + " " + C.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 21 21)" />';
      offset += len;
      return html;
    }).join("");
    legend.innerHTML = parts.map((p) => {
      return '<span data-open="board" data-tip="' + escAttr(statusCountTip(p.label, p.n)) + '"><i style="background:' + p.stroke + '"></i>' + escText(p.label) + " " + p.n + "</span>";
    }).join("");
    legend.querySelectorAll("[data-open]").forEach(bindOpen);
  }
  function overviewScope() {
    return wantsDashStats() ? null : currentProject;
  }
  function overviewLabel(scopeId) {
    return scopeId ? ((projects[scopeId] && projects[scopeId].name) || "Project") : "All live projects";
  }
  function paintOverviewHeading(allProjects) {
    const head = document.getElementById("ovHeading");
    if (head) head.textContent = allProjects ? "Workspace overview" : "Project overview";
  }
  function refreshDeadlines() {
    const box = document.getElementById("deadlineList");
    if (!box) return;
    const open = [];
    const scope = overviewScope();
    if (!scope) {
      Object.keys(tasks).forEach((id) => {
        const t = tasks[id];
        if (!t || isClosedProject(projectIdOf(t)) || !isOpen(t)) return;
        open.push([id, t]);
      });
    } else {
      eachProjectTask(scope, (id, t) => {
        if (isOpen(t)) open.push([id, t]);
      });
    }
    open.sort((a, b) => dueParts(a[1]).key - dueParts(b[1]).key);
    const top = open.slice(0, 4);
    box.innerHTML = top.map(([id, t]) => {
      return '<div class="deadline' + (isOverdue(t) ? " late" : "") + '" data-task="' + id + '"><div><div class="t">' + t.title + '</div><div class="d">' + dueParts(t).label + '</div></div>' + catalogTagHtml(t.priClass, t.pri, "pri") + "</div>";
    }).join("");
    box.querySelectorAll(".deadline").forEach(bindTask);
  }
  function wantsDashStats() {
    return activeView === "dashboard" || activeView === "reports";
  }
  function dueCardLiveIds() {
    return liveProjectIds().filter((id) => projects[id] && !isClosedProject(id));
  }
  function paintDueSidebar() {
    const ids = dueCardLiveIds();
    const allProjects = wantsDashStats() || !projects[currentProject];
    const tip = allProjects
      ? (ids.length ? "Open calendar · all live projects" : "Open calendar · create a project first")
      : "Open " + ((projects[currentProject] && projects[currentProject].name) || "this project") + " calendar";
    const calBtn = document.getElementById("dueCalBtn");
    if (calBtn) {
      if (allProjects) calBtn.dataset.calAll = "1";
      else delete calBtn.dataset.calAll;
      calBtn.dataset.tip = tip;
    }
    const filesBtn = document.getElementById("projectFilesBtn");
    const onProject = projectFilesAllowed();
    if (filesBtn) {
      filesBtn.hidden = !onProject;
      filesBtn.dataset.tip = onProject
        ? "List files attached to " + ((projects[currentProject] && projects[currentProject].name) || "this project")
        : "Open a project to see its files";
    }
    if (!onProject && isProjectFilesOpen()) closeProjectFiles();
    else if (isProjectFilesOpen()) paintProjectFilesTable();
  }
  function queueStats(heavy) {
    if (heavy || wantsDashStats()) statsHeavy = true;
    if (statsRaf) return;
    statsRaf = requestAnimationFrame(() => {
      statsRaf = 0;
      const doHeavy = statsHeavy;
      statsHeavy = false;
      refreshStats({ heavy: doHeavy });
    });
  }
  function refreshStats(opts) {
    const heavy = !opts || opts.heavy !== false;
    const paintDash = heavy || wantsDashStats();
    refreshWip();
    if (!Object.keys(projects).length) {
      paintEmptyWorkspace();
      updateSampleDesc();
      return { completed: 0, pct: 0, overdueShown: 0 };
    }
    const scope = overviewScope();
    const allProjects = !scope;
    const s = collectStats(scope);
    const scopeLabel = overviewLabel(scope);
    const p = projects[currentProject] || projects[Object.keys(projects)[0]];
    paintOverviewHeading(allProjects);
    const ringC = 2 * Math.PI * 36;
    const ring = document.getElementById("ovRing");
    if (ring) ring.setAttribute("stroke-dasharray", (ringC * s.pct / 100).toFixed(1) + " " + ringC.toFixed(1));
    const ovPct = document.getElementById("ovPct");
    if (ovPct) ovPct.textContent = s.pct + "%";
    const setNum = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = String(n); };
    setNum("ovTotal", s.total);
    setNum("ovDone", s.completed);
    setNum("ovProg", s.progress);
    setNum("ovOver", s.overdueShown);
    const ovOver = document.getElementById("ovOver");
    if (ovOver) ovOver.classList.toggle("late", s.overdueShown > 0);
    const ovTotalRow = document.getElementById("ovTotalRow");
    const ovDoneRow = document.getElementById("ovDoneRow");
    const ovProgRow = document.getElementById("ovProgRow");
    const ovOverRow = document.getElementById("ovOverRow");
    if (ovTotalRow) ovTotalRow.dataset.tip = allProjects
      ? s.total + " tasks across live projects · closed excluded"
      : s.total + " tasks on " + scopeLabel + " · open list";
    if (ovDoneRow) ovDoneRow.dataset.tip = allProjects
      ? s.completed + " completed across live projects"
      : s.completed + " completed";
    if (ovProgRow) ovProgRow.dataset.tip = allProjects
      ? s.progress + " open across live projects"
      : s.progress + " open (not completed)";
    if (ovOverRow) ovOverRow.dataset.tip = allProjects
      ? s.overdueShown + " overdue across live projects"
      : s.overdueShown + " overdue";
    paintDonut(s);
    paintAllCatalogs();
    const status = document.getElementById("projStatusTag");
    if (status && p) {
      fillProjectStatusSelect(status, p.status);
      const st = statusMeta(p.status);
      status.dataset.tip = st.label + " · " + s.progress + " open, " + s.overdueShown + " overdue";
    }
    if (currentProject) paintProjectSurfaces(currentProject);
    paintDueSidebar();
    refreshDeadlines();
    if (activeView === "calendar") paintCalendar(calendarAllProjects);
    const railEl = document.querySelector(".rail");
    if (railEl && !railEl.hidden) renderTeamRail();
    if (!paintDash) {
      return s;
    }
    const dash = allProjects ? s : collectStats(null);
    paintCharts();
    paintKpiGrids(dash);
    document.querySelectorAll(".kcard[data-task] .due").forEach((el) => {
      const t = tasks[el.closest("[data-task]").dataset.task];
      if (!t) return;
      el.classList.toggle("late", isOverdue(t));
    });
    document.querySelectorAll("table.list tr[data-task]").forEach((tr) => {
      const t = tasks[tr.dataset.task];
      const td = tr.children[3];
      if (td) td.classList.toggle("late", !!(t && isOverdue(t)));
    });
    document.querySelectorAll(".chip[data-task]").forEach((chip) => {
      const t = tasks[chip.dataset.task];
      if (!t) return;
      chip.classList.toggle("late", isOverdue(t));
    });
    paintNotifications(false);
    return s;
  }
  function applyCardStatusLook(card, listName) {
    const h3 = card.querySelector("h3");
    if (!h3) return;
    if (isDoneStatus(listName)) {
      card.style.opacity = ".85";
      h3.style.textDecoration = "line-through";
      h3.style.color = "var(--text-2)";
    } else {
      card.style.opacity = "";
      h3.style.textDecoration = "";
      h3.style.color = "";
    }
    const st = listStatusOf(listName);
    const t = tasks[card.dataset.task];
    card.classList.toggle("blocked", !!(t && isBlocked(t)));
    const statusCls = new Set(taskStatuses.map((s) => s.cls));
    const tags = card.querySelectorAll(".kfoot .tag");
    tags.forEach((tag) => {
      if (tag.dataset.cat === "pri") return;
      const hit = [...tag.classList].some((c) => statusCls.has(c));
      if (hit) {
        setCatalogTag(tag, st.cls, "status");
        tag.textContent = st.label;
      }
    });
  }
  function setTaskList(id, listName) {
    const t = tasks[id];
    if (!t) return;
    const from = t.list;
    t.list = listName;
    t.statusClass = listStatusOf(listName).cls;
    if (isDoneStatus(listName)) t.pct = 100;
    else if (isDoneStatus(from) && t.pct === 100) t.pct = 80;
    if (taskPane.dataset.currentTask === id) {
      const pctEl = document.getElementById("dTimePct");
      if (pctEl) pctEl.textContent = t.pct + "%";
    }
    const card = document.querySelector('.kcard[data-task="' + id + '"]');
    if (card) applyCardStatusLook(card, listName);
    const tr = document.querySelector('table.list tr[data-task="' + id + '"]');
    if (tr && tr.children[1]) {
      tr.children[1].innerHTML = catalogTagHtml(t.statusClass, listName, "status");
    }
    if (taskPane.dataset.currentTask === id) {
      const listEl = document.getElementById("dList");
      if (listEl) {
        listEl.value = listName;
        styleTagSelect(listEl, t.statusClass, listName);
      }
    }
    const hist = document.getElementById("historyPanel");
    if (from !== listName) addHistory(id, "AC moved this to " + listName);
    ensureBoardColumn(listName);
    syncTaskDom(id);
    pruneEmptyInactiveColumns();
    refreshWip();
    queueStats(false);
    schedulePersist();
    if (from !== listName) toast("Status → <em>" + listName + "</em>");
  }
  function bindCardDrag(card) {
    card.draggable = true;
    card.addEventListener("dragstart", (e) => {
      if (!canEditWorkspace()) { e.preventDefault(); toast(workspaceLockReason()); return; }
      dragCard = card;
      justDragged = true;
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.dataset.task);
      e.dataTransfer.effectAllowed = "move";
      hideTip();
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document.querySelectorAll(".board > [data-col]").forEach((c) => c.classList.remove("drop-target"));
      if (dragCard) {
        const col = dragCard.closest("[data-col]");
        if (col) setTaskList(dragCard.dataset.task, col.dataset.col);
      }
      dragCard = null;
      setTimeout(() => { justDragged = false; }, 80);
    });
  }
  function cardAfterCursor(col, y) {
    const cards = [...col.querySelectorAll(".kcard:not(.dragging)")];
    let closest = { offset: Number.NEGATIVE_INFINITY, el: null };
    cards.forEach((child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) closest = { offset, el: child };
    });
    return closest.el;
  }
  const boardRoot = document.getElementById("boardCols") || document.querySelector(".board");
  if (boardRoot) {
    boardRoot.addEventListener("dragover", (e) => {
      const col = e.target.closest("[data-col]");
      if (!col || !boardRoot.contains(col)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      boardRoot.querySelectorAll("[data-col]").forEach((c) => c.classList.toggle("drop-target", c === col));
      if (!dragCard) return;
      const after = cardAfterCursor(col, e.clientY);
      const addBtn = col.querySelector(".add-task");
      if (after) col.insertBefore(dragCard, after);
      else col.insertBefore(dragCard, addBtn);
    });
    boardRoot.addEventListener("dragleave", (e) => {
      const col = e.target.closest("[data-col]");
      if (col && !col.contains(e.relatedTarget)) col.classList.remove("drop-target");
    });
    boardRoot.addEventListener("drop", (e) => {
      const col = e.target.closest("[data-col]");
      if (!col) return;
      e.preventDefault();
      col.classList.remove("drop-target");
    });
    boardRoot.addEventListener("click", (e) => {
      const b = e.target.closest(".add-task");
      if (!b || !boardRoot.contains(b)) return;
      openModal("task", b.dataset.list || firstStatusLabel());
    });
  }
  document.querySelectorAll(".kcard[data-task]").forEach(bindCardDrag);
  function statusMeta(status) {
    const st = projectStatusOf(status);
    return { cls: st.cls, label: st.label, id: st.id, closed: !!st.closed };
  }
  function handleProjectStarClick(e, id) {
    if (!e.target.closest || !e.target.closest(".star")) return false;
    e.preventDefault();
    e.stopPropagation();
    const p = projects[id];
    if (!p) return true;
    p.pinned = !p.pinned;
    paintProjectSurfaces(id);
    sortProjList();
    schedulePersist();
    toast(p.pinned ? "Pinned <em>" + p.name + "</em> · stays at the top" : "Unpinned <em>" + p.name + "</em>");
    return true;
  }
  function projStatusOrder() {
    const used = Object.create(null);
    Object.keys(projects).forEach((id) => {
      const p = projects[id];
      if (!p) return;
      used[projectStatusOf(p.status).id] = true;
    });
    const out = [];
    projectStatuses.forEach((st) => {
      if (used[st.id]) out.push(st);
    });
    Object.keys(used).forEach((id) => {
      if (out.some((s) => s.id === id)) return;
      out.push(projectStatusOf(id));
    });
    return out;
  }
  function ensureProjStatusGroup(st) {
    const grid = document.getElementById("projGrid");
    if (!grid || !st) return null;
    let group = grid.querySelector('.proj-status-group[data-proj-status="' + st.id + '"]');
    if (!group) {
      group = document.createElement("section");
      group.className = "proj-status-group";
      group.dataset.projStatus = st.id;
      group.innerHTML = '<div class="proj-status-h">' + catalogTagHtml(st.cls, st.label, "proj") + '<span class="wip">0</span></div><div class="proj-status-cards"></div>';
      grid.appendChild(group);
    } else {
      const tag = group.querySelector(".proj-status-h .tag");
      if (tag) {
        setCatalogTag(tag, st.cls, "proj");
        tag.textContent = st.label;
      }
    }
    return group;
  }
  function placeProjectCard(art, id) {
    const p = projects[id];
    if (!p || !art) return;
    const st = projectStatusOf(p.status);
    const group = ensureProjStatusGroup(st);
    const cards = group && group.querySelector(".proj-status-cards");
    if (cards && art.parentElement !== cards) cards.appendChild(art);
  }
  function refreshProjStatusCounts() {
    document.querySelectorAll("#projGrid .proj-status-group").forEach((group) => {
      const cards = [...group.querySelectorAll(".proj[data-project]")];
      const visible = cards.filter((el) => !el.hidden).length;
      const wip = group.querySelector(".wip");
      const st = projectStatusOf(group.dataset.projStatus);
      if (wip) {
        wip.textContent = String(visible);
        wip.dataset.tip = visible + (visible === 1 ? " project" : " projects") + " · " + st.label;
      }
      group.hidden = visible === 0;
    });
  }
  function sortProjGridCards() {
    const order = liveProjectIds();
    document.querySelectorAll("#projGrid .proj-status-cards").forEach((cards) => {
      const items = [...cards.querySelectorAll(".proj[data-project]")];
      items.sort((a, b) => {
        const pa = projects[a.dataset.project];
        const pb = projects[b.dataset.project];
        const sa = pa && pa.pinned ? 0 : 1;
        const sb = pb && pb.pinned ? 0 : 1;
        if (sa !== sb) return sa - sb;
        const ia = order.indexOf(a.dataset.project);
        const ib = order.indexOf(b.dataset.project);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      items.forEach((el) => cards.appendChild(el));
    });
  }
  function syncProjStatusLayout() {
    const grid = document.getElementById("projGrid");
    if (!grid) return;
    projStatusOrder().forEach((st) => {
      const g = ensureProjStatusGroup(st);
      if (g) grid.appendChild(g);
    });
    sortProjGridCards();
    refreshProjStatusCounts();
  }
  function sortProjList() {
    const list = document.getElementById("projList");
    if (!list) return;
    const items = [...list.querySelectorAll(".proj-item")];
    items.sort((a, b) => {
      const pa = projects[a.dataset.project];
      const pb = projects[b.dataset.project];
      const sa = pa && pa.pinned ? 0 : 1;
      const sb = pb && pb.pinned ? 0 : 1;
      return sa - sb;
    });
    items.forEach((el) => list.appendChild(el));
    sortProjGridCards();
  }
  function teamMemberIds() {
    return Object.keys(roster).filter((id) => id !== "AC");
  }
  function isPersonActive(id) {
    const rec = roster[id];
    if (!rec) return false;
    if (id === "AC") return true;
    return rec.active !== false;
  }
  function activeTeamIds() {
    return teamMemberIds().filter(isPersonActive);
  }
  function isTeamMember(id) {
    return !!(id && id !== "AC" && roster[id]);
  }
  function validAssignee(id) {
    if (!isTeamMember(id)) return false;
    if (isPersonActive(id)) return true;
    return !!(modalMode === "task" && editingId && tasks[editingId] && tasks[editingId].assignee === id);
  }
  function validOwner(id) {
    if (!isTeamMember(id)) return false;
    if (isPersonActive(id)) return true;
    return !!(modalMode === "project" && editingId && projects[editingId] && projects[editingId].owner === id);
  }
  function paintProjectSurfaces(id) {
    const p = projects[id];
    if (!p) return;
    const st = statusMeta(p.status);
    const rec = roster[p.owner] || { name: p.owner };
    const s = collectStats(id);
    const closed = projectStatusOf(p.status).closed;
    const tip = p.name + " · " + st.label + (p.pinned ? " · pinned" : "") + " · " + s.pct + "% · " + s.total + " tasks · owner " + rec.name + (closed ? " · excluded from Dashboard and Reports" : "");
    const btn = document.querySelector('#projList .proj-item[data-project="' + id + '"]');
    if (btn) {
      btn.classList.toggle("pinned", !!p.pinned);
      btn.classList.toggle("closed", closed);
      btn.innerHTML = '<span class="dot" style="background:' + (p.dot || p.hex) + '"></span> ' + p.name + STAR_SVG;
      btn.dataset.tip = tip + " · click to open board · star to pin";
    }
    const art = document.querySelector('.proj[data-project="' + id + '"]');
    if (art) {
      art.classList.toggle("closed", closed);
      art.dataset.tip = tip + " · click for board";
      const h2 = art.querySelector("h2");
      if (h2) h2.innerHTML = '<span class="dot" style="background:' + (p.dot || p.hex) + '"></span> ' + p.name;
      const tag = art.querySelector(".tag");
      if (tag) { setCatalogTag(tag, st.cls, "proj"); tag.textContent = st.label; }
      const pEl = art.querySelector("p");
      if (pEl) pEl.textContent = p.desc;
      const spans = art.querySelectorAll(".meta span");
      if (spans[0]) spans[0].textContent = (p.startIso && p.endIso) ? (fmtIso(p.startIso) + " – " + fmtIso(p.endIso)) : (p.range || "—");
      if (spans[1]) spans[1].textContent = s.pct + "%";
      const bar = art.querySelector(".bar span");
      if (bar) {
        bar.style.width = s.pct + "%";
        bar.style.background = p.hex || p.dot;
      }
      const footWrap = art.querySelector(".proj-foot");
      if (footWrap) {
        const count = footWrap.querySelector("span:not(.av)");
        if (count) count.textContent = s.total + " tasks" + (s.overdueShown ? " · " + s.overdueShown + " overdue" : "");
        const oldAv = footWrap.querySelector(".av");
        if (oldAv) oldAv.outerHTML = avatarHTML(p.owner, "sm");
        else footWrap.insertAdjacentHTML("beforeend", avatarHTML(p.owner, "sm"));
      }
      placeProjectCard(art, id);
    }
  }
  function paintChrome(p) {
    if (!p) {
      const nameEl = document.getElementById("projName");
      if (nameEl) nameEl.textContent = "No project";
      const range = document.getElementById("projRange");
      if (range) { range.textContent = "—"; range.dataset.tip = "Create a project first"; }
      const ownerWrap = document.getElementById("projOwnerWrap");
      if (ownerWrap) { ownerWrap.textContent = "No owner"; ownerWrap.dataset.tip = "Pick an owner from Team Members"; }
      return;
    }
    const nameEl = document.getElementById("projName");
    if (nameEl) nameEl.textContent = p.name;
    const titleBtn = document.getElementById("projTitleBtn");
    if (titleBtn) titleBtn.dataset.tip = p.name + " · " + statusMeta(p.status).label + " · open projects list";
    const icon = document.getElementById("projTitleDot");
    if (icon) icon.style.background = p.hex || p.dot || "var(--accent)";
    const status = document.getElementById("projStatusTag");
    if (status) {
      fillProjectStatusSelect(status, p.status);
      const st = statusMeta(p.status);
      status.dataset.tip = p.name + " · " + st.label;
    }
    const range = document.getElementById("projRange");
    if (range) {
      const label = (p.startIso && p.endIso) ? (fmtIso(p.startIso) + " – " + fmtIso(p.endIso)) : (p.range || "—");
      range.textContent = label;
      range.dataset.tip = label + " · open calendar";
    }
    const ownerWrap = document.getElementById("projOwnerWrap");
    if (ownerWrap) {
      if (isTeamMember(p.owner) && roster[p.owner]) {
        const rec = roster[p.owner];
        ownerWrap.innerHTML = avatarHTML(p.owner, "sm") + " Owner · " + rec.name;
        ownerWrap.dataset.tip = rec.name + " · " + rec.role + " · owns this project";
      } else {
        ownerWrap.textContent = "No owner";
        ownerWrap.dataset.tip = "Pick an owner from Team Members";
      }
    }
  }
  function dueInCalMonth(t) {
    const due = parseDueDate(t);
    return !!(due && due.year === calViewYear && due.month === calViewMonth);
  }
  function dueInTodayMonth(t) {
    const due = parseDueDate(t);
    return !!(due && due.year === TODAY_Y && due.month === TODAY_M);
  }
  function calDayForDue(t) {
    const due = parseDueDate(t);
    if (!due || due.year !== calViewYear || due.month !== calViewMonth) return 0;
    return due.day >= 1 && due.day <= 31 ? due.day : 0;
  }
  function calDayForDueInMonth(t, year, month) {
    const due = parseDueDate(t);
    if (!due || due.year !== year || due.month !== month) return 0;
    return due.day;
  }
  function taskOnCalendar(t) {
    return !!(t && isOpen(t) && calDayForDue(t));
  }
  function taskOnSidebarCalendar(t) {
    return !!(t && isOpen(t) && calDayForDueInMonth(t, TODAY_Y, TODAY_M));
  }
  function collectCalendarCounts(projectId) {
    let overdue = 0, dueToday = 0, upcoming = 0, onCal = 0;
    const tally = (t) => {
      if (!taskOnSidebarCalendar(t)) return;
      onCal++;
      if (isOverdue(t)) overdue++;
      else if (isDueToday(t)) dueToday++;
      else if (dueParts(t).key > TODAY_KEY) upcoming++;
    };
    if (projectId) {
      eachProjectTask(projectId, (_, t) => tally(t));
    } else {
      Object.keys(tasks).forEach((id) => {
        const t = tasks[id];
        if (!t || isClosedProject(projectIdOf(t))) return;
        tally(t);
      });
    }
    return { overdue, dueToday, upcoming, onCal };
  }
  function calCellForDueIn(grid, t) {
    const day = calDayForDue(t);
    if (!day || !grid) return null;
    return grid.querySelector('.cell[data-cal-day="' + day + '"]:not([data-cal-out])');
  }
  function mountTask(id) {
    const t = tasks[id];
    if (!t) return;
    indexTask(id);
    const p = projects[t.project] || projects.website;
    const rec = roster[t.assignee] || roster.AC;
    if (!document.querySelector('.kcard[data-task="' + id + '"]')) {
      const col = boardCol(t.list);
      if (col) {
        const card = document.createElement("article");
        card.className = "kcard" + (isBlocked(t) ? " blocked" : "");
        card.dataset.task = id;
        card.innerHTML = "<h3>" + t.title + "</h3><div class=\"due" + (isOverdue(t) ? " late" : "") + "\">Due " + fmtIso(t.due) + "</div><div class=\"kfoot\">" + catalogTagHtml(t.priClass, t.pri, "pri") + avatarHTML(t.assignee, "sm") + "</div>";
        col.insertBefore(card, col.querySelector(".add-task"));
        bindTask(card);
        bindCardDrag(card);
        applyCardStatusLook(card, t.list);
      }
    }
    if (!document.querySelector('#taskTbody tr[data-task="' + id + '"]')) {
      const tr = document.createElement("tr");
      tr.dataset.task = id;
      const dueShort = dueParts(t).label;
      tr.innerHTML = "<td class=\"title\"><span class=\"dot\" style=\"background:" + p.dot + "\"></span> " + t.title + "</td><td>" + catalogTagHtml(t.statusClass, t.list, "status") + "</td><td>" + catalogTagHtml(t.priClass, t.pri, "pri") + "</td><td" + (isOverdue(t) ? " style=\"color:var(--danger-text)\"" : "") + ">" + dueShort + "</td><td>" + avatarHTML(t.assignee, "sm") + "</td>";
      const tbody = document.getElementById("taskTbody");
      if (tbody) {
        tbody.appendChild(tr);
        bindTask(tr);
      }
    }
  }
  function isoToMs(value) {
    const p = parseIsoDate(value);
    if (!p) return NaN;
    return Date.UTC(p.y, p.mo - 1, p.d);
  }
  function msToShort(ms) {
    const d = new Date(ms);
    return fmtIso(ymdIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  }
  function ganttRange() {
    const p = projects[currentProject];
    return { start: (p && p.startIso) || "2026-06-01", end: (p && p.endIso) || "2026-09-12" };
  }
  function ganttPct(iso, range) {
    const t = isoToMs(iso);
    const a = isoToMs(range.start);
    const b = isoToMs(range.end);
    if (!isFinite(t) || !isFinite(a) || !isFinite(b) || b <= a) return 0;
    return Math.max(0, Math.min(100, ((t - a) / (b - a)) * 100));
  }
  function currentTaskEntries() {
    const out = [];
    eachProjectTask(currentProject, (id, t) => {
      if (taskMatchesFilters(t)) out.push([id, t]);
    });
    return out;
  }
  function purgeTaskDomExcept(projectId) {
    document.querySelectorAll(".kcard[data-task], #taskTbody tr[data-task]").forEach((el) => {
      const t = tasks[el.dataset.task];
      if (!t || t.project !== projectId) el.remove();
    });
  }
  function ensureProjectTasksMounted(projectId) {
    purgeTaskDomExcept(projectId);
    if (!projectId) return;
    projectTaskIds(projectId).forEach(mountTask);
  }
  function paintGantt() {
    const box = document.querySelector(".gantt");
    if (!box) return;
    const range = ganttRange();
    const weeks = document.getElementById("ganttWeeks");
    if (weeks) {
      const a = isoToMs(range.start);
      const b = isoToMs(range.end);
      weeks.innerHTML = Array.from({ length: 10 }, (_, i) => {
        const ms = a + ((b - a) * i) / 9;
        return "<span>" + msToShort(ms) + "</span>";
      }).join("");
    }
    box.querySelectorAll(".gantt-row, .gantt-empty").forEach((el) => el.remove());
    const rows = currentTaskEntries().sort((a, b) => dueParts(a[1]).key - dueParts(b[1]).key);
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "page-sub gantt-empty";
      empty.style.margin = "12px";
      empty.textContent = currentProject ? "No tasks on this project" : "Create a project to see the timeline";
      box.appendChild(empty);
      return;
    }
    const todayPct = ganttPct(todayIso(), range);
    rows.forEach(([id, t]) => {
      const p = projects[t.project] || { name: "Task", dim: "var(--accent-dim)", dot: "var(--accent)", fg: "var(--accent-fg)" };
      const startIso = toIso(t.start) || range.start;
      const dueIso = toIso(t.due) || startIso;
      let left = ganttPct(startIso, range);
      let right = ganttPct(dueIso, range);
      if (right < left) { const tmp = left; left = right; right = tmp; }
      const width = Math.max(6, right - left);
      const row = document.createElement("div");
      row.className = "gantt-row";
      row.dataset.task = id;
      row.style.opacity = isDoneStatus(t.list) ? ".55" : "";
      row.innerHTML = "<div class=\"lab\"><span class=\"dot\" style=\"background:" + p.dot + "\"></span> " + t.title + "</div><div class=\"track\"><div class=\"grid\"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class=\"today\" style=\"left:" + todayPct + "%\"></div><div class=\"gbar\" style=\"left:" + left + "%;width:" + width + "%;background:" + p.dim + ";border:1px solid " + p.dot + ";color:" + p.fg + "\">" + dueParts(t).label + "</div></div>";
      box.appendChild(row);
      bindTask(row);
    });
  }
  function calendarTaskEntries(allProjects) {
    if (!allProjects) {
      const out = [];
      eachProjectTask(currentProject, (id, t) => { if (t && taskMatchesFilters(t)) out.push([id, t]); });
      return out;
    }
    return Object.entries(tasks).filter(([, t]) => t && !isClosedProject(projectIdOf(t)) && taskMatchesFilters(t, true));
  }
  function calDaysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }
  function paintCalHeader() {
    const month = CAL_MONTH_NAMES[calViewMonth - 1] + " " + calViewYear;
    const onToday = calViewYear === TODAY_Y && calViewMonth === TODAY_M;
    const noteText = onToday
      ? "Today · " + todayLabel()
      : "Today · " + todayLabel() + " · use Today to return";
    const title = document.getElementById("calTitle");
    if (title) title.textContent = month;
    const popTitle = document.getElementById("calPopTitle");
    if (popTitle) popTitle.textContent = month;
    const note = document.getElementById("calTodayNote");
    if (note) note.textContent = noteText;
    const popNote = document.getElementById("calPopTodayNote");
    if (popNote) popNote.textContent = noteText;
    ["calTodayBtn", "calPopToday"].forEach((id) => {
      const todayBtn = document.getElementById(id);
      if (!todayBtn) return;
      todayBtn.disabled = onToday;
      todayBtn.classList.toggle("on", onToday);
      todayBtn.dataset.tip = "Jump to today · " + todayLabel();
    });
    const scope = document.getElementById("calPopScope");
    if (scope) {
      scope.textContent = (calPopAllProjects || !projects[currentProject])
        ? "All live projects"
        : projects[currentProject].name;
    }
  }
  function calendarGridEls() {
    return ["calGrid", "calPopGrid"].map((id) => document.getElementById(id)).filter(Boolean);
  }
  function isCalendarPopOpen() {
    const box = document.getElementById("calModal");
    return !!(box && !box.hidden);
  }
  function closeCalendarPop() {
    const box = document.getElementById("calModal");
    if (box) box.hidden = true;
  }
  function openCalendarPop(wantAll) {
    calPopAllProjects = !!(wantAll || !projects[currentProject]);
    calViewYear = TODAY_Y;
    calViewMonth = TODAY_M;
    hideTip();
    closePops();
    const box = document.getElementById("calModal");
    if (!box) return;
    box.hidden = false;
    buildCalendarGrid();
    paintCalendar();
  }
  function calCellHTML(y, m, d, mute) {
    const iso = ymdIso(y, m, d);
    const parsed = parseIsoDate(iso);
    const dow = parsed ? parsed.dow : new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const today = y === TODAY_Y && m === TODAY_M && d === TODAY_D;
    const cls = "cell" + (mute ? " mute" : "") + (today ? " today" : "") + (isWeekendDow(dow) ? " weekend" : "");
    return '<div class="' + cls + '"' + (mute ? ' data-cal-out="1"' : ' data-cal-day="' + d + '"') + ' data-cal-iso="' + iso + '"><div class="n">' + d + "</div></div>";
  }
  function buildCalendarGrid() {
    const grids = calendarGridEls();
    if (!grids.length) return;
    const dowLabels = weekDowLabels();
    const first = new Date(Date.UTC(calViewYear, calViewMonth - 1, 1));
    const startDow = weekColOf(first.getUTCDay());
    const dim = calDaysInMonth(calViewYear, calViewMonth);
    const prev = calViewMonth === 1 ? { y: calViewYear - 1, m: 12 } : { y: calViewYear, m: calViewMonth - 1 };
    const next = calViewMonth === 12 ? { y: calViewYear + 1, m: 1 } : { y: calViewYear, m: calViewMonth + 1 };
    const prevDim = calDaysInMonth(prev.y, prev.m);
    let html = dowLabels.map((d) => '<div class="dow">' + d + "</div>").join("");
    for (let i = startDow - 1; i >= 0; i--) {
      html += calCellHTML(prev.y, prev.m, prevDim - i, true);
    }
    for (let d = 1; d <= dim; d++) {
      html += calCellHTML(calViewYear, calViewMonth, d, false);
    }
    const totalCells = startDow + dim;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      html += calCellHTML(next.y, next.m, d, true);
    }
    grids.forEach((grid) => { grid.innerHTML = html; });
    paintCalHeader();
  }
  function closeDatePicker() {
    const pop = document.getElementById("datePop");
    if (pop) pop.hidden = true;
    datePickInput = null;
  }
  function placeDatePop(anchor) {
    const pop = document.getElementById("datePop");
    if (!pop || !anchor) return;
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth || 276;
    const ph = Math.max(pop.offsetHeight, 320);
    let left = r.left;
    let top = r.bottom + 6;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pw - 8);
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }
  function paintDatePicker(reposition) {
    const pop = document.getElementById("datePop");
    const grid = document.getElementById("datePopGrid");
    const title = document.getElementById("datePopTitle");
    if (!pop || !grid) return;
    if (title) title.textContent = CAL_MONTH_NAMES[datePickMonth - 1] + " " + datePickYear;
    const selected = datePickInput ? parseIsoDate(datePickInput.value) : null;
    const dowLabels = weekDowLabels();
    const first = new Date(Date.UTC(datePickYear, datePickMonth - 1, 1));
    const startDow = weekColOf(first.getUTCDay());
    const dim = calDaysInMonth(datePickYear, datePickMonth);
    const prev = datePickMonth === 1 ? { y: datePickYear - 1, m: 12 } : { y: datePickYear, m: datePickMonth - 1 };
    const next = datePickMonth === 12 ? { y: datePickYear + 1, m: 1 } : { y: datePickYear, m: datePickMonth + 1 };
    const prevDim = calDaysInMonth(prev.y, prev.m);
    let html = dowLabels.map((d) => '<div class="dow">' + d + "</div>").join("");
    const addBtn = (y, m, d, mute) => {
      const iso = ymdIso(y, m, d);
      const parsed = parseIsoDate(iso);
      const dow = parsed ? parsed.dow : new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const today = y === TODAY_Y && m === TODAY_M && d === TODAY_D;
      const on = selected && selected.iso === iso;
      const hol = holidayOn(iso);
      const cls = (mute ? " mute" : "") + (today ? " today" : "") + (isWeekendDow(dow) ? " weekend" : "") + (hol ? " holiday" : "") + (on ? " on" : "");
      html += '<button type="button" class="' + cls.trim() + '" data-pick-iso="' + iso + '"' + (hol ? ' data-tip="' + escAttr(hol.name + " · holiday") + '"' : "") + ">" + d + "</button>";
    };
    for (let i = startDow - 1; i >= 0; i--) addBtn(prev.y, prev.m, prevDim - i, true);
    for (let d = 1; d <= dim; d++) addBtn(datePickYear, datePickMonth, d, false);
    const filled = startDow + dim;
    for (let d = 1; d <= 42 - filled; d++) addBtn(next.y, next.m, d, true);
    grid.innerHTML = html;
    if (reposition && datePickInput) placeDatePop(datePickInput);
  }
  function setDateFieldValue(input, iso) {
    if (!input) return;
    input.value = dateFieldText(iso);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function openDatePicker(input) {
    if (!input) return;
    datePickInput = input;
    const parsed = parseIsoDate(input.value) || parseIsoDate(todayIso());
    datePickYear = parsed ? parsed.y : TODAY_Y;
    datePickMonth = parsed ? parsed.mo : TODAY_M;
    paintDatePicker(true);
  }
  function pickDateIso(iso) {
    if (!datePickInput) return Promise.resolve();
    const input = datePickInput;
    const warnIds = { taskStart: 1, taskDue: 1, projStart: 1, projEnd: 1, subtaskDue: 1 };
    const finish = () => {
      datePickInput = input;
      setDateFieldValue(input, iso);
      closeDatePicker();
      markInvalid(input, false);
      if (input.id === "taskStart" || input.id === "taskDue") syncTaskSchedule(input.id === "taskStart" ? "start" : "due");
    };
    if (warnIds[input.id] && isNonWorking(iso)) {
      closeDatePicker();
      datePickInput = input;
      const reason = nonWorkingReason(iso);
      return askConfirm({
        title: "Non-working day",
        body: holidayDateLabel(iso) + " is a " + reason + ". Task and project dates can stay on this day if you confirm.",
        okLabel: "Use date",
        cancelLabel: "Pick another",
        danger: false
      }).then((ok) => {
        if (!ok) {
          openDatePicker(input);
          return;
        }
        finish();
      });
    }
    finish();
    return Promise.resolve();
  }
  let estLock = false;
  let taskEstUnit = "days";
  const EST_MAX_CHARS = 5;
  function sanitizeEstInput(value) {
    let s = String(value || "").replace(/[^\d.]/g, "");
    const dot = s.indexOf(".");
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
    if (s.length > EST_MAX_CHARS) s = s.slice(0, EST_MAX_CHARS);
    return s;
  }
  function formatEstDisplay(n) {
    if (!(n > 0) || !isFinite(n)) return "";
    const x = roundHours(n);
    let s;
    if (x >= 10000) s = String(Math.min(99999, Math.round(x)));
    else if (x >= 1000) s = String(Math.round(x));
    else if (x >= 100) s = String(roundHours(Math.round(x * 10) / 10));
    else s = String(x);
    return s.length > EST_MAX_CHARS ? s.slice(0, EST_MAX_CHARS) : s;
  }
  function setTaskEstUnit(unit) {
    taskEstUnit = unit === "hours" ? "hours" : "days";
    const sel = document.getElementById("taskEstUnit");
    if (sel && sel.value !== taskEstUnit) sel.value = taskEstUnit;
    const input = document.getElementById("taskEst");
    if (input) {
      input.placeholder = taskEstUnit === "days" ? "1" : "8";
      input.dataset.tip = taskEstUnit === "days"
        ? "Working days · hours = days × " + hoursPerDay() + "h"
        : "Hours · days = hours ÷ " + hoursPerDay() + "h";
    }
  }
  function readEstHours() {
    const raw = parseFloat((document.getElementById("taskEst") || {}).value);
    if (!(raw > 0) || !isFinite(raw)) return 0;
    return taskEstUnit === "days" ? roundHours(raw * hoursPerDay()) : roundHours(raw);
  }
  function paintEstHint(hours) {
    const hint = document.getElementById("taskEstHint");
    if (!hint) return;
    const hpd = hoursPerDay();
    const h = hours > 0 ? hours : 0;
    const days = h ? roundHours(h / hpd) : 0;
    const span = h ? estSpanDays(h) : 0;
    hint.textContent = h
      ? h + "h · " + days + "d at " + hpd + "h/day · due " + span + " workday" + (span === 1 ? "" : "s")
      : "Enter a value · " + hpd + "h per working day";
  }
  function writeEstFromHours(hours) {
    const input = document.getElementById("taskEst");
    if (!input) return;
    const h = roundHours(hours);
    const shown = taskEstUnit === "days" ? roundHours(h / hoursPerDay()) : h;
    input.value = formatEstDisplay(shown);
    paintEstHint(h);
  }
  function syncTaskSchedule(source) {
    if (estLock) return;
    const fields = document.getElementById("taskFields");
    if (fields && fields.hidden) return;
    const startEl = document.getElementById("taskStart");
    const dueEl = document.getElementById("taskDue");
    if (!startEl || !dueEl) return;
    estLock = true;
    const start = parseIsoDate(startEl.value);
    const due = parseIsoDate(dueEl.value);
    let hours = readEstHours();
    if (source === "hours" || source === "days") {
      hours = readEstHours();
      if (hours > 0 && start) {
        fillDateField(dueEl, addWorkingDays(start.iso, estSpanDays(hours) - 1));
        markInvalid(dueEl, false);
      } else if (hours > 0 && due && !start) {
        fillDateField(startEl, subWorkingDays(due.iso, estSpanDays(hours) - 1));
        markInvalid(startEl, false);
      }
    } else if (source === "start") {
      if (hours > 0 && start) {
        fillDateField(dueEl, addWorkingDays(start.iso, estSpanDays(hours) - 1));
        markInvalid(dueEl, false);
      } else if (start && due) {
        const span = workingDaysInclusive(start.iso, due.iso);
        hours = roundHours(span * hoursPerDay());
        writeEstFromHours(hours);
      }
    } else if (source === "due") {
      if (start && due) {
        if (due.iso < start.iso) {
          estLock = false;
          markInvalid(dueEl, true);
          toast("Due date must be on or after start date");
          return;
        }
        const span = workingDaysInclusive(start.iso, due.iso);
        hours = roundHours(Math.max(span, 1) * hoursPerDay());
        writeEstFromHours(hours);
      } else if (hours > 0 && due && !start) {
        fillDateField(startEl, subWorkingDays(due.iso, estSpanDays(hours) - 1));
        markInvalid(startEl, false);
      }
    }
    paintEstHint(readEstHours());
    const projRange = projectDateRange();
    if (projRange) {
      const startIsoVal = start && start.iso;
      const dueIsoVal = due && due.iso;
      if (startIsoVal && (startIsoVal < projRange.start || startIsoVal > projRange.end)) markInvalid(startEl, true);
      if (dueIsoVal && (dueIsoVal < projRange.start || dueIsoVal > projRange.end)) markInvalid(dueEl, true);
    }
    estLock = false;
  }
  function shiftCalMonth(delta) {
    calViewMonth += delta;
    if (calViewMonth < 1) { calViewMonth = 12; calViewYear--; }
    else if (calViewMonth > 12) { calViewMonth = 1; calViewYear++; }
    buildCalendarGrid();
    paintCalendar(calendarAllProjects);
  }
  function goCalToday() {
    calViewYear = TODAY_Y;
    calViewMonth = TODAY_M;
    buildCalendarGrid();
    paintCalendar(calendarAllProjects);
  }
  function paintCalHolidaysIn(grid) {
    if (!grid) return;
    holidays.forEach((h) => {
      const cell = grid.querySelector('.cell[data-cal-iso="' + h.date + '"]');
      if (!cell) return;
      const chip = document.createElement("span");
      chip.className = "chip holiday";
      chip.textContent = h.name;
      chip.dataset.tip = h.name + " · holiday · " + holidayDateLabel(h.date);
      cell.appendChild(chip);
    });
  }
  function paintCalendarChips(grid, scopeAll) {
    if (!grid) return;
    grid.querySelectorAll(".chip").forEach((el) => el.remove());
    calendarTaskEntries(scopeAll).forEach(([id, t]) => {
      if (!isOpen(t) || !dueInCalMonth(t)) return;
      const cell = calCellForDueIn(grid, t);
      if (!cell) return;
      const p = projects[t.project] || { dim: "var(--accent-dim)", fg: "var(--accent-fg)" };
      const chip = document.createElement("span");
      chip.className = "chip" + (isOverdue(t) ? " late" : "") + (isDueToday(t) ? " today-due" : "");
      chip.dataset.task = id;
      chip.style.background = p.dim;
      chip.style.color = p.fg;
      if (isDoneStatus(t.list)) chip.style.textDecoration = "line-through";
      chip.textContent = t.title;
      cell.appendChild(chip);
      bindTask(chip);
    });
    paintCalHolidaysIn(grid);
  }
  function paintCalendar(allProjects) {
    if (allProjects != null) calendarAllProjects = !!allProjects;
    const grids = calendarGridEls();
    if (!grids.length) return;
    if (grids.some((grid) => !grid.querySelector(".cell[data-cal-day]"))) buildCalendarGrid();
    else paintCalHeader();
    paintCalendarChips(document.getElementById("calGrid"), calendarAllProjects);
    if (isCalendarPopOpen()) paintCalendarChips(document.getElementById("calPopGrid"), calPopAllProjects);
  }
  function collectNotifItems() {
    const items = [];
    let dueN = 0;
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t || isClosedProject(projectIdOf(t))) return;
      const p = projects[t.project];
      const who = isTeamMember(t.assignee) ? roster[t.assignee].name : "";
      const proj = (p && p.name) || "Project";
      const extra = [proj, who].filter(Boolean).join(" · ");
      if (isDueToday(t)) dueN++;
      if (isOverdue(t)) items.push({ id, title: t.title, sub: "Overdue · " + extra, sort: 0, key: dueParts(t).key });
      else if (isBlocked(t)) items.push({ id, title: t.title, sub: "Blocked · " + extra, sort: 1, key: dueParts(t).key });
      else if (isDueToday(t)) items.push({ id, title: t.title, sub: "Due today · " + extra, sort: 2, key: dueParts(t).key });
    });
    items.sort((a, b) => a.sort - b.sort || a.key - b.key);
    return { items, dueN };
  }
  function paintNotifList(items, dueN) {
    const list = document.getElementById("notifList");
    if (!list) return;
    if (!prefs.notify) {
      list.innerHTML = '<p class="empty-note">Notifications are off</p>';
    } else if (!items.length && !dueN) {
      list.innerHTML = '<p class="empty-note">No notifications</p>';
    } else {
      list.innerHTML = items.map((it) => {
        return '<a href="#" data-task="' + it.id + '">' + it.title + "<span>" + it.sub + "</span></a>";
      }).join("") + (dueN
        ? '<a href="#" data-cal-pop="1" data-cal-all="1" id="notifDueLink">' + (dueN === 1 ? "1 task due today" : dueN + " tasks due today") + "<span>Open calendar for " + todayLabel() + "</span></a>"
        : "");
      list.querySelectorAll("[data-task]").forEach(bindTask);
    }
    notifListDirty = false;
  }
  function paintNotifications(fillList) {
    const badge = document.getElementById("notifBadge");
    const head = document.getElementById("notifHead");
    const btn = document.getElementById("notifBtn");
    const pop = document.getElementById("notifPop");
    const { items, dueN } = collectNotifItems();
    const unread = prefs.notify ? items.length : 0;
    if (badge) {
      badge.textContent = String(unread);
      badge.hidden = unread === 0;
    }
    if (head) head.textContent = "Notifications · " + unread;
    if (btn) btn.dataset.tip = unread ? unread + " unread · overdue, blocked, due today" : "No unread notifications";
    const open = pop && !pop.hidden;
    if (fillList !== false && (fillList === true || open || notifListDirty)) {
      if (open || fillList === true) paintNotifList(items, dueN);
      else notifListDirty = true;
    } else {
      notifListDirty = true;
    }
  }
  const MULTI_FILTERS = {
    assignee: { id: "filterAssignee", all: "All assignees" },
    status: { id: "filterStatus", all: "All statuses" },
    pri: { id: "filterPri", all: "All priorities" },
    tag: { id: "filterTag", all: "All tags" }
  };
  const boardFilters = { assignee: [], status: [], pri: [], tag: [] };
  let filterCatalogSig = "";
  function escText(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function escAttr(s) {
    return escText(s).replace(/"/g, "&quot;");
  }
  function filterAllows(key, value) {
    const sel = boardFilters[key] || [];
    if (!sel.length) return true;
    return sel.indexOf(value) !== -1;
  }
  function filterAllowsAny(key, values) {
    const sel = boardFilters[key] || [];
    if (!sel.length) return true;
    const list = values || [];
    for (let i = 0; i < sel.length; i++) if (list.indexOf(sel[i]) !== -1) return true;
    return false;
  }
  function filterValueLabels(key) {
    const map = {};
    if (key === "assignee") {
      Object.keys(roster).forEach((id) => { map[id] = roster[id].name; });
    }
    return map;
  }
  function paintFilterButton(key) {
    const spec = MULTI_FILTERS[key];
    const btn = document.getElementById(spec.id);
    if (!btn) return;
    const sel = boardFilters[key] || [];
    const labels = filterValueLabels(key);
    let text = spec.all;
    if (sel.length === 1) text = labels[sel[0]] || sel[0];
    else if (sel.length > 1) text = (labels[sel[0]] || sel[0]) + " +" + (sel.length - 1);
    btn.textContent = text;
    btn.classList.toggle("on", sel.length > 0);
    const n = sel.length;
    btn.dataset.tip = n
      ? spec.all.replace("All ", "") + " · " + n + " selected · click to change"
      : spec.all.replace("All ", "Filter by ") + " · pick several";
  }
  function paintFilterList(key, items) {
    const spec = MULTI_FILTERS[key];
    const list = document.getElementById(spec.id + "List");
    if (!list) return;
    const sel = boardFilters[key] || [];
    const labels = filterValueLabels(key);
    if (!items.length) {
      list.innerHTML = '<label class="msel-opt"><input type="checkbox" data-all="1" checked><span>' + spec.all + '</span></label><div class="msel-empty">None in this project</div>';
      return;
    }
    const allOn = sel.length === 0;
    list.innerHTML = '<label class="msel-opt"><input type="checkbox" data-all="1"' + (allOn ? " checked" : "") + "><span>" + spec.all + "</span></label>" +
      items.map((val) => {
        const on = sel.indexOf(val) !== -1;
        return '<label class="msel-opt"><input type="checkbox" value="' + escAttr(val) + '"' + (on ? " checked" : "") + "><span>" + escText(labels[val] || val) + "</span></label>";
      }).join("");
  }
  function fillFilterOptions() {
    const people = new Set();
    const tags = new Set();
    eachProjectTask(currentProject, (_, t) => {
      if (t.assignee && t.assignee !== "AC") people.add(t.assignee);
      (t.tags || []).forEach((n) => tags.add(n));
    });
    (boardFilters.assignee || []).forEach((id) => people.add(id));
    (boardFilters.tag || []).forEach((n) => tags.add(n));
    const peopleList = [...people];
    const tagList = [...tags].sort();
    const sig = peopleList.join("\n") + "||" + tagList.join("\n") + "||" + statusFilterLabels().join("\n") + "||" + priFilterLabels().join("\n");
    if (sig !== filterCatalogSig) {
      filterCatalogSig = sig;
      paintFilterList("assignee", peopleList);
      paintFilterList("tag", tagList);
      paintFilterList("status", statusFilterLabels());
      paintFilterList("pri", priFilterLabels());
    }
    ["assignee", "status", "pri", "tag"].forEach(paintFilterButton);
  }
  function resetFilterValues() {
    boardFilters.assignee = [];
    boardFilters.status = [];
    boardFilters.pri = [];
    boardFilters.tag = [];
    const range = document.getElementById("filterRange");
    if (range) range.value = "";
    const boardSearch = document.getElementById("boardSearch");
    if (boardSearch) boardSearch.value = "";
    filterCatalogSig = "";
    fillFilterOptions();
  }
  function searchNeedle() {
    const global = ((document.getElementById("globalSearch") || {}).value || "").trim().toLowerCase();
    const board = ((document.getElementById("boardSearch") || {}).value || "").trim().toLowerCase();
    return board || global;
  }
  function blobMatches(blob, q) {
    if (!q) return true;
    return String(blob || "").toLowerCase().indexOf(q) !== -1;
  }
  function taskSearchBlob(t) {
    if (!t) return "";
    const rec = roster[t.assignee];
    const p = projects[t.project];
    return [t.title, t.desc, t.list, t.pri, t.due, t.assignee, rec && rec.name, p && p.name, (t.tags || []).join(" ")].join(" ");
  }
  function taskMatchesFilters(t, skipProject) {
    if (!t) return false;
    if (!skipProject && t.project !== currentProject) return false;
    const range = (document.getElementById("filterRange") || {}).value || "";
    const q = searchNeedle();
    if (!filterAllows("assignee", t.assignee)) return false;
    if (!filterAllows("status", t.list)) return false;
    if (!filterAllows("pri", t.pri)) return false;
    if (!filterAllowsAny("tag", t.tags || [])) return false;
    if (range === "overdue" && !isOverdue(t)) return false;
    if (range === "today" && !isDueToday(t)) return false;
    if (range === "upcoming" && !isUpcoming(t)) return false;
    if (range === "week") {
      const key = dueParts(t).key;
      if (key < TODAY_KEY || key > TODAY_KEY + 6) return false;
    }
    if (q && !blobMatches(taskSearchBlob(t), q)) return false;
    return true;
  }
  function filterProjectSurfaces(q) {
    const query = (q || "").trim().toLowerCase();
    document.querySelectorAll("#projList .proj-item").forEach((el) => {
      const p = projects[el.dataset.project];
      el.hidden = !!(query && !blobMatches(((p && p.name) || "") + " " + ((p && p.desc) || "") + " " + el.dataset.project, query));
    });
    document.querySelectorAll("#projGrid .proj[data-project]").forEach((el) => {
      const p = projects[el.dataset.project];
      el.hidden = !!(query && !blobMatches(((p && p.name) || "") + " " + ((p && p.desc) || "") + " " + el.dataset.project, query));
    });
    refreshProjStatusCounts();
  }
  function collectSearchHits(q) {
    const query = (q || "").trim().toLowerCase();
    const hits = [];
    if (!query) return hits;
    Object.keys(projects).forEach((id) => {
      const p = projects[id];
      if (!p) return;
      if (!blobMatches(p.name + " " + (p.desc || "") + " " + id, query)) return;
      hits.push({ kind: "project", id: id, title: p.name, sub: (p.statusLabel || p.status || "") + " · " + (p.desc || "Project") });
    });
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t || isClosedProject(t.project)) return;
      if (!blobMatches(taskSearchBlob(t), query)) return;
      const p = projects[t.project];
      hits.push({ kind: "task", id: id, title: t.title, sub: ((p && p.name) || t.project) + " · " + t.list + " · " + fmtIso(t.due) });
    });
    Object.keys(roster).forEach((id) => {
      const rec = roster[id];
      if (!rec) return;
      if (!blobMatches(rec.name + " " + rec.role + " " + id, query)) return;
      hits.push({ kind: "person", id: id, title: rec.name, sub: rec.role + (id === "AC" ? " · you" : "") });
    });
    return hits.slice(0, 24);
  }
  function paintSearchPop() {
    const pop = document.getElementById("searchPop");
    const list = document.getElementById("searchPopList");
    const head = document.getElementById("searchPopHead");
    const input = document.getElementById("globalSearch");
    if (!pop || !list) return;
    const q = ((input && input.value) || "").trim();
    if (!q) { pop.hidden = true; return; }
    const hits = collectSearchHits(q);
    if (head) head.textContent = hits.length ? hits.length + " match" + (hits.length === 1 ? "" : "es") : "No matches";
    list.innerHTML = hits.length
      ? hits.map((h) => '<button class="search-hit" type="button" data-kind="' + h.kind + '" data-id="' + h.id + '"><b>' + h.title + "</b><span>" + h.kind + " · " + h.sub + "</span></button>").join("")
      : '<div class="search-empty">No projects, tasks, or people match “' + q.replace(/[<>]/g, "") + '”</div>';
    pop.hidden = false;
  }
  function openSearchHit(kind, id) {
    const input = document.getElementById("globalSearch");
    if (input) input.value = "";
    closePops();
    if (kind === "project" && projects[id]) {
      selectProject(id, workspaceViews.has(activeView) ? activeView : "board");
      return;
    }
    if (kind === "task" && tasks[id]) {
      openTask(id, true);
      return;
    }
    if (kind === "person" && roster[id]) {
      if (id === "AC") { showView("settings"); return; }
      openTeamModal();
      const row = document.querySelector('#teamList .team-person[data-who="' + id + '"]');
      if (row) row.scrollIntoView({ block: "nearest" });
    }
  }
  function filterWorkspace(view) {
    fillFilterOptions();
    filterProjectSurfaces(((document.getElementById("globalSearch") || {}).value || "").trim());
    document.querySelectorAll(".kcard[data-task], table.list tr[data-task]").forEach((el) => {
      const t = tasks[el.dataset.task];
      el.hidden = !taskMatchesFilters(t);
    });
    refreshWip();
    const v = view || activeView;
    if (v === "gantt") paintGantt();
    else if (v === "calendar") paintCalendar(calendarAllProjects);
  }
  function selectProject(id, view) {
    const p = projects[id];
    if (!p) return;
    currentProject = id;
    document.querySelectorAll("#projList .proj-item").forEach((el) => el.classList.toggle("on", el.dataset.project === id));
    paintChrome(p);
    ensureProjectTasksMounted(id);
    resetFilterValues();
    taskPane.dataset.currentTask = "";
    const current = activeView || document.querySelector(".view:not([hidden])")?.dataset.view;
    const next = view || (workspaceViews.has(current) ? current : "board");
    showView(next, { force: true });
    queueStats(wantsDashStats());
    syncWorkspaceActions();
  }
  function bindOpen(el) {
    el.addEventListener("click", (e) => {
      if (handleProjectStarClick(e, el.dataset.project)) return;
      e.preventDefault();
      if (el.dataset.project) {
        const current = document.querySelector(".view:not([hidden])")?.dataset.view;
        const keep = workspaceViews.has(current) ? current : (el.dataset.open || "board");
        selectProject(el.dataset.project, keep);
      } else showView(el.dataset.open, { calendarAll: el.dataset.calAll === "1" });
    });
  }
  document.querySelectorAll("#detailTabs button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#detailTabs button").forEach((x) => x.classList.toggle("on", x === b));
      document.querySelectorAll(".tab-panel").forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    });
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      document.querySelector(".search-lg input, #globalSearch").focus();
    }
    if (e.key === "Escape") {
      const datePop = document.getElementById("datePop");
      if (datePop && !datePop.hidden) {
        e.preventDefault();
        closeDatePicker();
        return;
      }
      const calBox = document.getElementById("calModal");
      if (calBox && !calBox.hidden) {
        e.preventDefault();
        closeCalendarPop();
        return;
      }
      if (isChartZoomOpen()) {
        e.preventDefault();
        closeChartZoom();
        return;
      }
      const reportBox = document.getElementById("reportModal");
      if (reportBox && !reportBox.hidden) {
        e.preventDefault();
        closeReportModal();
        return;
      }
      if (isProjectFilesOpen()) {
        e.preventDefault();
        closeProjectFiles();
        return;
      }
      closePops();
      hideTip();
      const confirmBox = document.getElementById("confirmModal");
      if (confirmBox && !confirmBox.hidden) {
        e.preventDefault();
        if (typeof confirmBox._resolve === "function") confirmBox._resolve(false);
        return;
      }
      const search = document.getElementById("globalSearch");
      if (search && document.activeElement === search) search.blur();
      const modal = document.getElementById("modal");
      if (modal) modal.hidden = true;
      const teamModal = document.getElementById("teamModal");
      if (teamModal) teamModal.hidden = true;
      const preview = document.getElementById("filePreview");
      if (preview && !preview.hidden) closeFilePreview();
    }
  });

  const people = {
    JL: "Jordan Lee · Design lead",
    SK: "Sam Kim · Engineering",
    MR: "Mira Rao · Marketing",
    AC: "Admin · FLOWVANTI Admin",
    A: "Admin · FLOWVANTI Admin"
  };
  const prefs = { dark: true, notify: true, weekStart: "Mon", accent: "#00D1D1", accentMode: "designed", catalogsOpen: false, holidaysOpen: false, holidayYear: TODAY_Y, hoursPerDay: 8, attachMaxMb: 10 };
  const DESIGNED_ACCENT = "#00D1D1";
  const THEME_VARS = [
    "--accent", "--accent-rgb", "--accent-on", "--accent-dim", "--accent-fg",
    "--purple", "--purple-dim", "--purple-fg",
    "--amber", "--amber-dim", "--amber-fg",
    "--hold-bg", "--hold-fg",
    "--success", "--success-bg", "--success-text",
    "--danger", "--danger-bg", "--danger-text",
    "--page", "--surface", "--surface-raised", "--border",
    "--text", "--text-2", "--text-3"
  ];
  const ACCENT_NAMES = {
    "#00D1D1": "Teal",
    "#A855F7": "Purple",
    "#F59E0B": "Amber",
    "#F43F5E": "Rose",
    "#3B82F6": "Blue",
    "#10B981": "Green",
    "#F97316": "Orange"
  };
  function usesDesignedTheme() {
    return prefs.accentMode !== "seed";
  }
  function clearThemeOverrides() {
    const st = document.body.style;
    THEME_VARS.forEach((k) => st.removeProperty(k));
  }
  function clamp01(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    if (!/^[0-9a-fA-F]{6}$/.test(v)) return { r: 0, g: 209, b: 209 };
    return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
  }
  function rgbToHex(r, g, b) {
    const h = (n) => clamp01(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return "#" + h(r) + h(g) + h(b);
  }
  function mixRgb(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    const d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s, l };
  }
  function hslToRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    let r, g, b;
    if (!s) r = g = b = l;
    else {
      const hue = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue(p, q, h + 1 / 3);
      g = hue(p, q, h);
      b = hue(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }
  function hslHex(hh, ss, ll) {
    const c = hslToRgb(hh, clamp01(ss, 0, 1), clamp01(ll, 0, 1));
    return rgbToHex(c.r, c.g, c.b);
  }
  function relLum(r, g, b) {
    const lin = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function contrastRatio(a, b) {
    const L1 = relLum(a.r, a.g, a.b);
    const L2 = relLum(b.r, b.g, b.b);
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function contrastOf(aHex, bHex) {
    return contrastRatio(hexToRgb(aHex), hexToRgb(bHex));
  }
  function onHexFor(bgHex) {
    const bg = hexToRgb(bgHex);
    const light = { r: 247, g: 250, b: 253 };
    const darkInk = { r: 10, g: 14, b: 20 };
    return contrastRatio(bg, light) >= contrastRatio(bg, darkInk) ? "#F7FAFD" : "#0A0E14";
  }
  function rolePair(h, s, dark) {
    let l = dark ? 0.26 : 0.9;
    const sat = dark ? Math.min(s, 0.42) : Math.min(s, 0.38);
    let bg = hslHex(h, sat, l);
    let fg = onHexFor(bg);
    let n = 0;
    while (contrastOf(bg, fg) < 4.6 && n < 10) {
      l = dark ? Math.max(0.12, l - 0.03) : Math.min(0.96, l + 0.02);
      bg = hslHex(h, sat, l);
      fg = onHexFor(bg);
      n += 1;
    }
    return { bg, fg };
  }
  function inkOnPage(pageHex, dark, level) {
    const page = hexToRgb(pageHex);
    const hue = rgbToHsl(page.r, page.g, page.b).h;
    const target = level === 0 ? 8 : level === 1 ? 5.8 : 4.7;
    let l = dark ? [0.96, 0.82, 0.72][level] : [0.1, 0.24, 0.34][level];
    const sat = dark ? 0.08 : 0.12;
    let hex = hslHex(hue, sat, l);
    let n = 0;
    while (contrastOf(pageHex, hex) < target && n < 12) {
      l = dark ? Math.min(0.98, l + 0.025) : Math.max(0.04, l - 0.025);
      hex = hslHex(hue, sat, l);
      n += 1;
    }
    return hex;
  }
  function applyAccentTheme() {
    if (usesDesignedTheme()) prefs.accent = DESIGNED_ACCENT;
    const hex = /^#[0-9a-fA-F]{6}$/.test(prefs.accent) ? prefs.accent : DESIGNED_ACCENT;
    prefs.accent = hex;
    const custom = document.getElementById("accentCustom");
    if (custom) custom.value = hex;
    const designed = usesDesignedTheme();
    document.querySelectorAll("#accentSwatches .accent-swatch").forEach((b) => {
      const isDefault = b.dataset.theme === "designed";
      const on = designed
        ? isDefault
        : !isDefault && (b.dataset.accent || "").toLowerCase() === hex.toLowerCase();
      b.classList.toggle("on", on);
    });
    const accentDesc = document.getElementById("accentDesc");
    if (designed) {
      clearThemeOverrides();
      if (accentDesc) accentDesc.textContent = "Default · original FLOWVANTI theme";
      return;
    }
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const dark = !!prefs.dark;
    const sat = clamp01(hsl.s, 0.28, 0.86);
    const primary = dark
      ? hslHex(hsl.h, sat, hsl.l < 0.48 ? 0.72 : clamp01(hsl.l, 0.58, 0.82))
      : hslHex(hsl.h, sat, hsl.l > 0.55 ? 0.42 : clamp01(hsl.l, 0.32, 0.5));
    const onPrimary = onHexFor(primary);
    const hue2 = (hsl.h + 48) % 360;
    const hue3 = (hsl.h + 310) % 360;
    const hueHold = (hsl.h + 268) % 360;
    const secondary = hslHex(hue2, clamp01(sat - 0.08, 0.25, 0.75), dark ? 0.72 : 0.4);
    const tertiary = hslHex(hue3, clamp01(sat - 0.05, 0.28, 0.78), dark ? 0.7 : 0.42);
    const accentWash = rolePair(hsl.h, sat, dark);
    const purpleWash = rolePair(hue2, clamp01(sat - 0.08, 0.22, 0.55), dark);
    const amberWash = rolePair(hue3, clamp01(sat - 0.05, 0.25, 0.58), dark);
    const holdWash = rolePair(hueHold, clamp01(sat * 0.5, 0.18, 0.4), dark);
    const okWash = rolePair(152, 0.42, dark);
    const badWash = rolePair(6, 0.52, dark);
    const page = dark ? hslHex(hsl.h, Math.min(sat, 0.18), 0.07) : hslHex(hsl.h, Math.min(sat, 0.1), 0.96);
    const st = document.body.style;
    st.setProperty("--accent", primary);
    st.setProperty("--accent-rgb", hexToRgb(primary).r + ", " + hexToRgb(primary).g + ", " + hexToRgb(primary).b);
    st.setProperty("--accent-on", onPrimary);
    st.setProperty("--accent-dim", accentWash.bg);
    st.setProperty("--accent-fg", accentWash.fg);
    st.setProperty("--purple", secondary);
    st.setProperty("--purple-dim", purpleWash.bg);
    st.setProperty("--purple-fg", purpleWash.fg);
    st.setProperty("--amber", tertiary);
    st.setProperty("--amber-dim", amberWash.bg);
    st.setProperty("--amber-fg", amberWash.fg);
    st.setProperty("--hold-bg", holdWash.bg);
    st.setProperty("--hold-fg", holdWash.fg);
    st.setProperty("--success", dark ? hslHex(152, 0.55, 0.55) : hslHex(152, 0.58, 0.36));
    st.setProperty("--success-bg", okWash.bg);
    st.setProperty("--success-text", okWash.fg);
    st.setProperty("--danger", dark ? hslHex(6, 0.72, 0.62) : hslHex(6, 0.72, 0.42));
    st.setProperty("--danger-bg", badWash.bg);
    st.setProperty("--danger-text", badWash.fg);
    st.setProperty("--page", page);
    st.setProperty("--surface", dark ? hslHex(hsl.h, Math.min(sat, 0.16), 0.12) : hslHex(hsl.h, Math.min(sat, 0.08), 0.99));
    st.setProperty("--surface-raised", dark ? hslHex(hsl.h, Math.min(sat, 0.18), 0.16) : hslHex(hsl.h, Math.min(sat, 0.1), 0.93));
    st.setProperty("--border", dark ? hslHex(hsl.h, Math.min(sat, 0.14), 0.22) : hslHex(hsl.h, Math.min(sat, 0.12), 0.72));
    st.setProperty("--text", inkOnPage(page, dark, 0));
    st.setProperty("--text-2", inkOnPage(page, dark, 1));
    st.setProperty("--text-3", inkOnPage(page, dark, 2));
    if (accentDesc) accentDesc.textContent = (ACCENT_NAMES[hex] || "Custom") + " seed · primary / on-primary for buttons";
  }
  function setToggle(btn, on) {
    btn.classList.toggle("on", on);
    btn.textContent = on ? "On" : "Off";
  }
  function applyWeekStart() {
    const days = weekDowLabels();
    document.querySelectorAll(".cal .dow").forEach((el, i) => { el.textContent = days[i]; });
    const weekBtn = document.getElementById("weekBtn");
    if (weekBtn) {
      weekBtn.textContent = prefs.weekStart;
      weekBtn.dataset.tip = "Monday: Sat–Sun weekend · Sunday: Fri–Sat weekend";
    }
    const weekDesc = document.getElementById("weekDesc");
    if (weekDesc) weekDesc.textContent = weekStartName() + " · weekends " + weekendNames();
    paintHolidayCalendar();
    if (datePickInput) paintDatePicker();
  }
  function collapseSettingsPanels() {
    prefs.catalogsOpen = false;
    prefs.holidaysOpen = false;
    applyCatalogOpen();
    applyHolidaysOpen();
  }
  function applyCatalogOpen() {
    const on = !!prefs.catalogsOpen;
    const panel = document.getElementById("catalogPanel");
    const btn = document.getElementById("catalogToggle");
    if (panel) panel.classList.toggle("is-collapsed", !on);
    if (btn) btn.setAttribute("aria-expanded", String(on));
  }
  function applyPrefs() {
    document.documentElement.classList.toggle("theme-light", !prefs.dark);
    document.body.classList.toggle("theme-light", !prefs.dark);
    document.documentElement.style.colorScheme = prefs.dark ? "dark" : "light";
    applyAccentTheme();
    applyCatalogColors();
    document.getElementById("appearBtn").classList.toggle("on", prefs.dark);
    document.getElementById("appearBtn").textContent = prefs.dark ? "Dark" : "Light";
    const mode = prefs.dark ? "Dark" : "Light";
    const colorName = usesDesignedTheme() ? "default theme" : ((ACCENT_NAMES[prefs.accent] || "custom") + " seed");
    document.getElementById("appearDesc").textContent = mode + " · " + colorName;
    setToggle(document.getElementById("notifyBtn"), prefs.notify);
    document.getElementById("notifyDesc").textContent = prefs.notify ? "Due today, blocked, mentions" : "Alerts paused";
    applyWeekStart();
    applyCatalogOpen();
    applyHolidaysOpen();
    const hpdEl = document.getElementById("hoursPerDay");
    if (hpdEl && document.activeElement !== hpdEl) hpdEl.value = String(hoursPerDay());
    const hpdDesc = document.getElementById("hoursPerDayDesc");
    if (hpdDesc) hpdDesc.textContent = hoursPerDay() + "h per working day · estimate days convert to hours · due dates skip weekends and holidays";
    const ambEl = document.getElementById("attachMaxMb");
    if (ambEl && document.activeElement !== ambEl) ambEl.value = String(attachMaxMb());
    const ambDesc = document.getElementById("attachMaxMbDesc");
    if (ambDesc) ambDesc.textContent = attachMaxMb() + " MB per file · compressed and encrypted on disk";
    if (typeof buildCalendarGrid === "function") buildCalendarGrid();
    if (typeof queueStats === "function") queueStats(true);
    if (typeof applyPhotos === "function") applyPhotos();
    schedulePersist();
  }

  function desktopApi() {
    if (window.pywebview && window.pywebview.api) return window.pywebview.api;
    if (window.flowvanti && window.flowvanti.api) return window.flowvanti.api;
    return null;
  }
  function clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function serializableAttachments(list) {
    return (list || []).map((a) => {
      const out = {
        id: a.id || "",
        name: a.name,
        size: a.size,
        bytes: a.bytes || 0,
        type: a.type || "",
        store: a.store || ""
      };
      if (a.store === "enc") return out;
      if (a.encB64) out.encB64 = a.encB64;
      if (a.dataUrl) out.dataUrl = a.dataUrl;
      else if (a.url && String(a.url).indexOf("data:") === 0) out.dataUrl = a.url;
      if (!out.store) out.store = out.encB64 ? "mem" : (out.dataUrl ? "data" : "");
      return out;
    });
  }
  function workspaceDump() {
    const taskDump = {};
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      const atts = t.attachments;
      taskDump[id] = atts && atts.length
        ? Object.assign({}, t, { attachments: serializableAttachments(atts) })
        : t;
    });
    return {
      v: 1,
      tasks: taskDump,
      projects: clonePlain(projects),
      roster: clonePlain(roster),
      photos: clonePlain(photos),
      prefs: clonePlain(prefs),
      taskStatuses: clonePlain(taskStatuses),
      taskPriorities: clonePlain(taskPriorities),
      projectStatuses: clonePlain(projectStatuses),
      holidays: clonePlain(holidays),
      people: clonePlain(people),
      currentProject: currentProject,
      sampleOn: samplePrefOn()
    };
  }
  function cancelPendingPersist() {
    clearTimeout(persistTimer);
    persistTimer = 0;
    if (persistIdle && typeof cancelIdleCallback === "function") {
      cancelIdleCallback(persistIdle);
      persistIdle = 0;
    }
  }
  async function persistWorkspace(epoch) {
    if (!persistReady) return;
    if (epoch != null && epoch !== persistEpoch) return;
    const raw = JSON.stringify(workspaceDump());
    const api = desktopApi();
    const jobId = ++persistInFlight;
    const save = async () => {
      if (epoch != null && epoch !== persistEpoch) return;
      if (api && api.save_workspace) {
        try {
          await api.save_workspace(raw);
          try { localStorage.removeItem(STORE_KEY); } catch (err) {}
          return;
        } catch (err) {}
      }
      if (epoch != null && epoch !== persistEpoch) return;
      try { localStorage.setItem(STORE_KEY, raw); } catch (err) {
        toast("Workspace is too large to save locally · remove a few attachments");
      }
    };
    await save();
    if (jobId === persistInFlight && epoch != null && epoch !== persistEpoch) return;
  }
  function persistWorkspaceNow() {
    persistReady = true;
    cancelPendingPersist();
    const epoch = ++persistEpoch;
    return persistWorkspace(epoch);
  }
  function schedulePersist() {
    if (!persistReady) return;
    cancelPendingPersist();
    const epoch = persistEpoch;
    persistTimer = setTimeout(() => {
      const run = () => persistWorkspace(epoch);
      if (typeof requestIdleCallback === "function") {
        persistIdle = requestIdleCallback(run, { timeout: 1200 });
      } else run();
    }, 650);
  }
  async function readPersisted() {
    const api = desktopApi();
    if (api && api.load_workspace) {
      try {
        const raw = await api.load_workspace();
        if (raw != null && raw !== "") return raw;
        return null;
      } catch (err) {}
    }
    try { return localStorage.getItem(STORE_KEY); } catch (err) { return null; }
  }
  function hydrateWorkspace(raw) {
    if (!raw) return false;
    let data;
    try { data = JSON.parse(raw); } catch (err) { return false; }
    if (!data || data.v !== 1 || typeof data.tasks !== "object" || typeof data.projects !== "object" || !data.tasks || !data.projects) return false;
    Object.keys(tasks).forEach((id) => delete tasks[id]);
    Object.assign(tasks, data.tasks);
    Object.keys(tasks).forEach((id) => {
      (tasks[id].attachments || []).forEach((a) => {
        if (!a.url && a.dataUrl) a.url = a.dataUrl;
      });
    });
    Object.keys(projects).forEach((id) => delete projects[id]);
    Object.assign(projects, data.projects);
    fillProjectMasterFromTasks();
    if (data.sampleOn === true) ensureAllSampleProjects();
    Object.keys(roster).forEach((id) => { if (id !== "AC") delete roster[id]; });
    Object.assign(roster, data.roster || {});
    if (roster.AC) {
      roster.AC.name = ADMIN.name;
      roster.AC.role = ADMIN.role;
      roster.AC.account = true;
      roster.AC.active = true;
    } else {
      roster.AC = { name: ADMIN.name, role: ADMIN.role, bg: "var(--success-bg)", fg: "var(--success-text)", account: true, active: true };
    }
    Object.keys(roster).forEach((id) => {
      if (roster[id].active === undefined) roster[id].active = true;
    });
    Object.keys(photos).forEach((id) => delete photos[id]);
    Object.assign(photos, data.photos || {});
    if (data.prefs) Object.assign(prefs, data.prefs);
    prefs.catalogsOpen = false;
    prefs.holidaysOpen = false;
    if (prefs.accentMode !== "seed" && prefs.accentMode !== "designed") {
      prefs.accentMode = (!prefs.accent || String(prefs.accent).toLowerCase() === DESIGNED_ACCENT.toLowerCase()) ? "designed" : "seed";
    }
    if (prefs.accentMode === "designed") prefs.accent = DESIGNED_ACCENT;
    else if (!/^#[0-9a-fA-F]{6}$/.test(prefs.accent || "")) {
      prefs.accent = DESIGNED_ACCENT;
      prefs.accentMode = "designed";
    }
    const hpd = parseFloat(prefs.hoursPerDay);
    prefs.hoursPerDay = hpd >= 1 && hpd <= 24 ? hpd : 8;
    const amb = parseInt(prefs.attachMaxMb, 10);
    prefs.attachMaxMb = amb >= 1 && amb <= 500 ? amb : 10;
    if (!Array.isArray(prefs.reportWidgets)) prefs.reportWidgets = undefined;
    taskStatuses = normalizeTaskStatuses(data.taskStatuses);
    taskPriorities = normalizePriorities(data.taskPriorities);
    projectStatuses = normalizeProjectStatuses(data.projectStatuses);
    holidays = normalizeHolidays(data.holidays);
    holidayYear = TODAY_Y;
    prefs.holidayYear = TODAY_Y;
    adoptStatusesFromTasks();
    adoptPrioritiesFromTasks();
    adoptProjectStatusesFromProjects();
    migrateBlockedTagToStatus();
    Object.keys(people).forEach((id) => { if (id !== "A" && id !== "AC") delete people[id]; });
    Object.assign(people, data.people || {});
    people.AC = ADMIN.name + " · " + ADMIN.role;
    people.A = people.AC;
    currentProject = data.currentProject && projects[data.currentProject] ? data.currentProject : (Object.keys(projects)[0] || "");
    if (typeof data.sampleOn === "boolean") setSamplePref(data.sampleOn);
    rebuildTaskIndex();
    return true;
  }
  function removeSampleProjectDom() {
    SAMPLE_PROJECT_IDS.forEach((id) => {
      document.querySelectorAll('#projList .proj-item[data-project="' + id + '"], #projGrid .proj[data-project="' + id + '"]').forEach((el) => el.remove());
    });
  }
  function syncProjectDom() {
    if (samplePrefOn() || sampleTasksPresent() || sampleLoaded()) ensureAllSampleProjects();
    fillProjectMasterFromTasks();
    const liveIds = liveProjectIds();
    const list = document.getElementById("projList");
    const grid = document.getElementById("projGrid");
    if (list) {
      while (list.firstChild) list.removeChild(list.firstChild);
    }
    if (grid) {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
    }
    liveIds.forEach((id) => ensureProjectDom(id));
    liveIds.forEach((id) => paintProjectSurfaces(id));
    syncProjStatusLayout();
    sortProjList();
  }
  function ensureSampleProjects() {
    if (!samplePrefOn() && !sampleTasksPresent()) return;
    SAMPLE_PROJECT_IDS.forEach((id) => {
      if (!projects[id]) {
        const copy = cloneMasterProject(id);
        if (copy) projects[id] = copy;
      }
    });
    fillProjectMasterFromTasks();
  }
  function rebuildWorkspaceDom() {
    document.querySelectorAll(".kcard[data-task], #taskTbody tr[data-task]").forEach((el) => el.remove());
    paintBoardColumns();
    fillStatusSelects();
    fillPrioritySelects();
    fillProjectStatusSelects();
    paintAllCatalogs();
    paintHolidayCalendar();
    syncProjectDom();
    ensureProjectTasksMounted(currentProject);
  }

  function enrichTips(root) {
    const scope = scopedRoot(root);
    scope.querySelectorAll(".av, .avatar").forEach((el) => {
      if (el.dataset.tip) return;
      const who = el.dataset.who || el.textContent.trim();
      const key = who === "A" ? "AC" : who;
      if (people[key]) el.dataset.tip = people[key];
      if (people[who]) el.dataset.tip = people[who];
    });
    scope.querySelectorAll(".kcard[data-task], table.list tr[data-task], .gantt-row[data-task], .chip[data-task], .deadline[data-task]").forEach((el) => {
      const t = tasks[el.dataset.task];
      if (!t) return;
      const who = people[t.assignee] || t.assignee;
      el.dataset.tip = t.title + "\n" + t.list + " · " + t.pri + " · " + fmtIso(t.due) + "\n" + who + "\nDrag to another column to change status · click to open";
    });
    scope.querySelectorAll(".gbar").forEach((el) => {
      if (!el.dataset.tip) el.dataset.tip = el.textContent.trim() + " project bar · click the row for the task";
    });
    scope.querySelectorAll(".wip").forEach((el) => {
      if (!el.dataset.tip) el.dataset.tip = el.textContent.trim() + " cards in this column";
    });
    applyPhotos(scope);
  }

  const floatTip = document.getElementById("floatTip");
  function hideTip() {
    const tip = document.getElementById("floatTip");
    if (!tip) return;
    tip.hidden = true;
    tip.classList.remove("chart-tip");
  }
  function tipBlocked(el, e) {
    if (e.target.closest(".pop, .auth")) return true;
    const modal = e.target.closest(".modal");
    if (!modal) return false;
    return modal.id !== "chartModal";
  }
  function showTip(el, e) {
    if (tipBlocked(el, e)) { hideTip(); return; }
    const value = el.getAttribute("data-tip-value");
    const text = el.getAttribute("data-tip");
    if (!text && (value == null || value === "")) return;
    if (value != null && value !== "") {
      floatTip.classList.add("chart-tip");
      floatTip.innerHTML = (text ? '<span class="chart-tip-k">' + escText(text) + "</span>" : "") +
        '<b class="chart-tip-v">' + escText(value) + "</b>";
    } else {
      floatTip.classList.remove("chart-tip");
      floatTip.textContent = text;
    }
    floatTip.hidden = false;
    const x = Math.min(e.clientX + 12, window.innerWidth - 300);
    const y = Math.min(e.clientY + 16, window.innerHeight - 120);
    floatTip.style.left = x + "px";
    floatTip.style.top = y + "px";
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el && !el.closest(".pop")) showTip(el, e);
    else hideTip();
  });
  document.addEventListener("mousemove", (e) => {
    if (floatTip.hidden) return;
    const el = e.target.closest("[data-tip]");
    if (el && !el.closest(".pop")) showTip(el, e);
    else hideTip();
  });

  function closePops() {
    closeDatePicker();
    document.getElementById("searchPop").hidden = true;
    document.getElementById("newPop").hidden = true;
    document.getElementById("notifPop").hidden = true;
    document.getElementById("accountPop").hidden = true;
    document.getElementById("avatarBtn").setAttribute("aria-expanded", "false");
    document.querySelectorAll(".msel-pop").forEach((p) => { p.hidden = true; });
    document.querySelectorAll(".msel-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  document.getElementById("newBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const p = document.getElementById("newPop");
    const open = p.hidden;
    closePops();
    p.hidden = !open;
  });
  document.getElementById("notifBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (!prefs.notify) {
      closePops();
      toast("Notifications are <em>off</em> · turn them on in Settings");
      return;
    }
    const p = document.getElementById("notifPop");
    const open = p.hidden;
    closePops();
    p.hidden = !open;
    if (!p.hidden) paintNotifications(true);
  });
  function toggleAccountPop(e) {
    if (e) e.stopPropagation();
    hideTip();
    const p = document.getElementById("accountPop");
    const open = p.hidden;
    closePops();
    p.hidden = !open;
    document.getElementById("avatarBtn").setAttribute("aria-expanded", String(!p.hidden));
  }
  document.getElementById("avatarBtn").addEventListener("click", toggleAccountPop);
  document.getElementById("accountSettings").addEventListener("click", (e) => {
    e.stopPropagation();
    closePops();
    showView("settings");
  });
  document.getElementById("accountLogout").addEventListener("click", (e) => {
    e.stopPropagation();
    closePops();
    signOut();
  });
  document.getElementById("brandHome").addEventListener("click", () => showView("dashboard"));
  const searchWrap = document.querySelector(".search-wrap");
  if (searchWrap) searchWrap.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closePops);
  document.querySelectorAll(".pop").forEach((p) => p.addEventListener("click", (e) => e.stopPropagation()));

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.innerHTML = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  function isImageAttach(a) {
    const type = String((a && a.type) || "").toLowerCase();
    const name = String((a && a.name) || "").toLowerCase();
    return type.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
  }
  const attachPreviewCache = Object.create(null);
  let filePreviewUrl = "";
  let filePreviewBytes = null;
  let filePreviewName = "file";
  let filePreviewExtraUrls = [];
  let previewTarget = "modal";
  let projectFileRows = [];
  let projectFilesSel = "";
  let filesModalPos = null;
  let filesModalSize = null;
  const FILES_MODAL_MIN_W = 640;
  const FILES_MODAL_MIN_H = 380;
  const FILES_SPLIT_GUTTER = 10;
  const FILES_LIST_MIN = 220;
  const FILES_PREV_MIN = 260;
  const FILES_LIST_DEFAULT = 380;
  let filesListWidth = FILES_LIST_DEFAULT;
  function newAttachId() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function u8FromIpc(raw) {
    if (!raw) return null;
    if (raw instanceof Uint8Array) return raw;
    if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
    if (Array.isArray(raw)) return Uint8Array.from(raw);
    if (raw.data && Array.isArray(raw.data)) return Uint8Array.from(raw.data);
    try { return new Uint8Array(raw); } catch (err) { return null; }
  }
  async function gzipBytes(u8) {
    if (typeof CompressionStream === "function") {
      const stream = new Blob([u8]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    return u8;
  }
  async function gunzipBytes(u8) {
    if (typeof DecompressionStream === "function") {
      try {
        const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (err) {}
    }
    return u8;
  }
  function u8ToB64(u8) {
    const chunk = 0x8000;
    let s = "";
    for (let i = 0; i < u8.length; i += chunk) s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    return btoa(s);
  }
  function b64ToU8(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  async function webAttachKey() {
    let raw = "";
    try { raw = localStorage.getItem("flow.attachKey") || ""; } catch (err) {}
    if (!raw) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      raw = u8ToB64(bytes);
      try { localStorage.setItem("flow.attachKey", raw); } catch (err) {}
    }
    return crypto.subtle.importKey("raw", b64ToU8(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  async function encryptMem(plain) {
    const gz = await gzipBytes(plain);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await webAttachKey();
    const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, gz);
    const packed = new Uint8Array(12 + buf.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(buf), 12);
    return u8ToB64(packed);
  }
  async function decryptMem(b64) {
    const packed = b64ToU8(b64);
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);
    const key = await webAttachKey();
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
    return gunzipBytes(new Uint8Array(buf));
  }
  async function storeAttachmentFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const rec = {
      id: newAttachId(),
      name: String(file.name || "file").replace(/[<>]/g, ""),
      size: fmtSize(file.size),
      bytes: file.size,
      type: file.type || "",
      store: "enc"
    };
    const api = desktopApi();
    if (api && api.put_attachment) {
      const ok = await api.put_attachment(rec.id, bytes);
      if (!ok) throw new Error("store");
      return rec;
    }
    rec.store = "mem";
    rec.encB64 = await encryptMem(bytes);
    return rec;
  }
  async function loadAttachmentBytes(a) {
    if (!a) return null;
    if (a.store === "enc" && a.id) {
      const api = desktopApi();
      if (!api || !api.get_attachment) return null;
      return u8FromIpc(await api.get_attachment(a.id));
    }
    if (a.encB64) return decryptMem(a.encB64);
    const href = a.dataUrl || (a.url && String(a.url).indexOf("data:") === 0 ? a.url : "") || (a.url && String(a.url).indexOf("blob:") === 0 ? a.url : "");
    if (href) {
      const res = await fetch(href);
      return new Uint8Array(await res.arrayBuffer());
    }
    return null;
  }
  function deleteStoredAttachment(a) {
    if (!a) return;
    if (a.id && attachPreviewCache[a.id]) {
      URL.revokeObjectURL(attachPreviewCache[a.id]);
      delete attachPreviewCache[a.id];
    }
    const api = desktopApi();
    if (a.store === "enc" && a.id && api && api.delete_attachment) {
      Promise.resolve(api.delete_attachment(a.id)).catch(() => {});
    }
  }
  function attachHref(a) {
    if (!a) return "";
    if (a.id && attachPreviewCache[a.id]) return attachPreviewCache[a.id];
    if (a.dataUrl) return a.dataUrl;
    if (a.url && String(a.url).indexOf("blob:") !== 0) return a.url;
    return "";
  }
  function previewKind(a, mime) {
    const type = String(mime || (a && a.type) || "").toLowerCase();
    const name = String((a && a.name) || "").toLowerCase();
    if (/\.(docx|dotx|docm)$/.test(name) || type.indexOf("wordprocessingml") >= 0) return "docx";
    if (/\.(xlsx|xlsm|xltx)$/.test(name) || type.indexOf("spreadsheetml") >= 0) return "xlsx";
    if (/\.(pptx|pptm|potx|ppsx|ppsm)$/.test(name) || type.indexOf("presentationml") >= 0) return "pptx";
    if (/\.(ppt|pps)$/.test(name) || type === "application/vnd.ms-powerpoint") return "ppt";
    if (/\.xls$/.test(name) || type === "application/vnd.ms-excel") return "xls";
    if (/\.doc$/.test(name) || type === "application/msword") return "doc";
    if (/\.(odt|ods|odp)$/.test(name) || type.indexOf("opendocument") >= 0) return "odf";
    if (type.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)$/.test(name)) return "image";
    if (type.indexOf("video/") === 0 || /\.(mp4|webm|ogv|mov)$/.test(name)) return "video";
    if (type.indexOf("audio/") === 0 || /\.(mp3|wav|ogg|m4a|flac)$/.test(name)) return "audio";
    if (type === "application/pdf" || /\.pdf$/.test(name)) return "pdf";
    if (type.indexOf("text/") === 0 || type === "application/json" || type === "application/javascript" || type === "application/xml" || type === "text/xml" || type.indexOf("csv") >= 0 || /\.(txt|md|csv|json|xml|js|css|html|htm|log|yml|yaml|ini|env)$/.test(name)) return "text";
    return "other";
  }
  function looksText(u8) {
    if (!u8 || !u8.length) return false;
    if (u8[0] === 0x50 && u8[1] === 0x4b) return false;
    const n = Math.min(u8.length, 4096);
    let bad = 0;
    for (let i = 0; i < n; i++) {
      const b = u8[i];
      if (b === 0) return false;
      if (b < 9 || (b > 13 && b < 32)) bad++;
    }
    return bad / n < 0.08;
  }
  function u8Le16(u8, o) {
    return u8[o] | (u8[o + 1] << 8);
  }
  function u8Le32(u8, o) {
    return (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0;
  }
  async function inflateRaw(u8) {
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzipOffice(u8) {
    if (!u8 || u8.length < 22 || u8[0] !== 0x50 || u8[1] !== 0x4b) return null;
    let eocd = -1;
    const minI = Math.max(0, u8.length - 22 - 65535);
    for (let i = u8.length - 22; i >= minI; i--) {
      if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) return null;
    const n = u8Le16(u8, eocd + 10);
    let off = u8Le32(u8, eocd + 16);
    const files = Object.create(null);
    const dec = new TextDecoder("utf-8");
    for (let i = 0; i < n; i++) {
      if (u8Le32(u8, off) !== 0x02014b50) break;
      const method = u8Le16(u8, off + 10);
      const csize = u8Le32(u8, off + 20);
      const nameLen = u8Le16(u8, off + 28);
      const extraLen = u8Le16(u8, off + 30);
      const commentLen = u8Le16(u8, off + 32);
      const localOff = u8Le32(u8, off + 42);
      const name = dec.decode(u8.subarray(off + 46, off + 46 + nameLen)).replace(/\\/g, "/");
      off += 46 + nameLen + extraLen + commentLen;
      if (!name || name.charAt(name.length - 1) === "/") continue;
      if (u8Le32(u8, localOff) !== 0x04034b50) continue;
      const locName = u8Le16(u8, localOff + 26);
      const locExtra = u8Le16(u8, localOff + 28);
      const data = u8.subarray(localOff + 30 + locName + locExtra, localOff + 30 + locName + locExtra + csize);
      let raw = data;
      if (method === 8) {
        try { raw = await inflateRaw(data); } catch (err) { continue; }
      } else if (method !== 0) continue;
      files[name] = raw;
    }
    return files;
  }
  function xmlUnescape(s) {
    return String(s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }
  function zipXml(files, path) {
    if (!files) return "";
    let u8 = files[path];
    if (!u8) {
      const want = path.toLowerCase();
      const key = Object.keys(files).find((k) => k.toLowerCase() === want);
      if (!key) return "";
      u8 = files[key];
    }
    return new TextDecoder("utf-8").decode(u8);
  }
  function zipFile(files, path) {
    if (!files || !path) return null;
    if (files[path]) return files[path];
    const want = path.replace(/\\/g, "/").toLowerCase();
    const key = Object.keys(files).find((k) => k.replace(/\\/g, "/").toLowerCase() === want);
    return key ? files[key] : null;
  }
  function zipJoin(fromFile, rel) {
    const base = String(fromFile || "").replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    const parts = (base + "/" + String(rel || "").replace(/\\/g, "/")).split("/");
    const out = [];
    parts.forEach((p) => {
      if (!p || p === ".") return;
      if (p === "..") out.pop();
      else out.push(p);
    });
    return out.join("/");
  }
  function parseRels(xml) {
    const map = Object.create(null);
    const re = /<Relationship\b([^>]*)\/?>/g;
    let m;
    while ((m = re.exec(xml))) {
      const id = (m[1].match(/\bId="([^"]+)"/) || [])[1];
      const target = (m[1].match(/\bTarget="([^"]+)"/) || [])[1];
      if (id && target) map[id] = xmlUnescape(target).replace(/\\/g, "/");
    }
    return map;
  }
  function mediaMime(path) {
    const n = String(path || "").toLowerCase();
    if (/\.png$/.test(n)) return "image/png";
    if (/\.jpe?g$/.test(n)) return "image/jpeg";
    if (/\.gif$/.test(n)) return "image/gif";
    if (/\.webp$/.test(n)) return "image/webp";
    if (/\.svg$/.test(n)) return "image/svg+xml";
    if (/\.bmp$/.test(n)) return "image/bmp";
    return "";
  }
  function rememberPreviewUrl(url) {
    if (url) filePreviewExtraUrls.push(url);
    return url;
  }
  function revokePreviewExtras() {
    filePreviewExtraUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (err) {} });
    filePreviewExtraUrls = [];
  }
  function zipNames(files, re) {
    return Object.keys(files).filter((k) => re.test(k)).sort((a, b) => {
      const na = parseInt((a.match(/(\d+)/) || [])[1] || "0", 10);
      const nb = parseInt((b.match(/(\d+)/) || [])[1] || "0", 10);
      return na - nb;
    });
  }
  function renderDocxHtml(xml) {
    const paras = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
    return paras.map((p) => {
      const texts = [];
      const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let m;
      while ((m = tRe.exec(p))) texts.push(xmlUnescape(m[1]));
      return "<p>" + escText(texts.join("") || " ") + "</p>";
    }).join("") || "<p></p>";
  }
  function parseSharedStrings(xml) {
    const sis = xml.match(/<si[\s>][\s\S]*?<\/si>/g) || [];
    return sis.map((si) => {
      const ts = [];
      const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
      let m;
      while ((m = tRe.exec(si))) ts.push(xmlUnescape(m[1]));
      return ts.join("");
    });
  }
  function parseSheetNames(xml) {
    const names = [];
    const re = /<sheet\b([^>]*)\/?>/g;
    let m;
    while ((m = re.exec(xml))) {
      const n = (m[1].match(/\bname="([^"]*)"/) || [])[1];
      if (n) names.push(xmlUnescape(n));
    }
    return names;
  }
  function colRowFromRef(ref) {
    const m = String(ref).match(/^([A-Z]+)(\d+)$/i);
    if (!m) return { c: 0, r: 0 };
    const letters = m[1].toUpperCase();
    let c = 0;
    for (let i = 0; i < letters.length; i++) c = c * 26 + (letters.charCodeAt(i) - 64);
    return { c: c - 1, r: parseInt(m[2], 10) - 1 };
  }
  function renderSheetTable(xml, strings) {
    const cells = [];
    let maxR = 0;
    let maxC = 0;
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^/][^>]*)\/>/g;
    let m;
    while ((m = cellRe.exec(xml))) {
      const attrs = m[1] || m[3] || "";
      const inner = m[2] || "";
      const ref = (attrs.match(/\br="([^"]+)"/) || [])[1] || "";
      const t = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "";
      const pos = colRowFromRef(ref);
      let val = "";
      if (t === "s") {
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        val = strings[parseInt(v, 10)] || "";
      } else if (t === "inlineStr") {
        const ts = [];
        const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
        let tm;
        while ((tm = tRe.exec(inner))) ts.push(xmlUnescape(tm[1]));
        val = ts.join("");
      } else if (t === "b") {
        val = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] === "1" ? "TRUE" : "FALSE";
      } else {
        val = xmlUnescape((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || "");
      }
      if (pos.r > maxR) maxR = pos.r;
      if (pos.c > maxC) maxC = pos.c;
      cells.push({ r: pos.r, c: pos.c, val: val });
    }
    maxR = Math.min(maxR, 199);
    maxC = Math.min(maxC, 39);
    const grid = [];
    for (let r = 0; r <= maxR; r++) grid[r] = [];
    cells.forEach((cell) => {
      if (cell.r <= maxR && cell.c <= maxC) grid[cell.r][cell.c] = cell.val;
    });
    let html = "<table><tbody>";
    for (let r = 0; r <= maxR; r++) {
      html += "<tr>";
      for (let c = 0; c <= maxC; c++) html += "<td>" + escText(grid[r][c] || "") + "</td>";
      html += "</tr>";
    }
    return html + "</tbody></table>";
  }
  function renderPptxHtml(files) {
    const slides = zipNames(files, /^ppt\/slides\/slide\d+\.xml$/i);
    if (!slides.length) return "<p>No slides found</p>";
    return slides.map((path, i) => {
      const xml = zipXml(files, path);
      const rels = parseRels(zipXml(files, path.replace(/^(.*)\/([^/]+)$/, "$1/_rels/$2.rels")));
      const texts = [];
      const tRe = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
      let m;
      while ((m = tRe.exec(xml))) {
        const t = xmlUnescape(m[1]).trim();
        if (t) texts.push(t);
      }
      const imgs = [];
      const seen = Object.create(null);
      const blipRe = /r:embed="([^"]+)"/g;
      let bm;
      while ((bm = blipRe.exec(xml))) {
        const rid = bm[1];
        if (seen[rid]) continue;
        seen[rid] = true;
        const target = rels[rid];
        if (!target) continue;
        const mediaPath = zipJoin(path, target);
        const u8 = zipFile(files, mediaPath);
        const mime = mediaMime(mediaPath);
        if (!u8 || !mime) continue;
        const url = rememberPreviewUrl(URL.createObjectURL(new Blob([u8], { type: mime })));
        imgs.push('<img class="office-slide-img" src="' + url + '" alt="Slide ' + (i + 1) + '">');
      }
      const textHtml = texts.map((t) => "<p>" + escText(t) + "</p>").join("");
      const body = imgs.join("") + textHtml;
      return '<div class="office-slide"><h4>Slide ' + (i + 1) + "</h4>" + (body || "<p>No previewable content on this slide</p>") + "</div>";
    }).join("");
  }
  function renderOdfHtml(xml) {
    if (!xml) return "<p>No document text found</p>";
    const tables = xml.match(/<table:table\b[\s\S]*?<\/table:table>/g);
    if (tables && tables.length) {
      return tables.map((table) => {
        const rows = table.match(/<table:table-row\b[\s\S]*?<\/table:table-row>/g) || [];
        let html = "<table><tbody>";
        rows.slice(0, 200).forEach((row) => {
          const cells = row.match(/<table:table-cell\b[\s\S]*?<\/table:table-cell>/g) || [];
          html += "<tr>";
          cells.slice(0, 40).forEach((cell) => {
            const ts = [];
            const tRe = /<text:p\b[^>]*>([\s\S]*?)<\/text:p>/g;
            let tm;
            while ((tm = tRe.exec(cell))) ts.push(xmlUnescape(tm[1].replace(/<[^>]+>/g, "")));
            html += "<td>" + escText(ts.join(" ")) + "</td>";
          });
          html += "</tr>";
        });
        return html + "</tbody></table>";
      }).join("");
    }
    const paras = xml.match(/<text:p\b[\s\S]*?<\/text:p>/g) || [];
    return paras.map((p) => "<p>" + escText(xmlUnescape(p.replace(/<[^>]+>/g, ""))) + "</p>").join("") || "<p></p>";
  }
  function oleExtractText(u8) {
    if (!u8 || u8.length < 8 || u8[0] !== 0xD0 || u8[1] !== 0xCF) return "";
    const chunks = [];
    let i = 0;
    while (i + 3 < u8.length) {
      if (u8[i] >= 32 && u8[i] < 127 && u8[i + 1] === 0) {
        let s = "";
        while (i + 1 < u8.length && u8[i + 1] === 0 && u8[i] >= 32 && u8[i] < 127) {
          s += String.fromCharCode(u8[i]);
          i += 2;
        }
        if (s.length >= 4) chunks.push(s);
      } else i++;
    }
    return chunks.join("\n");
  }
  function officeFallback(name, detail) {
    return '<div class="file-preview-fallback"><b>' + escText(name) + "</b>" + escText(detail || "No inline preview for this type · download the decrypted file") + "</div>";
  }
  async function renderOfficePreview(kind, bytes, name) {
    if (kind === "ppt" && bytes && bytes[0] === 0x50 && bytes[1] === 0x4b) kind = "pptx";
    if (kind === "doc" || kind === "xls" || kind === "ppt") {
      const text = oleExtractText(bytes);
      if (!text) return officeFallback(name, "This older Office file has no inline layout preview · download the decrypted file");
      return '<div class="file-preview-office"><p class="office-note">Text extract from this older Office file</p><pre>' + escText(text) + "</pre></div>";
    }
    const files = await unzipOffice(bytes);
    if (!files || !Object.keys(files).length) return officeFallback(name, "Could not read this Office file · download the decrypted file");
    if (kind === "docx") {
      const xml = zipXml(files, "word/document.xml");
      if (!xml) return officeFallback(name, "No document text found");
      return '<div class="file-preview-office">' + renderDocxHtml(xml) + "</div>";
    }
    if (kind === "xlsx") {
      const strings = parseSharedStrings(zipXml(files, "xl/sharedStrings.xml"));
      const sheets = zipNames(files, /^xl\/worksheets\/sheet\d+\.xml$/i);
      if (!sheets.length) return officeFallback(name, "No spreadsheet sheets found");
      const names = parseSheetNames(zipXml(files, "xl/workbook.xml"));
      return '<div class="file-preview-office">' + sheets.map((path, i) => {
        return "<h4>" + escText(names[i] || ("Sheet " + (i + 1))) + "</h4>" + renderSheetTable(zipXml(files, path), strings);
      }).join("") + "</div>";
    }
    if (kind === "pptx") {
      return '<div class="file-preview-office">' + renderPptxHtml(files) + "</div>";
    }
    return '<div class="file-preview-office">' + renderOdfHtml(zipXml(files, "content.xml")) + "</div>";
  }
  function previewFrame(kind, name) {
    const n = String(name || "").toLowerCase();
    if (kind === "xlsx" || kind === "xls" || /\.ods$/.test(n)) return "sheet";
    if (kind === "image") return "image";
    if (kind === "pdf") return "pdf";
    if (kind === "docx" || kind === "doc" || /\.odt$/.test(n)) return "page";
    if (kind === "pptx" || kind === "ppt" || /\.odp$/.test(n)) return "slide";
    if (kind === "text") return "text";
    if (kind === "video") return "video";
    if (kind === "audio") return "audio";
    if (kind === "odf") return "page";
    return "file";
  }
  function previewEls() {
    if (previewTarget === "files") {
      return {
        box: document.getElementById("projectFilesModal"),
        body: document.getElementById("projectFilesPreview"),
        cap: document.getElementById("projectFilesCap"),
        stage: document.getElementById("projectFilesStage"),
        download: document.getElementById("projectFilesDownload"),
        embedded: true
      };
    }
    return {
      box: document.getElementById("filePreview"),
      body: document.getElementById("filePreviewBody"),
      cap: document.getElementById("filePreviewCap"),
      stage: document.querySelector("#filePreview .file-preview-stage"),
      download: document.getElementById("filePreviewDownload"),
      embedded: false
    };
  }
  function previewStageEl() {
    return previewEls().stage;
  }
  function applyPreviewFrame(kind, name) {
    const stage = previewStageEl();
    if (!stage) return;
    stage.dataset.preview = previewFrame(kind, name);
    stage.style.width = "";
    stage.style.height = "";
  }
  function fitPreviewStage(w, h) {
    const stage = previewStageEl();
    if (!stage) return;
    const maxW = Math.max(280, window.innerWidth - 48);
    const maxH = Math.max(200, window.innerHeight - 48);
    const scale = Math.min(1, maxW / w, maxH / h);
    stage.style.width = Math.round(Math.max(280, w * scale)) + "px";
    stage.style.height = Math.round(Math.max(180, h * scale)) + "px";
  }
  let filesFitGen = 0;
  function filesModalChrome() {
    const card = filesModalCard();
    const head = card && card.querySelector(".files-modal-head");
    return {
      list: filesListWidth || FILES_LIST_DEFAULT,
      gutter: FILES_SPLIT_GUTTER,
      padX: 40,
      padY: 28 + (head && head.offsetHeight ? head.offsetHeight + 12 : 58)
    };
  }
  function filesPreviewPanePreset(kind, name, bytes) {
    const frame = previewFrame(kind, name);
    const n = (bytes && bytes.length) || 0;
    const kb = n / 1024;
    if (frame === "audio") return { w: 520, h: 176 };
    if (frame === "video") return { w: 960, h: 560 };
    if (frame === "pdf" || frame === "page") return { w: 794, h: Math.min(1020, Math.max(640, 720 + Math.min(200, kb / 8))) };
    if (frame === "text") return { w: 680, h: Math.min(860, Math.max(320, 240 + Math.ceil(n / 28))) };
    if (frame === "slide") return { w: 1100, h: 640 };
    if (frame === "sheet") return { w: Math.min(1180, 820 + Math.min(360, kb / 4)), h: 720 };
    if (frame === "image") return { w: 720, h: 520 };
    if (kind === "empty") return { w: 420, h: 340 };
    return { w: 480, h: 300 };
  }
  function applyFilesModalFit(previewW, previewH) {
    const card = filesModalCard();
    if (!card || !isProjectFilesOpen()) return;
    const ch = filesModalChrome();
    const paneW = Math.max(FILES_PREV_MIN, Math.round(previewW));
    const paneH = Math.max(220, Math.round(previewH));
    filesModalSize = clampFilesModalSize(ch.list + ch.gutter + paneW + ch.padX, ch.padY + paneH);
    if (!filesModalPos) {
      const r = card.getBoundingClientRect();
      filesModalPos = { left: r.left, top: r.top };
    }
    applyFilesModalPos();
    applyFilesSplit();
  }
  function sizeFilesModalToPreview(kind) {
    const gen = ++filesFitGen;
    const els = previewEls();
    const name = filePreviewName;
    const bytes = filePreviewBytes;
    const preset = filesPreviewPanePreset(kind, name, bytes);
    const go = (w, h) => {
      if (gen !== filesFitGen) return;
      applyFilesModalFit(w, h);
    };
    if (kind === "empty" || kind === "other") {
      const office = els.body && els.body.querySelector(".file-preview-office");
      if (office) {
        requestAnimationFrame(() => {
          if (gen !== filesFitGen) return;
          go(Math.max(preset.w, office.scrollWidth + 28), Math.max(preset.h, Math.min(office.scrollHeight + 64, window.innerHeight - 96)));
        });
        return;
      }
      go(preset.w, preset.h);
      return;
    }
    if (kind === "image") {
      const img = els.body && els.body.querySelector("img");
      if (!img) { go(preset.w, preset.h); return; }
      const ready = () => go((img.naturalWidth || preset.w) + 24, (img.naturalHeight || preset.h) + 68);
      if (img.complete && img.naturalWidth) ready();
      else img.addEventListener("load", ready, { once: true });
      return;
    }
    if (kind === "video") {
      const vid = els.body && els.body.querySelector("video");
      if (!vid) { go(preset.w, preset.h); return; }
      const ready = () => go((vid.videoWidth || preset.w) + 8, (vid.videoHeight || preset.h) + 60);
      if (vid.readyState >= 1 && vid.videoWidth) ready();
      else vid.addEventListener("loadedmetadata", ready, { once: true });
      return;
    }
    if (kind === "docx" || kind === "xlsx" || kind === "pptx" || kind === "odf" || kind === "doc" || kind === "xls" || kind === "ppt") {
      requestAnimationFrame(() => {
        if (gen !== filesFitGen) return;
        const office = els.body && (els.body.querySelector(".file-preview-office") || els.body.querySelector(".file-preview-fallback"));
        if (!office) { go(preset.w, preset.h); return; }
        go(Math.max(preset.w, Math.min(office.scrollWidth + 28, window.innerWidth - 80)), Math.max(Math.min(preset.h, 860), Math.min(office.scrollHeight + 64, window.innerHeight - 96)));
      });
      return;
    }
    go(preset.w, preset.h);
  }
  function sizePreviewToMedia(kind) {
    if (previewTarget === "files") {
      sizeFilesModalToPreview(kind);
      return;
    }
    const body = document.getElementById("filePreviewBody");
    if (!body) return;
    const bar = 52;
    if (kind === "image") {
      const img = body.querySelector("img");
      if (!img) return;
      const go = () => fitPreviewStage((img.naturalWidth || 480) + 24, (img.naturalHeight || 320) + bar + 16);
      if (img.complete && img.naturalWidth) go();
      else img.addEventListener("load", go, { once: true });
      return;
    }
    if (kind === "video") {
      const vid = body.querySelector("video");
      if (!vid) return;
      const go = () => fitPreviewStage((vid.videoWidth || 960) + 8, (vid.videoHeight || 540) + bar + 8);
      if (vid.readyState >= 1 && vid.videoWidth) go();
      else vid.addEventListener("loadedmetadata", go, { once: true });
    }
  }
  function releasePreviewBlob() {
    if (filePreviewUrl) {
      const cached = Object.keys(attachPreviewCache).some((id) => attachPreviewCache[id] === filePreviewUrl);
      if (!cached) URL.revokeObjectURL(filePreviewUrl);
      filePreviewUrl = "";
    }
    revokePreviewExtras();
    filePreviewBytes = null;
    filePreviewName = "file";
  }
  function clearPreviewUi(els) {
    if (!els) return;
    if (els.body) els.body.innerHTML = "";
    if (els.stage) {
      delete els.stage.dataset.preview;
      els.stage.style.width = "";
      els.stage.style.height = "";
    }
    if (els.embedded && els.cap) els.cap.textContent = "Preview";
    if (els.embedded && els.download) els.download.hidden = true;
  }
  function closeFilePreview() {
    previewTarget = "modal";
    const els = {
      box: document.getElementById("filePreview"),
      body: document.getElementById("filePreviewBody"),
      cap: document.getElementById("filePreviewCap"),
      stage: document.querySelector("#filePreview .file-preview-stage"),
      download: document.getElementById("filePreviewDownload"),
      embedded: false
    };
    if (els.box) els.box.hidden = true;
    clearPreviewUi(els);
    releasePreviewBlob();
  }
  function resetFilesPreviewPane() {
    const prev = previewTarget;
    previewTarget = "files";
    const els = previewEls();
    clearPreviewUi(els);
    if (els.body) els.body.innerHTML = '<p class="page-sub files-preview-empty">Select a file to preview</p>';
    previewTarget = prev;
  }
  async function openFilePreview(a, host) {
    if (!a) return;
    hideTip();
    closePops();
    const nextHost = host === "files" ? "files" : "modal";
    if (nextHost === "modal") closeFilePreview();
    else {
      const modalBox = document.getElementById("filePreview");
      if (modalBox) modalBox.hidden = true;
      releasePreviewBlob();
    }
    const bytes = await loadAttachmentBytes(a);
    if (!bytes) {
      toast("No stored file to preview · sample placeholders have no bytes");
      if (nextHost === "files") {
        const pane = document.getElementById("projectFilesPreview");
        if (pane) pane.innerHTML = '<p class="page-sub files-preview-empty">No stored file to preview</p>';
        const cap = document.getElementById("projectFilesCap");
        if (cap) cap.textContent = a.name || "Preview";
        const dl = document.getElementById("projectFilesDownload");
        if (dl) dl.hidden = true;
        previewTarget = "files";
        sizeFilesModalToPreview("other");
      }
      return;
    }
    previewTarget = nextHost;
    const els = previewEls();
    const mime = a.type || "application/octet-stream";
    const kind = previewKind(a, mime);
    if (!els.body) return;
    filePreviewBytes = bytes;
    filePreviewName = a.name || "file";
    if (els.cap) els.cap.textContent = filePreviewName;
    if (els.download) els.download.hidden = false;
    const blobType = kind === "pdf" ? "application/pdf" : (mime || "application/octet-stream");
    const blob = new Blob([bytes], { type: blobType });
    filePreviewUrl = URL.createObjectURL(blob);
    if (a.id && isImageAttach(a) && !attachPreviewCache[a.id]) {
      attachPreviewCache[a.id] = URL.createObjectURL(new Blob([bytes], { type: blobType }));
    }
    const officeKinds = { docx: 1, xlsx: 1, pptx: 1, odf: 1, doc: 1, xls: 1, ppt: 1 };
    let html = "";
    if (kind === "image") html = '<img src="' + filePreviewUrl + '" alt="">';
    else if (kind === "video") html = '<video src="' + filePreviewUrl + '" controls></video>';
    else if (kind === "audio") html = '<audio src="' + filePreviewUrl + '" controls></audio>';
    else if (kind === "pdf") html = '<iframe title="PDF preview" src="' + filePreviewUrl + '"></iframe>';
    else if (officeKinds[kind]) {
      try { html = await renderOfficePreview(kind, bytes, filePreviewName); }
      catch (err) { html = officeFallback(filePreviewName, "Could not read this Office file · download the decrypted file"); }
    }
    else if (kind === "text" || looksText(bytes)) html = "<pre></pre>";
    else html = officeFallback(filePreviewName);
    els.body.innerHTML = html;
    const asText = kind === "text" || (!officeKinds[kind] && looksText(bytes));
    if (asText) {
      const pre = els.body.querySelector("pre");
      if (pre) pre.textContent = new TextDecoder("utf-8").decode(bytes);
    }
    applyPreviewFrame(asText && kind !== "text" && !officeKinds[kind] ? "text" : kind, filePreviewName);
    sizePreviewToMedia(asText && kind !== "text" && !officeKinds[kind] ? "text" : kind);
    if (!els.embedded && els.box) els.box.hidden = false;
  }
  function isProjectFilesOpen() {
    const box = document.getElementById("projectFilesModal");
    return !!(box && !box.hidden);
  }
  function projectFilesAllowed() {
    return !!(projects[currentProject] && workspaceViews.has(activeView));
  }
  function projectFilesScopeIds() {
    return projectFilesAllowed() ? [currentProject] : [];
  }
  function collectProjectFileRows() {
    const rows = [];
    const pids = projectFilesScopeIds();
    if (!pids.length) return rows;
    const allow = Object.create(null);
    pids.forEach((pid) => { allow[pid] = true; });
    Object.keys(tasks).forEach((id) => {
      const t = tasks[id];
      if (!t) return;
      if (!allow[t.project]) return;
      ensureExtras(id);
      (t.attachments || []).forEach((a, ai) => {
        if (!a) return;
        rows.push({
          key: id + "|t|" + ai,
          task: t.title || "Untitled",
          name: a.name || "file",
          size: a.size || "",
          attach: a
        });
      });
    });
    rows.sort((a, b) => String(a.task).localeCompare(String(b.task)) || String(a.name).localeCompare(String(b.name)));
    return rows;
  }
  function paintProjectFilesTable() {
    const body = document.getElementById("projectFilesBody");
    const sub = document.getElementById("projectFilesSub");
    if (!body) return;
    projectFileRows = collectProjectFileRows();
    const ids = projectFilesScopeIds();
    if (sub) {
      sub.textContent = ids.length === 1 && projects[ids[0]]
        ? projects[ids[0]].name + " · " + projectFileRows.length + " file" + (projectFileRows.length === 1 ? "" : "s")
        : (ids.length ? "Live projects" : "No project") + " · " + projectFileRows.length + " file" + (projectFileRows.length === 1 ? "" : "s");
    }
    if (!projectFileRows.length) {
      body.innerHTML = '<tr><td colspan="2"><p class="page-sub" style="margin:8px">No attachments on this project</p></td></tr>';
      return;
    }
    if (projectFilesSel && !projectFileRows.some((r) => r.key === projectFilesSel)) projectFilesSel = "";
    body.innerHTML = projectFileRows.map((r) => {
      const on = r.key === projectFilesSel ? " on" : "";
      return '<tr data-file-key="' + escAttr(r.key) + '" class="' + on.trim() + '" data-tip="Preview ' + escAttr(r.name) + '"><td class="title">' + escText(r.task) + '</td><td>' + escText(r.name) + (r.size ? ' <span class="t">' + escText(r.size) + "</span>" : "") + "</td></tr>";
    }).join("");
  }
  function closeProjectFiles() {
    const box = document.getElementById("projectFilesModal");
    if (box) box.hidden = true;
    document.body.classList.remove("is-files-drag", "is-files-resize", "is-files-split");
    delete document.body.dataset.filesResize;
    projectFilesSel = "";
    if (previewTarget === "files") {
      releasePreviewBlob();
      resetFilesPreviewPane();
      previewTarget = "modal";
    }
  }
  function filesModalCard() {
    return document.querySelector("#projectFilesModal .files-modal-card");
  }
  function clampFilesModalSize(w, h) {
    const maxW = Math.max(FILES_MODAL_MIN_W, window.innerWidth - 16);
    const maxH = Math.max(FILES_MODAL_MIN_H, window.innerHeight - 16);
    return {
      w: Math.max(FILES_MODAL_MIN_W, Math.min(Math.round(w), maxW)),
      h: Math.max(FILES_MODAL_MIN_H, Math.min(Math.round(h), maxH))
    };
  }
  function clampFilesModalPos(left, top, card) {
    const w = (filesModalSize && filesModalSize.w) || card.offsetWidth || 720;
    const h = (filesModalSize && filesModalSize.h) || card.offsetHeight || 480;
    const maxL = Math.max(8, window.innerWidth - Math.min(w, window.innerWidth - 16));
    const maxT = Math.max(8, window.innerHeight - 56);
    return {
      left: Math.max(8, Math.min(left, maxL)),
      top: Math.max(8, Math.min(top, maxT))
    };
  }
  function applyFilesModalPos() {
    const card = filesModalCard();
    if (!card) return;
    if (!filesModalPos && !filesModalSize) {
      card.style.position = "";
      card.style.left = "";
      card.style.top = "";
      card.style.margin = "";
      card.style.transform = "";
      card.style.width = "";
      card.style.height = "";
      card.style.maxWidth = "";
      card.style.maxHeight = "";
      applyFilesSplit();
      return;
    }
    if (filesModalSize) {
      const size = clampFilesModalSize(filesModalSize.w, filesModalSize.h);
      filesModalSize = size;
      card.style.width = size.w + "px";
      card.style.height = size.h + "px";
      card.style.maxWidth = "none";
      card.style.maxHeight = "none";
    }
    if (filesModalPos) {
      const pos = clampFilesModalPos(filesModalPos.left, filesModalPos.top, card);
      filesModalPos = pos;
      card.style.position = "fixed";
      card.style.left = pos.left + "px";
      card.style.top = pos.top + "px";
      card.style.margin = "0";
      card.style.transform = "none";
    }
    applyFilesSplit();
  }
  function filesSplitEl() {
    return document.querySelector("#projectFilesModal .files-modal-split");
  }
  function applyFilesSplit() {
    const split = filesSplitEl();
    if (!split) return;
    const total = split.clientWidth - FILES_SPLIT_GUTTER;
    if (total <= 0) return;
    const maxList = Math.max(FILES_LIST_MIN, total - FILES_PREV_MIN);
    const listW = Math.max(FILES_LIST_MIN, Math.min(filesListWidth, maxList));
    split.style.gridTemplateColumns = listW + "px " + FILES_SPLIT_GUTTER + "px minmax(0, 1fr)";
  }
  function bindProjectFilesSplit() {
    const handle = document.getElementById("projectFilesSplit");
    const split = filesSplitEl();
    if (!handle || !split || handle.dataset.splitBound) return;
    handle.dataset.splitBound = "1";
    let drag = null;
    const end = () => {
      drag = null;
      handle.classList.remove("on");
      document.body.classList.remove("is-files-split");
    };
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const r = split.getBoundingClientRect();
      drag = { pointerId: e.pointerId, left: r.left };
      handle.classList.add("on");
      document.body.classList.add("is-files-split");
      hideTip();
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    const onMove = (e) => {
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return;
      filesListWidth = Math.round(e.clientX - drag.left);
      applyFilesSplit();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }
  function pinFilesModalBox() {
    const card = filesModalCard();
    if (!card) return null;
    const r = card.getBoundingClientRect();
    filesModalPos = { left: r.left, top: r.top };
    filesModalSize = { w: r.width, h: r.height };
    applyFilesModalPos();
    return card;
  }
  function bindProjectFilesDrag() {
    const handle = document.querySelector("#projectFilesModal .files-modal-head");
    const card = filesModalCard();
    if (!handle || !card || handle.dataset.dragBound) return;
    handle.dataset.dragBound = "1";
    let drag = null;
    let pointerId = null;
    const end = () => {
      drag = null;
      pointerId = null;
      card.classList.remove("is-files-drag");
      document.body.classList.remove("is-files-drag");
    };
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button, a, input, select, textarea, [data-resize]")) return;
      const r = card.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      pointerId = e.pointerId;
      card.classList.add("is-files-drag");
      document.body.classList.add("is-files-drag");
      hideTip();
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    const onMove = (e) => {
      if (!drag) return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      filesModalPos = clampFilesModalPos(e.clientX - drag.dx, e.clientY - drag.dy, card);
      applyFilesModalPos();
    };
    handle.addEventListener("pointermove", onMove);
    window.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }
  function bindProjectFilesResize() {
    const card = filesModalCard();
    if (!card || card.dataset.resizeBound) return;
    card.dataset.resizeBound = "1";
    let rs = null;
    const end = () => {
      rs = null;
      card.classList.remove("is-files-resize");
      document.body.classList.remove("is-files-resize");
      delete document.body.dataset.filesResize;
    };
    card.querySelectorAll("[data-resize]").forEach((el) => {
      el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        pinFilesModalBox();
        const r = card.getBoundingClientRect();
        rs = {
          dir: el.getAttribute("data-resize") || "se",
          pointerId: e.pointerId,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom
        };
        card.classList.add("is-files-resize");
        document.body.classList.add("is-files-resize");
        document.body.dataset.filesResize = rs.dir;
        hideTip();
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      });
    });
    const onMove = (e) => {
      if (!rs) return;
      if (e.pointerId !== rs.pointerId) return;
      const dir = rs.dir;
      let left = rs.left;
      let top = rs.top;
      let w = rs.right - rs.left;
      let h = rs.bottom - rs.top;
      if (dir.indexOf("e") !== -1) w = e.clientX - rs.left;
      if (dir.indexOf("s") !== -1) h = e.clientY - rs.top;
      if (dir.indexOf("w") !== -1) {
        w = rs.right - e.clientX;
        left = e.clientX;
      }
      if (dir.indexOf("n") !== -1) {
        h = rs.bottom - e.clientY;
        top = e.clientY;
      }
      const size = clampFilesModalSize(w, h);
      if (dir.indexOf("w") !== -1) left = rs.right - size.w;
      if (dir.indexOf("n") !== -1) top = rs.bottom - size.h;
      filesModalSize = size;
      filesModalPos = clampFilesModalPos(left, top, card);
      applyFilesModalPos();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }
  function openProjectFiles() {
    if (!projectFilesAllowed()) {
      toast("Open a project to see its files");
      return;
    }
    hideTip();
    closePops();
    closeFilePreview();
    projectFilesSel = "";
    resetFilesPreviewPane();
    paintProjectFilesTable();
    const box = document.getElementById("projectFilesModal");
    if (box) box.hidden = false;
    bindProjectFilesDrag();
    bindProjectFilesResize();
    bindProjectFilesSplit();
    requestAnimationFrame(() => {
      applyFilesModalPos();
      applyFilesSplit();
      sizeFilesModalToPreview("empty");
    });
  }
  async function viewProjectFile(key) {
    const row = projectFileRows.find((r) => r.key === key);
    if (!row) return;
    projectFilesSel = key;
    paintProjectFilesTable();
    await openFilePreview(row.attach, "files");
  }
  function photoSrcFromEl(el) {
    if (!el) return "";
    if (el.tagName === "IMG") return el.currentSrc || el.src || "";
    const who = el.dataset && el.dataset.who ? normWho(el.dataset.who) : "";
    if (who && photos[who]) return photos[who];
    const bg = (el.style && el.style.backgroundImage) || "";
    const quoted = bg.match(/url\((['"])([\s\S]*?)\1\)/);
    if (quoted) return quoted[2];
    const bare = bg.match(/url\(([\s\S]*?)\)/);
    return bare ? bare[1].trim() : "";
  }
  function photoLabelFromEl(el) {
    const who = el.dataset && el.dataset.who ? normWho(el.dataset.who) : "";
    if (who && roster[who]) return roster[who].name;
    return (el.getAttribute && (el.getAttribute("alt") || el.getAttribute("data-tip"))) || "Photo";
  }
  function closePhotoZoom() {
    const box = document.getElementById("photoZoom");
    if (box) box.hidden = true;
    const img = document.getElementById("photoZoomImg");
    if (img) img.removeAttribute("src");
  }
  function openPhotoZoom(src, label) {
    if (!src) return;
    hideTip();
    closePops();
    const box = document.getElementById("photoZoom");
    const img = document.getElementById("photoZoomImg");
    const cap = document.getElementById("photoZoomCap");
    if (!box || !img) return;
    img.src = src;
    img.alt = label || "Photo";
    if (cap) cap.textContent = label || "";
    box.hidden = false;
  }
  document.addEventListener("click", (e) => {
    const zoom = document.getElementById("photoZoom");
    if (zoom && !zoom.hidden) {
      if (e.target.closest("#photoZoomClose") || e.target === zoom) {
        e.preventDefault();
        e.stopPropagation();
        closePhotoZoom();
      }
      return;
    }
    const preview = document.getElementById("filePreview");
    if (preview && !preview.hidden) {
      if (e.target.closest("#filePreviewClose") || e.target === preview) {
        e.preventDefault();
        e.stopPropagation();
        closeFilePreview();
      }
      return;
    }
    const el = e.target.closest(".has-photo");
    if (!el || el.closest("#accountWrap")) return;
    const src = photoSrcFromEl(el);
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    openPhotoZoom(src, photoLabelFromEl(el));
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const zoom = document.getElementById("photoZoom");
    if (zoom && !zoom.hidden) {
      e.preventDefault();
      closePhotoZoom();
      return;
    }
    const preview = document.getElementById("filePreview");
    if (preview && !preview.hidden) {
      e.preventDefault();
      closeFilePreview();
      return;
    }
    if (isProjectFilesOpen()) {
      e.preventDefault();
      closeProjectFiles();
    }
  });
  const photoZoomClose = document.getElementById("photoZoomClose");
  if (photoZoomClose) photoZoomClose.addEventListener("click", closePhotoZoom);
  async function downloadPreviewFile() {
    const name = filePreviewName || "file";
    try {
      if (!filePreviewBytes || !filePreviewBytes.length) throw new Error("Nothing to download · this file has no stored bytes");
      const blob = new Blob([filePreviewBytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      await showNotice("Download complete", "“" + name + "” downloaded successfully.");
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : "Could not download this file.";
      await showNotice("Download failed", msg);
    }
  }
  const filePreviewClose = document.getElementById("filePreviewClose");
  if (filePreviewClose) filePreviewClose.addEventListener("click", closeFilePreview);
  const filePreviewDownload = document.getElementById("filePreviewDownload");
  if (filePreviewDownload) {
    filePreviewDownload.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadPreviewFile();
    });
  }
  const projectFilesBtn = document.getElementById("projectFilesBtn");
  if (projectFilesBtn) projectFilesBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openProjectFiles();
  });
  const projectFilesClose = document.getElementById("projectFilesClose");
  if (projectFilesClose) projectFilesClose.addEventListener("click", closeProjectFiles);
  const projectFilesBody = document.getElementById("projectFilesBody");
  if (projectFilesBody) {
    projectFilesBody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-file-key]");
      const key = tr && tr.getAttribute("data-file-key");
      if (!key) return;
      e.preventDefault();
      viewProjectFile(key);
    });
  }
  const projectFilesDownload = document.getElementById("projectFilesDownload");
  if (projectFilesDownload) {
    projectFilesDownload.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadPreviewFile();
    });
  }

  const modal = document.getElementById("modal");
  const modalInput = document.getElementById("modalInput");
  let modalMode = "task";
  let pendingList = "To do";
  let pendingHex = "#00D1D1";
  function normalizeHex(v) {
    const s = String(v || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return "#" + s.slice(1).toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return "#" + s.slice(1).split("").map((c) => (c + c).toUpperCase()).join("");
    return "#00D1D1";
  }
  function hexRgb(hex) {
    const h = normalizeHex(hex).slice(1);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function mixHex(hex, other, t) {
    const a = hexRgb(hex), b = hexRgb(other);
    const n = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
    return "#" + n(a.r, b.r) + n(a.g, b.g) + n(a.b, b.b);
  }
  function colorPack(hex) {
    const h = normalizeHex(hex);
    const known = {
      "#00D1D1": { name: "teal", hex: h, dot: "var(--accent)", dim: "var(--accent-dim)", fg: "var(--accent-fg)" },
      "#A855F7": { name: "purple", hex: h, dot: "var(--purple)", dim: "var(--purple-dim)", fg: "var(--purple-fg)" },
      "#7C3AED": { name: "purple", hex: h, dot: "var(--purple)", dim: "var(--purple-dim)", fg: "var(--purple-fg)" },
      "#F59E0B": { name: "amber", hex: h, dot: "var(--amber)", dim: "var(--amber-dim)", fg: "var(--amber-fg)" },
      "#D97706": { name: "amber", hex: h, dot: "var(--amber)", dim: "var(--amber-dim)", fg: "var(--amber-fg)" }
    };
    if (known[h]) return known[h];
    const rgb = hexRgb(h);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const dark = !document.body.classList.contains("theme-light");
    const pair = rolePair(hsl.h, hsl.s, dark);
    return { name: h, hex: h, dot: h, dim: pair.bg, fg: pair.fg };
  }
  function setPendingHex(hex) {
    pendingHex = normalizeHex(hex);
    let matched = false;
    document.querySelectorAll("#projColorPicks .color-pick").forEach((b) => {
      const on = normalizeHex(b.dataset.hex) === pendingHex;
      b.classList.toggle("on", on);
      if (on) matched = true;
    });
    const custom = document.getElementById("projColorCustom");
    if (custom) custom.value = pendingHex;
    const wrap = document.getElementById("projColorCustomWrap");
    if (wrap) wrap.classList.toggle("on", !matched);
    const colors = document.getElementById("projColorPicks");
    if (colors) colors.classList.remove("invalid");
  }

  let editingId = null;
  function fillPeopleSelect(sel, selected) {
    if (!sel) return;
    const ids = activeTeamIds().slice();
    if (isTeamMember(selected) && ids.indexOf(selected) === -1) ids.push(selected);
    const pick = ids.indexOf(selected) !== -1 ? selected : (ids[0] || "");
    sel.innerHTML = ids.length
      ? ids.map((id) => {
          const rec = roster[id];
          const extra = isPersonActive(id) ? "" : " · inactive";
          return '<option value="' + id + '"' + (id === pick ? " selected" : "") + ">" + rec.name + " · " + rec.role + extra + "</option>";
        }).join("")
      : '<option value="">Add an active teammate first</option>';
  }
  function toIso(label) {
    return dateIso(label);
  }
  function formatDue(value) {
    const p = parseIsoDate(value);
    if (!p) return fmtIso(value);
    const label = fmtIso(p.iso);
    const diff = Math.round((Date.UTC(TODAY_Y, TODAY_M - 1, TODAY_D) - Date.UTC(p.y, p.mo - 1, p.d)) / 86400000);
    if (diff > 0) return label + " · " + diff + "d late";
    return label;
  }
  function priClassOf(pri) {
    return priorityOf(pri).cls;
  }
  function ensureExtras(id) {
    const t = tasks[id];
    if (!t) return;
    const proj = (projects[t.project] && projects[t.project].name) || "this project";
    if (!t.subtasks) {
      t.subtasks = [
        { text: "Scope " + t.title, who: t.assignee, date: t.start, done: t.pct >= 40 || isDoneStatus(t.list) },
        { text: "Draft on " + proj, who: t.assignee, date: t.start, done: t.pct >= 70 || isDoneStatus(t.list) },
        { text: "Review with owner", who: t.assignee, date: dueParts(t).label, done: isDoneStatus(t.list) }
      ];
    }
    if (!Array.isArray(t.comments)) t.comments = t.list === "To do" ? [] : [{ who: t.assignee, date: t.start, text: "In progress on " + proj + "." }];
    if (!Array.isArray(t.attachments)) t.attachments = [{ name: t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 22) + ".fig", size: "1.2 MB" }];
    if (!Array.isArray(t.history)) t.history = [{ text: t.assignee + " created this in " + t.list, t: t.start }];
  }
  function addHistory(id, text) {
    const t = tasks[id];
    if (!t) return;
    ensureExtras(id);
    t.history.unshift({ text: text, t: "just now" });
    if (taskPane.dataset.currentTask === id) renderTaskExtras(id);
    schedulePersist();
  }
  function isSubOverdue(s) {
    if (!s || s.done) return false;
    return dueParts({ due: s.date }).key < TODAY_KEY;
  }
  function primeSubtaskForm(id) {
    const t = tasks[id];
    const input = document.getElementById("subtaskInput");
    const who = document.getElementById("subtaskAssignee");
    const due = document.getElementById("subtaskDue");
    if (!t || !input || !who || !due) return;
    fillPeopleSelect(who, t.assignee);
    due.value = dateFieldText(t.due) || dateFieldText(todayIso());
    input.value = "";
    [input, who, due].forEach((el) => el.classList.remove("invalid"));
  }
  function renderTaskExtras(id) {
    ensureExtras(id);
    const t = tasks[id];
    const list = document.getElementById("subtaskList");
    const writeOk = canEditWorkspace();
    list.innerHTML = t.subtasks.map((s, i) => {
      const rec = roster[s.who] || roster[t.assignee] || roster.AC;
      const late = isSubOverdue(s);
      return '<label class="check' + (s.done ? " done" : "") + '"><input type="checkbox" data-check="subtask" data-i="' + i + '"' + (s.done ? " checked" : "") + (writeOk ? "" : " disabled") + '><span class="sub-body">' + s.text + '</span><span class="who' + (late ? " late" : "") + '">' + avatarHTML(s.who, "sm") + " " + rec.name + " · " + fmtIso(s.date) + (late ? " · overdue" : "") + "</span></label>";
    }).join("") || '<p class="page-sub" style="margin:0">No subtasks on this task</p>';
    const done = t.subtasks.filter((s) => s.done).length;
    document.getElementById("subCount").textContent = done + "/" + t.subtasks.length + " completed";
    document.getElementById("subBar").style.width = (t.subtasks.length ? Math.round((done / t.subtasks.length) * 100) : 0) + "%";
    document.getElementById("commentPanel").innerHTML = t.comments.map((c) => {
      if (!c.id) c.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const who = (roster[c.who] && roster[c.who].name) || c.who;
      const editBtn = writeOk
        ? '<button class="btn btn-ghost btn-sm" type="button" data-edit-comment="' + escAttr(c.id) + '" data-tip="Edit this comment">Edit</button>'
        : "";
      return '<div class="comment" data-comment-id="' + escAttr(c.id) + '"><div class="comment-h"><b>' + escText(who) + '</b> <span class="t">' + escText(fmtIso(c.date)) + (c.edited ? " · edited" : "") + "</span>" + editBtn + '</div><div class="comment-text">' + escText(c.text) + "</div></div>";
    }).join("") || '<p class="page-sub" style="margin:0">No comments on this task</p>';
    document.querySelector('#detailTabs [data-tab="comments"]').textContent = "Comments (" + t.comments.length + ")";
    document.getElementById("attachList").innerHTML = t.attachments.map((a, i) => {
      const safe = String(a.name || "file").replace(/[<>]/g, "");
      const href = attachHref(a);
      const image = isImageAttach(a);
      const thumb = image && href
        ? '<img class="attach-thumb" src="' + href + '" alt="' + escAttr(safe) + '" data-view-attach="' + i + '" data-tip="View ' + escAttr(safe) + '">'
        : "";
      const name = '<span class="attach-name" data-tip="' + escAttr(safe) + '">' + escText(safe) + "</span>";
      return '<div class="attach">' + thumb + '<div class="attach-meta">' + name + '<span class="attach-size">' + escText(a.size || "") + "</span></div>" +
        '<div class="attach-actions"><button class="btn btn-ghost btn-sm" type="button" data-view-attach="' + i + '" data-tip="Preview ' + escAttr(safe) + '">View</button>' +
        (writeOk ? '<button class="btn btn-ghost btn-sm" type="button" data-del-attach="' + i + '" data-tip="Remove ' + escAttr(safe) + ' from this task">Delete</button>' : "") + "</div></div>";
    }).join("") || '<p class="page-sub" style="margin:0">No attachments on this task</p>';
    document.querySelector('#detailTabs [data-tab="attachments"]').textContent = "Attachments (" + t.attachments.length + ")";
    document.getElementById("historyPanel").innerHTML = t.history.map((h) => {
      return '<div class="hist">' + h.text + ' <span class="t">' + fmtIso(h.t) + "</span></div>";
    }).join("") || '<p class="page-sub" style="margin:0">No history yet</p>';
    applyPhotos(taskPane);
  }
  function syncTaskDom(id) {
    const t = tasks[id];
    if (!t) return;
    const p = projects[t.project] || projects.website;
    const rec = roster[t.assignee] || roster.AC;
    const card = document.querySelector('.kcard[data-task="' + id + '"]');
    if (card) {
      const h3 = card.querySelector("h3");
      if (h3) h3.textContent = t.title;
      const dueEl = card.querySelector(".due");
      if (dueEl) {
        dueEl.textContent = "Due " + fmtIso(t.due);
        dueEl.classList.toggle("late", isOverdue(t));
      }
      const foot = card.querySelector(".kfoot");
      if (foot) foot.innerHTML = catalogTagHtml(t.priClass, t.pri, "pri") + avatarHTML(t.assignee, "sm");
      applyCardStatusLook(card, t.list);
      const col = boardCol(t.list);
      if (col && card.parentElement !== col) col.insertBefore(card, col.querySelector(".add-task"));
    }
    const tr = document.querySelector('#taskTbody tr[data-task="' + id + '"]');
    if (tr) {
      tr.innerHTML = "<td class=\"title\"><span class=\"dot\" style=\"background:" + p.dot + "\"></span> " + t.title + "</td><td>" + catalogTagHtml(t.statusClass, t.list, "status") + "</td><td>" + catalogTagHtml(t.priClass, t.pri, "pri") + "</td><td" + (isOverdue(t) ? " style=\"color:var(--danger-text)\"" : "") + ">" + dueParts(t).label + "</td><td>" + avatarHTML(t.assignee, "sm") + "</td>";
    }
    mountTask(id);
    filterWorkspace(activeView);
    applyPhotos(card || tr);
  }

  function openModal(mode, list, editId) {
    if (mode === "task" && !editId && !canEditWorkspace()) {
      toast(workspaceLockReason() || "Create a project first");
      return;
    }
    closePops();
    hideTip();
    modalMode = mode;
    editingId = editId || null;
    pendingList = list || firstStatusLabel();
    const editing = !!editingId;
    const titles = {
      task: [editing ? "Edit task" : "Create task", editing ? "Updates this task on " + ((projects[currentProject] && projects[currentProject].name) || "the board") : "Added to " + pendingList + " on " + ((projects[currentProject] && projects[currentProject].name) || "this project"), "Task title", editing ? "Save task" : "Create task"],
      project: [editing ? "Edit project" : "Create project", "Name, description, owner, dates, and project color are required", "Project name", editing ? "Save project" : "Create project"],
      member: [editing ? "Edit teammate" : "Add teammate", "Typed in by hand · no Outlook or email invite", "Full name", editing ? "Save person" : "Add person"]
    };
    const t = titles[mode];
    document.getElementById("modalTitle").textContent = t[0];
    document.getElementById("modalSub").textContent = t[1];
    document.getElementById("modalLabel").innerHTML = t[2] + ' <i class="req">*</i>';
    document.getElementById("modalOk").textContent = t[3];
    const okBtn = document.getElementById("modalOk");
    if (okBtn) {
      okBtn.dataset.tip = editing
        ? (mode === "task" ? "Save changes to this task" : mode === "project" ? "Save changes to this project" : "Save name, role, and status")
        : (mode === "task" ? "Create this task on the board" : mode === "project" ? "Create this project in the workspace" : "Add this person to the team");
    }
    const cancelBtn = document.getElementById("modalCancel");
    if (cancelBtn) {
      cancelBtn.textContent = "Cancel";
      cancelBtn.dataset.tip = "Close without saving";
    }
    const delBtn = document.getElementById("modalDelete");
    if (delBtn) {
      const canDelTask = mode === "task" && editing && !!tasks[editingId];
      const canDelProj = mode === "project" && editing && !!projects[editingId];
      delBtn.hidden = !(canDelTask || canDelProj);
      if (canDelTask) {
        delBtn.textContent = "Delete task";
        delBtn.dataset.tip = "Remove this task, its comments, subtasks, and files";
      } else if (canDelProj) {
        delBtn.textContent = "Delete project";
        delBtn.dataset.tip = "Delete this project and every task on it";
      } else {
        delBtn.textContent = "Delete";
        delBtn.dataset.tip = "";
      }
    }
    document.getElementById("modalCard").classList.toggle("wide", mode === "project" || mode === "task");
    modalInput.value = "";
    modalInput.classList.remove("invalid");
    modalInput.placeholder = mode === "member" ? "Priya Shah" : mode === "project" ? "project name" : "Task title";
    modalInput.setAttribute("placeholder", modalInput.placeholder);
    document.getElementById("modalRoleWrap").hidden = mode !== "member";
    document.getElementById("modalRole").value = "";
    const memberExtras = document.getElementById("memberExtras");
    if (memberExtras) memberExtras.hidden = mode !== "member";
    const memberPhotoRow = document.getElementById("memberPhotoRow");
    if (memberPhotoRow) memberPhotoRow.hidden = !(mode === "member" && editing);
    const memberActive = document.getElementById("memberActive");
    if (memberActive) memberActive.value = "active";
    document.getElementById("projFields").hidden = mode !== "project";
    document.getElementById("taskFields").hidden = mode !== "task";
    if (mode === "project") {
      fillPeopleSelect(document.getElementById("projOwner"));
      document.getElementById("projDesc").value = "";
      document.getElementById("projStart").value = "";
      document.getElementById("projEnd").value = "";
      fillProjectStatusSelect(document.getElementById("projStatusSelect"), firstProjectStatusId());
      pendingHex = "#00D1D1";
      setPendingHex(pendingHex);
      ["projDesc", "projStart", "projEnd", "projOwner"].forEach((id) => document.getElementById(id).classList.remove("invalid"));
      if (editing && projects[editingId]) {
        const p = projects[editingId];
        modalInput.value = p.name;
        document.getElementById("projDesc").value = p.desc || "";
        fillPeopleSelect(document.getElementById("projOwner"), p.owner);
        fillProjectStatusSelect(document.getElementById("projStatusSelect"), p.status || firstProjectStatusId());
        fillDateField(document.getElementById("projStart"), p.startIso || p.range);
        fillDateField(document.getElementById("projEnd"), p.endIso);
        setPendingHex(p.hex || "#00D1D1");
      }
    }
    if (mode === "task") {
      fillPeopleSelect(document.getElementById("taskAssignee"));
      document.getElementById("taskDesc").value = "";
      const startList = (editing && tasks[editingId] && tasks[editingId].list) || pendingList || firstStatusLabel();
      fillStatusSelect(document.getElementById("taskList"), startList);
      fillPrioritySelect(document.getElementById("taskPri"), firstPriorityLabel());
      estLock = true;
      setTaskEstUnit("days");
      document.getElementById("taskEst").value = "1";
      fillDateField(document.getElementById("taskStart"), todayIso());
      document.getElementById("taskDue").value = "";
      document.getElementById("taskTags").value = "";
      ["taskDesc", "taskStart", "taskDue", "taskEst", "taskAssignee"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("invalid");
      });
      if (editing && tasks[editingId]) {
        const tk = tasks[editingId];
        modalInput.value = tk.title;
        document.getElementById("taskDesc").value = tk.desc || "";
        document.getElementById("taskList").value = tk.list;
        fillStatusSelect(document.getElementById("taskList"), tk.list);
        fillPrioritySelect(document.getElementById("taskPri"), tk.pri);
        fillPeopleSelect(document.getElementById("taskAssignee"), tk.assignee);
        writeEstFromHours(parseFloat(tk.est) || 8);
        fillDateField(document.getElementById("taskStart"), tk.start);
        fillDateField(document.getElementById("taskDue"), tk.due);
        document.getElementById("taskTags").value = (tk.tags || []).join(", ");
      }
      estLock = false;
      if (!editing) syncTaskSchedule("days");
      else paintEstHint(readEstHours());
    }
    if (mode === "member") {
      if (editing && roster[editingId]) {
        modalInput.value = roster[editingId].name;
        document.getElementById("modalRole").value = roster[editingId].role;
        if (memberActive) memberActive.value = isPersonActive(editingId) ? "active" : "inactive";
      }
      paintMemberPreview();
    }
    modal.hidden = false;
    modalInput.readOnly = true;
    modalInput.focus();
    requestAnimationFrame(() => {
      modalInput.readOnly = false;
      if (mode === "project" && !editingId) {
        modalInput.value = "";
        modalInput.placeholder = "project name";
      }
    });
  }
  function closeModal() { modal.hidden = true; }

  function bumpWip(listName, delta) {
    const col = boardCol(listName);
    if (!col) return;
    const wip = col.querySelector(".wip");
    wip.textContent = String(Math.max(0, parseInt(wip.textContent, 10) + delta));
  }

  function createTask(data) {
    const id = "t" + Date.now();
    tasks[id] = {
      title: data.title, list: data.list, statusClass: listStatusOf(data.list).cls,
      pri: data.pri, priClass: priClassOf(data.pri), due: formatDue(data.due), start: fmtIso(data.start),
      assignee: data.assignee, est: roundHours(data.est || 8) + "h", act: "0h", pct: isDoneStatus(data.list) ? 100 : 0,
      desc: data.desc, tags: data.tags.length ? data.tags : [((projects[currentProject] && projects[currentProject].name) || "Task").split(" ")[0]], project: currentProject
    };
    ensureExtras(id);
    mountTask(id);
    filterWorkspace(activeView);
    queueStats(false);
    schedulePersist();
    if (activeView !== "board") showView("board");
    openTask(id, false);
    toast("Created task <em>" + data.title + "</em> in " + data.list);
  }
  function saveTask(id, data) {
    const t = tasks[id];
    if (!t) return;
    const from = t.list;
    t.title = data.title;
    t.desc = data.desc;
    t.list = data.list;
    t.statusClass = listStatusOf(data.list).cls;
    t.pri = data.pri;
    t.priClass = priClassOf(data.pri);
    t.assignee = data.assignee;
    t.start = fmtIso(data.start);
    t.due = formatDue(data.due);
    t.est = roundHours(data.est || 8) + "h";
    t.tags = data.tags;
    if (isDoneStatus(data.list)) t.pct = 100;
    addHistory(id, "AC edited this task");
    if (from !== data.list) addHistory(id, "AC moved this to " + data.list);
    syncTaskDom(id);
    queueStats(false);
    schedulePersist();
    openTask(id, false);
    toast("Saved task <em>" + t.title + "</em>");
  }
  function saveProject(id, data) {
    const c = colorPack(data.color);
    const st = statusMeta(data.status);
    const range = fmtIso(data.start) + " – " + fmtIso(data.end);
    Object.assign(projects[id], {
      name: data.name, desc: data.desc, owner: data.owner, range: range,
      startIso: data.start, endIso: data.end, status: data.status, statusLabel: st.label,
      colorName: c.name, hex: c.hex, dot: c.dot, dim: c.dim, fg: c.fg
    });
    paintProjectSurfaces(id);
    if (currentProject === id) paintChrome(projects[id]);
    syncProjStatusLayout();
    queueStats(true);
    schedulePersist();
    applyPhotos(document.querySelector('.proj[data-project="' + id + '"]'));
    toast("Saved project <em>" + data.name + "</em> · " + st.label + (statusMeta(data.status).closed ? " · off Dashboard and Reports" : ""));
  }
  function deleteTaskRecord(id) {
    const t = tasks[id];
    if (!t) return;
    (t.attachments || []).forEach((a) => {
      revokeAttach(a);
      deleteStoredAttachment(a);
    });
    removeTaskDom(id);
    unindexTask(id, t.project);
    delete tasks[id];
  }
  function deleteProject(id) {
    const p = projects[id];
    if (!p) return;
    const name = p.name;
    projectTaskIds(id).slice().forEach(deleteTaskRecord);
    document.querySelectorAll('[data-project="' + id + '"]').forEach((el) => el.remove());
    delete projects[id];
    closeModal();
    const next = Object.keys(projects)[0];
    if (next) selectProject(next);
    else {
      currentProject = "";
      paintChrome(null);
      clearTaskPane();
      paintEmptyWorkspace();
    }
    sortProjList();
    refreshProjStatusCounts();
    resetFilterValues();
    syncWorkspaceActions();
    updateSampleDesc();
    persistWorkspaceNow();
    toast("Deleted <em>" + name + "</em> · tasks, comments, and files removed");
  }

  function fmtIso(value) {
    const p = parseIsoDate(value);
    if (p) return pad2(p.d) + "-" + DATE_MONS[p.mo - 1] + "-" + p.y;
    return value ? String(value) : "—";
  }
  function markInvalid(el, bad) {
    if (!el) return !bad;
    el.classList.toggle("invalid", !!bad);
    return !bad;
  }

  function createProject(data) {
    const title = data.name;
    const c = colorPack(data.color);
    const owner = isTeamMember(data.owner) ? data.owner : (teamMemberIds()[0] || "");
    const rec = roster[owner];
    const range = fmtIso(data.start) + " – " + fmtIso(data.end);
    const st = statusMeta(data.status);
    const id = "p" + Date.now();
    projects[id] = { name: title, desc: data.desc, colorName: c.name, hex: c.hex, dot: c.dot, dim: c.dim, fg: c.fg, owner: owner, range: range, startIso: data.start, endIso: data.end, status: data.status, statusLabel: st.label, pinned: false };
    const btn = document.createElement("button");
    btn.className = "proj-item";
    btn.type = "button";
    btn.dataset.open = "board";
    btn.dataset.project = id;
    btn.innerHTML = "<span class=\"dot\" style=\"background:" + c.dot + "\"></span> " + title + STAR_SVG;
    document.getElementById("projList").appendChild(btn);
    bindOpen(btn);
    const art = document.createElement("article");
    art.className = "proj";
    art.dataset.open = "board";
    art.dataset.project = id;
    art.innerHTML = "<div class=\"proj-top\"><h2><span class=\"dot\" style=\"background:" + c.dot + "\"></span> " + title + "</h2>" + catalogTagHtml(st.cls, st.label, "proj") + "</div><p>" + data.desc + "</p><div class=\"meta\"><span>" + range + "</span><span>0%</span></div><div class=\"bar\"><span style=\"width:0%;background:" + c.dot + "\"></span></div><div class=\"proj-foot\"><span>0 tasks · owner " + rec.name.split(" ")[0] + "</span>" + avatarHTML(owner, "sm") + "</div>";
    document.getElementById("projGrid").appendChild(art);
    bindOpen(art);
    placeProjectCard(art, id);
    paintProjectSurfaces(id);
    syncProjStatusLayout();
    applyPhotos(art);
    selectProject(id, "board");
    schedulePersist();
    toast("Created project <em>" + title + "</em> · owner " + rec.name);
  }

  function sampleLoaded() {
    return SAMPLE_PROJECT_IDS.some((id) => projects[id] && projects[id].sample);
  }
  function samplePrefOn() {
    try { return localStorage.getItem(SAMPLE_KEY) !== "0"; } catch (err) { return true; }
  }
  function setSamplePref(on) {
    try { localStorage.setItem(SAMPLE_KEY, on ? "1" : "0"); } catch (err) {}
  }
  function removeTaskDom(id) {
    document.querySelectorAll(
      '.kcard[data-task="' + id + '"], table.list tr[data-task="' + id + '"], .gantt-row[data-task="' + id + '"], .chip[data-task="' + id + '"], .deadline[data-task="' + id + '"], #notifPop [data-task="' + id + '"]'
    ).forEach((el) => el.remove());
  }
  function paintEmptyWorkspace() {
    const live = {};
    taskStatuses.forEach((s) => { live[s.label] = 0; });
    const z = { live: live, todo: 0, progress: 0, review: 0, done: 0, total: 0, completed: 0, overdue: 0, overdueShown: 0, blocked: 0, pct: 0 };
    const setNum = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = String(n); };
    setNum("ovTotal", 0); setNum("ovDone", 0); setNum("ovProg", 0); setNum("ovOver", 0);
    const ovPct = document.getElementById("ovPct");
    if (ovPct) ovPct.textContent = "0%";
    const ring = document.getElementById("ovRing");
    if (ring) ring.setAttribute("stroke-dasharray", "0 226.1");
    const ovOver = document.getElementById("ovOver");
    if (ovOver) ovOver.classList.remove("late");
    paintDonut(z);
    paintKpiGrids(z);
    paintCharts();
    const box = document.getElementById("deadlineList");
    if (box) box.innerHTML = '<p class="page-sub" style="margin:0">No upcoming deadlines</p>';
    paintOverviewHeading(wantsDashStats());
    paintDueSidebar();
    refreshWip();
    paintGantt();
    paintCalendar(calendarAllProjects);
    paintNotifications();
  }
  function stripSampleTeam() {
    SAMPLE_TEAM_IDS.forEach((id) => {
      delete roster[id];
      delete people[id];
      delete photos[id];
    });
  }
  function restoreSampleTeam() {
    SAMPLE_TEAM_IDS.forEach((id) => {
      roster[id] = JSON.parse(JSON.stringify(SAMPLE_TEAM[id]));
      if (roster[id].active === undefined) roster[id].active = true;
      people[id] = roster[id].name + " · " + roster[id].role + (roster[id].active ? "" : " · inactive");
    });
  }
  function ensureSampleTeam() {
    if (!sampleLoaded() || !samplePrefOn()) return;
    SAMPLE_TEAM_IDS.forEach((id) => {
      if (roster[id]) return;
      roster[id] = JSON.parse(JSON.stringify(SAMPLE_TEAM[id]));
      if (roster[id].active === undefined) roster[id].active = true;
      people[id] = roster[id].name + " · " + roster[id].role + (roster[id].active ? "" : " · inactive");
    });
  }
  function stripSampleData() {
    SAMPLE_TASK_IDS.forEach((id) => {
      removeTaskDom(id);
      unindexTask(id);
      delete tasks[id];
    });
    SAMPLE_PROJECT_IDS.forEach((id) => {
      delete projects[id];
    });
    removeSampleProjectDom();
    stripSampleTeam();
    rebuildTaskIndex();
  }
  function updateSampleDesc() {
    const el = document.getElementById("sampleDesc");
    if (!el) return;
    el.textContent = sampleLoaded() ? "Demo projects are loaded" : "Demo projects are not loaded";
  }
  function observeProjectCard(el) {
    if (!el) return;
    if (!projCardObserver) {
      projCardObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = en.target.dataset.project;
          if (id && projects[id]) paintProjectSurfaces(id);
          projCardObserver.unobserve(en.target);
        });
      }, { rootMargin: "280px", threshold: 0 });
    }
    projCardObserver.observe(el);
  }
  function ensureProjectDom(id) {
    const p = projects[id] || cloneMasterProject(id);
    if (!p) return;
    if (!projects[id]) projects[id] = p;
    const list = document.getElementById("projList");
    const grid = document.getElementById("projGrid");
    if (list) {
      let btn = list.querySelector('.proj-item[data-project="' + id + '"]');
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.open = "board";
        btn.dataset.project = id;
        list.appendChild(btn);
        bindOpen(btn);
      }
      btn.className = "proj-item" + (p.pinned ? " pinned" : "") + (projectStatusOf(p.status).closed ? " closed" : "") + (id === currentProject ? " on" : "");
      btn.innerHTML = "<span class=\"dot\" style=\"background:" + (p.dot || p.hex) + "\"></span> " + p.name + STAR_SVG;
    }
    if (grid) {
      let art = document.querySelector('#projGrid .proj[data-project="' + id + '"]');
      if (!art) {
        art = document.createElement("article");
        art.className = "proj" + (projectStatusOf(p.status).closed ? " closed" : "");
        art.dataset.open = "board";
        art.dataset.project = id;
        art.innerHTML = "<div class=\"proj-top\"><h2><span class=\"dot\"></span> " + p.name + "</h2><span class=\"tag\"></span></div><p></p><div class=\"meta\"><span></span><span></span></div><div class=\"bar\"><span></span></div><div class=\"proj-foot\"><span></span></div>";
        bindOpen(art);
      }
      placeProjectCard(art, id);
      observeProjectCard(art);
    }
  }
  async function deleteSample() {
    if (sampleBusy) return;
    sampleBusy = true;
    cancelPendingPersist();
    persistEpoch++;
    try {
      setSamplePref(false);
      stripSampleData();
      syncProjectDom();
      renderTeamRail();
      renderTeamList();
      const next = Object.keys(projects)[0];
      if (next) selectProject(next);
      else {
        currentProject = "";
        paintChrome(null);
        clearTaskPane();
        paintEmptyWorkspace();
      }
      resetFilterValues();
      syncWorkspaceActions();
      updateSampleDesc();
      await persistWorkspaceNow();
      toast("Sample data removed");
    } finally {
      sampleBusy = false;
    }
  }
  function restoreSampleFromConstant(force) {
    setSamplePref(true);
    restoreSampleTeam();
    ensureAllSampleProjects();
    ensureAllSampleTasks(force);
    rebuildTaskIndex();
  }
  async function applySampleToWorkspace(viewName) {
    ensureAllSampleProjects();
    ensureAllSampleTasks();
    rebuildTaskIndex();
    adoptStatusesFromTasks();
    adoptPrioritiesFromTasks();
    adoptProjectStatusesFromProjects();
    migrateBlockedTagToStatus();
    paintBoardColumns();
    fillStatusSelects();
    fillPrioritySelects();
    fillProjectStatusSelects();
    paintAllCatalogs();
    repairSampleIntegrity();
    syncProjectDom();
    const pick = projects.website ? "website" : SAMPLE_PROJECT_IDS.find((id) => projects[id]) || Object.keys(projects)[0];
    if (pick) currentProject = pick;
    document.querySelectorAll(".kcard[data-task], #taskTbody tr[data-task]").forEach((el) => el.remove());
    ensureProjectTasksMounted(currentProject);
    if (pick) {
      document.querySelectorAll("#projList .proj-item").forEach((el) => el.classList.toggle("on", el.dataset.project === pick));
      paintChrome(projects[pick]);
    }
    renderTeamRail();
    renderTeamList();
    updateSampleDesc();
    resetFilterValues();
    const view = viewName || (workspaceViews.has(activeView) ? activeView : "board");
    showView(view, { force: true });
    queueStats(true);
    paintCalendar(calendarAllProjects);
    paintNotifications(true);
    enrichTips();
    syncWorkspaceActions();
    ensureAllSampleProjects();
    syncProjectDom();
    requestAnimationFrame(() => {
      syncProjectDom();
      ensureProjectTasksMounted(currentProject);
      filterWorkspace(activeView);
    });
    const nProj = SAMPLE_PROJECT_IDS.filter((id) => projects[id]).length;
    const nTasks = SAMPLE_TASK_IDS.filter((id) => tasks[id]).length;
    toast("Sample loaded · <em>" + nTasks + " tasks</em> on " + nProj + " projects");
    await persistWorkspaceNow();
  }
  async function loadSample() {
    if (sampleBusy) return;
    sampleBusy = true;
    cancelPendingPersist();
    persistEpoch++;
    try {
      restoreSampleFromConstant(true);
      await applySampleToWorkspace("board");
    } finally {
      sampleBusy = false;
    }
  }
  function sampleTasksPresent() {
    return SAMPLE_TASK_IDS.some((id) => tasks[id]);
  }
  function repairSampleIntegrity() {
    const hasSampleTasks = sampleTasksPresent();
    const wantSample = samplePrefOn() || hasSampleTasks || sampleLoaded();
    if (!wantSample) return false;
    let repaired = false;
    SAMPLE_PROJECT_IDS.forEach((id) => {
      const usedByTask = SAMPLE_TASK_IDS.some((tid) => tasks[tid] && tasks[tid].project === id);
      if (!projects[id] && (samplePrefOn() || usedByTask)) {
        const copy = cloneMasterProject(id);
        if (copy) {
          projects[id] = copy;
          repaired = true;
        }
      }
    });
    fillProjectMasterFromTasks();
    SAMPLE_TASK_IDS.forEach((id) => {
      if (!tasks[id] && (samplePrefOn() || hasSampleTasks)) {
        tasks[id] = JSON.parse(JSON.stringify(SAMPLE_TASK_DEFS[id]));
        tasks[id].sample = true;
        repaired = true;
      }
    });
    if (hasSampleTasks || sampleLoaded()) setSamplePref(true);
    if (repaired) rebuildTaskIndex();
    return repaired;
  }
  function needsSampleRestore() {
    if (SAMPLE_TASK_IDS.some((id) => tasks[id] && !projects[tasks[id].project] && PROJECT_MASTER[tasks[id].project])) return true;
    if (SAMPLE_TASK_IDS.some((id) => !tasks[id]) && (samplePrefOn() || sampleTasksPresent())) return true;
    return SAMPLE_PROJECT_IDS.some((id) => !projects[id]) && (samplePrefOn() || sampleTasksPresent());
  }

  function paintMemberPreview() {
    const el = document.getElementById("memberPhotoPreview");
    const del = document.getElementById("memberPhotoDelete");
    if (!el) return;
    const who = (modalMode === "member" && editingId && roster[editingId]) ? editingId : "";
    el.dataset.who = who;
    el.classList.remove("has-photo");
    el.style.backgroundImage = "";
    if (!who) {
      el.textContent = "?";
      if (del) del.hidden = true;
      return;
    }
    const rec = roster[who];
    el.textContent = who === "AC" ? ADMIN.initials : who;
    el.style.background = rec.bg;
    el.style.color = rec.fg;
    if (del) del.hidden = !photos[who];
    applyPhotos();
  }
  function refreshPersonSurfaces() {
    applyPhotos();
    renderTeamRail();
    renderTeamList();
    paintMemberPreview();
    if (currentProject) paintProjectSurfaces(currentProject);
    document.querySelectorAll("#projGrid .proj[data-project]").forEach((el) => {
      const p = projects[el.dataset.project];
      if (!p) return;
      const oldAv = el.querySelector(".proj-foot .av");
      if (oldAv) oldAv.outerHTML = avatarHTML(p.owner, "sm");
      observeProjectCard(el);
    });
    document.querySelectorAll(".kcard[data-task]").forEach((card) => {
      const t = tasks[card.dataset.task];
      if (!t) return;
      const foot = card.querySelector(".kfoot");
      if (foot) foot.innerHTML = catalogTagHtml(t.priClass, t.pri, "pri") + avatarHTML(t.assignee, "sm");
    });
    document.querySelectorAll("#taskTbody tr[data-task]").forEach((tr) => {
      const t = tasks[tr.dataset.task];
      if (!t || !tr.cells[4]) return;
      tr.cells[4].innerHTML = avatarHTML(t.assignee, "sm");
    });
    const openId = taskPane && taskPane.dataset.currentTask;
    if (openId && tasks[openId]) {
      const t = tasks[openId];
      const whoEl = document.getElementById("dAssignee");
      if (whoEl) {
        whoEl.innerHTML = isTeamMember(t.assignee)
          ? avatarHTML(t.assignee, "sm") + " " + roster[t.assignee].name
          : "—";
      }
      renderTaskExtras(openId);
    }
    applyPhotos();
    fillFilterOptions();
    schedulePersist();
  }
  function clearPersonPhoto(who) {
    who = normWho(who);
    if (!who || !photos[who]) return;
    const rec = roster[who];
    delete photos[who];
    refreshPersonSurfaces();
    toast("Photo removed · initials restored" + (rec ? " for <em>" + rec.name + "</em>" : ""));
  }

  function addPerson(fullName, role) {
    const name = (fullName || "").trim() || "New person";
    const parts = name.split(/\s+/).filter(Boolean);
    let initials = (parts[0][0] + (parts[1] ? parts[1][0] : (parts[0][1] || ""))).toUpperCase();
    if (roster[initials]) initials = initials + Object.keys(roster).length;
    const pal = [
      { bg: "var(--accent-dim)", fg: "var(--accent-fg)" },
      { bg: "var(--purple-dim)", fg: "var(--purple-fg)" },
      { bg: "var(--amber-dim)", fg: "var(--amber-fg)" },
      { bg: "var(--success-bg)", fg: "var(--success-text)" }
    ][Object.keys(roster).length % 4];
    roster[initials] = { name: name, role: (role || "").trim() || "Teammate", bg: pal.bg, fg: pal.fg, active: (document.getElementById("memberActive") || {}).value !== "inactive" };
    people[initials] = name + " · " + roster[initials].role + (roster[initials].active ? "" : " · inactive");
    refreshPersonSurfaces();
    toast("Added <em>" + name + "</em> to the team");
  }

  let pendingPhotoWho = null;
  const photoFile = document.getElementById("photoFile");
  const teamModal = document.getElementById("teamModal");

  function pickPhoto(who) {
    pendingPhotoWho = normWho(who);
    photoFile.value = "";
    photoFile.click();
  }
  photoFile.addEventListener("change", () => {
    const file = photoFile.files && photoFile.files[0];
    if (!file || !pendingPhotoWho) return;
    if (!file.type.startsWith("image/")) { toast("Choose an image file"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      photos[pendingPhotoWho] = reader.result;
      refreshPersonSurfaces();
      const rec = roster[pendingPhotoWho];
      toast("Photo set for <em>" + ((rec && rec.name) || pendingPhotoWho) + "</em>");
    };
    reader.readAsDataURL(file);
  });
  const memberPhotoUpload = document.getElementById("memberPhotoUpload");
  if (memberPhotoUpload) memberPhotoUpload.addEventListener("click", () => {
    if (modalMode !== "member" || !editingId) return;
    pickPhoto(editingId);
  });
  const memberPhotoDelete = document.getElementById("memberPhotoDelete");
  if (memberPhotoDelete) memberPhotoDelete.addEventListener("click", () => {
    if (modalMode !== "member" || !editingId) return;
    clearPersonPhoto(editingId);
  });

  function renderTeamList() {
    const list = document.getElementById("teamList");
    if (!list) return;
    const q = ((document.getElementById("teamSearch") || {}).value || "").trim().toLowerCase();
    list.innerHTML = Object.keys(roster).map((id) => {
      const rec = roster[id];
      if (!rec) return "";
      if (q && !blobMatches(rec.name + " " + rec.role + " " + id, q)) return "";
      const has = !!photos[id];
      const isAdmin = id === "AC";
      return '<div class="team-person" data-who="' + id + '">' +
        avatarHTML(id, "xl") +
        '<div class="meta"><div class="name">' + rec.name + '</div><div class="role">' + rec.role + (isAdmin ? " · you" : "") + (isPersonActive(id) ? "" : " · inactive") + (has ? " · photo on" : " · initials") + '</div></div>' +
        '<div class="team-actions">' +
        (isAdmin ? "" : '<button class="btn btn-ghost btn-sm" type="button" data-edit="' + id + '" data-tip="Edit name and role">Edit</button>') +
        '<button class="btn btn-ghost btn-sm" type="button" data-upload="' + id + '" data-tip="Upload a photo for ' + rec.name + '">' + (has ? "Change" : "Upload") + "</button>" +
        (has ? '<button class="btn btn-ghost btn-sm" type="button" data-clear="' + id + '" data-tip="Revert to initials">Remove</button>' : "") +
        "</div></div>";
    }).join("");
    applyPhotos();
  }
  function openTeamModal() {
    closePops();
    renderTeamList();
    teamModal.hidden = false;
  }
  document.getElementById("manageTeamBtn").addEventListener("click", openTeamModal);
  document.getElementById("teamDoneBtn").addEventListener("click", () => { teamModal.hidden = true; });
  document.getElementById("teamInviteBtn").addEventListener("click", () => { teamModal.hidden = true; openModal("member"); });
  teamModal.addEventListener("click", (e) => { if (e.target === teamModal) teamModal.hidden = true; });
  document.getElementById("teamList").addEventListener("click", (e) => {
    const up = e.target.closest("[data-upload]");
    const clr = e.target.closest("[data-clear]");
    const ed = e.target.closest("[data-edit]");
    if (ed) {
      if (ed.dataset.edit === "AC") { toast("This is the admin account"); return; }
      teamModal.hidden = true;
      openModal("member", null, ed.dataset.edit);
    }
    else if (up) pickPhoto(up.dataset.upload);
    else if (clr) {
      clearPersonPhoto(clr.dataset.clear);
    }
  });

  document.getElementById("projColorPicks").addEventListener("click", (e) => {
    const b = e.target.closest(".color-pick");
    if (!b) return;
    setPendingHex(b.dataset.hex);
  });
  document.getElementById("projColorCustom").addEventListener("input", (e) => {
    setPendingHex(e.target.value);
  });

  document.getElementById("modalCancel").addEventListener("click", closeModal);
  function askConfirm(opts) {
    const box = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmTitle");
    const bodyEl = document.getElementById("confirmBody");
    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");
    if (!box || !okBtn || !cancelBtn) return Promise.resolve(false);
    const notice = !!(opts && opts.notice);
    if (titleEl) titleEl.textContent = (opts && opts.title) || "Confirm";
    if (bodyEl) bodyEl.textContent = (opts && opts.body) || "";
    okBtn.textContent = (opts && opts.okLabel) || "OK";
    okBtn.className = notice || (opts && opts.danger === false) ? "btn btn-primary" : "btn btn-danger";
    okBtn.dataset.tip = notice ? "Close this message" : ((opts && opts.okTip) || "Remove permanently");
    cancelBtn.textContent = (opts && opts.cancelLabel) || "Cancel";
    cancelBtn.hidden = notice;
    box.classList.toggle("is-notice", notice);
    box.hidden = false;
    hideTip();
    return new Promise((resolve) => {
      const done = (val) => {
        if (box._resolve !== done) return;
        box._resolve = null;
        box.hidden = true;
        box.classList.remove("is-notice");
        cancelBtn.hidden = false;
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        box.removeEventListener("click", onBack);
        resolve(val);
      };
      const onOk = () => done(true);
      const onCancel = () => done(false);
      const onBack = (e) => { if (e.target === box) done(notice ? true : false); };
      box._resolve = done;
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      box.addEventListener("click", onBack);
      setTimeout(() => { try { okBtn.focus(); } catch (err) {} }, 0);
    });
  }
  function showNotice(title, body) {
    return askConfirm({ title: title, body: body, okLabel: "OK", notice: true, danger: false });
  }
  document.getElementById("modalDelete").addEventListener("click", async () => {
    if (modalMode === "project" && editingId && projects[editingId]) {
      const p = projects[editingId];
      const n = Object.keys(tasks).filter((id) => tasks[id].project === editingId).length;
      const ok = await askConfirm({
        title: "Delete project",
        body: "Delete “" + p.name + "” and " + n + " task" + (n === 1 ? "" : "s") + "? This also removes comments, subtasks, and files on those tasks.",
        okLabel: "Delete",
        danger: true
      });
      if (!ok) return;
      deleteProject(editingId);
      persistWorkspaceNow();
      return;
    }
    if (modalMode === "task" && editingId && tasks[editingId]) {
      const t = tasks[editingId];
      const ok = await askConfirm({
        title: "Delete task",
        body: "Delete “" + t.title + "”? Comments, subtasks, and files on this task are removed.",
        okLabel: "Delete",
        danger: true
      });
      if (!ok) return;
      const id = editingId;
      const title = t.title;
      const wasOpen = taskPane && taskPane.dataset.currentTask === id;
      deleteTaskRecord(id);
      closeModal();
      if (wasOpen) {
        const next = projectTaskIds(currentProject)[0];
        if (next) openTask(next, false);
        else clearTaskPane();
      }
      refreshWip();
      queueStats(false);
      filterWorkspace(activeView);
      persistWorkspaceNow();
      toast("Deleted <em>" + title + "</em>");
    }
  });
  document.getElementById("modalOk").addEventListener("click", () => {
    const v = modalInput.value.trim();
    if (modalMode === "task") {
      const desc = document.getElementById("taskDesc");
      const start = document.getElementById("taskStart");
      const due = document.getElementById("taskDue");
      const assignee = document.getElementById("taskAssignee");
      const estEl = document.getElementById("taskEst");
      const hours = readEstHours();
      const startP = parseIsoDate(start.value);
      const dueP = parseIsoDate(due.value);
      const okName = markInvalid(modalInput, !v);
      const okDesc = markInvalid(desc, !desc.value.trim());
      const okStart = markInvalid(start, !startP);
      const okDue = markInvalid(due, !dueP);
      const okEst = markInvalid(estEl, !(hours > 0 && hours <= 10000));
      const okWho = markInvalid(assignee, !validAssignee(assignee.value));
      let okRange = true;
      if (startP && dueP && dueP.iso < startP.iso) { markInvalid(due, true); okRange = false; }
      let okProj = true;
      const projRange = projectDateRange();
      if (projRange && startP && dueP) {
        if (startP.iso < projRange.start || startP.iso > projRange.end) { markInvalid(start, true); okProj = false; }
        if (dueP.iso < projRange.start || dueP.iso > projRange.end) { markInvalid(due, true); okProj = false; }
      }
      if (!okName || !okDesc || !okStart || !okDue || !okEst || !okWho || !okRange || !okProj) {
        toast(!validAssignee(assignee.value) ? "Pick an active teammate"
          : !okEst ? "Estimate must be greater than 0"
          : !okProj ? "Task dates must fall inside the project start and end"
          : (okRange ? "Fill every required task field" : "Due date must be on or after start date"));
        return;
      }
      const payload = {
        title: v,
        desc: desc.value.trim(),
        list: document.getElementById("taskList").value,
        pri: document.getElementById("taskPri").value,
        assignee: assignee.value,
        start: startP.iso,
        due: dueP.iso,
        est: hours,
        tags: document.getElementById("taskTags").value.split(",").map((s) => s.trim()).filter(Boolean)
      };
      if (editingId) saveTask(editingId, payload);
      else createTask(payload);
    } else if (modalMode === "project") {
      const desc = document.getElementById("projDesc");
      const owner = document.getElementById("projOwner");
      const start = document.getElementById("projStart");
      const end = document.getElementById("projEnd");
      const colors = document.getElementById("projColorPicks");
      const startP = parseIsoDate(start.value);
      const endP = parseIsoDate(end.value);
      const okName = markInvalid(modalInput, !v);
      const okDesc = markInvalid(desc, !desc.value.trim());
      const okOwner = markInvalid(owner, !validOwner(owner.value));
      const okStart = markInvalid(start, !startP);
      const okEnd = markInvalid(end, !endP);
      const okColor = markInvalid(colors, !pendingHex);
      let okRange = true;
      if (startP && endP && endP.iso < startP.iso) {
        markInvalid(end, true);
        okRange = false;
      }
      if (!okName || !okDesc || !okOwner || !okStart || !okEnd || !okColor || !okRange) {
        toast(!validOwner(owner.value) ? "Pick an active teammate as owner" : (okRange ? "Fill every required project field" : "End date must be on or after start date"));
        return;
      }
      const payload = {
        name: v,
        desc: desc.value.trim(),
        owner: owner.value,
        status: document.getElementById("projStatusSelect").value,
        start: startP.iso,
        end: endP.iso,
        color: pendingHex
      };
      if (editingId) saveProject(editingId, payload);
      else createProject(payload);
    } else {
      const role = document.getElementById("modalRole");
      if (!markInvalid(modalInput, !v)) { toast("Name is required"); return; }
      if (!markInvalid(role, !role.value.trim())) { toast("Role is required"); return; }
      if (editingId && roster[editingId]) {
        roster[editingId].name = v;
        roster[editingId].role = role.value.trim();
        roster[editingId].active = (document.getElementById("memberActive") || {}).value !== "inactive";
        people[editingId] = v + " · " + roster[editingId].role + (roster[editingId].active ? "" : " · inactive");
        refreshPersonSurfaces();
        if (projects[currentProject] && projects[currentProject].owner === editingId) paintChrome(projects[currentProject]);
        toast("Updated <em>" + v + "</em>");
        teamModal.hidden = false;
      } else addPerson(v, role.value);
    }
    closeModal();
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  modalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("modalOk").click(); }
    if (e.key === "Escape") closeModal();
  });

  document.getElementById("newTaskBtn").addEventListener("click", () => openModal("task", firstStatusLabel()));
  document.getElementById("editTaskBtn").addEventListener("click", () => {
    const id = taskPane.dataset.currentTask;
    if (!id || !tasks[id]) { toast("Open a task first"); return; }
    openModal("task", tasks[id].list, id);
  });
  document.getElementById("editProjectBtn").addEventListener("click", () => openModal("project", null, currentProject));
  document.getElementById("popNewTask").addEventListener("click", () => openModal("task", firstStatusLabel()));
  document.getElementById("newProjectBtn").addEventListener("click", () => openModal("project"));
  document.getElementById("popNewProject").addEventListener("click", () => openModal("project"));
  document.getElementById("sideAddProject").addEventListener("click", () => openModal("project"));
  document.getElementById("inviteBtn").addEventListener("click", () => openModal("member"));
  document.getElementById("saveViewBtn").addEventListener("click", () => {
    const view = document.querySelector("#viewToggle button.on")?.textContent.trim() || "Kanban";
    const s = collectStats(currentProject);
    toast("Saved <em>" + view + "</em> · " + s.completed + " complete · " + s.pct + "% · " + s.overdueShown + " overdue");
  });
  const filterRange = document.getElementById("filterRange");
  if (filterRange) filterRange.addEventListener("change", () => filterWorkspace(activeView));
  Object.keys(MULTI_FILTERS).forEach((key) => {
    const spec = MULTI_FILTERS[key];
    const wrap = document.getElementById(spec.id + "Wrap");
    const btn = document.getElementById(spec.id);
    const pop = document.getElementById(spec.id + "Pop");
    const list = document.getElementById(spec.id + "List");
    if (wrap) wrap.addEventListener("click", (e) => e.stopPropagation());
    if (btn && pop) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideTip();
        const open = pop.hidden;
        closePops();
        pop.hidden = !open;
        btn.setAttribute("aria-expanded", String(!pop.hidden));
      });
    }
    if (list) {
      list.addEventListener("change", (e) => {
        const box = e.target.closest("input[type=checkbox]");
        if (!box) return;
        if (box.getAttribute("data-all")) boardFilters[key] = [];
        else {
          const set = new Set(boardFilters[key]);
          if (box.checked) set.add(box.value);
          else set.delete(box.value);
          boardFilters[key] = [...set];
        }
        const items = key === "pri"
          ? priFilterLabels()
          : key === "status"
            ? statusFilterLabels()
            : [...list.querySelectorAll("input[type=checkbox]:not([data-all])")].map((el) => el.value);
        paintFilterList(key, items);
        paintFilterButton(key);
        document.querySelectorAll(".kcard[data-task], table.list tr[data-task]").forEach((el) => {
          const t = tasks[el.dataset.task];
          el.hidden = !taskMatchesFilters(t);
        });
        refreshWip();
        const v = activeView;
        if (v === "gantt") paintGantt();
        else if (v === "calendar") paintCalendar(calendarAllProjects);
      });
    }
  });
  const globalSearch = document.getElementById("globalSearch");
  if (globalSearch) {
    globalSearch.addEventListener("input", () => {
      paintSearchPop();
      filterWorkspace(activeView);
    });
    globalSearch.addEventListener("focus", () => { if (globalSearch.value.trim()) paintSearchPop(); });
    globalSearch.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const first = document.querySelector("#searchPopList .search-hit");
      if (first) {
        e.preventDefault();
        openSearchHit(first.dataset.kind, first.dataset.id);
      }
    });
  }
  const searchPopList = document.getElementById("searchPopList");
  if (searchPopList) {
    searchPopList.addEventListener("click", (e) => {
      const hit = e.target.closest(".search-hit");
      if (!hit) return;
      openSearchHit(hit.dataset.kind, hit.dataset.id);
    });
  }
  const boardSearch = document.getElementById("boardSearch");
  if (boardSearch) boardSearch.addEventListener("input", () => filterWorkspace(activeView));
  const teamSearch = document.getElementById("teamSearch");
  if (teamSearch) teamSearch.addEventListener("input", () => renderTeamList());
  const accentSwatches = document.getElementById("accentSwatches");
  if (accentSwatches) {
    accentSwatches.addEventListener("click", (e) => {
      const b = e.target.closest(".accent-swatch");
      if (!b || !b.dataset.accent) return;
      if (b.dataset.theme === "designed") {
        prefs.accentMode = "designed";
        prefs.accent = DESIGNED_ACCENT;
      } else {
        prefs.accentMode = "seed";
        prefs.accent = b.dataset.accent;
      }
      applyPrefs();
      toast("Accent · <em>" + (prefs.accentMode === "designed" ? "Default" : (ACCENT_NAMES[prefs.accent] || prefs.accent)) + "</em>");
    });
  }
  const accentCustom = document.getElementById("accentCustom");
  if (accentCustom) {
    accentCustom.addEventListener("input", (e) => {
      prefs.accentMode = "seed";
      prefs.accent = e.target.value;
      applyPrefs();
    });
  }
  document.getElementById("projStatusTag").addEventListener("change", () => {
    const p = projects[currentProject];
    if (!p) return;
    const status = document.getElementById("projStatusTag").value;
    const st = statusMeta(status);
    p.status = status;
    p.statusLabel = st.label;
    paintProjectSurfaces(currentProject);
    paintChrome(p);
    syncProjStatusLayout();
    queueStats(true);
    schedulePersist();
    syncWorkspaceActions();
    if (taskPane.dataset.currentTask) renderTaskExtras(taskPane.dataset.currentTask);
    toast("Project status → <em>" + st.label + "</em>");
  });
  document.getElementById("dList").addEventListener("change", () => {
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    const id = taskPane.dataset.currentTask;
    if (id && tasks[id]) setTaskList(id, document.getElementById("dList").value);
  });
  document.getElementById("dPri").addEventListener("change", () => {
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    const id = taskPane.dataset.currentTask;
    const t = tasks[id];
    if (!t) return;
    t.pri = document.getElementById("dPri").value;
    t.priClass = priClassOf(t.pri);
    styleTagSelect(document.getElementById("dPri"), t.priClass, t.pri);
    syncTaskDom(id);
    addHistory(id, "AC set priority to " + t.pri);
    toast("Priority → <em>" + t.pri + "</em>");
  });

  function updateSubtasks() {
    const id = taskPane.dataset.currentTask;
    const t = tasks[id];
    if (!t) return;
    ensureExtras(id);
    document.querySelectorAll('#subtaskList input[data-check="subtask"]').forEach((box) => {
      const i = parseInt(box.dataset.i, 10);
      if (t.subtasks[i]) t.subtasks[i].done = box.checked;
    });
    renderTaskExtras(id);
  }
  document.addEventListener("change", (e) => {
    const box = e.target;
    if (!box.matches("input[type=checkbox]")) return;
    const kind = box.dataset.check || "checkbox";
    const label = (box.closest("label")?.innerText || kind).replace(/\s+/g, " ").trim();
    if (kind === "subtask") {
      if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
      updateSubtasks();
      const id = taskPane.dataset.currentTask;
      const subTitle = (box.closest("label")?.querySelector(".sub-body")?.textContent || label.split("·")[0]).trim();
      addHistory(id, "AC " + (box.checked ? "completed" : "reopened") + " “" + subTitle + "”");
      toast((box.checked ? "Checked" : "Unchecked") + " <em>" + subTitle + "</em>");
    } else if (kind === "remember") {
      toast(box.checked ? "Remember me <em>on</em> · stay signed in on this browser" : "Remember me <em>off</em>");
    } else {
      toast((box.checked ? "Checked" : "Unchecked") + " · " + label);
    }
  });

  document.getElementById("sendComment").addEventListener("click", postComment);
  document.getElementById("commentMe").addEventListener("click", (e) => {
    e.stopPropagation();
    hideTip();
  });
  document.getElementById("commentInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); postComment(); }
  });
  function beginCommentEdit(cid) {
    const row = document.querySelector('.comment[data-comment-id="' + cid + '"]');
    if (!row) return;
    const id = taskPane.dataset.currentTask;
    const t = tasks[id];
    const c = t && (t.comments || []).find((x) => x.id === cid);
    if (!c) return;
    const textEl = row.querySelector(".comment-text");
    if (!textEl) return;
    textEl.innerHTML = '<textarea class="comment-edit" id="commentEditBox"></textarea><div class="comment-edit-actions"><button class="btn btn-primary btn-sm" type="button" data-save-comment="' + escAttr(cid) + '">Save</button><button class="btn btn-ghost btn-sm" type="button" data-cancel-comment="' + escAttr(cid) + '">Cancel</button></div>';
    const box = document.getElementById("commentEditBox");
    if (box) {
      box.value = c.text || "";
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
    const editBtn = row.querySelector("[data-edit-comment]");
    if (editBtn) editBtn.hidden = true;
  }
  function saveCommentEdit(cid) {
    const id = taskPane.dataset.currentTask;
    if (!id || !tasks[id]) return;
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    const c = (tasks[id].comments || []).find((x) => x.id === cid);
    const box = document.getElementById("commentEditBox");
    const text = ((box && box.value) || "").trim();
    if (!c) return;
    if (!text) { toast("Comment cannot be empty"); return; }
    if (text === c.text) {
      renderTaskExtras(id);
      return;
    }
    c.text = text.replace(/</g, "");
    c.edited = true;
    addHistory(id, ADMIN.name + " edited a comment");
    toast("Comment updated");
  }
  document.getElementById("commentPanel").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit-comment]");
    if (edit) {
      e.preventDefault();
      if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
      beginCommentEdit(edit.dataset.editComment);
      return;
    }
    const save = e.target.closest("[data-save-comment]");
    if (save) {
      e.preventDefault();
      saveCommentEdit(save.dataset.saveComment);
      return;
    }
    const cancel = e.target.closest("[data-cancel-comment]");
    if (cancel) {
      e.preventDefault();
      const id = taskPane.dataset.currentTask;
      if (id) renderTaskExtras(id);
    }
  });
  function postComment() {
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text) { toast("Type a comment first"); return; }
    const id = taskPane.dataset.currentTask;
    if (!id || !tasks[id]) { toast("Open a task first"); return; }
    ensureExtras(id);
    tasks[id].comments.unshift({ id: "c" + Date.now().toString(36), who: "AC", date: "just now", text: text.replace(/</g, "") });
    addHistory(id, ADMIN.name + " commented");
    input.value = "";
    renderTaskExtras(id);
    toast("Comment posted on this task");
  }
  document.getElementById("addSubtaskBtn").addEventListener("click", () => {
    const input = document.getElementById("subtaskInput");
    const who = document.getElementById("subtaskAssignee");
    const due = document.getElementById("subtaskDue");
    const text = input.value.trim();
    const id = taskPane.dataset.currentTask;
    if (!id || !tasks[id]) { toast("Open a task first"); return; }
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    const okText = markInvalid(input, !text);
    const okWho = markInvalid(who, !who.value);
    const okDue = markInvalid(due, !parseIsoDate(due.value));
    const parentDue = dateIso(tasks[id].due);
    const dueIsoVal = dateIso(due.value);
    let okRange = true;
    if (dueIsoVal && parentDue && dueIsoVal > parentDue) { markInvalid(due, true); okRange = false; }
    if (!okText || !okWho || !okDue || !okRange) {
      toast(okRange ? "Subtask needs a title, assignee, and due date" : "Subtask due date cannot be after the parent task");
      return;
    }
    if (who.value === "AC") { toast("Assign the subtask to a teammate"); return; }
    ensureExtras(id);
    const rec = roster[who.value];
    if (!rec) { toast("Assign the subtask to a teammate"); return; }
    tasks[id].subtasks.push({ text: text.replace(/</g, ""), who: who.value, date: fmtIso(due.value), done: false });
    addHistory(id, rec.name + " assigned a subtask due " + fmtIso(due.value));
    renderTaskExtras(id);
    primeSubtaskForm(id);
    toast("Subtask added · " + rec.name + " · due " + fmtIso(due.value));
  });
  document.getElementById("subtaskInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("addSubtaskBtn").click(); }
  });
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (Math.round(bytes / 102.4) / 10) + " KB";
    return (Math.round(bytes / 104857.6) / 10) + " MB";
  }
  function revokeAttach(a) {
    if (a && a.url && String(a.url).indexOf("blob:") === 0) URL.revokeObjectURL(a.url);
  }
  const attachFile = document.getElementById("attachFile");
  document.getElementById("addAttachBtn").addEventListener("click", () => {
    const id = taskPane.dataset.currentTask;
    if (!id || !tasks[id]) { toast("Open a task first"); return; }
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    attachFile.value = "";
    attachFile.click();
  });
  attachFile.addEventListener("change", async () => {
    const files = attachFile.files;
    const id = taskPane.dataset.currentTask;
    if (!files || !files.length || !id || !tasks[id]) return;
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    ensureExtras(id);
    const added = [];
    const rejected = [];
    const failed = [];
    const maxBytes = attachMaxBytes();
    const maxMb = attachMaxMb();
    for (const file of Array.from(files)) {
      const name = String(file.name || "file").replace(/[<>]/g, "");
      if (file.size > maxBytes) {
        rejected.push(name);
        addHistory(id, "AC could not attach “" + name + "” · " + fmtSize(file.size) + " exceeds " + maxMb + " MB limit");
        continue;
      }
      try {
        const rec = await storeAttachmentFile(file);
        tasks[id].attachments.push(rec);
        added.push(rec.name);
      } catch (err) {
        failed.push(name);
        addHistory(id, "AC failed to attach “" + name + "”");
      }
    }
    if (added.length) addHistory(id, "AC attached " + added.join(", "));
    renderTaskExtras(id);
    if (isProjectFilesOpen()) paintProjectFilesTable();
    if (added.length) toast(added.length === 1 ? "Attached <em>" + added[0] + "</em>" : "Attached " + added.length + " files");
    if (rejected.length) toast("Skipped " + rejected.length + " file" + (rejected.length === 1 ? "" : "s") + " · over " + maxMb + " MB");
    if (failed.length) toast("Could not store " + failed.length + " file" + (failed.length === 1 ? "" : "s"));
  });
  document.getElementById("attachList").addEventListener("click", (e) => {
    const view = e.target.closest("[data-view-attach]");
    if (view) {
      e.preventDefault();
      const id = taskPane.dataset.currentTask;
      if (!id || !tasks[id]) return;
      ensureExtras(id);
      const i = parseInt(view.dataset.viewAttach, 10);
      const a = tasks[id].attachments[i];
      if (!a) return;
      openFilePreview(a);
      return;
    }
    const del = e.target.closest("[data-del-attach]");
    if (!del) return;
    e.preventDefault();
    const id = taskPane.dataset.currentTask;
    if (!id || !tasks[id]) return;
    if (!canEditWorkspace()) { toast(workspaceLockReason()); return; }
    ensureExtras(id);
    const i = parseInt(del.dataset.delAttach, 10);
    const a = tasks[id].attachments[i];
    if (!a) return;
    revokeAttach(a);
    deleteStoredAttachment(a);
    tasks[id].attachments.splice(i, 1);
    addHistory(id, "AC removed “" + a.name + "”");
    renderTaskExtras(id);
    if (isProjectFilesOpen()) paintProjectFilesTable();
    toast("Removed <em>" + a.name + "</em>");
  });

  document.querySelectorAll("button").forEach((btn) => {
    if (btn.dataset.tip) return;
    const label = (btn.getAttribute("aria-label") || btn.textContent || "").replace(/\s+/g, " ").trim();
    if (label) btn.dataset.tip = label;
  });

  function paintAdminIdentity() {
    if (roster.AC) {
      roster.AC.name = ADMIN.name;
      roster.AC.role = ADMIN.role;
    }
    const name = ADMIN.name;
    const role = ADMIN.role;
    const av = document.getElementById("topAccountPhoto") || document.getElementById("avatarBtn");
    if (av && !photos.AC) av.textContent = ADMIN.initials;
    const topName = document.getElementById("topAccountName");
    const topRole = document.getElementById("topAccountRole");
    if (topName) topName.textContent = name;
    if (topRole) topRole.textContent = role;
    const chip = document.getElementById("avatarBtn");
    if (chip) chip.dataset.tip = name + " · " + ADMIN.user + " · signed in · open account menu";
    const popName = document.getElementById("accountPopName");
    const popUser = document.getElementById("accountPopUser");
    if (popName) popName.textContent = name;
    if (popUser) popUser.textContent = ADMIN.user + " · " + role;
    const me = document.getElementById("commentMe");
    if (me) {
      me.textContent = ADMIN.initials;
      me.dataset.tip = name + " · comments post as this account";
    }
    if (people) {
      people.AC = name + " · " + role;
      people.A = name + " · " + role;
    }
  }
  async function bootWorkspace() {
    paintAdminIdentity();
    const restored = hydrateWorkspace(await readPersisted());
    if (restored) {
      repairSampleIntegrity();
      ensureSampleTeam();
      ensureSampleProjects();
      if (needsSampleRestore()) restoreSampleFromConstant();
      else if (sampleTasksPresent()) ensureAllSampleProjects();
    } else if (!samplePrefOn()) {
      stripSampleData();
      currentProject = Object.keys(projects)[0] || "";
    }
    rebuildTaskIndex();
    rebuildWorkspaceDom();
    if (projects[currentProject]) paintChrome(projects[currentProject]);
    else paintChrome(null);
    ensureSampleTeam();
    renderTeamRail();
    if (typeof renderTeamList === "function") renderTeamList();
    applyPhotos();
    enrichTips();
    persistReady = true;
    applyPrefs();
    queueStats(true);
    sortProjList();
    updateSampleDesc();
    const firstTask = projectTaskIds(currentProject)[0];
    if (firstTask) openTask(firstTask, false);
    else clearTaskPane();
    resetFilterValues();
    syncWorkspaceActions();
    await persistWorkspaceNow();
    window.addEventListener("beforeunload", () => { persistWorkspace(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") persistWorkspace();
    });
  }

  const loginCard = document.getElementById("loginCard");
  const signupCard = document.getElementById("signupCard");
  const forgotCard = document.getElementById("forgotCard");
  function showAuth(which) {
    if (loginCard) loginCard.hidden = which !== "login";
    if (signupCard) signupCard.hidden = which !== "signup";
    if (forgotCard) forgotCard.hidden = which !== "forgot";
    if (which === "login") setLoginError("");
  }
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  document.getElementById("forgotBtn").addEventListener("click", (e) => {
    e.preventDefault();
    showAuth("login");
    setLoginError("Sign in with the admin username. The password is stored as a hash.");
  });
  if (forgotCard) forgotCard.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("forgotBtn").click();
  });
  document.getElementById("toSignup").addEventListener("click", (e) => { e.preventDefault(); showAuth("signup"); });
  document.getElementById("toLogin").addEventListener("click", (e) => { e.preventDefault(); showAuth("login"); });
  document.getElementById("forgotLink").addEventListener("click", (e) => { e.preventDefault(); showAuth("forgot"); });
  document.getElementById("forgotBack").addEventListener("click", (e) => { e.preventDefault(); showAuth("login"); });
  document.getElementById("loadSampleBtn").addEventListener("click", () => { loadSample(); });
  document.getElementById("deleteSampleBtn").addEventListener("click", () => { deleteSample(); });
  const uninstallAppBtn = document.getElementById("uninstallAppBtn");
  if (uninstallAppBtn) {
    uninstallAppBtn.addEventListener("click", async () => {
      const api = desktopApi();
      if (api && typeof api.uninstall_app === "function") {
        const res = await api.uninstall_app();
        if (res && res.ok) return;
        toast("Windows Settings → Apps → FLOWVANTI → Uninstall");
        return;
      }
      toast("Windows Settings → Apps → FLOWVANTI → Uninstall");
    });
  }
  const calPrev = document.getElementById("calPrev");
  const calNext = document.getElementById("calNext");
  const calTodayBtn = document.getElementById("calTodayBtn");
  if (calPrev) calPrev.addEventListener("click", () => shiftCalMonth(-1));
  if (calNext) calNext.addEventListener("click", () => shiftCalMonth(1));
  if (calTodayBtn) calTodayBtn.addEventListener("click", goCalToday);
  const calPopPrev = document.getElementById("calPopPrev");
  const calPopNext = document.getElementById("calPopNext");
  const calPopToday = document.getElementById("calPopToday");
  const calPopClose = document.getElementById("calPopClose");
  const calModal = document.getElementById("calModal");
  if (calPopPrev) calPopPrev.addEventListener("click", () => shiftCalMonth(-1));
  if (calPopNext) calPopNext.addEventListener("click", () => shiftCalMonth(1));
  if (calPopToday) calPopToday.addEventListener("click", goCalToday);
  if (calPopClose) calPopClose.addEventListener("click", closeCalendarPop);
  if (calModal) calModal.addEventListener("click", (e) => { if (e.target === calModal) closeCalendarPop(); });
  document.addEventListener("click", (e) => {
    const zoomBtn = e.target.closest("[data-chart-zoom]");
    if (zoomBtn) {
      e.preventDefault();
      openChartZoom(zoomBtn.getAttribute("data-chart-zoom"));
      return;
    }
  });
  const reportAddBtn = document.getElementById("reportAddBtn");
  if (reportAddBtn) reportAddBtn.addEventListener("click", () => openReportModal(""));
  const reportResetBtn = document.getElementById("reportResetBtn");
  if (reportResetBtn) reportResetBtn.addEventListener("click", async () => {
    const ok = await askConfirm({
      title: "Reset reports",
      body: "Restore the default KPI strip and created vs completed chart? Custom charts on this page are removed.",
      okLabel: "Reset",
      danger: true
    });
    if (!ok) return;
    prefs.reportWidgets = defaultReportWidgets();
    schedulePersist();
    paintReportWidgets(true);
  });
  const reportModal = document.getElementById("reportModal");
  const reportModalCancel = document.getElementById("reportModalCancel");
  const reportModalOk = document.getElementById("reportModalOk");
  if (reportModalCancel) reportModalCancel.addEventListener("click", closeReportModal);
  if (reportModalOk) reportModalOk.addEventListener("click", saveReportModal);
  if (reportModal) reportModal.addEventListener("click", (e) => { if (e.target === reportModal) closeReportModal(); });
  ["rwViz", "rwSource", "rwX", "rwY", "rwSplit"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => syncReportForm());
  });
  const rwYs = document.getElementById("rwYs");
  if (rwYs) rwYs.addEventListener("change", () => {
    const splitEl = document.getElementById("rwSplit");
    if (readReportYs().length && splitEl) splitEl.value = "";
    syncReportForm(readReportYs());
  });
  document.addEventListener("click", (e) => {
    const temp = e.target.closest("[data-report-template]");
    if (temp) {
      e.preventDefault();
      applyReportTemplate(temp.getAttribute("data-report-template"));
      return;
    }
    if (e.target.closest("#reportEmptyAdd")) {
      e.preventDefault();
      openReportModal("");
      return;
    }
    const edit = e.target.closest("[data-report-edit]");
    if (edit) {
      e.preventDefault();
      openReportModal(edit.getAttribute("data-report-edit"));
      return;
    }
    const del = e.target.closest("[data-report-del]");
    if (!del) return;
    e.preventDefault();
    const id = del.getAttribute("data-report-del");
    const w = findReportWidget(id);
    askConfirm({
      title: "Remove chart",
      body: w ? "Remove “" + w.title + "” from Reports?" : "Remove this chart?",
      okLabel: "Remove",
      danger: true
    }).then((ok) => {
      if (!ok) return;
      mutateReportWidgets((list) => {
        const i = list.findIndex((x) => x.id === id);
        if (i >= 0) list.splice(i, 1);
      });
    });
  });
  const chartModal = document.getElementById("chartModal");
  const chartZoomClose = document.getElementById("chartZoomClose");
  if (chartZoomClose) chartZoomClose.addEventListener("click", closeChartZoom);
  if (chartModal) chartModal.addEventListener("click", (e) => { if (e.target === chartModal) closeChartZoom(); });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-cal-pop]");
    if (!el) return;
    e.preventDefault();
    openCalendarPop(el.dataset.calAll === "1");
  });
  const datePopPrev = document.getElementById("datePopPrev");
  const datePopNext = document.getElementById("datePopNext");
  const datePopToday = document.getElementById("datePopToday");
  const datePopGrid = document.getElementById("datePopGrid");
  if (datePopPrev) datePopPrev.addEventListener("click", () => {
    datePickMonth--;
    if (datePickMonth < 1) { datePickMonth = 12; datePickYear--; }
    paintDatePicker();
  });
  if (datePopNext) datePopNext.addEventListener("click", () => {
    datePickMonth++;
    if (datePickMonth > 12) { datePickMonth = 1; datePickYear++; }
    paintDatePicker();
  });
  if (datePopToday) datePopToday.addEventListener("click", () => pickDateIso(todayIso()));
  if (datePopGrid) datePopGrid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick-iso]");
    if (!b) return;
    pickDateIso(b.getAttribute("data-pick-iso"));
  });
  document.querySelectorAll(".date-field").forEach((input) => {
    input.addEventListener("mousedown", (e) => e.preventDefault());
    input.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pop = document.getElementById("datePop");
      const same = datePickInput === input && pop && !pop.hidden;
      closePops();
      if (!same) openDatePicker(input);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        openDatePicker(input);
      }
    });
  });
  document.getElementById("appearBtn").addEventListener("click", () => {
    prefs.dark = !prefs.dark;
    applyPrefs();
    toast("Appearance · <em>" + (prefs.dark ? "dark" : "light") + "</em> · " + (usesDesignedTheme() ? "Default" : (ACCENT_NAMES[prefs.accent] || "custom")));
  });
  document.getElementById("notifyBtn").addEventListener("click", () => {
    prefs.notify = !prefs.notify;
    applyPrefs();
    if (!prefs.notify) closePops();
    toast("Notifications · <em>" + (prefs.notify ? "on" : "off") + "</em>");
  });
  const catalogToggle = document.getElementById("catalogToggle");
  if (catalogToggle) {
    catalogToggle.addEventListener("click", () => {
      prefs.catalogsOpen = !prefs.catalogsOpen;
      applyCatalogOpen();
      schedulePersist();
    });
  }
  const holidayToggle = document.getElementById("holidayToggle");
  if (holidayToggle) {
    holidayToggle.addEventListener("click", () => {
      prefs.holidaysOpen = !prefs.holidaysOpen;
      applyHolidaysOpen();
      if (prefs.holidaysOpen) {
        refreshToday();
        const dateEl = document.getElementById("holidayDate");
        if (dateEl && document.activeElement !== dateEl) fillDateField(dateEl, todayIso());
        paintHolidayCalendar();
      }
      schedulePersist();
    });
  }
  document.getElementById("weekBtn").addEventListener("click", () => {
    prefs.weekStart = prefs.weekStart === "Mon" ? "Sun" : "Mon";
    applyPrefs();
    toast("Week starts <em>" + weekStartName() + "</em> · weekends " + weekendNames());
  });
  function commitHoursPerDay() {
    const el = document.getElementById("hoursPerDay");
    let n = parseFloat(el && el.value);
    if (!(n >= 1 && n <= 24)) {
      markInvalid(el, true);
      toast("Working hours / day must be between 1 and 24");
      if (el) el.value = String(hoursPerDay());
      return;
    }
    n = Math.round(n * 2) / 2;
    markInvalid(el, false);
    if (el) el.value = String(n);
    prefs.hoursPerDay = n;
    const hpdDesc = document.getElementById("hoursPerDayDesc");
    if (hpdDesc) hpdDesc.textContent = n + "h per working day · estimate days convert to hours · due dates skip weekends and holidays";
    setTaskEstUnit(taskEstUnit);
    const box = document.getElementById("modal");
    if (box && !box.hidden) syncTaskSchedule(taskEstUnit);
    schedulePersist();
    toast("Working day · <em>" + n + "h</em>");
  }
  function commitAttachMaxMb() {
    const el = document.getElementById("attachMaxMb");
    let n = parseInt(el && el.value, 10);
    if (!(n >= 1 && n <= 500)) {
      markInvalid(el, true);
      toast("Attachment file size must be between 1 and 500 MB");
      if (el) el.value = String(attachMaxMb());
      return;
    }
    markInvalid(el, false);
    if (el) el.value = String(n);
    if (prefs.attachMaxMb === n) return;
    prefs.attachMaxMb = n;
    const desc = document.getElementById("attachMaxMbDesc");
    if (desc) desc.textContent = n + " MB per file · compressed and encrypted on disk";
    schedulePersist();
    toast("Attachment limit · <em>" + n + " MB</em>");
  }
  const hoursPerDayEl = document.getElementById("hoursPerDay");
  if (hoursPerDayEl) {
    hoursPerDayEl.addEventListener("change", commitHoursPerDay);
    hoursPerDayEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); hoursPerDayEl.blur(); }
    });
  }
  const attachMaxMbEl = document.getElementById("attachMaxMb");
  if (attachMaxMbEl) {
    attachMaxMbEl.addEventListener("change", commitAttachMaxMb);
    attachMaxMbEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); attachMaxMbEl.blur(); }
    });
  }
  const taskEstUnitEl = document.getElementById("taskEstUnit");
  if (taskEstUnitEl) {
    taskEstUnitEl.addEventListener("change", () => {
      const h = readEstHours() || hoursPerDay();
      setTaskEstUnit(taskEstUnitEl.value);
      estLock = true;
      writeEstFromHours(h);
      estLock = false;
      syncTaskSchedule(taskEstUnit);
    });
  }
  const taskEst = document.getElementById("taskEst");
  if (taskEst) {
    taskEst.addEventListener("input", () => {
      const next = sanitizeEstInput(taskEst.value);
      if (next !== taskEst.value) taskEst.value = next;
      syncTaskSchedule(taskEstUnit);
    });
    taskEst.addEventListener("change", () => {
      taskEst.value = sanitizeEstInput(taskEst.value);
      syncTaskSchedule(taskEstUnit);
    });
  }
  function addHoliday() {
    const dateEl = document.getElementById("holidayDate");
    const nameEl = document.getElementById("holidayName");
    const parsed = parseIsoDate(dateEl && dateEl.value);
    const name = ((nameEl && nameEl.value) || "").replace(/[<>]/g, "").trim();
    const okDate = markInvalid(dateEl, !parsed);
    const okName = markInvalid(nameEl, !name);
    if (!okDate || !okName) {
      toast(!parsed ? "Pick a holiday date" : "Name the holiday");
      return;
    }
    if (holidays.some((h) => h.date === parsed.iso && h.name.toLowerCase() === name.toLowerCase())) {
      toast("That holiday is already listed");
      return;
    }
    holidays.push({ id: slugHoliday(parsed.iso, name), date: parsed.iso, name: name });
    holidays = normalizeHolidays(holidays);
    holidayYear = parsed.y;
    prefs.holidayYear = holidayYear;
    if (nameEl) nameEl.value = "";
    paintHolidayCalendar();
    paintCalendar(calendarAllProjects);
    schedulePersist();
    toast("Added <em>" + name + "</em> · " + holidayDateLabel(parsed.iso));
  }
  const addHolidayBtn = document.getElementById("addHolidayBtn");
  if (addHolidayBtn) addHolidayBtn.addEventListener("click", addHoliday);
  const holidayName = document.getElementById("holidayName");
  if (holidayName) {
    holidayName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addHoliday(); }
    });
  }
  const holidayDate = document.getElementById("holidayDate");
  if (holidayDate) holidayDate.addEventListener("input", paintHolidayDayPreview);
  const holidayYearSelect = document.getElementById("holidayYearSelect");
  if (holidayYearSelect) {
    holidayYearSelect.addEventListener("change", () => {
      const y = parseInt(holidayYearSelect.value, 10);
      if (!(y >= 1970 && y <= 2100)) return;
      holidayYear = y;
      prefs.holidayYear = y;
      const dateEl = document.getElementById("holidayDate");
      if (dateEl) {
        const cur = parseIsoDate(dateEl.value);
        const keep = cur ? pad2(cur.mo) + "-" + pad2(cur.d) : "01-01";
        const next = parseIsoDate(y + "-" + keep) || parseIsoDate(y + "-01-01");
        if (next) fillDateField(dateEl, next.iso);
      }
      paintHolidayCalendar();
      schedulePersist();
    });
  }
  const holidayTableHost = document.getElementById("holidayTableHost");
  if (holidayTableHost) {
    holidayTableHost.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del-holiday]");
      if (!btn) return;
      const id = btn.getAttribute("data-del-holiday");
      const rec = holidays.find((h) => h.id === id);
      if (!rec) return;
      const ok = await askConfirm({
        title: "Remove holiday",
        body: "Remove “" + rec.name + "” on " + holidayDateLabel(rec.date) + "?",
        okLabel: "Remove",
        danger: true
      });
      if (!ok) return;
      holidays = holidays.filter((h) => h.id !== id);
      paintHolidayCalendar();
      paintCalendar(calendarAllProjects);
      schedulePersist();
      toast("Removed <em>" + rec.name + "</em>");
    });
  }
  const catalogHosts = ["statusCatalog", "priCatalog", "projStatusCatalog"];
  catalogHosts.forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    box.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat-toggle]");
      if (!btn || btn.disabled) return;
      const row = btn.closest("[data-cat-id]");
      if (!row) return;
      const kind = row.dataset.catalog;
      const list = kind === "pri" ? taskPriorities : kind === "proj" ? projectStatuses : taskStatuses;
      const rec = list.find((s) => s.id === row.dataset.catId);
      if (!rec) return;
      const activeN = list.filter((s) => s.active).length;
      const noun = kind === "pri" ? "priority" : kind === "proj" ? "project status" : "status";
      if (rec.active && activeN <= 1) { toast("Keep at least one active " + noun); return; }
      rec.active = !rec.active;
      if (kind === "pri") applyPriorityCatalog();
      else if (kind === "proj") applyProjectStatusCatalog();
      else applyTaskStatusCatalog();
      toast("<em>" + rec.label + "</em> · " + (rec.active ? "active" : "inactive"));
    });
    box.addEventListener("input", (e) => {
      const input = e.target.closest("[data-cat-color]");
      if (!input) return;
      const row = input.closest("[data-cat-id]");
      if (!row) return;
      const kind = row.dataset.catalog;
      const list = kind === "pri" ? taskPriorities : kind === "proj" ? projectStatuses : taskStatuses;
      const rec = list.find((s) => s.id === row.dataset.catId);
      if (!rec) return;
      rec.color = normCatalogHex(input.value, rec.color);
      applyCatalogColors();
    });
    box.addEventListener("change", (e) => {
      const input = e.target.closest("[data-cat-color]");
      if (!input) return;
      const row = input.closest("[data-cat-id]");
      if (!row) return;
      const kind = row.dataset.catalog;
      const list = kind === "pri" ? taskPriorities : kind === "proj" ? projectStatuses : taskStatuses;
      const rec = list.find((s) => s.id === row.dataset.catId);
      if (!rec) return;
      rec.color = normCatalogHex(input.value, rec.color);
      applyCatalogColors();
      queueStats(true);
      schedulePersist();
    });
  });
  function addNamedItem(inputId, list, slugFn, applyFn, extra, emptyMsg, dupMsg, addedMsg) {
    const input = document.getElementById(inputId);
    const label = ((input && input.value) || "").trim();
    if (!label) { toast(emptyMsg); return; }
    if (list.some((s) => s.label.toLowerCase() === label.toLowerCase())) { toast(dupMsg); return; }
    const palCls = extra && extra.blocked ? "blocked" : extra && extra.done ? "done" : extra && extra.closed ? "closed" : extra && extra.cls;
    const pal = paletteFor(palCls, list.length);
    list.push(Object.assign({ id: slugFn(label), label: label, cls: pal.cls, token: pal.token, color: pal.color, active: true }, extra || {}));
    if (input) input.value = "";
    applyFn();
    toast(addedMsg.replace("%s", label));
  }
  const addStatusBtn = document.getElementById("addStatusBtn");
  if (addStatusBtn) {
    addStatusBtn.addEventListener("click", () => {
      const done = !!(document.getElementById("newStatusDone") && document.getElementById("newStatusDone").checked);
      const blocked = !!(document.getElementById("newStatusBlocked") && document.getElementById("newStatusBlocked").checked);
      addNamedItem("newStatusName", taskStatuses, slugStatus, applyTaskStatusCatalog, { done: done, blocked: blocked && !done }, "Name the new status", "That status already exists", "Added status <em>%s</em>");
      const doneBox = document.getElementById("newStatusDone");
      const blockedBox = document.getElementById("newStatusBlocked");
      if (doneBox) doneBox.checked = false;
      if (blockedBox) blockedBox.checked = false;
    });
  }
  const addPriBtn = document.getElementById("addPriBtn");
  if (addPriBtn) {
    addPriBtn.addEventListener("click", () => {
      addNamedItem("newPriName", taskPriorities, slugPri, applyPriorityCatalog, {}, "Name the new priority", "That priority already exists", "Added priority <em>%s</em>");
    });
  }
  const addProjStatusBtn = document.getElementById("addProjStatusBtn");
  if (addProjStatusBtn) {
    addProjStatusBtn.addEventListener("click", () => {
      const closed = !!(document.getElementById("newProjStatusClosed") && document.getElementById("newProjStatusClosed").checked);
      addNamedItem("newProjStatusName", projectStatuses, slugProjStatus, applyProjectStatusCatalog, { closed: closed }, "Name the new project status", "That project status already exists", "Added project status <em>%s</em>");
      const closedBox = document.getElementById("newProjStatusClosed");
      if (closedBox) closedBox.checked = false;
    });
  }
  [["newStatusName", "addStatusBtn"], ["newPriName", "addPriBtn"], ["newProjStatusName", "addProjStatusBtn"]].forEach(([inputId, btnId]) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); const b = document.getElementById(btnId); if (b) b.click(); }
    });
  });
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      signOut();
    });
  }

  function revealSession() {
    const saved = readSession();
    if (saved && saved.user === ADMIN.user) {
      try { document.getElementById("rememberMe").checked = !!localStorage.getItem(SESSION_KEY); } catch (err) {}
      enterApp();
    } else {
      if (saved) {
        try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (err) {}
      }
      const userEl = document.getElementById("loginEmail");
      if (userEl && !userEl.value) userEl.value = ADMIN.user;
      showAuth("login");
    }
  }

  let bootPromise = Promise.resolve();
  (function startApp() {
    const go = async () => {
      if (window.__flowBooted) return;
      window.__flowBooted = true;
      await bootWorkspace();
      syncProjectDom();
      revealSession();
    };
    window.addEventListener("pywebviewready", go, { once: true });
    if (desktopApi()) {
      bootPromise = go();
      return;
    }
    if (window.pywebview) return;
    bootPromise = go();
  })();
  window.__flowResyncProjects = () => syncProjectDom();
  window.__flowBootPromise = bootPromise;
  return bootPromise;

}
