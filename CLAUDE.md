# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

On Windows, `run.bat` (as Administrator) opens the browser and starts `npm run dev` automatically.

There is no test suite and no linter configured.

## Architecture

This is a single-page React 18 app (Vite + JSX, no TypeScript) that simulates a **protection relay test bench** — a training/educational tool for relay commissioning.

### Source files (`src/`)

| File | Role |
|---|---|
| `main.jsx` | React entry point, mounts `<App>` |
| `App.jsx` | Root component — all global state, protection engine, simulation loop |
| `CampoPage.jsx` | "Campo" tab — physical wiring simulator (suitcase ↔ switch ↔ terminal block) |
| `PainelPage.jsx` | "Painel" tab — circuit breaker, command diagram (ladder), single-line diagram |
| `comtrade.js` | Pure function: generates IEEE C37.111-1999 COMTRADE files from a trip record |

### Data flow

```
App.jsx (global state)
  ├── phasors (Ia/Ib/Ic/Va/Vb/Vc magnitude+angle — what the test suitcase injects)
  ├── protections (relay settings: 50/51/50N/51N/67/67N/27/59/47)
  ├── system (TC ratio, TP ratio)
  ├── relayMatrix (Output Matrix: which relay stages activate which BOs/LEDs)
  ├── inMatrix (Input Matrix: which binary inputs signal CB feedback)
  │
  ├── CampoPage → reports fieldState {connections, internalConns}
  │     electricalGraph (Union-Find) resolves which terminals share a node
  │     computeRelayReadings() maps suitcase outputs → relay sensor readings
  │     checkMaletaTripDetection() checks BO→borne→BI chain for trip detection
  │
  ├── PainelPage → reports bkState / springLoaded / tripLatch
  │
  └── Protection engine (App.jsx) runs on every phasor/setting change:
        evaluates each enabled stage, computes trip time, fires relayTrip signal
        → opens breaker via PainelPage, records tripHistory, generates COMTRADE
```

### Electrical simulation (`CampoPage.jsx`)

The field wiring panel uses a **Union-Find graph** (`buildElectricalGraph`) to determine electrical connectivity between terminals. Terminal IDs follow a naming convention:

- `ia1_top` / `ia1_bot` — top/bottom banana connectors on the calibration switch (phase A, pole 1)
- `i1_pos` / `i1_neg` — red/black jacks on the test suitcase (current output I1)
- `v1_pos` / `v1_neg` — voltage output jacks
- `bi1_pos` / `bi1_neg` — binary input jacks
- `bo1_pos` / `bo1_neg` — binary output jacks
- `tb_N_top` / `tb_N_bottom` — terminal block module N (top/bottom openings, always internally shorted)

The switch (`CHAVE_POLES`) has 10 poles grouped by phase (ia, ib, ic, va, vb, vc, terra). Current groups have two poles each (phase + return T). In the UP (closed) position each pole passes current through; in DOWN position the two S1/S2 banana jacks are shorted together (safe state for injecting).

`validateConnection()` enforces wiring rules — current terminals cannot connect to voltage terminals, analog cannot go to the terminal block, and the lower side of the switch (`switch_bot`) cannot be connected at all.

### Protection engine (`App.jsx`)

Implements ANSI/IEC protection functions:
- **50/50N** — instantaneous overcurrent (phase / neutral 3I0) with ±20 ms / 5% tolerance simulation
- **51/51N** — time-overcurrent with IEC, US, IEEE, ANSI, and Definite-Time curves
- **67/67N** — directional (phase/neutral) using MTA angle and polarizing voltage
- **27/59** — under/overvoltage with hysteresis and low-voltage block
- **47** — negative-sequence voltage

`CURVE_MAP` holds the mathematical coefficients; `CURVE_ALIASES` provides backward compatibility with older save files.

### COMTRADE export (`comtrade.js`)

`generateComtrade(record)` returns `{cfg, dat, hdr}` strings following IEEE C37.111-1999 (ASCII format, 960 samples/s, 8 analog channels: IA/IB/IC/IGS/VA/VB/VC/VN). The trip event is anchored at the 500 ms pre-trigger point. The file is packaged as a ZIP by `App.jsx` using `jszip`.

### Styling

All CSS is written as template-literal strings inside each component (`campoCSS` in CampoPage, `S` in PainelPage). There is no global stylesheet or CSS framework. CSS custom properties (`--card`, `--bdr`, `--tx`, `--mint`, etc.) are defined in App.jsx and injected via a `<style>` tag on the root element.

### State persistence

App state (phasors, protections, system parameters, matrix, trip history) is saved/loaded as JSON via the browser's `<input type="file">` / `URL.createObjectURL` pattern — no backend, no localStorage.
