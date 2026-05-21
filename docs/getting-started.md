# Getting Started with RelayLab 360

A 3-step guide to run your first protection relay test.

---

## Step 1 — Open the application

Navigate to [relaytester.augustocesar-mariano.workers.dev](https://relaytester.augustocesar-mariano.workers.dev/) in a modern browser (Chrome 90+ or Edge 90+ recommended for full File System Access API support).

On first visit the interactive tutorial launches automatically. You can skip it with **ESC** or revisit it via the **(?)** help button in the top bar.

---

## Step 2 — Select a test scenario

1. Click the **RELÉ** tab in the navigation bar.
2. In the **Scenarios** panel on the left, pick one of the preset scenarios:
   - **3-Ph Fault** — symmetrical three-phase short circuit
   - **L-G Fault** — single line-to-ground fault (A phase)
   - **L-L Fault** — line-to-line fault (A-B phases)
   - **Inrush** — transformer energization transient
   - **Undervolt** — voltage depression (27 function)
   - **Underfreq** — underfrequency event (81U function)
   - **Directional** — directional overcurrent (67 function)
3. The injection phasors and protection settings load automatically.

---

## Step 3 — Run the injection and verify the trip

1. Click **[▶ Injetar]** in the controls bar at the bottom.
2. Watch the **ReGrid Pro 1000** panel on the right:
   - **MENS.** tab shows live current and voltage measurements.
   - **PROT.** tab shows each function's status (EN / TRIP).
   - **EVENTOS** tab logs the trip event with timestamp.
3. The **TRIP timer** in the controls bar shows elapsed time; it freezes when the protection actuates.
4. Click **[↺ Reset Fault]** to clear the trip and prepare for the next test.

---

## Next steps

- **CAMPO tab** — wire the virtual test suitcase to the relay using the Union-Find electrical graph.
- **PAINEL tab** — observe the circuit breaker command diagram (ladder) and single-line diagram animate during a trip.
- **Custom scenarios** — click **+ Novo cenário** in the Scenarios sidebar to build your own test case.
- **COMTRADE export** — after a trip, open the waveform modal (📊) and download the `.zip` file.
- **Help topics** — press **(?)** for reference on Wiring Basics, Phasors 101, Protection Settings, and more.
