import React, { useState, useEffect } from "react";
import { Signal, Wifi, Battery, ShieldAlert, Cpu } from "lucide-react";

interface PhoneSimulatorProps {
  children: React.ReactNode;
  operator: string;
  networkType: string;
  isOffline: boolean;
  latitude: number;
  longitude: number;
}

export function PhoneSimulator({
  children,
  operator,
  networkType,
  isOffline,
  latitude,
  longitude
}: PhoneSimulatorProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // key 0 as 12
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto my-4 w-full max-w-[410px] aspect-[9/19] rounded-[48px] border-8 border-[#1f1f2e] bg-[#020205] p-2.5 shadow-2xl ring-1 ring-cyan-500/20">
      {/* Speaker Bar & Camera Notch */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#12121c] rounded-full z-50 flex items-center justify-center border border-gray-800/50">
        <div className="h-1 w-8 bg-gray-700 rounded-full mr-2"></div>
        <div className="h-2.5 w-2.5 bg-[#08080f] rounded-full border border-gray-800"></div>
      </div>

      {/* Internal Phone Bezel Guard */}
      <div className="relative w-full h-full rounded-[38px] bg-[#0a0a0f] flex flex-col overflow-hidden select-none select-none">
        
        {/* Simulated Android Status Bar */}
        <div className="h-8 pt-1.5 px-6 flex justify-between items-center text-[11px] font-medium font-sans text-gray-400 bg-black/40 z-30">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-cyan-400">{time}</span>
            {!isOffline && (
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                {operator}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOffline ? (
              <div className="flex items-center gap-0.5 text-amber-500 text-[9px] font-bold">
                <ShieldAlert className="w-3 h-3" />
                <span>OFFLINE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-cyan-400 font-extrabold font-mono tracking-tighter mr-0.5">
                  {networkType}
                </span>
                <Signal className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            )}
            <Wifi className="w-3.5 h-3.5 text-gray-400" />
            <Battery className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Dynamic Simulator Screen Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0f]">
          {children}
        </div>

        {/* Bottom Android Gesture Capsule pill */}
        <div className="h-4 w-full flex items-center justify-center bg-transparent z-40">
          <div className="h-1 w-24 bg-gray-600 rounded-full opacity-60"></div>
        </div>
      </div>

      {/* Side Volume Keys Buttons & Power Button Mock */}
      <div className="absolute top-28 -right-2 h-14 w-1 bg-[#1e1e2d] rounded-l-md"></div>
      <div className="absolute top-48 -right-2 h-10 w-1 bg-[#1e1e2d] rounded-l-md"></div>
      <div className="absolute top-24 -left-2 h-10 w-1 bg-[#1e1e2d] rounded-r-md"></div>
    </div>
  );
}
