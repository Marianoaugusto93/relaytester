/**
 * TccTool.jsx — Time-Current Characteristic (TCC) analysis tool
 *
 * Displays protection device curves, allows curve selection and comparison,
 * calculates trip times for given currents.
 */

import { useState, useEffect } from "react";
import {
  CURVE_TYPES,
  calcTripTime,
  generateTccCurve,
  getCurveGroups,
} from "../engine/tcc.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";
import TccExportButton from "../components/TccExportButton.jsx";

export default function TccTool() {
  const bus = useArtifactBus();

  const [Ipickup, setIpickup] = useState(5.0);
  const [selectedCurves, setSelectedCurves] = useState([
    CURVE_TYPES.IEC_VERY_INVERSE,
  ]);
  const [timeDial, setTimeDial] = useState(0.5);
  const [queryI, setQueryI] = useState(20);
  const [queryResult, setQueryResult] = useState(null);
  const [curveData, setCurveData] = useState({});

  const curveGroups = getCurveGroups();

  // Generate curves whenever pickup, timeDial, or selection changes
  useEffect(() => {
    const newData = {};
    selectedCurves.forEach((curve) => {
      newData[curve] = generateTccCurve(Ipickup, curve, timeDial, 1.0, 100.0);
    });
    setCurveData(newData);
  }, [Ipickup, selectedCurves, timeDial]);

  const handleAddCurve = (curveId) => {
    if (!selectedCurves.includes(curveId)) {
      setSelectedCurves([...selectedCurves, curveId]);
    }
  };

  const handleRemoveCurve = (curveId) => {
    setSelectedCurves(selectedCurves.filter((c) => c !== curveId));
  };

  const handleQueryTripTime = () => {
    if (selectedCurves.length === 0) {
      setQueryResult({ error: "Select at least one curve" });
      return;
    }

    const results = {};
    selectedCurves.forEach((curve) => {
      const t = calcTripTime(queryI, Ipickup, curve, timeDial);
      results[curve] = isFinite(t) ? t.toFixed(4) : "∞";
    });

    setQueryResult({ current: queryI, results });

    // Publish result
    bus.publish("tcc.result", {
      Ipickup,
      curve: selectedCurves[0],
      timeDial,
      queryI,
      results,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>TCC — Time-Current Characteristic</div>

      {/* Parameters section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Parâmetros</div>

        <div style={styles.field}>
          <label style={styles.label}>Corrente de Pickup (A)</label>
          <input
            type="number"
            value={Ipickup}
            onChange={(e) => setIpickup(parseFloat(e.target.value) || 5.0)}
            step={0.5}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Time Dial (0.1 - 10.0)</label>
          <input
            type="number"
            value={timeDial}
            onChange={(e) => setTimeDial(parseFloat(e.target.value) || 0.5)}
            step={0.1}
            min={0.1}
            max={10}
            style={styles.input}
          />
        </div>
      </div>

      {/* Curve selection */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Selecionar Curvas</div>

        {Object.entries(curveGroups).map(([family, curves]) => (
          <div key={family} style={styles.familyGroup}>
            <div style={styles.familyName}>{curves[0]?.family}</div>
            <div style={styles.curveButtonGrid}>
              {curves.map((c) => (
                <button
                  key={c.id}
                  style={{
                    ...styles.curveBtn,
                    ...(selectedCurves.includes(c.id)
                      ? styles.curveBtnActive
                      : {}),
                  }}
                  onClick={() =>
                    selectedCurves.includes(c.id)
                      ? handleRemoveCurve(c.id)
                      : handleAddCurve(c.id)
                  }
                >
                  {c.label.split(" ").pop()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* TCC Graph */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Gráfico TCC (Log-Log)</div>
        <svg
          style={styles.graph}
          viewBox="0 0 500 400"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a1a2e" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="500" height="400" fill="var(--card2)" />
          <rect width="500" height="400" fill="url(#grid)" />

          {/* Axes */}
          <line x1="40" y1="360" x2="480" y2="360" stroke="var(--tx3)" strokeWidth="1" />
          <line x1="40" y1="360" x2="40" y2="20" stroke="var(--tx3)" strokeWidth="1" />

          {/* Axis labels */}
          <text x="470" y="380" fontSize="10" fill="var(--tx3)">
            Current (A)
          </text>
          <text x="10" y="30" fontSize="10" fill="var(--tx3)">
            Time (s)
          </text>

          {/* Pickup threshold line */}
          <line
            x1="50"
            y1="360"
            x2="50"
            y2="350"
            stroke="var(--tx3)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <text x="45" y="370" fontSize="9" fill="var(--tx3)">
            {Ipickup}A
          </text>

          {/* Curve lines */}
          {selectedCurves.map((curve, idx) => {
            const points = curveData[curve] || [];
            if (points.length < 2) return null;

            const color = [
              "var(--cyan)",
              "#22c55e",
              "#f97316",
              "#8b5cf6",
              "#ec4899",
            ][idx % 5];

            // Convert data to SVG coordinates (log scale)
            const pathData = points
              .map(([I, t], i) => {
                const logI = Math.log(I / Ipickup) / Math.log(10); // log relative to pickup
                const logT = Math.log(t + 0.01) / Math.log(10);

                // Map to SVG coordinates (simple linear mapping)
                const x = 50 + (logI + 1) * 80; // Normalize roughly 0.1x to 10x
                const y = 360 - (logT + 2) * 30; // Normalize roughly 0.01s to 100s

                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={curve}>
                <path d={pathData} stroke={color} strokeWidth="2" fill="none" />
              </g>
            );
          })}
        </svg>

        {selectedCurves.length > 0 && (
          <div style={styles.legend}>
            {selectedCurves.map((curve, idx) => (
              <div key={curve} style={styles.legendItem}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: [
                      "var(--cyan)",
                      "#22c55e",
                      "#f97316",
                      "#8b5cf6",
                      "#ec4899",
                    ][idx % 5],
                    borderRadius: 2,
                  }}
                />
                <span style={styles.legendLabel}>{curve}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Consultar Tempo de Trip</div>

        <div style={styles.field}>
          <label style={styles.label}>Corrente (A)</label>
          <input
            type="number"
            value={queryI}
            onChange={(e) => setQueryI(parseFloat(e.target.value) || 20)}
            step={1}
            style={styles.input}
          />
        </div>

        <button style={styles.queryBtn} onClick={handleQueryTripTime}>
          Calcular Trip Time
        </button>

        {queryResult && !queryResult.error && (
          <div style={styles.resultBox}>
            <div style={styles.resultLine}>
              Corrente: <strong>{queryResult.current} A</strong>
            </div>
            {Object.entries(queryResult.results).map(([curve, time]) => (
              <div key={curve} style={styles.resultLine}>
                {curve}: <strong>{time} s</strong>
              </div>
            ))}
          </div>
        )}

        {queryResult && queryResult.error && (
          <div style={{ ...styles.resultBox, ...styles.errorBox }}>
            {queryResult.error}
          </div>
        )}

        {queryResult && !queryResult.error && selectedCurves.length > 0 && (
          <TccExportButton
            tccData={curveData}
            curve={selectedCurves[0]}
            timeDial={timeDial}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    padding: "20px",
    background: "var(--card)",
    borderRadius: 10,
    maxWidth: 640,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid var(--bdr)",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx3)",
    marginBottom: 4,
    fontFamily: "var(--fm)",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
  },
  familyGroup: {
    marginBottom: 12,
  },
  familyName: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    marginBottom: 6,
    fontStyle: "italic",
  },
  curveButtonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 6,
  },
  curveBtn: {
    padding: "6px 10px",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card2)",
    color: "var(--tx3)",
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "var(--fm)",
    cursor: "pointer",
    transition: "all .2s",
  },
  curveBtnActive: {
    background: "rgba(14,165,233,0.15)",
    borderColor: "var(--cyan)",
    color: "var(--cyan)",
  },
  graph: {
    width: "100%",
    height: 280,
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    marginTop: 10,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    fontSize: 10,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legendLabel: {
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  queryBtn: {
    width: "100%",
    padding: "8px",
    marginTop: 12,
    border: "1px solid var(--cyan)",
    borderRadius: 6,
    background: "rgba(14,165,233,0.08)",
    color: "var(--cyan)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .2s",
  },
  resultBox: {
    marginTop: 12,
    padding: 10,
    background: "rgba(34,197,94,0.08)",
    borderLeft: "3px solid #22c55e",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)",
    borderLeftColor: "#ef4444",
    color: "#ef4444",
  },
  resultLine: {
    marginBottom: 4,
    fontFamily: "var(--fm)",
  },
};
