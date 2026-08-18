# DESIGN.md — Flow (Project Management App)

Dark visual contract, taken from the MedVault analytics screenshot. Every screen should
follow these tokens. The light hairline system in the original Flow spec is retired.

## Color tokens

Two separate color systems. Never cross them.

**Surfaces**
| Token | Hex | Use |
|---|---|---|
| `page` | `#0B0E14` | app background |
| `surface` | `#161B22` | cards, panels, top bar |
| `surface-raised` | `#1C232C` | inputs, segmented track, hover |
| `border` | `#1E2630` | hairline on cards and inputs |
| `text-primary` | `#F4F7FB` | titles, KPI values, nav |
| `text-secondary` | `#8B9BB4` | subtitles, axis labels, captions |
| `text-muted` | `#6B7A90` | placeholders, inactive nav |

**Primary accent** (active chrome — nav pill, filled filters, consumption/completed series)
| Token | Hex | Wash | On-accent |
|---|---|---|---|
| `accent` | `#00D1D1` | `#083536` | `#062424` |

**Project identity** (which project — dots, calendar tags, Gantt bars). Do not use red/green here.
| Token | Hex | Wash | Text-on-wash |
|---|---|---|---|
| `project-teal` | `#00D1D1` | `#083536` | `#7EF0F0` |
| `project-purple` | `#A855F7` | `#2A1644` | `#E9D5FF` |
| `project-amber` | `#F59E0B` | `#3A2A0A` | `#FDE68A` |

**Semantic status** (urgency/state — trends, alerts, priority)
| Token | Hex | Wash | Text-on-wash |
|---|---|---|---|
| `success` | `#10B981` | `#0B2F24` | `#6EE7B7` |
| `danger` | `#EF4444` | `#3A1518` | `#FECACA` |
| `warning` | `#F59E0B` | `#3A2A0A` | `#FDE68A` |
| `series-2` | `#A855F7` | `#2A1644` | `#E9D5FF` |

**Rule:** project color answers “which project.” Status color answers “urgency or state.” A component is never colored by both systems at once.

## Typography
- Font: Inter. Weights 400, 500, 600, 700. KPI values and page titles use 600/700.
- KPI labels: 10–11px, uppercase, letter-spacing ~0.08em, `text-secondary`.
- Page title: ~22px / 700. Subtitle: 13px `text-secondary`.
- Nav: 13px / 500. Body: 13px. Captions: 11–12px.

## Spacing & radius
- Top bar height: 56px.
- Left sidebar: 220–240px.
- Right rail: 272–300px.
- Card radius: 12px. Control / pill radius: 8px (pills may read more capsule-like to match the screenshot).
- KPI card padding: 14–16px. Control height: 28–32px.
- Inline task pane: ~260–280px tall under the board.

## Elevation
- Depth comes from `surface` on `page`, not drop shadows on in-flow cards.
- Soft teal glow is allowed on the active nav pill and on chart series.
- One popover shadow if a menu is needed: `0 12px 40px rgba(0,0,0,0.45)`.

## Chrome
Dense three-column PM shell (left nav + center board/detail + right analytics). Clean MedVault surfaces and teal accent — not bronze, not serif titles, not decorative flourishes.

- **Top bar:** brand mark + Flow (left), large centered search (“Search projects, tasks, people…” + Ctrl+K), utilities (filled + New, bell with numeric badge, settings, avatar).
- **Left sidebar:** primary nav — Dashboard, Projects, Tasks, Calendar, Gantt, Reports, Settings. Then a PROJECTS list with identity-colored dots (teal / purple / amber) and Flow project names. Optional “N tasks due today” card. User row pinned at the bottom.
- **Active nav:** teal fill pill + `on-accent` text, optional glow. Inactive = `text-secondary`.
- **Center:** project header (title, In Progress status pill, date range, owner) + view toggle Kanban / List / Calendar / Gantt. Default view is the Kanban board (To do, In progress, In review, Done). Filter row under the toggle (Assignees, Status, Priority, Tags, Date range).
- **Task pane:** same center column, below the board. Left: status, description, assignee, dates, time tracking (estimated vs actual + progress bar), outline tags. Right: tabs Subtasks / Comments / Attachments / History, comment composer at the bottom.
- **Right rail:** project overview (progress ring + task counts), status donut, upcoming deadlines, team avatars + Manage team.
- **Filter pills:** inactive = teal outline on transparent; active = solid teal fill + dark text.

## Auth (login / signup)

Full-page gate before the command center. Same tokens — no second brand.

- **Layout:** split screen. Left: brand mark + one-line product promise on `page` with a faint teal radial wash. Right: centered form card (`max-width` ~380px).
- **Sign in:** email, password, remember me, forgot password, primary **Sign in**, ghost **Continue with Google**, link to create account.
- **Create account:** full name, work email, password, workspace name, primary **Create workspace**, link back to sign in.
- **Reset password:** email + send link, back to sign in.
- Inputs: 36px, `surface` fill, `border`, 8px radius, teal focus ring (`0 0 0 3px` accent at 12% opacity).
- After Sign in, hide the gate and show the app. Sign out from Settings and the top-bar avatar returns to Sign in.
- One admin account: username `admin` (or `admin@flowvanti.app`). Password is stored as a salted SHA-256 hash.

## Component anatomy

**KPI card** — `surface` fill, 12px radius, icon tile top-left, trend pill top-right, uppercase label, large value.

**Area chart** — dashed horizontal grid, smooth teal + purple series, faint gradient fill, glow on strokes.

**Bar chart** — amber (and optional teal) rounded bars for monthly throughput.

**Alert row** — danger wash background, red icon circle, title + “Critical / Blocked / Overdue” subtitle.

**Kanban card** — `surface`, 1px `border`, 12px radius, 8–10px padding. Title, optional subtask progress bar, footer with status/priority pill (semantic, fully rounded) + assignee avatar. Blocked/urgent cards get a **2px `danger` border** (not accent). Selected card (task drawer open) gets a 2px `accent` border.

**Task list** — table on `surface`, 12px cells, project **dot** (identity) + title, status/priority pills (semantic), due date, avatar. No project-colored pills.

**Gantt bar** — 18px tall, project-family wash + solid border (teal / purple / amber). Today = 1px vertical `danger` line across the grid.

**Calendar cell** — 1px `border` grid on `page`. Date top-left. Task chips are fully rounded pills in **project** color (which project), not status color.

**Task pane** — inline under the board (not a floating overlay). Split: details (status, description, assignee, dates, estimated vs actual + bar) | tabs (Subtasks, Comments, Attachments, History) with comment composer. Does not use project hue on status controls. Selecting a card updates this pane and applies a 2px `accent` border on the card.

**Trend pills** are context-aware: color answers “is this good,” not “did the number go up.” Rising overdue = danger; falling cycle time = success.

## Icons
Tabler outline (`@tabler/icons-react` / `ti-*`). 16px inline, 18–20px in KPI tiles. Icon color inherits text color except inside a colored tile or alert circle.

## Reference
- Visual source: MedVault inventory analytics screenshot (dark navy, teal accent).
- Pixel reference: `dashboard.html` (left nav + Kanban/List/Calendar/Gantt + inline task pane + right analytics).
- Hover: `[data-tip]` shows a floating detail tooltip (people, metrics, why a color is used, where a click goes). Click-throughs: KPIs and overview counts open the related view; names/avatars explain the person; dates open Calendar; notifications and + New are menus of links; attachments are labeled file links.
- Nav active pill: 8px radius. Filter pills: teal outline / teal fill. Status/trend pills: fully rounded (`999px`).
