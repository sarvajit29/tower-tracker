import React, { useState, useEffect } from "react";
import { PhoneSimulator } from "./components/PhoneSimulator";
import { MapTab } from "./components/MapTab";
import { TelemetryTab } from "./components/TelemetryTab";
import { OptimizerTab } from "./components/OptimizerTab";
import { SettingsTab } from "./components/SettingsTab";
import { HistoryTab } from "./components/HistoryTab";
import { CellTower, TelemetryHistoryPoint } from "./types";
import { Map, Radio, Award, Settings, Cpu, CloudLightning, RefreshCw, Loader2, LineChart } from "lucide-react";

// Helper to pre-populate 24 hours of telemetry database points
const generateInitialHistoryPoints = (op: string, net: string): TelemetryHistoryPoint[] => {
  const points: TelemetryHistoryPoint[] = [];
  const now = new Date().getTime();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000);
    const baseWave = Math.sin((24 - i) / 3.5) * 11;
    const randomFuzz = Math.random() * 7 - 3.5;
    const strength = Math.round(-84 + baseWave + randomFuzz);
    points.push({
      timestamp: time.toISOString(),
      dbm: Math.max(-115, Math.min(-50, strength)),
      operator: op,
      networkType: net as any,
    });
  }
  return points;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"map" | "signal" | "history" | "advisory" | "settings">("map");
  const [latitude, setLatitude] = useState(12.9716); // Default: Bangalore
  const [longitude, setLongitude] = useState(77.5946);
  const [towers, setTowers] = useState<CellTower[]>([]);
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);
  
  const [isOffline, setIsOffline] = useState(false);
  const [signalStrength, setSignalStrength] = useState(-82); // starting dBm
  const [operator, setOperator] = useState("Jio");
  const [networkType, setNetworkType] = useState<"4G" | "5G" | "3G" | "2G">("5G");
  
  const [loading, setLoading] = useState(false);
  const [apiSource, setApiSource] = useState<string>("local");

  const [historyPoints, setHistoryPoints] = useState<TelemetryHistoryPoint[]>(() => 
    generateInitialHistoryPoints("Jio", "5G")
  );

  // Native Android Bridge listener integration
  useEffect(() => {
    const checkNativeBridge = () => {
      const gBridge = (window as any).AndroidBridge;
      if (gBridge) {
        try {
          if (typeof gBridge.getSignalStrength === "function") {
            const nativeDbm = parseInt(gBridge.getSignalStrength());
            if (!isNaN(nativeDbm)) setSignalStrength(nativeDbm);
          }
          if (typeof gBridge.getOperatorName === "function") {
            const nativeOp = gBridge.getOperatorName();
            if (nativeOp) setOperator(nativeOp);
          }
          if (typeof gBridge.getNetworkType === "function") {
            const nativeNet = gBridge.getNetworkType();
            if (nativeNet) setNetworkType(nativeNet as any);
          }
          if (typeof gBridge.getNetworkInfo === "function") {
            const infoString = gBridge.getNetworkInfo();
            if (infoString) {
              const info = JSON.parse(infoString);
              if (info.latitude && info.longitude) {
                setLatitude(info.latitude);
                setLongitude(info.longitude);
              }
            }
          }
        } catch (e) {
          console.error("Error reading initial Android Bridge config:", e);
        }
      }
    };

    checkNativeBridge();

    // Bind real-time fluctuation updates from native Kotlin handler
    (window as any).onNativeSignalUpdate = (dbm: number) => {
      setSignalStrength(dbm);
    };

    return () => {
      delete (window as any).onNativeSignalUpdate;
    };
  }, []);

  // Append new telemetry entry to history path when active signal changes
  useEffect(() => {
    const newPoint: TelemetryHistoryPoint = {
      timestamp: new Date().toISOString(),
      dbm: signalStrength,
      operator: operator,
      networkType: networkType as any,
    };
    setHistoryPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && new Date(newPoint.timestamp).getTime() - new Date(last.timestamp).getTime() < 2000) {
        return prev;
      }
      return [...prev, newPoint].slice(-250); // limit local storage vector size
    });
  }, [signalStrength, operator, networkType]);

  // Telemetry real-time micro-fluctuation timer simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setSignalStrength((prev) => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1 dBm
        const next = prev + change;
        return Math.max(-115, Math.min(-50, next));
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);


  // Fetch towers from fullstack API route
  const fetchTowers = async (lat: number, lng: number) => {
    if (isOffline) return;
    setLoading(true);
    try {
      const response = await fetch("/api/towers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await response.json();
      if (data && Array.isArray(data.towers)) {
        setTowers(data.towers);
        setApiSource(data.source || "calculated");
        
        // Link primary phone state to the highest telemetry tower found near coordinates!
        if (data.towers.length > 0) {
          const sorted = [...data.towers].sort((a, b) => b.signalStrength - a.signalStrength);
          const topTower = sorted[0];
          setSignalStrength(topTower.signalStrength);
          setOperator(topTower.operator);
          setNetworkType(topTower.networkType as any);
        }
      }
    } catch (error) {
      console.error("Failed to retrieve cell towers:", error);
      // Fallback local procedure if API fails
      setApiSource("local-static-fallback");
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on coordinate changes
  useEffect(() => {
    fetchTowers(latitude, longitude);
  }, [latitude, longitude, isOffline]);

  // Request actual user HTML Geolocation coords
  const handleRequestGeolocation = () => {
    if (isOffline) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setSelectedTower(null);
        },
        (error) => {
          console.error("Geolocation request failed:", error);
          alert("Location permission declined or signal unavailable. Standard coordinate simulator remains active.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleToggleOffline = (offline: boolean) => {
    setIsOffline(offline);
    if (offline) {
      setApiSource("cached-offline-storage");
    } else {
      fetchTowers(latitude, longitude);
    }
  };

  return (
    <div className="min-h-screen bg-[#030308] flex flex-col items-center justify-center py-6 px-4 md:px-8 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-black to-[#020204]">
      
      {/* Outer Web Layout Shell and Headers (kept beautifully clean) */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-8 lg:gap-12 justify-center">
        
        {/* Left column info details */}
        <div className="max-w-md space-y-4 md:space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-800/60 rounded-full">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-mono font-black tracking-widest text-[#00e5ff] uppercase">
              Vite-Express Link Active
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white font-sans">
              Tower Tracker
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
              High-fidelity mobile monitoring utility. Evaluates co-location antenna parameters, cellular dBm index, and maps regional RF distribution sectors in real-time.
            </p>
          </div>

          {/* Quick Technical Specs Indicators */}
          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="p-3 bg-[#0d0d16] border border-gray-900/40 rounded-lg">
              <div className="text-gray-500 uppercase tracking-widest text-[9px]">Server API Feed</div>
              <div className="text-cyan-400 font-extrabold mt-0.5 truncate flex items-center gap-1">
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block animate-pulse"></span>
                )}
                {apiSource}
              </div>
            </div>
            <div className="p-3 bg-[#0d0d16] border border-gray-900/40 rounded-lg">
              <div className="text-gray-500 uppercase tracking-widest text-[9px]">COMPILER TARGET</div>
              <div className="text-white font-extrabold mt-0.5">Android SDK 34</div>
            </div>
          </div>

          {/* Android files indicator list */}
          <div className="text-left p-4 bg-[#0a0a0f] border border-gray-900/60 rounded-xl space-y-2.5">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
              COMPRESSED ANDROID ARCHIVE
            </div>
            <div className="space-y-1.5 text-[10px] font-mono text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                <span>Package: <code className="text-gray-300">com.techavengers.towertracker</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                <span>Jetpack Compose UI: <code className="text-gray-300">MainActivity.kt</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                <span>Telemetry Sensors: <code className="text-gray-300">TelephonyManager</code></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Beautiful Phone Simulator holding standard Jetpack M3 pages */}
        <div className="relative">
          <PhoneSimulator
            operator={operator}
            networkType={networkType}
            isOffline={isOffline}
            latitude={latitude}
            longitude={longitude}
          >
            {/* Screen Page Routing based on active bottom navbar tab */}
            {activeTab === "map" && (
              <MapTab
                latitude={latitude}
                longitude={longitude}
                towers={towers}
                onSelectTower={setSelectedTower}
                selectedTower={selectedTower}
                isOffline={isOffline}
              />
            )}
            
            {activeTab === "signal" && (
              <TelemetryTab
                signalStrength={signalStrength}
                operator={operator}
                networkType={networkType}
                towers={towers}
                isOffline={isOffline}
              />
            )}

            {activeTab === "history" && (
              <HistoryTab
                historyPoints={historyPoints}
                currentOperator={operator}
                currentNetwork={networkType}
              />
            )}
            
            {activeTab === "advisory" && (
              <OptimizerTab towers={towers} />
            )}
            
            {activeTab === "settings" && (
              <SettingsTab
                isOffline={isOffline}
                onToggleOffline={handleToggleOffline}
                latitude={latitude}
                longitude={longitude}
                onChangeCoordinates={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setSelectedTower(null);
                }}
                onRequestGeolocation={handleRequestGeolocation}
              />
            )}

            {/* Jetpack Compose Bottom Navigation Bar simulation */}
            <div className="h-14 bg-[#141421] border-t border-[#1e1e2d] flex justify-around items-center px-1.5 z-30">
              <button
                onClick={() => setActiveTab("map")}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
                  activeTab === "map" ? "text-cyan-400 font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Map className="w-4 h-4" />
                <span className="text-[7.5px] font-mono tracking-wider font-bold uppercase mt-1">Map</span>
              </button>
              
              <button
                onClick={() => setActiveTab("signal")}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
                  activeTab === "signal" ? "text-cyan-400 font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span className="text-[7.5px] font-mono tracking-wider font-bold uppercase mt-1">Signal</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
                  activeTab === "history" ? "text-cyan-400 font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <LineChart className="w-4 h-4" />
                <span className="text-[7.5px] font-mono tracking-wider font-bold uppercase mt-1">History</span>
              </button>
              
              <button
                onClick={() => setActiveTab("advisory")}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
                  activeTab === "advisory" ? "text-cyan-400 font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Award className="w-4 h-4" />
                <span className="text-[7.5px] font-mono tracking-wider font-bold uppercase mt-1">Advisor</span>
              </button>
              
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
                  activeTab === "settings" ? "text-cyan-400 font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-[7.5px] font-mono tracking-wider font-bold uppercase mt-1">Config</span>
              </button>
            </div>
          </PhoneSimulator>
        </div>

      </div>
    </div>
  );
}
