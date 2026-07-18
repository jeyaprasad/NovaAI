import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAnalysis } from "../hooks/useAnalysis";
import { ChatInterface } from "../components/ui/ChatInterface";
import { InteractiveMap } from "../components/ui/InteractiveMap";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend, ResponsiveContainer } from "recharts";
import "./aichat.css";

const COMPARE_DATABASE = [
  {
    name: "Western Ghats Region",
    category: "Forest",
    forest: 88,
    industry: 2,
    residential: 3,
    water: 5,
    agriculture: 2,
    ndvi: 0.78,
    cloud: 1.8,
    scene: "Natural / Vegetation",
    env: 94,
    urb: 8,
    dev: "Low"
  },
  {
    name: "Anaimalai Tiger Reserve",
    category: "Forest",
    forest: 92,
    industry: 1,
    residential: 1,
    water: 4,
    agriculture: 2,
    ndvi: 0.82,
    cloud: 1.5,
    scene: "Natural / Vegetation",
    env: 96,
    urb: 2,
    dev: "Low"
  },
  {
    name: "Sathyamangalam Wildlife",
    category: "Forest",
    forest: 85,
    industry: 3,
    residential: 2,
    water: 4,
    agriculture: 6,
    ndvi: 0.72,
    cloud: 2.1,
    scene: "Natural / Vegetation",
    env: 91,
    urb: 5,
    dev: "Low"
  },
  {
    name: "Hosur Industrial Hub",
    category: "Industrial",
    forest: 6,
    industry: 68,
    residential: 12,
    water: 4,
    agriculture: 10,
    ndvi: 0.08,
    cloud: 2.2,
    scene: "Built-up / Commercial",
    env: 25,
    urb: 65,
    dev: "Medium"
  },
  {
    name: "Sriperumbudur Industrial Hub",
    category: "Industrial",
    forest: 5,
    industry: 72,
    residential: 14,
    water: 3,
    agriculture: 6,
    ndvi: 0.06,
    cloud: 1.9,
    scene: "Built-up / Commercial",
    env: 22,
    urb: 72,
    dev: "Medium"
  },
  {
    name: "Coimbatore Industrial Area",
    category: "Industrial",
    forest: 10,
    industry: 58,
    residential: 18,
    water: 5,
    agriculture: 9,
    ndvi: 0.12,
    cloud: 2.0,
    scene: "Built-up / Commercial",
    env: 28,
    urb: 58,
    dev: "Medium"
  },
  {
    name: "Bangalore Urban Center",
    category: "Residential",
    forest: 10,
    industry: 18,
    residential: 58,
    water: 3,
    agriculture: 11,
    ndvi: 0.22,
    cloud: 2.4,
    scene: "Urban / Built-up",
    env: 48,
    urb: 88,
    dev: "High"
  },
  {
    name: "Chennai Metro Area",
    category: "Residential",
    forest: 4,
    industry: 22,
    residential: 62,
    water: 6,
    agriculture: 6,
    ndvi: 0.15,
    cloud: 2.5,
    scene: "Urban / Built-up",
    env: 42,
    urb: 92,
    dev: "High"
  },
  {
    name: "Mysore City Center",
    category: "Residential",
    forest: 15,
    industry: 10,
    residential: 52,
    water: 5,
    agriculture: 18,
    ndvi: 0.28,
    cloud: 1.7,
    scene: "Urban / Built-up",
    env: 55,
    urb: 72,
    dev: "Medium"
  },
  {
    name: "Kelavarapalli Dam Reservoir",
    category: "Water",
    forest: 6,
    industry: 5,
    residential: 7,
    water: 82,
    agriculture: 0,
    ndvi: -0.15,
    cloud: 2.4,
    scene: "Aquatic / Inland Water",
    env: 85,
    urb: 10,
    dev: "Low"
  },
  {
    name: "Mettur Stanley Reservoir",
    category: "Water",
    forest: 8,
    industry: 4,
    residential: 5,
    water: 83,
    agriculture: 0,
    ndvi: -0.12,
    cloud: 2.0,
    scene: "Aquatic / Inland Water",
    env: 88,
    urb: 8,
    dev: "Low"
  },
  {
    name: "Pulicat Lake Lagoon",
    category: "Water",
    forest: 5,
    industry: 3,
    residential: 4,
    water: 88,
    agriculture: 0,
    ndvi: -0.18,
    cloud: 1.8,
    scene: "Aquatic / Inland Water",
    env: 92,
    urb: 5,
    dev: "Low"
  },
  {
    name: "Dharmapuri Farmlands",
    category: "Agricultural",
    forest: 12,
    industry: 4,
    residential: 6,
    water: 6,
    agriculture: 72,
    ndvi: 0.46,
    cloud: 1.8,
    scene: "Managed Vegetation",
    env: 68,
    urb: 18,
    dev: "Medium"
  },
  {
    name: "Cauvery Delta paddy Fields",
    category: "Agricultural",
    forest: 8,
    industry: 3,
    residential: 5,
    water: 12,
    agriculture: 72,
    ndvi: 0.54,
    cloud: 2.2,
    scene: "Managed Vegetation",
    env: 72,
    urb: 15,
    dev: "Medium"
  },
  {
    name: "Anantapur Horticultural Farmlands",
    category: "Agricultural",
    forest: 6,
    industry: 2,
    residential: 6,
    water: 6,
    agriculture: 80,
    ndvi: 0.42,
    cloud: 1.6,
    scene: "Managed Vegetation",
    env: 64,
    urb: 12,
    dev: "Medium"
  }
];

export const Route = createFileRoute("/aichat")({
  component: NovaDemo,
});

function NovaDemo() {
  const {
    file,
    previewUrl,
    status,
    stageIndex,
    result,
    error,
    messages,
    sessions,
    isStreaming,
    handleFile,
    handleReset,
    restoreSession,
    runAnalysis,
    askInsight,
    insightLoading,
    abortRequest,
    simulateMapClickAnalysis
  } = useAnalysis();

  const [chatInput, setChatInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [locationA, setLocationA] = useState("Hosur Industrial Hub");
  const [locationB, setLocationB] = useState("Coimbatore Industrial Area");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleSubmit = () => {
    const prompt = chatInput.trim();
    if (!prompt && !file) return;
    if (file && status !== "running") {
      runAnalysis(prompt);
    } else if (result && status !== "running") {
      askInsight(prompt);
    }
  };

  const handleResetChat = () => {
    handleReset();
    setChatInput("");
    setShowHistory(false);
    setShowCompare(false);
  };

  return (
    <div className="cb-root">
      <div id="stars"></div>

      <div className="cb-layout">
        {/* SIDEBAR */}
        <aside className="cb-sidebar">
          <div className="cb-sidebar-top">
            <button className={`cb-sidebar-btn ${(!showHistory && !showCompare) ? 'active' : ''}`} title="New Chat" onClick={handleResetChat}>✨</button>
            <button className={`cb-sidebar-btn ${showHistory ? 'active' : ''}`} title="History" onClick={() => { setShowHistory(true); setShowCompare(false); }}>📜</button>
            <button className={`cb-sidebar-btn ${showCompare ? 'active' : ''}`} title="Compare Locations" onClick={() => { setShowCompare(true); setShowHistory(false); }}>📊</button>
            <button className="cb-sidebar-btn" title="Saved Reports">📁</button>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="cb-main">
          {/* HEADER */}
          <header className="cb-header">
            <Link to="/" className="cb-logo-text">
              <div className="cb-dot" />
              NOVA AI
            </Link>
            <Link to="/" className="cb-back-link">
              ← Back to overview
            </Link>
          </header>

          <div className="cb-split-view">
            {showCompare ? (
              <div className="cb-compare-pane" style={{ flex: 1, padding: "24px", overflowY: "auto", background: "var(--void)" }}>
                <div className="cb-compare-header">
                  <h2 style={{ margin: 0, color: "var(--aurora)", fontSize: "1.5rem", fontWeight: 600 }}>Predefined Territory Comparison</h2>
                  <p style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                    Select two predefined observation sites to perform a side-by-side comparative analysis of satellite telemetry, LULC distributions, and environmental decision scores.
                  </p>
                </div>

                <div className="cb-compare-selectors">
                  <div className="cb-compare-select-wrapper">
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontFamily: "'Space Mono', monospace" }}>Location A</label>
                    <select value={locationA} onChange={(e) => setLocationA(e.target.value)} className="cb-compare-select">
                      {COMPARE_DATABASE.map(loc => (
                        <option key={`a-${loc.name}`} value={loc.name}>{loc.name} ({loc.category})</option>
                      ))}
                    </select>
                  </div>
                  <div className="cb-compare-select-wrapper">
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontFamily: "'Space Mono', monospace" }}>Location B</label>
                    <select value={locationB} onChange={(e) => setLocationB(e.target.value)} className="cb-compare-select">
                      {COMPARE_DATABASE.map(loc => (
                        <option key={`b-${loc.name}`} value={loc.name}>{loc.name} ({loc.category})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(() => {
                  const profileA = COMPARE_DATABASE.find(db => db.name === locationA) || COMPARE_DATABASE[0];
                  const profileB = COMPARE_DATABASE.find(db => db.name === locationB) || COMPARE_DATABASE[1];
                  const chartData = [
                    { name: "Forest", [locationA]: profileA.forest, [locationB]: profileB.forest },
                    { name: "Industrial", [locationA]: profileA.industry, [locationB]: profileB.industry },
                    { name: "Residential", [locationA]: profileA.residential, [locationB]: profileB.residential },
                    { name: "Water Bodies", [locationA]: profileA.water, [locationB]: profileB.water },
                    { name: "Agriculture", [locationA]: profileA.agriculture, [locationB]: profileB.agriculture },
                  ];

                  return (
                    <div className="cb-compare-dashboard">
                      <div className="cb-compare-table-wrapper">
                        <h4 style={{ margin: "0 0 16px 0", color: "var(--star)", fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>Telemetry Comparison Table</h4>
                        <table className="cb-compare-table">
                          <thead>
                            <tr>
                              <th>Parameter</th>
                              <th>{locationA}</th>
                              <th>{locationB}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Dominant Land Cover</td>
                              <td style={{ color: "var(--aurora)", fontWeight: 600 }}>{profileA.category}</td>
                              <td style={{ color: "var(--aurora)", fontWeight: 600 }}>{profileB.category}</td>
                            </tr>
                            <tr>
                              <td>Estimated NDVI</td>
                              <td>{profileA.ndvi.toFixed(2)}</td>
                              <td>{profileB.ndvi.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td>Cloud Cover</td>
                              <td>{profileA.cloud}%</td>
                              <td>{profileB.cloud}%</td>
                            </tr>
                            <tr>
                              <td>Scene Classification</td>
                              <td>{profileA.scene}</td>
                              <td>{profileB.scene}</td>
                            </tr>
                            <tr>
                              <td>Vegetation Health Score</td>
                              <td>{profileA.forest + profileA.agriculture >= 50 ? "🟢 High" : "🟡 Medium"} ({profileA.forest + profileA.agriculture}%)</td>
                              <td>{profileB.forest + profileB.agriculture >= 50 ? "🟢 High" : "🟡 Medium"} ({profileB.forest + profileB.agriculture}%)</td>
                            </tr>
                            <tr>
                              <td>Environmental Quality</td>
                              <td>{profileA.env}/100</td>
                              <td>{profileB.env}/100</td>
                            </tr>
                            <tr>
                              <td>Urbanization Index</td>
                              <td>{profileA.urb}/100</td>
                              <td>{profileB.urb}/100</td>
                            </tr>
                            <tr>
                              <td>Development Potential</td>
                              <td style={{ textTransform: "uppercase", fontSize: "0.85rem", color: "var(--aurora)" }}>{profileA.dev}</td>
                              <td style={{ textTransform: "uppercase", fontSize: "0.85rem", color: "var(--aurora)" }}>{profileB.dev}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="cb-compare-chart-wrapper">
                        <h4 style={{ margin: "0 0 20px 0", color: "var(--star)", fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>Distribution Breakdown (%)</h4>
                        <div style={{ flex: 1, minHeight: "300px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="var(--muted)" style={{ fontSize: "0.78rem" }} />
                              <YAxis unit="%" stroke="var(--muted)" style={{ fontSize: "0.78rem" }} />
                              <ChartTooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                              <ChartLegend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "10px" }} />
                              <Bar dataKey={locationA} fill="var(--nebula)" radius={[4, 4, 0, 0]} />
                              <Bar dataKey={locationB} fill="var(--aurora)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                {/* LEFT PANE: MAP */}
                {!showHistory && (
                  <div className="cb-pane cb-map-pane">
                    {typeof window !== "undefined" && (
                      <InteractiveMap 
                        onCategorySelect={(category, lat, lng) => {
                          setSelectedLocation({ lat, lng });
                          simulateMapClickAnalysis(category, lat, lng);
                        }} 
                      />
                    )}
                  </div>
                )}

                {/* RIGHT PANE: CHAT/HISTORY */}
                <div className={`cb-pane cb-chat-pane ${showHistory ? 'full-width' : ''}`}>
                  {showHistory ? (
                    <div className="cb-history-view">
                      <h2 className="cb-history-title">Session History</h2>
                      {sessions.length === 0 ? (
                        <div className="cb-history-empty">No past sessions found.</div>
                      ) : (
                        <div className="cb-history-list">
                          {sessions.map(s => (
                            <div key={s.id} className="cb-history-card" onClick={() => { restoreSession(s); setShowHistory(false); }}>
                              {s.previewUrl && <img src={s.previewUrl} alt="Thumbnail" className="cb-history-thumb" />}
                              <div className="cb-history-info">
                                <div className="cb-history-date">{s.date.toLocaleString()}</div>
                                <div className="cb-history-desc">
                                  {s.result?.insight?.slice(0, 60) || s.messages[0]?.text?.slice(0, 60) || "Unfinished Session"}...
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {error && (
                        <div style={{ padding: '0 24px' }}>
                          <div className="cb-input-error">{error}</div>
                        </div>
                      )}

                      <ChatInterface
                        messages={messages}
                        status={status}
                        stageIndex={stageIndex}
                        result={result}
                        file={file}
                        previewUrl={previewUrl}
                        chatInput={chatInput}
                        setChatInput={setChatInput}
                        handleSubmit={handleSubmit}
                        handleFile={handleFile}
                        isStreaming={isStreaming}
                        abortRequest={abortRequest}
                        showHistory={showHistory}
                        askInsight={askInsight}
                        insightLoading={insightLoading}
                        handleResetChat={handleResetChat}
                        selectedLocation={selectedLocation}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
