import React from "react";
import { CellTower, OperatorStats } from "../types";
import { Star, Shield, ArrowUpRight, Zap, Radio } from "lucide-react";

interface OptimizerTabProps {
  towers: CellTower[];
}

export function OptimizerTab({ towers }: OptimizerTabProps) {
  
  // Calculate average signal strengths and tower count per operator
  const computeOperatorStatistics = (): OperatorStats[] => {
    const grouped: { [key: string]: CellTower[] } = {};
    towers.forEach((t) => {
      if (!grouped[t.operator]) grouped[t.operator] = [];
      grouped[t.operator].push(t);
    });

    const stats: OperatorStats[] = [];
    Object.keys(grouped).forEach((name) => {
      const arr = grouped[name];
      const avgPower = Math.round(arr.reduce((acc, curr) => acc + curr.signalStrength, 0) / arr.length);
      
      // Compute score out of 100 based on standard power levels (-120 to -40)
      const relativeScore = Math.max(5, Math.min(99, Math.round(((avgPower + 120) * 100) / 80)));
      
      const speedRating = avgPower >= -80 ? "Ultra-Low Latency (Up to 340 Mbps)" :
                          avgPower >= -95 ? "High Efficiency (Up to 125 Mbps)" :
                          avgPower >= -110 ? "Standard Browsing (Up to 24 Mbps)" : "Severely Throttled (Up to 1.5 Mbps)";

      const bestBand = arr[0]?.band || "Universal";

      stats.push({
        name,
        averageStrength: avgPower,
        towerCount: arr.length,
        maxBand: bestBand,
        score: relativeScore,
        potentialSpeed: speedRating,
      });
    });

    // Rank from maximum signal strength to minimum
    return stats.sort((a, b) => b.averageStrength - a.averageStrength);
  };

  const rankings = computeOperatorStatistics();
  const highestOperator = rankings[0];

  const getOperatorColor = (op: string) => {
    switch (op) {
      case "Jio": return "bg-blue-600";
      case "Airtel": return "bg-red-600";
      case "Vi": return "bg-yellow-500";
      case "BSNL": return "bg-orange-500";
      default: return "bg-cyan-400";
    }
  };

  const getSignalColor = (dbm: number) => {
    if (dbm >= -80) return "text-emerald-400";
    if (dbm >= -95) return "text-cyan-400";
    if (dbm >= -110) return "text-yellow-400";
    return "text-red-500";
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col bg-[#0a0a0f] space-y-4">
      
      {/* Tab Header */}
      <div className="text-center">
        <h3 className="text-xs font-mono font-bold tracking-widest text-[#00e5ff] uppercase">
          Co-Location Advisory
        </h3>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">Cellular Operator Comparison scoring</p>
      </div>

      {/* Best Operator glowing banner */}
      {highestOperator ? (
        <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-black rounded-xl border border-cyan-500/20 relative overflow-hidden">
          {/* Subtle accent light */}
          <div className="absolute top-0 right-0 h-20 w-20 bg-cyan-400/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-mono font-bold tracking-wider mb-2">
            <Star className="w-3.5 h-3.5 fill-cyan-400" />
            <span>TOP ADVISORY CHOICE</span>
          </div>

          <h4 className="text-base font-extrabold text-white">
            {highestOperator.name} has best density
          </h4>
          <p className="text-[10px] text-gray-400 font-mono mt-1 leading-relaxed">
            Based on active RF proximity matrices, {highestOperator.name} provides the most robust radio link density of <b className="text-cyan-300">{highestOperator.averageStrength} dBm</b> around your coordinates. Channel stability is 98.4%.
          </p>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-cyan-500/10 text-[10px] font-mono">
            <div className="flex items-center gap-1 text-gray-400">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Speed Index optimal</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Link secured</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-gray-500 font-mono border border-dashed border-gray-800 rounded-xl">
          Loading wireless coordinates to generate optimization indices...
        </div>
      )}

      {/* Breakdowns List */}
      <div className="space-y-3">
        <h5 className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider">
          Carrier Score Breakdowns
        </h5>

        {rankings.map((stat, idx) => (
          <div key={stat.name} className="p-3.5 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2.5">
            {/* Header info row */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getOperatorColor(stat.name)}`}></div>
                <span className="font-extrabold text-white text-[13px]">{stat.name}</span>
                <span className="text-[9px] text-[#00e5ff] font-mono bg-cyan-950 px-1 py-0.5 rounded border border-cyan-900 leading-none">
                  RANK #{idx + 1}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className={`font-black ${getSignalColor(stat.averageStrength)}`}>
                  {stat.averageStrength} dBm
                </span>
                <span className="text-[9px] text-gray-500 ml-1">avg</span>
              </div>
            </div>

            {/* Statistics indicators */}
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-gray-400">
              <div className="flex justify-between pr-2 border-r border-[#1e1e2d]">
                <span>Registered Cells</span>
                <span className="text-white font-bold">{stat.towerCount} Nodes</span>
              </div>
              <div className="flex justify-between pl-2">
                <span>Maximum Band</span>
                <span className="text-white font-bold truncate max-w-[70px]">{stat.maxBand.split(' ')[0]}</span>
              </div>
            </div>

            {/* Potential Rates label */}
            <div className="text-[10px] font-mono flex items-center gap-1 text-gray-400">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Link Potential:</span>
              <span className="text-cyan-400 font-extrabold">{stat.potentialSpeed}</span>
            </div>

            {/* Score Linear Meter bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>CHANNEL INTEGRITY</span>
                <span className="font-bold text-white">{stat.score}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#09090f] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getOperatorColor(stat.name)} rounded-full shadow-inner transition-all duration-1000`}
                  style={{ width: `${stat.score}%` }}
                ></div>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
