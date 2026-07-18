import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export type MapCategory = "Forest" | "Industrial" | "Residential" | "Water" | "Agricultural";

interface InteractiveMapProps {
  onCategorySelect: (category: MapCategory, lat: number, lng: number) => void;
}

const CATEGORY_LOCATIONS: { name: MapCategory; lat: number; lng: number; desc: string }[] = [
  // Forest
  { name: "Forest", lat: 11.5, lng: 76.5, desc: "Western Ghats Region" },
  { name: "Forest", lat: 10.333, lng: 77.0, desc: "Anaimalai Tiger Reserve" },
  { name: "Forest", lat: 11.9, lng: 77.2, desc: "Sathyamangalam Wildlife" },
  // Industrial
  { name: "Industrial", lat: 12.740, lng: 77.825, desc: "Hosur Industrial Area" },
  { name: "Industrial", lat: 13.0, lng: 79.9, desc: "Sriperumbudur Hub" },
  { name: "Industrial", lat: 11.0, lng: 77.0, desc: "Coimbatore Manufacturing" },
  // Residential
  { name: "Residential", lat: 12.971, lng: 77.594, desc: "Bangalore Urban Center" },
  { name: "Residential", lat: 13.082, lng: 80.270, desc: "Chennai Metro" },
  { name: "Residential", lat: 12.3, lng: 76.6, desc: "Mysore City" },
  // Water
  { name: "Water", lat: 12.775, lng: 77.865, desc: "Kelavarapalli Dam" },
  { name: "Water", lat: 11.3, lng: 77.8, desc: "Mettur Dam Reservoir" },
  { name: "Water", lat: 13.6, lng: 79.9, desc: "Pulicat Lake" },
  // Agricultural
  { name: "Agricultural", lat: 12.2, lng: 78.5, desc: "Rural Tamil Nadu Farmlands" },
  { name: "Agricultural", lat: 10.8, lng: 78.7, desc: "Cauvery Delta Region" },
  { name: "Agricultural", lat: 14.5, lng: 77.5, desc: "Anantapur Farmlands" }
];

export function InteractiveMap({ onCategorySelect }: InteractiveMapProps) {
  return (
    <div className="cb-map-container" style={{ height: "100%", width: "100%", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
      <div style={{ position: "absolute", top: "10px", left: "50px", zIndex: 1000, background: "rgba(0,0,0,0.7)", padding: "10px", borderRadius: "8px", color: "white", backdropFilter: "blur(5px)" }}>
        <strong>Select a predefined location to view its EO Report</strong>
      </div>
      <MapContainer
        center={[12.5, 77.5]} // Center around South India for these points
        zoom={8}
        style={{ height: "100%", width: "100%", background: "#0a0a1a" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {CATEGORY_LOCATIONS.map((loc, idx) => (
          <Marker 
            key={`${loc.name}-${idx}`} 
            position={[loc.lat, loc.lng]}
            eventHandlers={{
              click: () => onCategorySelect(loc.name, loc.lat, loc.lng)
            }}
          >
            <Tooltip permanent direction="top" opacity={0.8} className="nova-map-tooltip">
              {loc.desc}
            </Tooltip>
            <Popup className="nova-map-popup">
              <strong>{loc.desc}</strong><br/>
              <span style={{color: "var(--muted)", fontSize: "0.85em"}}>Category: {loc.name}</span><br/>
              Lat: {loc.lat.toFixed(4)}, Lng: {loc.lng.toFixed(4)}<br/>
              <button 
                onClick={() => onCategorySelect(loc.name, loc.lat, loc.lng)}
                style={{marginTop: "8px", width: "100%", background: "var(--aurora)", color: "#000", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer"}}
              >
                Generate Report
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
