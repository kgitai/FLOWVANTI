import { useLayoutEffect, memo } from "react";

const DomHost = memo(function DomHost({ id, className }) {
  useLayoutEffect(() => {
    if (typeof window.__flowResyncProjects === "function") window.__flowResyncProjects();
  }, []);
  return <div id={id} className={className} />;
}, () => true);

function ChartZoomBtn({ chart }) {
  return (
    <button className="icon-btn chart-zoom-btn" type="button" data-chart-zoom={chart} aria-label="Enlarge chart" data-tip="Open a larger, readable view">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    </button>
  );
}

export default function FlowUi() {
  return (
    <>
      <div className="auth" id="auth">
        <div className="auth-brand">
          <div className="brand">
            <div className="mark" aria-hidden="true">
              <svg className="fv-mark" width="32" height="32" viewBox="0 0 32 32">
                <path className="fv-v" d="M16.4 12.8h3.2l1.6 7.4 2.2-7.4h3.4L21.4 29.6h-3.8z" />
                <path className="fv-f" d="M6.8 3h20.4l-.7 5.8H12.9l-.5 4.4h10.8l-.6 5H11.8L11 24.5 8.2 29.8 4.2 24.5z" />
              </svg>
            </div>
            <div>
              <div className="brand-name">FLOW<span className="brand-v">V</span>ANTI</div>
              <div className="brand-sub">Project command</div>
            </div>
          </div>
          <div className="auth-copy">
            <p className="lede">Plan. <em>Track.</em> Deliver.</p>
            <p className="hint">Kanban, list, calendar, and Gantt in one workspace. Project color marks identity. Status color marks urgency.</p>
            <div className="auth-features">
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="7" height="7" rx="1" /><rect x="14" y="4" width="7" height="7" rx="1" /><rect x="3" y="13" width="7" height="7" rx="1" /><rect x="14" y="13" width="7" height="7" rx="1" /></svg>Projects</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>Tasks</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>Timeline</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M3 20c1.2-3 3.4-4 6-4s4.8 1 6 4" /><circle cx="17" cy="9" r="2" /><path d="M21 20c-.6-2-1.8-3-4-3" /></svg>Team</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5m6 14V9m6 10V3" /></svg>Insights</span>
            </div>
          </div>
        </div>
        <div className="auth-form-wrap">
          <form className="auth-card" id="loginCard" noValidate>
            <div className="auth-emblem" aria-hidden="true">
              <svg className="fv-mark" width="32" height="32" viewBox="0 0 32 32">
                <path className="fv-v" d="M16.4 12.8h3.2l1.6 7.4 2.2-7.4h3.4L21.4 29.6h-3.8z" />
                <path className="fv-f" d="M6.8 3h20.4l-.7 5.8H12.9l-.5 4.4h10.8l-.6 5H11.8L11 24.5 8.2 29.8 4.2 24.5z" />
              </svg>
            </div>
            <h1>Welcome back</h1>
            <p className="page-sub">Sign in with the admin account</p>
            <p className="auth-error" id="loginError" role="alert"></p>
            <div className="auth-field">
              <label htmlFor="loginEmail">Username</label>
              <div className="auth-input" id="loginEmailWrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3" /><path d="M5 20c1.5-4 4-6 7-6s5.5 2 7 6" /></svg>
                <input id="loginEmail" type="text" defaultValue="admin" autoComplete="username" placeholder="admin" />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="loginPass">Password</label>
              <div className="auth-input" id="loginPassWrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                <input id="loginPass" type="password" defaultValue="" autoComplete="current-password" placeholder="Enter your password" />
                <button className="auth-eye" type="button" data-for="loginPass" aria-label="Show password" data-tip="Show or hide password">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
              </div>
            </div>
            <div className="auth-row">
              <label><input type="checkbox" id="rememberMe" defaultChecked data-check="remember" /> Remember me</label>
              <a href="#" id="forgotLink">Forgot password?</a>
            </div>
            <button className="btn btn-primary btn-block" type="submit" id="loginBtn" data-tip="Sign in as admin">Sign in <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
            <div className="auth-divider">or</div>
            <button className="btn btn-ghost btn-block" type="button" id="googleBtn" data-tip="Standalone app · admin account only">Continue with Google</button>
            <p className="auth-switch">No account? <a href="#" id="toSignup">Create one</a></p>
          </form>
          <form className="auth-card" id="signupCard" hidden noValidate>
            <div className="auth-emblem" aria-hidden="true">
              <svg className="fv-mark" width="32" height="32" viewBox="0 0 32 32">
                <path className="fv-v" d="M16.4 12.8h3.2l1.6 7.4 2.2-7.4h3.4L21.4 29.6h-3.8z" />
                <path className="fv-f" d="M6.8 3h20.4l-.7 5.8H12.9l-.5 4.4h10.8l-.6 5H11.8L11 24.5 8.2 29.8 4.2 24.5z" />
              </svg>
            </div>
            <h1>Create account</h1>
            <p className="page-sub">This standalone app uses one admin account</p>
            <p className="auth-error show" id="signupError" role="alert">Sign in with username <b>admin</b>. New accounts are off. The password is stored as a hash.</p>
            <div className="auth-field">
              <label htmlFor="signupName">Full name</label>
              <div className="auth-input">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3" /><path d="M5 20c1.5-4 4-6 7-6s5.5 2 7 6" /></svg>
                <input id="signupName" type="text" defaultValue="Admin" autoComplete="name" placeholder="Your name" />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signupEmail">Work email</label>
              <div className="auth-input">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>
                <input id="signupEmail" type="email" defaultValue="alex@flowvanti.app" autoComplete="email" placeholder="Enter your email" />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signupPass">Password</label>
              <div className="auth-input">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                <input id="signupPass" type="password" defaultValue="password" autoComplete="new-password" placeholder="Create a password" />
                <button className="auth-eye" type="button" data-for="signupPass" aria-label="Show password" data-tip="Show or hide password">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signupOrg">Workspace name</label>
              <div className="auth-input">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V9l8-5 8 5v11" /><path d="M10 20v-6h4v6" /></svg>
                <input id="signupOrg" type="text" defaultValue="FLOWVANTI studio" placeholder="Workspace name" />
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="button" id="signupBtn" data-tip="Standalone app · use the admin account">Back to sign in</button>
            <p className="auth-switch">Already have an account? <a href="#" id="toLogin">Sign in</a></p>
          </form>
          <form className="auth-card" id="forgotCard" hidden noValidate>
            <div className="auth-emblem" aria-hidden="true">
              <svg className="fv-mark" width="32" height="32" viewBox="0 0 32 32">
                <path className="fv-v" d="M16.4 12.8h3.2l1.6 7.4 2.2-7.4h3.4L21.4 29.6h-3.8z" />
                <path className="fv-f" d="M6.8 3h20.4l-.7 5.8H12.9l-.5 4.4h10.8l-.6 5H11.8L11 24.5 8.2 29.8 4.2 24.5z" />
              </svg>
            </div>
            <h1>Reset password</h1>
            <p className="page-sub">Password is stored as a salted SHA-256 hash, not plain text</p>
            <p className="auth-error show" id="forgotError" role="alert">No email reset on this build. Sign in as <b>admin</b> with the default password.</p>
            <div className="auth-field">
              <label htmlFor="forgotEmail">Email</label>
              <div className="auth-input">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>
                <input id="forgotEmail" type="email" defaultValue="alex@flowvanti.app" placeholder="Enter your email" />
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="button" id="forgotBtn" data-tip="Returns to sign in">Back to sign in</button>
            <p className="auth-switch"><a href="#" id="forgotBack">Back to sign in</a></p>
          </form>
        </div>
      </div>
      <div className="app" id="appShell" hidden>
        <header className="topbar">
          <div className="brand" id="brandHome" data-tip="FLOWVANTI home · open Dashboard">
            <div className="mark" aria-hidden="true">
              <svg className="fv-mark" width="32" height="32" viewBox="0 0 32 32">
                <path className="fv-v" d="M16.4 12.8h3.2l1.6 7.4 2.2-7.4h3.4L21.4 29.6h-3.8z" />
                <path className="fv-f" d="M6.8 3h20.4l-.7 5.8H12.9l-.5 4.4h10.8l-.6 5H11.8L11 24.5 8.2 29.8 4.2 24.5z" />
              </svg>
            </div>
            <div>
              <div className="brand-name">FLOWVANTI</div>
              <div className="brand-sub">Project command</div>
            </div>
          </div>
          <div className="search-wrap">
            <div className="search-lg" data-tip="Search projects, tasks, and people · Ctrl+K">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
              <input id="globalSearch" type="search" placeholder="Search projects, tasks, people..." aria-label="Search" autoComplete="off" />
              <span className="kbd" data-tip="Keyboard shortcut · focus search">Ctrl+K</span>
            </div>
            <div className="pop search-pop" id="searchPop" hidden>
              <div className="pop-h" id="searchPopHead">Search</div>
              <div id="searchPopList"></div>
            </div>
          </div>
          <div className="utils">
            <div className="top-clock" id="topClock" data-tip="Local date and time" aria-live="polite">
              <b id="topClockTime">12:00 AM</b>
              <span id="topClockDate">01-Jan-2026</span>
            </div>
            <div className="icon-wrap">
              <button className="btn btn-primary btn-sm" type="button" id="newBtn" data-tip="Create a project, task, or team members">+ New</button>
              <div className="pop" id="newPop" hidden>
                <div className="pop-h">Create</div>
                <button className="row" type="button" id="popNewProject" data-tip="Create a project">New project<span>Opens a create form</span></button>
                <button className="row" type="button" id="popNewTask" data-tip="Create a task on the current board">New task<span>Opens a create task</span></button>
                <button className="row" type="button" id="inviteBtn" data-tip="Add people by name · no email">Add team members<span>Manual add · name and role</span></button>
              </div>
            </div>
            <div className="icon-wrap">
            <div className="icon-btn" id="notifBtn" data-tip="No unread notifications">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
              <span className="badge" id="notifBadge" hidden>0</span>
            </div>
            <div className="pop" id="notifPop" hidden>
              <div className="pop-h" id="notifHead">Notifications · 0</div>
              <div id="notifList"></div>
            </div>
            </div>
            <div className="icon-wrap" id="accountWrap">
              <button className="account-chip" type="button" id="avatarBtn" data-tip="Admin · admin · signed in · open account menu" aria-haspopup="menu" aria-expanded="false">
                <span className="av passport" id="topAccountPhoto" data-who="AC">A</span>
                <span className="account-chip-meta">
                  <b id="topAccountName">Admin</b>
                  <span id="topAccountRole">FLOWVANTI Admin</span>
                </span>
              </button>
              <div className="pop" id="accountPop" hidden role="menu">
                <div className="pop-h">Signed in</div>
                <div className="account-id">
                  <span className="av passport" data-who="AC">A</span>
                  <div>
                    <b id="accountPopName">Admin</b>
                    <span id="accountPopUser">admin · FLOWVANTI Admin</span>
                  </div>
                </div>
                <button className="row" type="button" id="accountSettings" data-tip="Open workspace settings">Settings<span>Appearance, notifications, catalogs</span></button>
                <button className="row" type="button" id="accountLogout" data-tip="Sign out and return to the login screen">Sign out<span>Ends this session</span></button>
              </div>
            </div>
          </div>
        </header>
      
        <div className="shell" id="shell">
          <aside className="sidebar">
            <nav className="side-nav" id="sideNav">
              <a href="#" data-view="dashboard" data-tip="Analytics · completed vs created, overdue, cycle time">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
                Dashboard
              </a>
              <a href="#" data-view="projects" data-tip="Live Workstream">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
                Projects
              </a>
              <a href="#" data-view="tasks" data-tip="Table of tasks · status, priority, due, assignee">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>
                Tasks
              </a>
              <a href="#" data-view="calendar" data-tip="August 2026 · chips are project color, not status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 11h16" /></svg>
                Calendar
              </a>
              <a href="#" data-view="gantt" data-tip="Timeline bars by project · today marker in red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h8M4 12h14M4 18h10" /></svg>
                Gantt
              </a>
              <a href="#" data-view="reports" data-tip="Build charts from live workspace data · Closed is excluded">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>
                Reports
              </a>
              <a href="#" data-view="settings" data-tip="Appearance, notifications, catalogs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
                Settings
              </a>
            </nav>
      
            <div className="side-label">Projects <button type="button" id="sideAddProject" data-tip="Create a new project">+</button></div>
            <DomHost id="projList" className="proj-list" />
      
            <div className="due-card" id="dueCard">
              <button className="btn btn-ghost btn-sm" type="button" id="projectFilesBtn" hidden data-tip="List files attached to this project">Project Files</button>
              <button className="btn btn-ghost btn-sm" type="button" id="dueCalBtn" data-cal-pop="1" data-tip="Open calendar">View calendar</button>
            </div>
          </aside>
      
          <main className="workspace">
            <div className="proj-chrome" id="projChrome">
              <div className="proj-head">
                <div>
                  <div className="proj-title" data-open="projects" id="projTitleBtn" data-tip="Website relaunch · open projects list">
                    <span className="dot" id="projTitleDot" style={{background: "var(--accent)"}}></span>
                    <span id="projName">Website relaunch</span>
                  </div>
                  <div className="proj-meta">
                    <span className="tag-select tag prog" data-cat="proj" data-label="In progress" data-tip="Project status">
                      <select id="projStatusTag" aria-label="Project status"></select>
                    </span>
                    <span data-open="calendar" className="link" id="projRange" style={{margin: "0"}} data-tip="12-Jun-2026 – 12-Sep-2026 · open calendar">12-Jun-2026 – 12-Sep-2026</span>
                    <span className="owner" id="projOwnerWrap" data-tip="Owner from project details"></span>
                  </div>
                </div>
                <div className="chrome-actions">
                  <button className="btn btn-ghost btn-sm" type="button" id="editProjectBtn" data-tip="Edit this project · name, owner, dates, color">Edit project</button>
                  <button className="btn btn-primary btn-sm" type="button" id="newTaskBtn" data-tip="Create a task on this board · opens a form">+ New task</button>
                </div>
              </div>
              <div className="view-toggle" id="viewToggle">
                <button type="button" className="on" data-view="board" data-tip="Kanban columns · one per active task status">Kanban</button>
                <button type="button" data-view="tasks" data-tip="List view · click a row for the task pane">List</button>
                <button type="button" data-view="calendar" data-tip="Month grid · chips use project color">Calendar</button>
                <button type="button" data-view="gantt" data-tip="Timeline · bars use project color">Gantt</button>
              </div>
              <div className="filters">
                <div className="search" data-tip="Filter the open project by title, tag, or assignee">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
                  <input id="boardSearch" type="search" placeholder="Filter this project..." aria-label="Filter this project" autoComplete="off" />
                </div>
                <div className="msel" id="filterAssigneeWrap">
                  <button className="dd msel-btn" type="button" id="filterAssignee" data-tip="Filter this project by assignee · pick several" aria-haspopup="listbox" aria-expanded="false">All assignees</button>
                  <div className="pop msel-pop" id="filterAssigneePop" hidden>
                    <div className="pop-h">Assignees</div>
                    <div className="msel-list" id="filterAssigneeList"></div>
                  </div>
                </div>
                <div className="msel" id="filterStatusWrap">
                  <button className="dd msel-btn" type="button" id="filterStatus" data-tip="Filter this project by task status · pick several" aria-haspopup="listbox" aria-expanded="false">All statuses</button>
                  <div className="pop msel-pop" id="filterStatusPop" hidden>
                    <div className="pop-h">Statuses</div>
                    <div className="msel-list" id="filterStatusList"></div>
                  </div>
                </div>
                <div className="msel" id="filterPriWrap">
                  <button className="dd msel-btn" type="button" id="filterPri" data-tip="Filter this project by priority · pick several" aria-haspopup="listbox" aria-expanded="false">All priorities</button>
                  <div className="pop msel-pop" id="filterPriPop" hidden>
                    <div className="pop-h">Priorities</div>
                    <div className="msel-list" id="filterPriList"></div>
                  </div>
                </div>
                <div className="msel" id="filterTagWrap">
                  <button className="dd msel-btn" type="button" id="filterTag" data-tip="Filter this project by tag · pick several" aria-haspopup="listbox" aria-expanded="false">All tags</button>
                  <div className="pop msel-pop" id="filterTagPop" hidden>
                    <div className="pop-h">Tags</div>
                    <div className="msel-list" id="filterTagList"></div>
                  </div>
                </div>
                <select className="dd" id="filterRange" data-tip="Filter this project by due date">
                  <option value="">All dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due today</option>
                  <option value="week">This week</option>
                  <option value="upcoming">Upcoming</option>
                </select>
                <button className="pill on" type="button" id="saveViewBtn" data-tip="Save the current filters and view (Kanban/List/Calendar/Gantt)">Save view</button>
              </div>
            </div>
      
            <div className="workspace-body">
      
              <section className="view" data-view="dashboard" hidden>
                <h1 className="page-title">Project analytics</h1>
                <DomHost id="dashKpis" className="kpis" />
                <section className="charts">
                  <article className="card">
                    <div className="card-h">
                      <div className="card-title">Completed vs created</div>
                      <div className="chart-tools">
                        <div className="legend">
                          <span><i style={{background: "var(--accent)"}}></i>Completed</span>
                          <span><i style={{background: "var(--purple)"}}></i>Created</span>
                        </div>
                        <ChartZoomBtn chart="dashLine" />
                      </div>
                    </div>
                    <svg className="chart-svg" viewBox="0 0 760 248" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00D1D1" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#00D1D1" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                        </linearGradient>
                        <filter id="glowT"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                        <filter id="glowP"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      <g id="dashLineGrid"></g>
                      <g id="dashLineY" fill="#8B9BB4" fontFamily="Inter" fontSize="14" fontWeight="600"></g>
                      <g id="dashLinePlot"></g>
                    </svg>
                  </article>
                  <article className="card">
                    <div className="card-h">
                      <div className="card-title">Monthly throughput</div>
                      <div className="chart-tools">
                        <div className="legend">
                          <span><i style={{background: "var(--amber)"}}></i>Delivered</span>
                          <span><i style={{background: "var(--accent)"}}></i>Open</span>
                        </div>
                        <ChartZoomBtn chart="dashBar" />
                      </div>
                    </div>
                    <svg className="bar-svg" viewBox="0 0 760 248" preserveAspectRatio="none">
                      <g id="dashBarGrid"></g>
                      <g id="dashBarY" fill="#8B9BB4" fontFamily="Inter" fontSize="14" fontWeight="600"></g>
                      <g id="dashBarPlot"></g>
                    </svg>
                  </article>
                </section>
              </section>
      
              <section className="view" data-view="projects" hidden>
                <div className="page-head">
                  <div>
                    <h1 className="page-title">Projects</h1>
                    <p className="page-sub">Live workstreams · Closed projects stay here, off Dashboard and Reports</p>
                  </div>
                  <button className="btn btn-primary" type="button" id="newProjectBtn" data-tip="Create a project · name, description, owner, dates, color">+ New project</button>
                </div>
                <DomHost id="projGrid" className="proj-board" />
              </section>
      
              <section className="view" data-view="board">
                <DomHost id="boardCols" className="board" />
              </section>
      
              <section className="view" data-view="tasks" hidden>
                <div className="card" style={{padding: "0"}}>
                  <table className="list">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Due</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody id="taskTbody"></tbody>
                  </table>
                </div>
              </section>
      
              <section className="view" data-view="gantt" hidden>
                <div className="gantt">
                  <div className="gantt-head">
                    <div className="lab">Task</div>
                    <div className="weeks" id="ganttWeeks">
                      <span>Jun 2</span><span>Jun 16</span><span>Jun 30</span><span>Jul 14</span><span>Jul 28</span>
                      <span>Aug 4</span><span>Aug 11</span><span>Aug 18</span><span>Aug 25</span><span>Sep 1</span>
                    </div>
                  </div>
                </div>
              </section>
      
              <section className="view" data-view="calendar" hidden>
                <div className="cal-head">
                  <button className="icon-btn" type="button" id="calPrev" aria-label="Previous month" data-tip="Previous month">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <div className="cal-title-wrap">
                    <h2 className="cal-title" id="calTitle">August 2026</h2>
                    <p className="page-sub cal-today-note" id="calTodayNote">Today · 18-Aug-2026</p>
                  </div>
                  <button className="icon-btn" type="button" id="calNext" aria-label="Next month" data-tip="Next month">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" id="calTodayBtn" data-tip="Jump to today · 18-Aug-2026">Today</button>
                </div>
                <div className="cal" id="calGrid"></div>
              </section>
      
              <section className="view" data-view="reports" hidden>
                <div className="page-head">
                  <div>
                    <h1 className="page-title">Reports</h1>
                  </div>
                  <div className="page-head-actions">
                    <button className="btn btn-ghost" type="button" id="reportResetBtn" data-tip="Restore the default KPI strip and created vs completed chart">Reset</button>
                    <button className="btn btn-primary" type="button" id="reportAddBtn" data-tip="Add a chart · pick style, X axis, and Y axis from workspace data">+ Add chart</button>
                  </div>
                </div>
                <DomHost id="reportGrid" className="report-grid" />
              </section>
      
              <section className="view" data-view="settings" hidden>
                <h1 className="page-title">Settings</h1>
                <p className="page-sub">Workspace preferences</p>
                <div className="settings-list">
                  <div className="set-grid set-grid-2">
                    <div className="set-row">
                      <div><b>Appearance</b><span className="set-desc" id="appearDesc">Dark · teal accent</span></div>
                      <button className="set-toggle on" type="button" id="appearBtn" data-tip="Toggle dark / light appearance">Dark</button>
                    </div>
                    <div className="set-row set-accent-row">
                      <div><b>Accent color</b><span className="set-desc" id="accentDesc">Default · original FLOWVANTI theme</span></div>
                      <div className="accent-swatches" id="accentSwatches">
                        <button className="accent-swatch on accent-swatch-default" type="button" data-theme="designed" data-accent="#00D1D1" data-tip="Default · designed theme" style={{background: "#00D1D1"}} aria-label="Default theme"></button>
                        <button className="accent-swatch" type="button" data-accent="#00D1D1" data-tip="Teal" style={{background: "#00D1D1"}} aria-label="Teal"></button>
                        <button className="accent-swatch" type="button" data-accent="#A855F7" data-tip="Purple" style={{background: "#A855F7"}} aria-label="Purple"></button>
                        <button className="accent-swatch" type="button" data-accent="#F59E0B" data-tip="Amber" style={{background: "#F59E0B"}} aria-label="Amber"></button>
                        <button className="accent-swatch" type="button" data-accent="#F43F5E" data-tip="Rose" style={{background: "#F43F5E"}} aria-label="Rose"></button>
                        <button className="accent-swatch" type="button" data-accent="#3B82F6" data-tip="Blue" style={{background: "#3B82F6"}} aria-label="Blue"></button>
                        <button className="accent-swatch" type="button" data-accent="#10B981" data-tip="Green" style={{background: "#10B981"}} aria-label="Green"></button>
                        <button className="accent-swatch" type="button" data-accent="#F97316" data-tip="Orange" style={{background: "#F97316"}} aria-label="Orange"></button>
                        <label className="accent-custom" data-tip="Pick any color">
                          <input id="accentCustom" type="color" defaultValue="#00D1D1" aria-label="Custom accent color" />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="set-grid set-grid-eq">
                    <div className="set-row">
                      <div><b>Notifications</b><span className="set-desc" id="notifyDesc">Due today, blocked, mentions</span></div>
                      <button className="set-toggle on" type="button" id="notifyBtn" data-tip="Turn due, blocked, and mention alerts on or off">On</button>
                    </div>
                    <div className="set-row">
                      <div>
                        <b>Attachment file size</b>
                        <span className="set-desc" id="attachMaxMbDesc">Maximum size per file · MB</span>
                      </div>
                      <input id="attachMaxMb" className="hours-per-day" type="number" min="1" max="500" step="1" defaultValue="10" aria-label="Attachment file size in megabytes" />
                    </div>
                    <div className="set-row">
                      <div><b>Week starts</b><span className="set-desc" id="weekDesc">Monday · weekends Saturday & Sunday</span></div>
                      <button className="set-toggle on" type="button" id="weekBtn" data-tip="Monday: Sat–Sun weekend · Sunday: Fri–Sat weekend">Mon</button>
                    </div>
                    <div className="set-row">
                      <div>
                        <b>Working hours / day</b>
                        <span className="set-desc" id="hoursPerDayDesc">Converts estimate days to hours and fills due dates on working days</span>
                      </div>
                      <input id="hoursPerDay" className="hours-per-day" type="number" min="1" max="24" step="0.5" defaultValue="8" aria-label="Working hours per day" />
                    </div>
                  </div>
                  <div className="set-row set-stack catalog-panel is-collapsed" id="catalogPanel">
                    <button className="catalog-toggle" type="button" id="catalogToggle" aria-expanded="false" data-tip="Show or hide task status, priority, and project status">
                      <span>
                        <b>Catalogs</b>
                        <span className="set-desc">Task status, priority, and project status · On/Off and add your own</span>
                      </span>
                      <svg className="catalog-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    <div className="catalog-cols" id="catalogCols">
                      <div className="catalog-col">
                        <div className="catalog-col-h">
                          <b>Task status</b>
                          <span className="set-desc" id="statusCatalogDesc">Board, filters, analytics</span>
                        </div>
                        <DomHost id="statusCatalog" className="status-catalog" />
                        <div className="status-add">
                          <input id="newStatusName" type="text" placeholder="New status" aria-label="New task status" />
                          <label className="status-done-flag"><input id="newStatusDone" type="checkbox" /> Completes work</label>
                          <label className="status-done-flag"><input id="newStatusBlocked" type="checkbox" /> Blocks work</label>
                          <button className="btn btn-ghost btn-sm" type="button" id="addStatusBtn" data-tip="Add a task status">Add</button>
                        </div>
                      </div>
                      <div className="catalog-col">
                        <div className="catalog-col-h">
                          <b>Priority</b>
                          <span className="set-desc" id="priCatalogDesc">Tasks and filters</span>
                        </div>
                        <DomHost id="priCatalog" className="status-catalog" />
                        <div className="status-add">
                          <input id="newPriName" type="text" placeholder="New priority" aria-label="New priority" />
                          <button className="btn btn-ghost btn-sm" type="button" id="addPriBtn" data-tip="Add a priority">Add</button>
                        </div>
                      </div>
                      <div className="catalog-col">
                        <div className="catalog-col-h">
                          <b>Project status</b>
                          <span className="set-desc" id="projStatusCatalogDesc">Projects and chrome</span>
                        </div>
                        <DomHost id="projStatusCatalog" className="status-catalog" />
                        <div className="status-add">
                          <input id="newProjStatusName" type="text" placeholder="New status" aria-label="New project status" />
                          <label className="status-done-flag"><input id="newProjStatusClosed" type="checkbox" /> Closes project</label>
                          <button className="btn btn-ghost btn-sm" type="button" id="addProjStatusBtn" data-tip="Add a project status">Add</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="set-row set-stack catalog-panel is-collapsed" id="holidayPanel">
                    <button className="catalog-toggle" type="button" id="holidayToggle" aria-expanded="false" data-tip="Show or hide holiday calendars">
                      <span>
                        <b>Holiday calendars</b>
                        <span className="set-desc" id="holidayPanelDesc">Current year is added automatically · weekends follow Week starts</span>
                      </span>
                      <svg className="catalog-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    <div className="holiday-body" id="holidayBody">
                      <p className="set-desc" id="holidayWeekendNote">Week starts Monday · weekends Saturday & Sunday · dates you pick can stay on that day · estimate-filled dues skip weekends and holidays</p>
                      <div className="holiday-toolbar">
                        <label className="holiday-year-lab">Year
                          <select id="holidayYearSelect" aria-label="Holiday year"></select>
                        </label>
                        <span className="set-desc" id="holidayCount">0 holidays</span>
                      </div>
                      <DomHost id="holidayTableHost" className="holiday-table-wrap" />
                      <div className="status-add holiday-add">
                        <input id="holidayDate" className="date-field" type="text" readOnly inputMode="none" autoComplete="off" aria-label="Holiday date" data-tip="Pick a date · week starts from Settings" />
                        <span className="set-desc holiday-day-preview" id="holidayDayPreview">Tuesday</span>
                        <input id="holidayName" type="text" placeholder="Holiday name" aria-label="Holiday name" />
                        <button className="btn btn-ghost btn-sm" type="button" id="addHolidayBtn" data-tip="Add this holiday to the selected year">Add</button>
                      </div>
                    </div>
                  </div>
                  <div className="set-row">
                    <div><b>Sample data</b><span className="set-desc" id="sampleDesc">Demo projects, tasks, and attachments</span></div>
                    <div style={{display: "flex", gap: "8px"}}>
                      <button className="btn btn-primary btn-sm" type="button" id="loadSampleBtn" data-tip="Restore the demo projects and tasks">Load Sample</button>
                      <button className="btn btn-ghost btn-sm" type="button" id="deleteSampleBtn" data-tip="Remove all demo projects and tasks">Delete Sample</button>
                    </div>
                  </div>
                  <div className="set-row">
                    <div><b>Uninstall FLOWVANTI</b><span className="set-desc">Remove the app from this PC · also in Windows Settings → Apps</span></div>
                    <button className="btn btn-ghost btn-sm" type="button" id="uninstallAppBtn" data-tip="Open the Windows uninstaller">Uninstall</button>
                  </div>
                </div>
              </section>
            </div>
      
            <section className="task-pane" id="taskPane">
              <div className="pane-info">
                <div className="pane-actions">
                  <div className="pane-crumb pane-quick">
                    <label>Status
                      <span className="tag-select tag todo" data-cat="status" data-label="To do" data-tip="Task status">
                        <select id="dList" aria-label="Task status"></select>
                      </span>
                    </label>
                    <label>Priority
                      <span className="tag-select tag med" data-cat="pri" data-label="Medium" data-tip="Task priority">
                        <select id="dPri" aria-label="Task priority"></select>
                      </span>
                    </label>
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button" id="editTaskBtn" data-tip="Edit this task · title, dates, assignee, priority">Edit task</button>
                </div>
                <h2 id="dTitle">Design new pricing page</h2>
                <p className="pane-desc" id="dDesc">Rebuild the public pricing grid, add annual toggle, and align checkout SKUs with the new plans. Waiting on legal copy for the enterprise tier.</p>
                <dl className="pane-fields">
                  <div>
                    <dt>Assignee</dt>
                    <dd id="dAssignee"><span className="av sm" style={{background: "var(--accent-dim)", color: "var(--accent-fg)"}}>JL</span> JL</dd>
                  </div>
                  <div>
                    <dt>Start</dt>
                    <dd id="dStart" data-open="calendar" className="link" style={{margin: "0"}} data-tip="Start date · open calendar">12-Aug-2026</dd>
                  </div>
                  <div>
                    <dt>Due</dt>
                    <dd id="dDue" data-open="calendar" className="link" style={{margin: "0"}} data-tip="Due date · open calendar">22-Aug-2026</dd>
                  </div>
                </dl>
                <div className="time-box">
                  <div className="row"><span>Estimated <b id="dEst">16h</b></span><span>Actual <b id="dAct">4h</b></span><span id="dTimePct">25%</span></div>
                  <div className="prog lg"><span id="dTimeBar" style={{width: "25%"}}></span></div>
                </div>
                <div className="pane-tags" id="dTags">
                  <span className="tag outline">Website</span>
                  <span className="tag outline">Design</span>
                  <span className="tag outline">High</span>
                </div>
              </div>
              <div className="pane-tabs">
                <div className="tabs" id="detailTabs">
                  <button type="button" className="on" data-tab="subtasks" data-tip="Checklist on this task">Subtasks</button>
                  <button type="button" data-tab="comments" data-tip="Discussion on this task">Comments (2)</button>
                  <button type="button" data-tab="attachments" data-tip="Files linked to this task">Attachments (3)</button>
                  <button type="button" data-tab="history" data-tip="Activity log">History</button>
                </div>
                <div className="tab-body">
                  <div className="tab-panel" data-panel="subtasks" id="subtaskPanel">
                    <div className="sub-head"><span id="subCount">0/0 completed</span></div>
                    <div className="prog" style={{marginBottom: "10px"}}><span id="subBar" style={{width: "0%", background: "var(--success)"}}></span></div>
                    <div id="subtaskList"></div>
                    <div className="sub-add">
                      <div className="auth-field">
                        <label htmlFor="subtaskInput">Subtask <i className="req">*</i></label>
                        <input id="subtaskInput" type="text" placeholder="Checklist item" data-tip="Title is required" />
                      </div>
                      <div className="field-row sub-add-meta">
                        <div className="auth-field">
                          <label htmlFor="subtaskAssignee">Assignee <i className="req">*</i></label>
                          <select id="subtaskAssignee" data-tip="Who owns this subtask"></select>
                        </div>
                        <div className="auth-field">
                          <label htmlFor="subtaskDue">Due date <i className="req">*</i></label>
                          <input id="subtaskDue" className="date-field" type="text" readOnly inputMode="none" autoComplete="off" data-tip="Due date is required · week starts from Settings" />
                        </div>
                        <button className="btn btn-ghost btn-sm" type="button" id="addSubtaskBtn" data-tip="Add subtask · title, assignee, and due date required">Add</button>
                      </div>
                    </div>
                  </div>
                  <div className="tab-panel" data-panel="comments" hidden id="commentPanel"></div>
                  <div className="tab-panel" data-panel="attachments" hidden id="attachPanel">
                    <div id="attachList"></div>
                    <button className="btn btn-ghost btn-sm" type="button" id="addAttachBtn" style={{marginTop: "8px"}} data-tip="Choose a file from your computer">+ Add file</button>
                  </div>
                  <div className="tab-panel" data-panel="history" hidden id="historyPanel"></div>
                </div>
                <div className="composer">
                  <span className="av sm" id="commentMe" data-who="AC" data-tip="Admin · comments post as this account">A</span>
                  <input type="text" id="commentInput" placeholder="Add a comment..." data-tip="Write a comment then send" />
                  <button className="send" type="button" id="sendComment" aria-label="Send" data-tip="Post this comment on the task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
                  </button>
                </div>
              </div>
            </section>
          </main>
      
          <aside className="rail">
            <div>
              <h3 id="ovHeading">Project overview</h3>
              <div className="overview">
                <div className="ring-wrap">
                  <svg width="88" height="88" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="36" fill="none" stroke="#1C232C" strokeWidth="8" />
                    <circle id="ovRing" cx="44" cy="44" r="36" fill="none" stroke="#00D1D1" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray="153.6 226.2" />
                  </svg>
                  <div className="ring-label"><b id="ovPct">68%</b><span>Complete</span></div>
                </div>
                <div className="ov-stats">
                  <div data-open="tasks" id="ovTotalRow" data-tip="Tasks on this project · open list">Tasks total<strong id="ovTotal">8</strong></div>
                  <div data-open="board" id="ovDoneRow" data-tip="Done on this board">Completed<strong id="ovDone">2</strong></div>
                  <div data-open="board" id="ovProgRow" data-tip="Open work on this board">Open<strong id="ovProg">1</strong></div>
                  <div data-open="tasks" id="ovOverRow" data-tip="Open tasks past due">Overdue<strong id="ovOver" style={{color: "var(--danger-text)"}}>1</strong></div>
                </div>
              </div>
            </div>
            <div>
              <h3>Task status</h3>
              <div className="donut-row">
                <svg width="92" height="92" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="14" fill="none" stroke="#1C232C" strokeWidth="7" />
                  <g id="donutArcs"></g>
                </svg>
                <div className="donut-legend" id="donutLegend"></div>
              </div>
            </div>
            <div>
              <h3>Upcoming deadlines</h3>
              <div id="deadlineList">
              <div className="deadline" data-task="qa">
                <div><div className="t">QA on checkout flow</div><div className="d">13-Aug-2026</div></div>
                <span className="tag urgent">Urgent</span>
              </div>
              <div className="deadline" data-task="copy">
                <div><div className="t">Launch copy review</div><div className="d">15-Aug-2026</div></div>
                <span className="tag med">Medium</span>
              </div>
              <div className="deadline" data-task="api">
                <div><div className="t">API rate-limit spike</div><div className="d">18-Aug-2026</div></div>
                <span className="tag high">High</span>
              </div>
              <div className="deadline" data-task="nav">
                <div><div className="t">Nav IA pass</div><div className="d">20-Aug-2026</div></div>
                <span className="tag low">Low</span>
              </div>
              </div>
            </div>
            <div>
              <h3>Active Teams Members</h3>
              <div className="team-row" id="teamRow"></div>
              <button className="btn btn-ghost btn-sm" type="button" id="manageTeamBtn" style={{marginTop: "12px", width: "100%", justifyContent: "center"}} data-tip="Manage team · add people, upload photos">Manage team</button>
            </div>
          </aside>
        </div>
      </div>
      <div id="floatTip" hidden></div>
      <div id="toast" hidden></div>
      <div className="modal" id="modal" hidden>
        <div className="modal-card" id="modalCard">
          <h2 id="modalTitle">Create</h2>
          <p className="page-sub" id="modalSub" style={{marginBottom: "14px"}}></p>
          <div className="auth-field" id="modalFieldWrap">
            <label htmlFor="modalInput" id="modalLabel">Name <i className="req">*</i></label>
            <input id="modalInput" type="text" autoComplete="off" name="flow_project_title" placeholder="project name" />
          </div>
          <div className="auth-field" id="modalRoleWrap" hidden>
            <label htmlFor="modalRole">Role <i className="req">*</i></label>
            <input id="modalRole" type="text" autoComplete="off" placeholder="Designer, engineer…" />
          </div>
          <div id="memberExtras" hidden>
            <div className="member-photo-row" id="memberPhotoRow" hidden>
              <span className="av profile" id="memberPhotoPreview" data-who="">?</span>
              <div className="member-photo-actions">
                <button className="btn btn-ghost btn-sm" type="button" id="memberPhotoUpload" data-tip="Upload a photo for this person">Upload photo</button>
                <button className="btn btn-danger btn-sm" type="button" id="memberPhotoDelete" hidden data-tip="Remove this photo everywhere">Delete photo</button>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="memberActive">Status <i className="req">*</i></label>
              <select id="memberActive">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div id="projFields" hidden>
            <div className="auth-field">
              <label htmlFor="projDesc">Description <i className="req">*</i></label>
              <textarea id="projDesc" placeholder="What this project delivers"></textarea>
            </div>
            <div className="field-row">
              <div className="auth-field">
                <label htmlFor="projOwner">Owner <i className="req">*</i></label>
                <select id="projOwner"></select>
              </div>
              <div className="auth-field">
                <label htmlFor="projStatusSelect">Status <i className="req">*</i></label>
                <select id="projStatusSelect"></select>
              </div>
            </div>
            <div className="field-row">
              <div className="auth-field">
                <label htmlFor="projStart">Start date <i className="req">*</i></label>
                <input id="projStart" className="date-field" type="text" readOnly inputMode="none" autoComplete="off" data-tip="Start date · week starts from Settings" />
              </div>
              <div className="auth-field">
                <label htmlFor="projEnd">End date <i className="req">*</i></label>
                <input id="projEnd" className="date-field" type="text" readOnly inputMode="none" autoComplete="off" data-tip="End date · week starts from Settings" />
              </div>
            </div>
            <div className="auth-field">
              <label>Project color <i className="req">*</i></label>
              <div className="color-picks" id="projColorPicks">
                <button className="color-pick on" type="button" data-hex="#00D1D1" style={{"--swatch": "#00D1D1"}} data-tip="Teal"></button>
                <button className="color-pick" type="button" data-hex="#A855F7" style={{"--swatch": "#A855F7"}} data-tip="Purple"></button>
                <button className="color-pick" type="button" data-hex="#F59E0B" style={{"--swatch": "#F59E0B"}} data-tip="Amber"></button>
                <button className="color-pick" type="button" data-hex="#3B82F6" style={{"--swatch": "#3B82F6"}} data-tip="Blue"></button>
                <button className="color-pick" type="button" data-hex="#10B981" style={{"--swatch": "#10B981"}} data-tip="Green"></button>
                <button className="color-pick" type="button" data-hex="#F43F5E" style={{"--swatch": "#F43F5E"}} data-tip="Rose"></button>
                <button className="color-pick" type="button" data-hex="#06B6D4" style={{"--swatch": "#06B6D4"}} data-tip="Cyan"></button>
                <button className="color-pick" type="button" data-hex="#8B5CF6" style={{"--swatch": "#8B5CF6"}} data-tip="Violet"></button>
                <button className="color-pick" type="button" data-hex="#EC4899" style={{"--swatch": "#EC4899"}} data-tip="Pink"></button>
                <button className="color-pick" type="button" data-hex="#84CC16" style={{"--swatch": "#84CC16"}} data-tip="Lime"></button>
                <button className="color-pick" type="button" data-hex="#F97316" style={{"--swatch": "#F97316"}} data-tip="Orange"></button>
                <button className="color-pick" type="button" data-hex="#64748B" style={{"--swatch": "#64748B"}} data-tip="Slate"></button>
              </div>
              <div className="color-custom" id="projColorCustomWrap">
                <input id="projColorCustom" type="color" defaultValue="#00D1D1" data-tip="Pick any color" />
                <span>Custom color</span>
              </div>
            </div>
          </div>
          <div id="taskFields" hidden>
            <div className="auth-field">
              <label htmlFor="taskDesc">Description <i className="req">*</i></label>
              <textarea id="taskDesc" placeholder="What this task delivers"></textarea>
            </div>
            <div className="field-row">
              <div className="auth-field">
                <label htmlFor="taskList">Status <i className="req">*</i></label>
                <select id="taskList"></select>
              </div>
              <div className="auth-field">
                <label htmlFor="taskPri">Priority <i className="req">*</i></label>
                <select id="taskPri"></select>
              </div>
            </div>
            <div className="field-row est-fields">
              <div className="auth-field">
                <label htmlFor="taskAssignee">Assignee <i className="req">*</i></label>
                <select id="taskAssignee"></select>
              </div>
              <div className="auth-field">
                <label htmlFor="taskEst">Estimate <i className="req">*</i></label>
                <div className="est-row">
                  <select id="taskEstUnit" aria-label="Estimate unit" data-tip="Days use Working hours / day from Settings">
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                  <input id="taskEst" type="text" inputMode="decimal" maxLength={5} placeholder="1" autoComplete="off" aria-label="Estimate" />
                </div>
                <span className="est-hint" id="taskEstHint">8h · 1d at 8h/day · due 1 workday</span>
              </div>
            </div>
            <div className="field-row">
              <div className="auth-field">
                <label htmlFor="taskStart">Start date <i className="req">*</i></label>
                <input id="taskStart" className="date-field" type="text" readOnly inputMode="none" autoComplete="off" data-tip="Start date · week starts from Settings" />
              </div>
              <div className="auth-field">
                <label htmlFor="taskDue">Due date <i className="req">*</i></label>
                <input id="taskDue" className="date-field" type="text" readOnly inputMode="none" autoComplete="off" data-tip="Due date · week starts from Settings" />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="taskTags">Tags</label>
              <input id="taskTags" type="text" placeholder="Website, Design" />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-danger" type="button" id="modalDelete" hidden data-tip="">Delete</button>
            <div className="modal-actions-end">
              <button className="btn btn-ghost" type="button" id="modalCancel" data-tip="Close without saving">Cancel</button>
              <button className="btn btn-primary" type="button" id="modalOk" data-tip="Save and add to the workspace">Create</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal" id="teamModal" hidden>
        <div className="modal-card" style={{maxWidth: "440px"}}>
          <h2>Team</h2>
          <p className="page-sub">Add people, edit name and role, or replace photos</p>
          <div className="search" style={{width: "100%", margin: "0 0 12px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
            <input id="teamSearch" type="search" placeholder="Search people..." aria-label="Search people" autoComplete="off" />
          </div>
          <div id="teamList"></div>
          <p className="upload-hint">JPG, PNG, or WebP · shown on cards, list, and the top bar</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" type="button" id="teamInviteBtn" data-tip="Add a person by name · no email invite">Add person</button>
            <button className="btn btn-primary" type="button" id="teamDoneBtn" data-tip="Close team">Done</button>
          </div>
        </div>
      </div>
      <div className="modal photo-zoom" id="photoZoom" hidden>
        <figure className="photo-zoom-stage">
          <button className="photo-zoom-close" type="button" id="photoZoomClose" aria-label="Close photo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <img id="photoZoomImg" alt="" />
          <figcaption className="photo-zoom-cap" id="photoZoomCap"></figcaption>
        </figure>
      </div>
      <div className="modal photo-zoom" id="filePreview" hidden>
        <div className="file-preview-stage">
          <button className="photo-zoom-close" type="button" id="filePreviewClose" aria-label="Close preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="file-preview-body" id="filePreviewBody"></div>
          <div className="file-preview-bar">
            <span id="filePreviewCap"></span>
            <button className="btn btn-ghost btn-sm" type="button" id="filePreviewDownload" data-tip="Download the decrypted file">Download</button>
          </div>
        </div>
      </div>
      <div className="pop date-pop" id="datePop" hidden>
        <div className="date-pop-h">
          <button className="icon-btn" type="button" id="datePopPrev" aria-label="Previous month" data-tip="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <b id="datePopTitle">August 2026</b>
          <button className="icon-btn" type="button" id="datePopNext" aria-label="Next month" data-tip="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="date-pop-grid" id="datePopGrid"></div>
        <button className="btn btn-ghost btn-sm" type="button" id="datePopToday" data-tip="Jump to today and pick it">Today</button>
      </div>
      <div className="modal" id="calModal" hidden>
        <div className="modal-card cal-modal-card" role="dialog" aria-modal="true" aria-labelledby="calPopTitle">
          <div className="cal-pop-top">
            <p className="page-sub" id="calPopScope">All live projects</p>
            <button className="icon-btn" type="button" id="calPopClose" aria-label="Close calendar" data-tip="Close calendar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="cal-head">
            <button className="icon-btn" type="button" id="calPopPrev" aria-label="Previous month" data-tip="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="cal-title-wrap">
              <h2 className="cal-title" id="calPopTitle">August 2026</h2>
              <p className="page-sub cal-today-note" id="calPopTodayNote">Today · 18-Aug-2026</p>
            </div>
            <button className="icon-btn" type="button" id="calPopNext" aria-label="Next month" data-tip="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <button className="btn btn-ghost btn-sm" type="button" id="calPopToday" data-tip="Jump to today · 18-Aug-2026">Today</button>
          </div>
          <div className="cal" id="calPopGrid"></div>
        </div>
      </div>
      <div className="modal" id="reportModal" hidden>
        <div className="modal-card report-card" role="dialog" aria-modal="true" aria-labelledby="reportModalTitle">
          <h2 id="reportModalTitle">Add chart</h2>
          <p className="page-sub" id="reportModalSub">Map workspace fields to a visual · same data as Dashboard</p>
          <div className="report-temps" id="rwTemps"></div>
          <div className="auth-field">
            <label htmlFor="rwTitle">Title <i className="req">*</i></label>
            <input id="rwTitle" type="text" autoComplete="off" placeholder="Tasks by status" />
          </div>
          <div className="field-row">
            <div className="auth-field">
              <label htmlFor="rwViz">Chart style <i className="req">*</i></label>
              <select id="rwViz">
                <optgroup label="Bars">
                  <option value="bar">Column (vertical)</option>
                  <option value="hbar">Bar (horizontal)</option>
                  <option value="stacked">Stacked column</option>
                  <option value="hstacked">Stacked bar</option>
                  <option value="percent">100% stacked column</option>
                  <option value="hpercent">100% stacked bar</option>
                </optgroup>
                <optgroup label="Lines">
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                  <option value="stackedarea">Stacked area</option>
                  <option value="combo">Column + line</option>
                </optgroup>
                <optgroup label="Part-to-whole">
                  <option value="pie">Pie</option>
                  <option value="donut">Donut</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="table">Table</option>
                  <option value="kpi">Single KPI</option>
                  <option value="kpis">Delivery KPI strip</option>
                </optgroup>
              </select>
            </div>
            <div className="auth-field" id="rwSourceWrap">
              <label htmlFor="rwSource">Data from <i className="req">*</i></label>
              <select id="rwSource">
                <option value="tasks">Tasks</option>
                <option value="projects">Projects</option>
              </select>
            </div>
          </div>
          <div className="field-row" id="rwAxisRow">
            <div className="auth-field" id="rwXWrap">
              <label htmlFor="rwX">X axis <i className="req">*</i></label>
              <select id="rwX"></select>
            </div>
            <div className="auth-field" id="rwYWrap">
              <label htmlFor="rwY">Y axis <i className="req">*</i></label>
              <select id="rwY"></select>
            </div>
          </div>
          <div className="auth-field" id="rwYsWrap">
            <label>Extra Y series</label>
            <div className="rw-ys" id="rwYs"></div>
          </div>
          <div className="field-row" id="rwSeriesRow">
            <div className="auth-field" id="rwSplitWrap">
              <label htmlFor="rwSplit">Legend / split</label>
              <select id="rwSplit"></select>
            </div>
          </div>
          <div className="field-row" id="rwOptRow">
            <div className="auth-field">
              <label htmlFor="rwSort">Sort</label>
              <select id="rwSort">
                <option value="category">Category</option>
                <option value="value">Value · high to low</option>
                <option value="valueAsc">Value · low to high</option>
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="rwTop">Show</label>
              <select id="rwTop">
                <option value="0">All categories</option>
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
                <option value="15">Top 15</option>
              </select>
            </div>
          </div>
          <div className="field-row" id="rwOptRow2">
            <div className="auth-field" id="rwLabelsWrap">
              <label htmlFor="rwLabels">Data labels</label>
              <select id="rwLabels">
                <option value="">Hide</option>
                <option value="1">Show values</option>
              </select>
            </div>
            <div className="auth-field" id="rwProjectWrap">
              <label htmlFor="rwProject">Project scope</label>
              <select id="rwProject"></select>
            </div>
          </div>
          <div className="modal-actions">
            <div className="modal-actions-end">
              <button className="btn btn-ghost" type="button" id="reportModalCancel" data-tip="Close without saving">Cancel</button>
              <button className="btn btn-primary" type="button" id="reportModalOk" data-tip="Save this chart on Reports">Save chart</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal" id="chartModal" hidden>
        <div className="modal-card chart-modal-card" role="dialog" aria-modal="true" aria-labelledby="chartZoomTitle">
          <div className="chart-zoom-top">
            <div className="chart-zoom-head">
              <div>
                <h2 className="cal-title" id="chartZoomTitle">Completed vs created</h2>
                <p className="page-sub" id="chartZoomSub">January–December 2026</p>
              </div>
              <button className="icon-btn" type="button" id="chartZoomClose" aria-label="Close chart" data-tip="Close chart">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="legend report-legend" id="chartZoomLegend"></div>
          </div>
          <svg className="chart-zoom-svg" viewBox="0 0 1200 420" preserveAspectRatio="none">
            <defs id="zoomDefs">
              <linearGradient id="gTealZ" data-keep="1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D1D1" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#00D1D1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gPurpleZ" data-keep="1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g id="zoomGrid"></g>
            <g id="zoomAxis" fill="#8B9BB4" fontFamily="Inter" fontSize="16" fontWeight="600"></g>
            <g id="zoomPlot"></g>
          </svg>
        </div>
      </div>
      <div className="modal" id="projectFilesModal" hidden>
        <div className="modal-card files-modal-card" role="dialog" aria-modal="true" aria-labelledby="projectFilesTitle">
          <div className="files-modal-head" data-tip="Drag to move">
            <div>
              <h2 id="projectFilesTitle">Project files</h2>
              <p className="page-sub" id="projectFilesSub">Attachments on this project</p>
            </div>
            <button className="icon-btn" type="button" id="projectFilesClose" aria-label="Close files" data-tip="Close files">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="files-modal-split">
            <div className="files-modal-list">
              <table className="list files-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody id="projectFilesBody"></tbody>
              </table>
            </div>
            <div className="files-split" id="projectFilesSplit" role="separator" aria-orientation="vertical" aria-label="Resize panes" data-tip="Drag to resize panes"></div>
            <div className="files-modal-preview">
              <div className="file-preview-stage" id="projectFilesStage">
                <div className="file-preview-body" id="projectFilesPreview">
                  <p className="page-sub files-preview-empty">Select a file to preview</p>
                </div>
                <div className="file-preview-bar">
                  <span id="projectFilesCap">Preview</span>
                  <button className="btn btn-ghost btn-sm" type="button" id="projectFilesDownload" hidden data-tip="Download the decrypted file">Download</button>
                </div>
              </div>
            </div>
          </div>
          <div className="files-resize" data-resize="n" data-tip="Resize"></div>
          <div className="files-resize" data-resize="s" data-tip="Resize"></div>
          <div className="files-resize" data-resize="e" data-tip="Resize"></div>
          <div className="files-resize" data-resize="w" data-tip="Resize"></div>
          <div className="files-resize files-resize-c" data-resize="ne" data-tip="Resize"></div>
          <div className="files-resize files-resize-c" data-resize="nw" data-tip="Resize"></div>
          <div className="files-resize files-resize-c" data-resize="se" data-tip="Resize"></div>
          <div className="files-resize files-resize-c" data-resize="sw" data-tip="Resize"></div>
          <span className="files-resize-grip" aria-hidden="true"></span>
        </div>
      </div>
      <div className="modal" id="confirmModal" hidden>
        <div className="modal-card confirm-card">
          <h2 id="confirmTitle">Delete</h2>
          <p className="page-sub" id="confirmBody"></p>
          <div className="modal-actions">
            <div className="modal-actions-end">
              <button className="btn btn-ghost" type="button" id="confirmCancel" data-tip="Keep this item">Cancel</button>
              <button className="btn btn-danger" type="button" id="confirmOk" data-tip="Remove permanently">Delete</button>
            </div>
          </div>
        </div>
      </div>
      <input type="file" id="photoFile" accept="image/*" hidden />
      <input type="file" id="attachFile" hidden multiple />
    </>
  );
}
