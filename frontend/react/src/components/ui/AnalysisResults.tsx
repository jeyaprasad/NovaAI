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
            <div className="cb-eo-grid">
              <div className="cb-eo-item">
                <span className="cb-eo-label">Scene Type</span>
                <span className="cb-eo-value">{result.scene_type || "Urban / Natural"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Resolution</span>
                <span className="cb-eo-value">{result.width && result.height ? `${result.width}x${result.height}` : "High"}</span>
              </div>
              <div className="cb-eo-item">
                <span className="cb-eo-label">Projection</span>
                <span className="cb-eo-value">{result.geo_metadata?.crs ? String(result.geo_metadata.crs) : "EPSG:4326"}</span>
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
            <div className="cb-eo-panel" style={{ height: 250, padding: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={result.classes}
                    dataKey="pct"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
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
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.85rem' }}/>
                </PieChart>
              </ResponsiveContainer>
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
              {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
            </summary>
            {showRaw && <pre>{JSON.stringify(result, null, 2)}</pre>}
          </details>
        </div>

      </div>
    </ErrorBoundary>
  );
});

AnalysisResults.displayName = "AnalysisResults";
