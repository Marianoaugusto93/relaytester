# Backup Strategy — RelayLab 360

## Overview

RelayLab 360 is a client-side single-page application with no server-side database. All persistent data lives in the browser's `localStorage` and in the Git repository. This document defines the backup procedures, recovery objectives, and responsibilities for each data domain.

---

## Recovery Objectives

| Data Domain | RTO | RPO | Notes |
|-------------|-----|-----|-------|
| Application source code | < 5 min | 0 (real-time) | Git history + Cloudflare Pages cache |
| User configuration files (`.txt`) | < 1 min | At export time | User is responsible for saving files |
| Custom scenarios (localStorage) | < 5 min | At export time | Export JSON before clearing browser data |
| Trip history / COMTRADE files | < 1 min | At download time | User downloads `.zip` at end of each session |
| Analytics data (localStorage) | Non-critical | N/A | Regenerated naturally from usage |

**RTO** = Recovery Time Objective (how quickly the system is usable again after a loss event).  
**RPO** = Recovery Point Objective (maximum acceptable data loss window).

---

## Backup Procedures

### 1. Source Code — Git + Cloudflare Pages

The canonical backup is the Git repository on GitHub.

```bash
# Verify no uncommitted changes before closing a session
git status

# Push all commits to remote (triggers automatic Cloudflare deploy)
git push origin master
```

- Cloudflare Pages retains the last 25 deployments. A previous build can be promoted in < 30 seconds from the Cloudflare dashboard.
- GitHub repository history provides full change log and point-in-time recovery.

**Frequency:** Every completed feature or fix (at minimum, daily during active development).

---

### 2. User Configuration Files

Users save relay configuration (phasors, protection settings, matrices) via the **💾 Save** button, which writes a `.txt` file to the local filesystem.

**Recommendation for users:**
- Save to a dedicated project folder (e.g., `~/Ensaios/RelayLab/`).
- Include date in filename: `config_2026-05-20_relay51.txt`.
- Back up the folder to cloud storage (OneDrive, Google Drive) after each session.

**Recovery:** Load the `.txt` file via the **📂 Load** button — configuration is restored instantly.

---

### 3. Custom Scenarios — localStorage Export

Custom scenarios are stored in `localStorage` under key `relaytester_custom_scenarios`. This storage is tied to the browser profile and is lost if the browser data is cleared.

**Export procedure (before clearing browser data or switching machines):**
1. Open the **Scenarios** sidebar in the RELÉ tab.
2. Click **Exportar** on each custom scenario, or use the batch export if available.
3. Save the resulting `.json` files to a safe location.

**Import procedure:**
1. Click **Carregar .json** in the Scenarios sidebar.
2. Select the previously exported `.json` file.

**Frequency:** After creating or editing any custom scenario.

---

### 4. COMTRADE Trip Records

COMTRADE files are generated on-demand after a trip and packaged as `.zip` archives. They are not persisted between sessions.

**Procedure:**
1. After a successful trip, open the waveform modal (📊 button in the top bar).
2. Select the trip record from the list.
3. Click **Download ZIP** — save to `~/Ensaios/RelayLab/COMTRADE/`.

**Recovery:** COMTRADE files cannot be regenerated after the browser session ends. Download immediately after each trip of interest.

---

## Disaster Recovery Scenarios

### Scenario A — Developer machine lost / formatted

1. `git clone https://github.com/Marianoaugusto93/relaytester.git`
2. `npm install && npm run dev`
3. Restore user config files from cloud backup.

**Time to recover:** < 10 minutes.

---

### Scenario B — Cloudflare deployment failure

1. Go to **dash.cloudflare.com → Workers & Pages → relaytester → Deployments**.
2. Find the last successful deployment and click **Rollback**.
3. If rollback is unavailable, trigger a new deploy: `git commit --allow-empty -m "chore: re-trigger deploy" && git push`.

**Time to recover:** < 5 minutes.

---

### Scenario C — Browser localStorage cleared

1. Import custom scenarios from previously exported `.json` files.
2. Analytics data resets — this is non-critical and regenerates with usage.
3. Reload saved configuration `.txt` files via the Load button.

**Time to recover:** < 5 minutes (assuming exports were made).

---

### Scenario D — npm package corruption

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Time to recover:** < 3 minutes (depends on network speed).

---

## Responsibilities

| Role | Responsibility |
|------|---------------|
| Developer | Commit and push code regularly; tag releases before deploy |
| Developer | Keep `npm run build` passing before every push |
| User | Export custom scenarios before clearing browser data |
| User | Download COMTRADE `.zip` files at end of each session |
| User | Save relay configuration `.txt` files to a backed-up folder |

---

## Checklist — Before Closing a Session

- [ ] All code changes committed and pushed (`git push origin master`)
- [ ] Custom scenarios exported to `.json` if modified
- [ ] COMTRADE files downloaded for any trips of interest
- [ ] Relay configuration saved as `.txt` if settings changed
- [ ] `npm run build` passes with zero errors
