import React, { useEffect, useRef, useState } from "react";
import { CellTower, Coordinates } from "../types";
import { Navigation, Compass, Signal, Radio } from "lucide-react";

interface MapTabProps {
  latitude: number;
  longitude: number;
  towers: CellTower[];
  onSelectTower: (tower: CellTower) => void;
  selectedTower: CellTower | null;
  isOffline: boolean;
}

export function MapTab({
  latitude,
  longitude,
  towers,
  onSelectTower,
  selectedTower,
  isOffline,
}: MapTabProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const circlesGroupRef = useRef<any[]>([]);

  // Calculate distance between coords
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const getOperatorColor = (op: string) => {
    switch (op) {
      case "Jio":
        return "#0F52BA";
      case "Airtel":
        return "#E41E26";
      case "Vi":
        return "#F9EE22";
      case "BSNL":
        return "#FF9933";
      default:
        return "#00e5ff";
    }
  };

  const getSignalColor = (dbm: number) => {
    if (dbm >= -80) return "text-emerald-400";
    if (dbm >= -95) return "text-cyan-400";
    if (dbm >= -110) return "text-yellow-400";
    return "text-red-500";
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Initialize Leaflet map if not present
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([latitude, longitude], 15);

      // CartoDB Dark Matter tile layer provides a gorgeous technical cyber dark vibe
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 20,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
    } else {
      // Smoothly fly to center if coordinates change
      mapInstanceRef.current.setView([latitude, longitude], 15);
    }

    const map = mapInstanceRef.current;

    // Remove legacy markers & circles
    markersGroupRef.current.forEach((m) => m.remove());
    markersGroupRef.current = [];
    circlesGroupRef.current.forEach((c) => c.remove());
    circlesGroupRef.current = [];
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Add User Indicator (Green pulser)
    const pulserIcon = L.divIcon({
      className: "custom-user-marker",
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-5 h-5 bg-green-500/30 rounded-full animate-ping"></div>
          <div class="w-2.5 h-2.5 bg-green-400 rounded-full border border-black shadow"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    userMarkerRef.current = L.marker([latitude, longitude], { icon: pulserIcon })
      .addTo(map)
      .bindTooltip("You Are Here", { permanent: false, direction: "top" });

    // Render Tower locations
    towers.forEach((tower) => {
      const opColor = getOperatorColor(tower.operator);
      
      const customIcon = L.divIcon({
        className: `custom-tower-marker-${tower.id}`,
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute h-8 w-8 rounded-full bg-black/40 border border-[#1f1f2e] backdrop-blur-xs flex items-center justify-center shadow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${opColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 20h20"/>
                <path d="m12 4-8 16"/>
                <path d="m12 4 8 16"/>
                <circle cx="12" cy="4" r="2" fill="${opColor}"/>
              </svg>
            </div>
            <!-- Live Signal animation pulse -->
            <div class="absolute inset-0 -m-1.5 rounded-full border border-${tower.operator.toLowerCase()} animate-pulse opacity-40"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([tower.latitude, tower.longitude], { icon: customIcon })
        .addTo(map)
        .on("click", () => {
          onSelectTower(tower);
        });

      markersGroupRef.current.push(marker);

      // Add soft concentric circle boundaries representing actual RF dispersion
      const rfCircle = L.circle([tower.latitude, tower.longitude], {
        color: opColor,
        fillColor: opColor,
        fillOpacity: 0.04,
        weight: 1,
        opacity: 0.25,
        radius: 300, // 300m approximation
      }).addTo(map);

      circlesGroupRef.current.push(rfCircle);
    });

    // Custom CSS style block for pins/pings dynamically injected
    if (!document.getElementById("map-custom-pulses")) {
      const style = document.createElement("style");
      style.id = "map-custom-pulses";
      style.innerHTML = `
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `;
      document.head.appendChild(style);
    }
  }, [latitude, longitude, towers]);

  return (
    <div className="flex-1 flex flex-col relative w-full h-full bg-[#0a0a0f]">
      {/* Map stage container */}
      <div ref={mapContainerRef} className="flex-1 w-full bg-[#08080c] relative z-10" />

      {/* Floating Header */}
      <div className="absolute top-3 left-3 z-[15] pointer-events-none">
        <div className="bg-[#0c0c14]/90 backdrop-blur-md border border-[#1e1e2d] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
          <Navigation className="w-3.5 h-3.5 text-cyan-400 rotate-45 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
            {isOffline ? "Caches Locked" : "GPS Coverage Active"}
          </span>
        </div>
      </div>

      {/* Selection card drawer or detail drawer */}
      {selectedTower ? (
        <div className="p-4 bg-[#141421] border-t border-[#1e1e30] transition-all duration-300 relative z-20 shadow-xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{selectedTower.operator} Base Station</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-[9px] font-mono font-bold text-cyan-400 uppercase">
                  {selectedTower.networkType}
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-400">Node ID: {selectedTower.id}</span>
            </div>
            <div className="text-right">
              <span className={`text-base font-mono font-black ${getSignalColor(selectedTower.signalStrength)}`}>
                {selectedTower.signalStrength} dBm
              </span>
              <div className="text-[10px] text-gray-500 font-mono">Signal Power</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 bg-[#09090f] rounded border border-gray-900/40 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <div>
                <div className="text-[9px] text-gray-500">BAND BANDWIDTH</div>
                <div className="text-gray-300 truncate">{selectedTower.band}</div>
              </div>
            </div>
            <div className="p-2 bg-[#09090f] rounded border border-gray-900/40 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <div>
                <div className="text-[9px] text-gray-500">DISTANCE DIST</div>
                <div className="text-gray-300">
                  {getDistance(latitude, longitude, selectedTower.latitude, selectedTower.longitude).toFixed(2)} km
                </div>
              </div>
            </div>
            <div className="p-2 bg-[#09090f] rounded border border-gray-900/40">
              <div className="text-[9px] text-gray-500">CELL IDENTIFIER (CID)</div>
              <div className="text-gray-300 font-semibold">{selectedTower.cellId}</div>
            </div>
            <div className="p-2 bg-[#09090f] rounded border border-gray-900/40">
              <div className="text-[9px] text-gray-500">TRACKING AREA CODES (TAC)</div>
              <div className="text-gray-300 font-semibold">{selectedTower.tac}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#141421] border-t border-[#1e1e2d] text-center text-xs text-gray-500 relative z-20 font-mono">
          <div className="flex justify-center items-center gap-2 mb-1">
            <Signal className="w-4 h-4 text-gray-500 animate-pulse" />
            <span className="font-bold text-gray-400">TOUCH PINS ON MAP TO WIRELESSLY DECODE METRICS</span>
          </div>
          Select a nearby antenna circle to audit specific transmit profiles, azimuths & channels.
        </div>
      )}
    </div>
  );
}
