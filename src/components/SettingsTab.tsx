import React, { useState } from "react";
import { Compass, Database, Shield, Radio, Activity, MapPin } from "lucide-react";
import { motion } from "motion/react";

interface SettingsTabProps {
  isOffline: boolean;
  onToggleOffline: (offline: boolean) => void;
  latitude: number;
  longitude: number;
  onChangeCoordinates: (lat: number, lng: number) => void;
  onRequestGeolocation: () => void;
}

export function SettingsTab({
  isOffline,
  onToggleOffline,
  latitude,
  longitude,
  onChangeCoordinates,
  onRequestGeolocation,
}: SettingsTabProps) {
  const [customLat, setCustomLat] = useState(latitude.toString());
  const [customLng, setCustomLng] = useState(longitude.toString());

  const presetCities = [
    { name: "Bangalore Hub", lat: 12.9716, lng: 77.5946 },
    { name: "Delhi Connect", lat: 28.6304, lng: 77.2177 },
    { name: "Mumbai Marine", lat: 18.9256, lng: 72.8242 },
    { name: "Kolkata Sector 5", lat: 22.5726, lng: 88.4256 },
    { name: "Chennai Tech", lat: 12.9229, lng: 80.2201 },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onChangeCoordinates(lat, lng);
    }
  };

  const handlePresetClick = (lat: number, lng: number) => {
    setCustomLat(lat.toString());
    setCustomLng(lng.toString());
    onChangeCoordinates(lat, lng);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col bg-[#0a0a0f] space-y-4 font-mono text-[11px]">
      
      {/* Tab Header */}
      <div className="text-center">
        <h3 className="text-xs font-bold tracking-widest text-[#00e5ff] uppercase">
          Device Configurations
        </h3>
        <p className="text-[10px] text-gray-500 mt-0.5">Adjust GPS simulation limits and scopes</p>
      </div>

      {/* Database/Cache Card */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#00e5ff]" />
            <span className="font-bold text-white">OFFLINE MODE CACHE</span>
          </div>
          <button
            onClick={() => onToggleOffline(!isOffline)}
            className={`w-9 h-5 rounded-full p-0.5 transition-all outline-hidden ${
              isOffline ? "bg-[#0b515c] flex items-center justify-end" : "bg-[#181827] flex items-center justify-start border border-gray-800"
            }`}
          >
            <div className={`w-4 h-4 rounded-full shadow-md transition-all ${isOffline ? "bg-[#00e5ff]" : "bg-gray-600"}`}></div>
          </button>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Locks coordinates database and ignores network queries. Reads locally cached tower configurations back on start.
        </p>
      </div>

      {/* GPS Coordinate Simulator */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-[#00e5ff]" />
          <span className="font-bold text-white uppercase">GPS Coordinates Synthesizer</span>
        </div>
        
        <p className="text-[10px] text-gray-500">
          Fake or test cellular operations by shifting coordinates to trigger nearby cell calculation metrics:
        </p>

        {/* Preset City pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presetCities.map((city) => (
            <button
              key={city.name}
              onClick={() => handlePresetClick(city.lat, city.lng)}
              className="px-2 py-1 text-[9px] bg-[#09090f] rounded-md border border-[#1f1f2e] text-gray-400 hover:text-[#00e5ff] hover:border-[#00e5ff] cursor-pointer"
            >
              {city.name}
            </button>
          ))}
          <button
            onClick={onRequestGeolocation}
            className="px-2 py-1 text-[9px] bg-cyan-950/40 rounded-md border border-cyan-800 text-cyan-400 hover:bg-cyan-500 hover:text-black cursor-pointer flex items-center gap-0.5"
          >
            <MapPin className="w-2.5 h-2.5" />
            <span>Use Real GPS</span>
          </button>
        </div>

        {/* Custom coordinate inputs */}
        <form onSubmit={handleCustomSubmit} className="space-y-2 pt-2 border-t border-gray-900/40">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 block mb-1">LATITUDE</label>
              <input
                type="text"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-full text-[10px] p-2 bg-[#09090f] rounded border border-[#1e1e2d] text-white focus:outline-hidden focus:border-[#00e5ff]"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 block mb-1">LONGITUDE</label>
              <input
                type="text"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="w-full text-[10px] p-2 bg-[#09090f] rounded border border-[#1e1e2d] text-white focus:outline-hidden focus:border-[#00e5ff]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold tracking-widest text-[10px] rounded-md active:scale-98 transition-all cursor-pointer"
          >
            APPLY TRANSLATE VECTOR
          </button>
        </form>
      </div>

      {/* Diagnostic details */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2 text-gray-500">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Activity className="w-4 h-4 text-[#00e5ff]" />
          <span>DIAGNOSTICS SPEC SHEET</span>
        </div>
        <div className="space-y-1 pt-1 font-mono text-[10px]">
          <div className="flex justify-between">
            <span>Operating Status:</span>
            <span className="text-emerald-400 font-bold">● Normal</span>
          </div>
          <div className="flex justify-between">
            <span>Telephony Sample rate:</span>
            <span>5000 ms</span>
          </div>
          <div className="flex justify-between">
            <span>GPS precision lock:</span>
            <span>Accurate to 12m</span>
          </div>
          <div className="flex justify-between">
            <span>Active Coordinates:</span>
            <span className="text-gray-300">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
