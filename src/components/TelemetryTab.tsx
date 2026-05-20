import React, { useState } from "react";
import { CellTower } from "../types";
import { Radio, RefreshCw, Cpu, Activity, ArrowDown, ArrowUp, CheckCircle, WifiOff } from "lucide-react";
import { motion } from "motion/react";

interface TelemetryTabProps {
  signalStrength: number;
  operator: string;
  networkType: string;
  towers: CellTower[];
  isOffline: boolean;
}

export function TelemetryTab({
  signalStrength,
  operator,
  networkType,
  towers,
  isOffline,
}: TelemetryTabProps) {
  const [testing, setTesting] = useState(false);
  const [speedTest, setSpeedTest] = useState<{
    ping: number;
    down: number;
    up: number;
    jitter: number;
  } | null>(null);

  // Map dBm power -120 to -40 as progress percent (0 to 100)
  const percentage = Math.max(0, Math.min(100, Math.round(((signalStrength + 120) * 100) / 80)));
  const strokeDashoffset = 283 - (283 * (percentage * 0.75)) / 100; // 3/4 circular gauge

  const getSignalQuality = (dbm: number) => {
    if (dbm >= -80) return { text: "EXCELLENT", desc: "No attenuation. S/N ratio optimum.", color: "text-emerald-400" };
    if (dbm >= -95) return { text: "GOOD", desc: "Strong link density. Steady throughput.", color: "text-cyan-400" };
    if (dbm >= -110) return { text: "FAIR / MARGINAL", desc: "Co-channel interference possible.", color: "text-yellow-400" };
    return { text: "CRITICAL", desc: "Multipath fading. Call drops probable.", color: "text-red-500" };
  };

  const getOperatorGradient = (op: string) => {
    switch (op) {
      case "Jio": return "from-blue-600 to-indigo-950";
      case "Airtel": return "from-red-600 to-rose-950";
      case "Vi": return "from-yellow-500 to-amber-950";
      case "BSNL": return "from-orange-500 to-amber-950";
      default: return "from-cyan-500 to-slate-950";
    }
  };

  const getSignalColorClass = (dbm: number) => {
    if (dbm >= -80) return "stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]";
    if (dbm >= -95) return "stroke-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]";
    if (dbm >= -110) return "stroke-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]";
    return "stroke-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  };

  const triggerDiagnosticCheck = () => {
    setTesting(true);
    setSpeedTest(null);

    // Stagger scan values to represent simulated hardware network analytics
    setTimeout(() => {
      setSpeedTest({
        ping: Math.round(12 + Math.random() * 25),
        down: signalStrength >= -80 ? Math.round(280 + Math.random() * 90) :
              signalStrength >= -95 ? Math.round(110 + Math.random() * 40) :
              signalStrength >= -110 ? Math.round(18 + Math.random() * 15) : Math.round(1 + Math.random() * 2),
        up: signalStrength >= -80 ? Math.round(45 + Math.random() * 15) :
            signalStrength >= -95 ? Math.round(18 + Math.random() * 10) :
            signalStrength >= -110 ? Math.round(2 + Math.random() * 4) : 0.4,
        jitter: Math.round(1 + Math.random() * 5),
      });
      setTesting(false);
    }, 2000);
  };

  const quality = getSignalQuality(signalStrength);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col bg-[#0a0a0f] space-y-4">
      
      {/* Title */}
      <div className="text-center">
        <h3 className="text-xs font-mono font-bold tracking-widest text-[#00e5ff] uppercase">
          Live Air Telemetry
        </h3>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">RF Power Spectrum Density</p>
      </div>

      {/* Main Gauge Indicator Circle */}
      <div className="flex justify-center py-2 relative">
        <div className="w-48 h-48 relative flex items-center justify-center">
          
          {/* Circular SVG Gauge Progress */}
          <svg className="w-full h-full -rotate-[225deg]" viewBox="0 0 100 100">
            {/* Guide track */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#131322"
              strokeWidth="6"
              strokeDasharray="212 283"
              strokeLinecap="round"
            />
            {/* Value stroke tracker */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              className={`transition-all duration-700 ${getSignalColorClass(signalStrength)}`}
              strokeWidth="7"
              strokeDasharray="212 283"
              strokeDashoffset={212 - (212 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>

          {/* Central Values Details block */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase text-gray-500 font-mono font-bold tracking-widest">
              {networkType} Link
            </span>
            <div className="flex items-baseline justify-center font-mono my-0.5">
              <span className="text-4xl font-black tracking-tighter text-white">{signalStrength}</span>
              <span className="text-xs font-bold text-cyan-400 ml-1">dBm</span>
            </div>
            <div className={`text-[10px] font-extrabold font-mono tracking-wide ${quality.color}`}>
              {quality.text}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics Telemetry Test Module */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#00e5ff]" />
            <span className="text-11px font-bold font-mono text-white">Ad-hoc Diagnostic Test</span>
          </div>
          <button
            onClick={triggerDiagnosticCheck}
            disabled={testing || isOffline}
            className={`px-2.5 py-1 text-[10px] font-mono font-extrabold tracking-wider rounded-md border flex items-center gap-1 transition-all ${
              testing
                ? "bg-cyan-950 border-cyan-800 text-cyan-400 cursor-not-allowed"
                : isOffline
                ? "bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-black border-[#00e5ff] text-[#00e5ff] hover:bg-cyan-500 hover:text-black cursor-pointer active:scale-95"
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${testing ? "animate-spin" : ""}`} />
            <span>{testing ? "SCANNING RF..." : "AUDIT LINK"}</span>
          </button>
        </div>

        {speedTest ? (
          <div className="grid grid-cols-3 gap-2 font-mono text-[10px] pt-1">
            <div className="p-2 bg-[#09090f] rounded border border-emerald-900/30 text-center">
              <div className="text-gray-500 flex items-center justify-center gap-1"><ArrowDown className="w-3 h-3 text-emerald-400" />DOWN</div>
              <div className="text-white font-bold text-sm mt-0.5">{speedTest.down} <span className="text-[9px] font-normal text-gray-400">Mbps</span></div>
            </div>
            <div className="p-2 bg-[#09090f] rounded border border-cyan-900/30 text-center">
              <div className="text-gray-500 flex items-center justify-center gap-1"><ArrowUp className="w-3 h-3 text-cyan-400" />UP</div>
              <div className="text-white font-bold text-sm mt-0.5">{speedTest.up} <span className="text-[9px] font-normal text-gray-400">Mbps</span></div>
            </div>
            <div className="p-2 bg-[#09090f] rounded border border-purple-900/30 text-center">
              <div className="text-gray-500 text-center">LATENCY</div>
              <div className="text-white font-bold text-sm mt-0.5">{speedTest.ping} <span className="text-[9px] font-normal text-gray-400">ms</span></div>
            </div>
          </div>
        ) : testing ? (
          <div className="p-3 bg-[#0a0a0f] border border-cyan-950/40 rounded flex flex-col items-center justify-center gap-1.5">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 w-1/3 rounded-full animate-[progress_1.5s_infinite]" style={{
                animationDuration: '1.2s'
              }}></div>
            </div>
            <span className="text-[9px] font-mono text-[#00e5ff] tracking-widest animate-pulse">LOCKING TRANSLATION CHANNELS & SUBCARRIERS...</span>
          </div>
        ) : (
          <div className="text-[10px] text-center text-gray-500 font-mono py-1">
            {isOffline ? "Telematics scanning disabled in offline cached database mode." : "Run audit to compute real-time throughput metrics & channel stability values."}
          </div>
        )}
      </div>

      {/* Operator Connection Details Card */}
      <div className={`p-4 rounded-xl bg-gradient-to-br ${getOperatorGradient(operator)} border border-white/5`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-white/70">REGISTERED CARRIER</div>
            <h4 className="text-lg font-black tracking-wider text-white uppercase">{operator} NETWORK</h4>
          </div>
          <div className="bg-black/60 px-2.5 py-1 rounded border border-white/10 text-right">
            <span className="font-mono text-cyan-400 font-black text-xs">{networkType} ONLY</span>
          </div>
        </div>
        <p className="text-[10px] text-white/50 font-mono mt-2.5">
          {quality.desc}
        </p>
      </div>

      {/* Technical Specifications Registry table */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2">
        <div className="flex items-center gap-1 text-gray-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold text-white uppercase">Hardware Cell Registration</span>
        </div>
        <div className="divide-y divide-[#181827] text-[10px] font-mono">
          <div className="py-2 flex justify-between">
            <span className="text-gray-500">Duplex Configuration</span>
            <span className="text-gray-300 font-semibold">{networkType === "5G" ? "TDD (Time-Division)" : "FDD (Frequency-Division)"}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-500">MIMO Profile Antennas</span>
            <span className="text-gray-300 font-semibold">{networkType === "5G" ? "64T64R Massive MIMO" : "4X4 Dual Polarized"}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-500">Carrier Registered Cell (CID)</span>
            <span className="text-[#00e5ff] font-extrabold">26048128</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-500">Tracking Area Code (TAC)</span>
            <span className="text-[#00e5ff] font-extrabold">8192</span>
          </div>
        </div>
      </div>

    </div>
  );
}
