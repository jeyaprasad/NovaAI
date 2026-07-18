import { useCallback, useRef, useState } from "react";
import imageCompression from "browser-image-compression";

export interface LandCoverClass {
  label: string;
  pct: number;
  color: string;
}

export interface AnalysisResult {
  status: string;
  dominant_land_cover: string;
  secondary_land_cover?: string;
  confidence: string;
  summary: string;
  gpt_analysis?: string;
  classes: LandCoverClass[];
  flags: { icon: string; label: string; level: "info" | "warning" | "danger" }[];
  insight: string;
  width?: number;
  height?: number;
  title?: string;
  risk_level?: "Low" | "Medium" | "High";
  use_cases?: { name: string; rationale: string }[];
  recommended_actions?: { audience: string; action: string }[];
  mask_image?: string;
  ndvi_heatmap?: string;
  ndvi_score?: number;
  ndvi_min?: number;
  ndvi_max?: number;
  pie_chart?: string;
  bar_chart?: string;
  geo_metadata?: Record<string, unknown>;
  scene_type?: string;
  sensor_type?: string;
  cloud_cover_pct?: number;
  estimated_ndvi?: number;
  spatial_resolution?: string;
  citation?: string;
  study_use_cases?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isReport?: boolean;
}

export interface ChatSession {
  id: number;
  date: Date;
  messages: ChatMessage[];
  result: AnalysisResult | null;
  file: File | null;
  previewUrl: string | null;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const PIPELINE_STAGES = [
  { icon: "📤", title: "Uploading Image...", desc: "Transferring file to secure server" },
  { icon: "🛰️", title: "Running RemoteCLIP...", desc: "Extracting vision features" },
  { icon: "🌍", title: "Interpreting EO Context...", desc: "Mapping land cover & vegetation" },
  { icon: "💬", title: "Generating GPT Response...", desc: "Synthesizing AI insights" },
];

export function useAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleFile = useCallback(async (f: File | null) => {
    setError(null);
    if (!f) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(f.type)) {
      setError(`Invalid file type. Please upload a PNG or JPG image.`);
      return;
    }

    try {
      // Client-side image compression
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(f, options);
      setFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error("Image compression error", err);
      // Fallback to uncompressed if it fails
      if (f.size > 10 * 1024 * 1024) {
        setError(`File is too large. Max size is 10MB.`);
        return;
      }
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, []);

  const handleReset = useCallback(() => {
    if (messages.length > 0 || result || file) {
      setSessions((prev) => [{
        id: Date.now(),
        date: new Date(),
        messages,
        result,
        file,
        previewUrl
      }, ...prev]);
    }
    setMessages([]);
    setFile(null);
    setPreviewUrl(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setStageIndex(-1);
    abortController?.abort();
    setAbortController(null);
    setIsStreaming(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, [messages, result, file, previewUrl, abortController]);

  const restoreSession = useCallback((s: ChatSession) => {
    setMessages(s.messages);
    setResult(s.result);
    setFile(s.file);
    setPreviewUrl(s.previewUrl);
    setStatus(s.result || s.messages.length > 0 ? "done" : "idle");
  }, []);

  const runAnalysis = useCallback(async (prompt: string) => {
    if (!file || !prompt.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setStatus("running");
    setResult(null);
    setError(null);
    setStageIndex(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    [1, 2, 3].forEach((i) => {
      const t = setTimeout(() => setStageIndex(i), i * 350);
      timers.current.push(t);
    });
    const minDuration = new Promise((resolve) => {
      const t = setTimeout(resolve, PIPELINE_STAGES.length * 350);
      timers.current.push(t);
    });

    try {
      const formData = new FormData();
      formData.append("image", file, file.name || "image.jpeg");

      const controller = new AbortController();
      setAbortController(controller);
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const fetchAnalysis = fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      }).then(async (res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          if (res.status === 413) throw new Error("Image too large for the backend to process.");
          if (res.status === 415) throw new Error("Unsupported image format.");

          let backendErrorStr = "";
          try {
            const errData = await res.json();
            backendErrorStr = errData.detail || "";
          } catch (e) { }

          if (res.status === 400 || res.status === 422) {
            throw new Error(backendErrorStr ? backendErrorStr : "Invalid image or request.");
          }
          if (res.status >= 500) throw new Error("The backend encountered an unexpected error.");
          throw new Error(`Analysis failed due to an unknown error (${res.status}).`);
        }
        return (await res.json()) as AnalysisResult;
      }).catch(err => {
        clearTimeout(timeoutId);
        throw err;
      });

      const [data] = await Promise.all([fetchAnalysis, minDuration]);
      setResult(data);
      setStatus("done");

      setMessages((prev) => {
        const historySnapshot = prev.filter(m => !m.isReport).map(m => ({ role: m.role, text: m.text }));

        setTimeout(async () => {
          try {
            setIsStreaming(true);
            const streamController = new AbortController();
            setAbortController(streamController);
            const res = await fetch(`${API_BASE}/api/chat/stream`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: prompt, result: data, history: historySnapshot }),
              signal: streamController.signal
            });
            if (!res.ok) throw new Error(`Chat request failed (${res.status})`);

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No readable stream");

            setMessages((m) => [...m, { role: "assistant", text: "" }]);

            let done = false;
            while (!done) {
              const { value, done: streamDone } = await reader.read();
              done = streamDone;
              if (value) {
                const text = decoder.decode(value, { stream: true });
                setMessages((m) => {
                  const updated = [...m];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant" && !last.isReport) {
                    updated[updated.length - 1] = { ...last, text: last.text + text };
                  }
                  return updated;
                });
              }
            }
          } catch (err: any) {
            if (err.name !== "AbortError") {
              console.error("Follow-up chat failed", err);
            }
          } finally {
            setIsStreaming(false);
            setAbortController(null);
          }
        }, 50);

        return [
          ...prev,
          { role: "assistant", text: data.insight, isReport: true }
        ];
      });
      setFile(null);
      setPreviewUrl(null);

    } catch (err: any) {
      setStatus("idle");
      setStageIndex(-1);

      let friendlyMsg = "Something went wrong while analyzing the image.";
      if (err.name === "AbortError") friendlyMsg = "The request timed out. The server took too long to respond.";
      else if (err instanceof TypeError) friendlyMsg = "Network failure. Could not connect to the backend server.";
      else if (err instanceof Error) friendlyMsg = err.message;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠️ Error: ${friendlyMsg}` }
      ]);
      setError(friendlyMsg);
    }
  }, [file]);

  const askInsight = useCallback(async (question: string) => {
    if (!question.trim() || !result || insightLoading) return;

    setMessages((m) => [...m, { role: "user", text: question }]);
    setInsightLoading(true);

    try {
      const controller = new AbortController();
      setAbortController(controller);
      const res = await fetch(`${API_BASE}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          eo_context: {
            dominant_land_cover: result.dominant_land_cover,
            secondary_land_cover: result.secondary_land_cover,
            confidence: result.confidence,
            summary: result.summary,
          }
        }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`Insights request failed (${res.status})`);

      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((m) => [...m, { role: "assistant", text: `Insight generation is temporarily unavailable.` }]);
      }
    } finally {
      setInsightLoading(false);
      setAbortController(null);
    }
  }, [result, insightLoading]);

  const abortRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setStatus("done");
    }
  }, [abortController]);

  const simulateMapClickAnalysis = useCallback((category: string, lat: number, lng: number) => {
    handleReset();
    
    // Detailed local location database to give accurate reports based on specific coordinates
    let location = "South India Region";
    let details = "Predefined satellite observation site.";
    let landCover = "";
    let classes: LandCoverClass[] = [];
    let indicators = "";
    let recommendations = "";

    // Helper to find the closest location from coordinate matching
    const latStr = lat.toFixed(3);
    const lngStr = lng.toFixed(3);
    
    if (category === "Forest") {
      if (latStr.startsWith("11.5") || latStr.startsWith("11.50")) {
        location = "Western Ghats Region";
        details = "High density forest range near Nilgiri biosphere. Crucial ecological zone.";
      } else if (latStr.startsWith("10.33")) {
        location = "Anaimalai Tiger Reserve";
        details = "Wet evergreen forest and montane shola grasslands. High altitude biodiversity sanctuary.";
      } else {
        location = "Sathyamangalam Wildlife Sanctuary";
        details = "Dry deciduous mixed woodland range. Critical elephant and tiger migration corridor.";
      }
      
      landCover = "Forest        88%\nWater          5%\nOthers         7%";
      classes = [
        { label: "Dense Forest", pct: 88, color: "#10b981" },
        { label: "River/Water Basin", pct: 5, color: "#0ea5e9" },
        { label: "Others", pct: 7, color: "#64748b" },
      ];
      indicators = "Vegetation Health (NDVI) : 0.78 (Excellent)\nCanopy Density             : Closed Canopy (>80%)\nSurface Humidity           : High (72%)\nSoil Erosion Risk          : Low (Buffered by roots)";
      recommendations = "* Maintain strict conservation zones and combat perimeter encroachment.\n* Deploy satellite thermal sensors to monitor seasonal forest fire hot spots.\n* Protect wildlife corridors to ensure gene flow across natural sanctuaries.";

    } else if (category === "Industrial") {
      if (latStr.startsWith("12.74") || latStr.startsWith("12.7")) {
        location = "Hosur Industrial Hub";
        details = "Large automobile manufacturing and heavy metal forging complexes.";
      } else if (latStr.startsWith("13.0")) {
        location = "Sriperumbudur Industrial Hub";
        details = "Major electronics manufacturing, telecom assembly, and logistics parks.";
      } else {
        location = "Coimbatore Industrial Area";
        details = "Concentrated textile spinning mills, foundry units, and pump manufacturing facilities.";
      }

      landCover = "Industrial    68%\nRoads/Paved   22%\nVegetation     6%\nOthers         4%";
      classes = [
        { label: "Industrial Complexes", pct: 68, color: "#f43f5e" },
        { label: "Paved Road Grids", pct: 22, color: "#64748b" },
        { label: "Urban Greenery", pct: 6, color: "#10b981" },
        { label: "Others", pct: 4, color: "#9ca3af" },
      ];
      indicators = "Thermal Hotspot (UHI) : Elevated (+4.2°C above baseline)\nImpervious Surface Ratio : 90% (High runoff potential)\nSoil Water Absorption   : Critical (<10% infiltration)\nVegetation Health (NDVI): 0.08 (Poor)";
      recommendations = "* Mandate factory rooftops to use cool roof coatings or green vegetative roofs.\n* Install sustainable stormwater drainage systems to mitigate urban flash flooding.\n* Create buffer zones of native trees around industrial estates to filter emissions.";

    } else if (category === "Residential") {
      if (latStr.startsWith("12.97")) {
        location = "Bangalore Urban Center";
        details = "High density IT parks, residential high-rises, and concrete built-up surface.";
      } else if (latStr.startsWith("13.08")) {
        location = "Chennai Metro Area";
        details = "Coastal urban sprawl, commercial centers, residential townships, and port layout.";
      } else {
        location = "Mysore City Center";
        details = "Moderate urban residential grids, heritage quarters, and planned municipal layouts.";
      }

      landCover = "Residential   58%\nCommercial    18%\nRoads/Asphalt 14%\nUrban Green   10%";
      classes = [
        { label: "Residential Zones", pct: 58, color: "#a855f7" },
        { label: "Commercial Blocks", pct: 18, color: "#ec4899" },
        { label: "Roads & Pavements", pct: 14, color: "#64748b" },
        { label: "Urban Vegetation", pct: 10, color: "#10b981" },
      ];
      indicators = "Urban Sprawl Index      : High Density\nImpervious Soil Ratio   : 86%\nVegetation Health (NDVI): 0.22 (Moderate)\nSurface Temperature     : Warm (+2.8°C anomalies)";
      recommendations = "* Develop urban green corridors and pocket parks to combat urban heat islands.\n* Implement mandatory household rainwater harvesting grids.\n* Restrict vertical high-rise expansion near active lake catchment basins.";

    } else if (category === "Water") {
      if (latStr.startsWith("12.77") || latStr.startsWith("12.7")) {
        location = "Kelavarapalli Dam Reservoir";
        details = "Inland reservoir fed by the Pennar river basin. Important local source for agriculture.";
      } else if (latStr.startsWith("11.3")) {
        location = "Mettur Stanley Reservoir";
        details = "Major storage reservoir on the Cauvery river. Essential irrigation source for delta districts.";
      } else {
        location = "Pulicat Lake Lagoon";
        details = "Brackish water lagoon ecosystem. Vital wetland sanctuary for migratory bird species.";
      }

      landCover = "Water Body    82%\nWetlands       12%\nSurrounding    6%";
      classes = [
        { label: "Open Water surface", pct: 82, color: "#0ea5e9" },
        { label: "Wetland Margins", pct: 12, color: "#14b8a6" },
        { label: "Vegetative Borders", pct: 6, color: "#10b981" },
      ];
      indicators = "NDVI Score (Water)      : -0.15 (Clear Water signature)\nEutrophication Index    : Moderate (Suspended sediment/algae)\nVolume Stability        : Highly Seasonal\nEcological Status       : Sensitive Wetland Habitats";
      recommendations = "* Restrict agricultural nitrogenous runoff upstream to prevent algal blooms.\n* Build silt traps at reservoir inlets to control soil sedimentation rates.\n* Conduct monthly satellite water quality monitoring (turbidity & chlorophyll-a).";

    } else { // Agricultural
      if (latStr.startsWith("12.2") || latStr.startsWith("12.20")) {
        location = "Dharmapuri Farmlands";
        details = "Arid agricultural cultivation, including millets, pulses, and oilseeds.";
      } else if (latStr.startsWith("10.8")) {
        location = "Cauvery Delta paddy Fields";
        details = "Intense wetland rice paddy cultivation using local river canal systems.";
      } else {
        location = "Anantapur Horticultural Farmlands";
        details = "Dryland groundnut cropping and sweet orange orchards. Highly rain-dependent.";
      }

      landCover = "Agriculture   72%\nFallow Land    16%\nWater Channels  6%\nSettlements     6%";
      classes = [
        { label: "Active Croplands", pct: 72, color: "#84cc16" },
        { label: "Fallow Soil/Barren", pct: 16, color: "#eab308" },
        { label: "Canals & Drainage", pct: 6, color: "#0ea5e9" },
        { label: "Rural Settlements", pct: 6, color: "#a855f7" },
      ];
      indicators = "Vegetation Health (NDVI) : 0.46 (Moderate Growth)\nSoil Moisture Index       : Dry-to-Moderate (Seasonal)\nCloud Cover Interference  : 1.8% (Excellent visibility)\nCrop Canopy Coverage      : 65%";
      recommendations = "* Transition to drip irrigation networks to conserve ground aquifer reserves.\n* Practice crop rotation with nitrogen-fixing pulses to restore soil health.\n* Promote agroforestry lines to act as natural windbreakers and prevent topsoil loss.";
    }

    const reportText = `\`\`\`text
==================================================
Earth Observation Satellite Intelligence Report
==================================================
Site Location : ${location}
Coordinates   : Lat ${lat.toFixed(4)}°, Lng ${lng.toFixed(4)}°
Sensor/Sensor : Sentinel-2 MSI (Multispectral Instrument)
Study Area    : 10m spatial resolution tile (~10 km² coverage)
Cloud Cover   : 1.8% (Cloud-free observation window)
Regional Desc : ${details}

--------------------------------------------------
Land Cover Distribution Breakdown
--------------------------------------------------
${landCover}

--------------------------------------------------
Calculated Environmental Telemetry Metrics
--------------------------------------------------
${indicators}

--------------------------------------------------
Sustainable Action & Resource Management Plan
--------------------------------------------------
${recommendations}
\`\`\`
`;

    const mockResult: AnalysisResult = {
      status: "success",
      dominant_land_cover: category,
      confidence: "High",
      summary: `Analysis complete for ${location} (${lat.toFixed(4)}, ${lng.toFixed(4)}). Mapped primary ${category.toLowerCase()} cover.`,
      classes,
      flags: [],
      insight: reportText,
      scene_type: category === "Forest" ? "Natural / Vegetation" : category === "Agricultural" ? "Managed Vegetation" : category === "Water" ? "Aquatic / Inland Water" : category === "Residential" ? "Urban / Built-up" : "Built-up / Commercial",
      sensor_type: "Sentinel-2 MSI (Multispectral Instrument)",
      cloud_cover_pct: 1.8,
      estimated_ndvi: category === "Forest" ? 0.78 : category === "Agricultural" ? 0.46 : category === "Residential" ? 0.22 : category === "Water" ? -0.15 : 0.08,
      spatial_resolution: "10 meters / Pixel",
      citation: `NovaAI Sentinel-2 LULC Engine (2026). Mapped primary ${category.toLowerCase()} cover at ${location} (Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E). (Illustrative Preset Data)`,
      study_use_cases: category === "Forest" ? [
        "Forest canopy density (FCD) modeling & boundary encroachment detection.",
        "Carbon sequestration baseline studies for local carbon credit assessments.",
        "Ecological biodiversity index tracking & biological corridor analysis."
      ] : category === "Agricultural" ? [
        "Agricultural crop health monitoring & crop yield estimation.",
        "Precision farming crop canopy indexing & irrigation efficiency modeling.",
        "Seasonal crop rotation maps & vegetation index (NDVI) variance profiling."
      ] : category === "Residential" ? [
        "Urban Heat Island (UHI) thermal anomaly mapping.",
        "Municipal green space ratio calculations & sustainable planning.",
        "Demographic sprawl profiling & impervious surface growth tracking."
      ] : category === "Water" ? [
        "Water surface area fluctuation analysis & seasonal drainage modeling.",
        "Hydrographic catchment area maps & turbidity/sedimentation monitoring.",
        "Sensitive coastal or inland wetland ecosystem habitat protection."
      ] : [
        "Impervious surface runoff coefficients & urban hydrology modeling.",
        "Environmental Impact Assessment (EIA) baseline mapping for industrial permits.",
        "Industrial zone growth boundaries & logistics center expansion tracking."
      ]
    };

    setMessages([
      { role: "user", text: `Analyze region at lat ${lat.toFixed(4)}, lng ${lng.toFixed(4)} (${location})` },
      { role: "assistant", text: reportText, isReport: true }
    ]);
    setResult(mockResult);
    setStatus("done");

  }, [handleReset]);

  return {
    file,
    previewUrl,
    status,
    stageIndex,
    result,
    error,
    messages,
    sessions,
    isStreaming,
    insightLoading,
    handleFile,
    handleReset,
    restoreSession,
    runAnalysis,
    askInsight,
    abortRequest,
    simulateMapClickAnalysis
  };
}
