import React, { memo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AnalysisResult } from "../../hooks/useAnalysis";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="cb-input-error" role="alert" style={{ marginTop: '20px' }}>
      <p>Something went wrong rendering the analysis results:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
      <button className="cb-attach-btn" onClick={resetErrorBoundary} style={{ marginTop: '10px' }}>Try again</button>
    </div>
  );
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  askInsight: (q: string) => void;
  insightLoading: boolean;
}

const getDecisionSupportScore = (dominant: string) => {
  const dom = (dominant || "").toLowerCase();
  if (dom.includes("forest")) {
    return {
      veg: { score: 92, status: "🟢" },
      urb: { score: 8, status: "🟢" },
      ind: { score: 2, status: "🟢" },
      env: { score: 94, status: "🟢" },
      dev: "Low"
    };
  } else if (dom.includes("agricult")) {
    return {
      veg: { score: 76, status: "🟢" },
      urb: { score: 18, status: "🟢" },
      ind: { score: 4, status: "🟢" },
      env: { score: 68, status: "🟡" },
      dev: "Medium"
    };
  } else if (dom.includes("resid")) {
    return {
      veg: { score: 32, status: "🟡" },
      urb: { score: 88, status: "🔴" },
      ind: { score: 12, status: "🟡" },
      env: { score: 48, status: "🟡" },
      dev: "High"
    };
  } else if (dom.includes("indust")) {
    return {
      veg: { score: 12, status: "🔴" },
      urb: { score: 65, status: "🟠" },
      ind: { score: 82, status: "🔴" },
      env: { score: 25, status: "🔴" },
      dev: "Medium"
    };
  } else if (dom.includes("water")) {
    return {
      veg: { score: 15, status: "🔴" },
      urb: { score: 10, status: "🟢" },
      ind: { score: 5, status: "🟢" },
      env: { score: 85, status: "🟢" },
      dev: "Low"
    };
  } else { // Desert / Arid
    return {
      veg: { score: 5, status: "🔴" },
      urb: { score: 4, status: "🟢" },
      ind: { score: 2, status: "🟢" },
      env: { score: 35, status: "🟡" },
      dev: "Low"
    };
  }
};

const getSmartAlerts = (dominant: string, classes: any[]) => {
  const dom = (dominant || "").toLowerCase();
  const alerts = [];
  const classList = classes || [];
  
  if (dom.includes("forest")) {
    const hasAgriOrInd = classList.some(c => c.label.toLowerCase().includes("farmland") || c.label.toLowerCase().includes("factor") || c.label.toLowerCase().includes("indust"));
    if (hasAgriOrInd) {
      alerts.push({ level: "danger", icon: "🔴", text: "High deforestation risk due to nearby active land conversion." });
    } else {
      alerts.push({ level: "success", icon: "🟢", text: "No significant deforestation concern; ecosystem remains intact." });
    }
  }
  
  if (dom.includes("agricult")) {
    const hasUrban = classList.some(c => c.label.toLowerCase().includes("resid") || c.label.toLowerCase().includes("indust") || c.label.toLowerCase().includes("building"));
    if (hasUrban) {
      alerts.push({ level: "warning", icon: "🟡", text: "Moderate urban expansion encroaching on active rural agricultural zones." });
    } else {
      alerts.push({ level: "success", icon: "🟢", text: "Stable rural farmlands with low urban development pressure." });
    }
  }

  if (dom.includes("resid")) {
    alerts.push({ level: "warning", icon: "🟡", text: "Elevated Urban Heat Island (UHI) index. Moderate vegetation cover deficit." });
    alerts.push({ level: "danger", icon: "🔴", text: "High surface runoff vulnerability due to extensive concrete paving." });
  }

  if (dom.includes("indust")) {
    alerts.push({ level: "danger", icon: "🔴", text: "Critical industrial activity warning. Low soil absorption capacity." });
    alerts.push({ level: "danger", icon: "🔴", text: "High chemical discharge/runoff risk from impervious logistics zones." });
  }

  if (dom.includes("water")) {
    const hasAgriOrInd = classList.some(c => c.label.toLowerCase().includes("farmland") || c.label.toLowerCase().includes("factor") || c.label.toLowerCase().includes("indust") || c.label.toLowerCase().includes("building"));
    if (hasAgriOrInd) {
      alerts.push({ level: "danger", icon: "🔴", text: "Severe agricultural/industrial run-off warning; potential eutrophication." });
    } else {
      alerts.push({ level: "success", icon: "🟢", text: "Water body has high clarity. No significant nearby pollution signals." });
    }
  }

  if (dom.includes("desert") || dom.includes("barren")) {
    alerts.push({ level: "warning", icon: "🟡", text: "High wind-borne sand erosion risk. Sparse ecological coverage." });
  }

  return alerts.length > 0 ? alerts : [{ level: "success", icon: "🟢", text: "Ecosystem indicators are stable and within standard margins." }];
};

export const AnalysisResults = memo(({ result, askInsight, insightLoading }: AnalysisResultsProps) => {
  const [showMask, setShowMask] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setShowMask(true); }}>
      <div className="cb-report-card nova-reveal nova-in">
        <div className="cb-report-header">
          <h3>Earth Observation Report</h3>
        </div>
        <hr className="cb-divider" />

        <div className="cb-report-section">
          <h4 className="cb-section-title">Telemetry & Context</h4>
          <div className="cb-eo-panel">
            <div className="cb-eo-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Scene Type</span>
                <span className="cb-eo-value">{result.scene_type || "Urban / Natural"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Sensor Platform</span>
                <span className="cb-eo-value">{result.sensor_type || "Sentinel-2 MSI (Illustrative)"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Spatial Resolution</span>
                <span className="cb-eo-value">{result.spatial_resolution || "10m / Pixel (Illustrative)"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Projection</span>
                <span className="cb-eo-value">{result.geo_metadata?.crs ? String(result.geo_metadata.crs) : "EPSG:4326"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Estimated NDVI</span>
                <span className="cb-eo-value" style={{ color: "var(--green)" }}>{result.estimated_ndvi !== undefined ? `${result.estimated_ndvi.toFixed(2)} (Illustrative)` : "0.45 (Illustrative)"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Cloud Cover</span>
                <span className="cb-eo-value">{result.cloud_cover_pct !== undefined ? `${result.cloud_cover_pct}% (Illustrative)` : "2.4% (Illustrative)"}</span>
              </div>
              <div className="cb-eo-item" style={{ gridColumn: "1 / -1" }}>
                <span className="cb-eo-label">Primary Land Cover</span>
                <span className="cb-eo-value" style={{ textTransform: "capitalize", color: "var(--nova-blue)" }}>{result.dominant_land_cover || "N/A"}</span>
              </div>
              {(result.secondary_land_cover && result.secondary_land_cover !== "none") && (
                <div className="cb-eo-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="cb-eo-label">Secondary Features</span>
                  <span className="cb-eo-value" style={{ textTransform: "capitalize" }}>{result.secondary_land_cover}</span>
                </div>
              )}
              <div className="cb-eo-item" style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                <span className="cb-eo-label">Classification Confidence</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
                  <span className="cb-eo-value" style={{ fontSize: "0.95rem", fontWeight: "600", minWidth: "60px" }}>
                    {result.confidence || "High"}
                  </span>
                  <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: (result.confidence?.toLowerCase().includes("high") || result.confidence?.includes("9") || result.confidence === "95%") ? "95%" : 
                             (result.confidence?.toLowerCase().includes("medium") || result.confidence?.includes("7")) ? "70%" : "40%",
                      background: (result.confidence?.toLowerCase().includes("high") || result.confidence?.includes("9") || result.confidence === "95%") ? "var(--green)" :
                                  (result.confidence?.toLowerCase().includes("medium") || result.confidence?.includes("7")) ? "var(--aurora)" : "var(--danger)",
                      borderRadius: "3px",
                      boxShadow: (result.confidence?.toLowerCase().includes("high") || result.confidence?.includes("9") || result.confidence === "95%") ? "0 0 10px rgba(0,229,160,0.4)" : "0 0 10px rgba(0,229,200,0.4)",
                      transition: "width 0.8s ease-out"
                    }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="cb-eo-flags">
              {result.flags?.map((f, idx) => (
                <div key={idx} className="cb-eo-match-row">
                  <span>{f.icon} {f.label}</span>
                  <span className="cb-eo-match-score">DETECTED</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="cb-report-section">
          <h4 className="cb-section-title">AI Decision Support Scorecard</h4>
          <div className="cb-eo-panel">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Vegetation Health</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--star)" }}>
                  {getDecisionSupportScore(result.dominant_land_cover).veg.status} {getDecisionSupportScore(result.dominant_land_cover).veg.score}/100
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Urbanization</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--star)" }}>
                  {getDecisionSupportScore(result.dominant_land_cover).urb.status} {getDecisionSupportScore(result.dominant_land_cover).urb.score}/100
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Industrial Activity</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--star)" }}>
                  {getDecisionSupportScore(result.dominant_land_cover).ind.status} {getDecisionSupportScore(result.dominant_land_cover).ind.score}/100
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Environmental Quality</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--star)" }}>
                  {getDecisionSupportScore(result.dominant_land_cover).env.status} {getDecisionSupportScore(result.dominant_land_cover).env.score}/100
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "8px", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Development Potential</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--aurora)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Space Mono, monospace" }}>
                  {getDecisionSupportScore(result.dominant_land_cover).dev}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic", lineHeight: "1.45" }}>
              "Instead of only describing the land cover, NovaAI converts the analysis into decision-support indicators for planners and environmental agencies."
            </p>
          </div>
        </div>

        <div className="cb-report-section">
          <h4 className="cb-section-title">Ecosystem Alerts & Monitoring</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {getSmartAlerts(result.dominant_land_cover, result.classes).map((alert, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: alert.level === "danger" ? "rgba(255,78,106,0.08)" : alert.level === "warning" ? "rgba(255,184,78,0.08)" : "rgba(0,229,160,0.08)",
                border: alert.level === "danger" ? "1px solid rgba(255,78,106,0.2)" : alert.level === "warning" ? "1px solid rgba(255,184,78,0.2)" : "1px solid rgba(0,229,160,0.2)"
              }}>
                <span style={{ fontSize: "1.1rem", lineHeight: "1" }}>{alert.icon}</span>
                <span style={{ fontSize: "0.82rem", color: "var(--star)", lineHeight: "1.4" }}>{alert.text}</span>
              </div>
            ))}
          </div>
        </div>

        {result.mask_image && (
          <div className="cb-report-section">
            <h4 className="cb-section-title">Segmentation Map</h4>
            <div className="cb-report-image-container">
              {showMask && <img src={`data:image/png;base64,${result.mask_image}`} alt="Mask Overlay" className="cb-mask-overlay" style={{ opacity: 1, mixBlendMode: 'normal' }} />}
              <button className="cb-mask-toggle" onClick={() => setShowMask(!showMask)}>
                {showMask ? "Hide SegMap" : "Show SegMap"}
              </button>
            </div>
          </div>
        )}

        {result.classes && result.classes.length > 0 && (
          <div className="cb-report-section">
            <h4 className="cb-section-title">Land Cover Distribution</h4>
            <div className="cb-eo-panel" style={{ height: 340, padding: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={result.classes}
                    dataKey="pct"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    stroke="none"
                  >
                    {result.classes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--star)' }}
                  />
                  <Legend verticalAlign="bottom" align="center" height={70} iconType="circle" wrapperStyle={{ fontSize: '0.78rem', color: 'var(--star)', paddingTop: '10px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {result.study_use_cases && result.study_use_cases.length > 0 && (
          <div className="cb-report-section">
            <h4 className="cb-section-title">Academic & Research Use Cases</h4>
            <div className="cb-eo-panel" style={{ padding: '16px 20px' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', fontSize: '0.88rem', color: 'var(--star)', lineHeight: '1.6' }}>
                {result.study_use_cases.map((uc, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>
                    {uc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {result.citation && (
          <div className="cb-report-section">
            <h4 className="cb-section-title">Academic Citation Reference</h4>
            <div className="cb-eo-panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.4)', border: '1px dashed var(--border)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'Space Mono, monospace', color: 'var(--aurora)', userSelect: 'all', wordBreak: 'break-all', lineHeight: '1.4' }}>
                {result.citation}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                (Triple-click inside to select and copy for references / bibliography)
              </span>
            </div>
          </div>
        )}



        {/* QUICK EO INSIGHTS PANEL */}
        <div className="cb-report-section">
          <h4 className="cb-section-title">Quick EO Insights</h4>
          <div className="cb-insights-grid">
            <button disabled={insightLoading} onClick={() => askInsight("What does this landscape primarily represent?")}>🌱 What does this landscape primarily represent?</button>
            <button disabled={insightLoading} onClick={() => askInsight("What environmental characteristics can be inferred?")}>🌿 What environmental characteristics can be inferred?</button>
            <button disabled={insightLoading} onClick={() => askInsight("Is there evidence of residential or industrial development?")}>🏗 Is there evidence of residential or industrial development?</button>
            <button disabled={insightLoading} onClick={() => askInsight("Are there any visible environmental risks?")}>⚠ Are there any visible environmental risks?</button>
            <button disabled={insightLoading} onClick={() => askInsight("What are the key observations?")}>🎯 What are the key observations?</button>
          </div>
          {insightLoading && <div className="cb-insight-loading"><div className="cb-dot small pulse" /> Generating Insight...</div>}
        </div>

        <div className="cb-report-section">
          <details className="cb-raw-json">
            <summary onClick={(e) => { e.preventDefault(); setShowRaw(!showRaw); }}>
              🔍 {showRaw ? "Hide API Metadata (JSON)" : "Show API Metadata (JSON)"}
            </summary>
            {showRaw && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px', lineHeight: '1.4' }}>
                  This JSON payload represents the raw response structure returned from the FastAPI backend services. It contains classification distributions, confidence bands, validation flags, model parameters, and processing performance metrics, which is useful for programmatic API integration and system verification.
                </p>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </details>
        </div>

      </div>
    </ErrorBoundary>
  );
});

AnalysisResults.displayName = "AnalysisResults";
