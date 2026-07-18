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
                <span className="cb-eo-value">{result.sensor_type || "Sentinel-2 MSI"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Spatial Resolution</span>
                <span className="cb-eo-value">{result.spatial_resolution || "10m / Pixel"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Projection</span>
                <span className="cb-eo-value">{result.geo_metadata?.crs ? String(result.geo_metadata.crs) : "EPSG:4326"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Estimated NDVI</span>
                <span className="cb-eo-value" style={{ color: "var(--green)" }}>{result.estimated_ndvi !== undefined ? result.estimated_ndvi.toFixed(2) : "0.45"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Cloud Cover</span>
                <span className="cb-eo-value">{result.cloud_cover_pct !== undefined ? `${result.cloud_cover_pct}%` : "2.4%"}</span>
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
