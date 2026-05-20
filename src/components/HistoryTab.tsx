import React, { useState, useMemo } from "react";
import { TelemetryHistoryPoint } from "../types";
import { BarChart3, Clock, TrendingDown, TrendingUp, Radio, AlertCircle, Database, HelpCircle } from "lucide-react";

interface HistoryTabProps {
  historyPoints: TelemetryHistoryPoint[];
  currentOperator: string;
  currentNetwork: string;
}

type TimeRange = "hour" | "day" | "all";

export function HistoryTab({ historyPoints, currentOperator, currentNetwork }: HistoryTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter history points based on the selected time range
  const filteredPoints = useMemo(() => {
    if (historyPoints.length === 0) return [];
    
    // Convert to sorted array by timestamp (oldest to newest for graphing)
    const sorted = [...historyPoints].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const now = new Date().getTime();
    if (timeRange === "hour") {
      // Show points from the last 60 minutes
      const oneHourAgo = now - 60 * 60 * 1000;
      return sorted.filter(p => new Date(p.timestamp).getTime() >= oneHourAgo);
    } else if (timeRange === "day") {
      // Show points from the last 24 hours
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      return sorted.filter(p => new Date(p.timestamp).getTime() >= oneDayAgo);
    }
    
    // "all" - limit to last 100 points for performance but display complete trace
    return sorted.slice(-100);
  }, [historyPoints, timeRange]);

  // Statistics
  const stats = useMemo(() => {
    if (filteredPoints.length === 0) return { min: 0, max: 0, avg: 0 };
    const dbms = filteredPoints.map(p => p.dbm);
    const min = Math.min(...dbms);
    const max = Math.max(...dbms);
    const avg = Math.round(dbms.reduce((sum, val) => sum + val, 0) / dbms.length);
    return { min, max, avg };
  }, [filteredPoints]);

  const getSignalColor = (dbm: number) => {
    if (dbm >= -80) return "text-emerald-400";
    if (dbm >= -95) return "text-cyan-400";
    if (dbm >= -110) return "text-yellow-400";
    return "text-red-500";
  };

  const getSignalDescription = (dbm: number) => {
    if (dbm >= -80) return "Excellent (Optimum throughput)";
    if (dbm >= -95) return "Good (High-fidelity)";
    if (dbm >= -110) return "Fair (Moderate load)";
    return "Poor (Near cell edge)";
  };

  // SVG Chart parameters
  const chartHeight = 140;
  const chartWidth = 280;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const minDbmLimit = -120;
  const maxDbmLimit = -40;
  const dbmRange = maxDbmLimit - minDbmLimit; // 80

  // Calculate coordinates for SVG
  const pointsData = useMemo(() => {
    if (filteredPoints.length < 2) return [];
    
    const count = filteredPoints.length;
    const xStep = (chartWidth - paddingLeft - paddingRight) / (count - 1);
    
    return filteredPoints.map((point, index) => {
      const x = paddingLeft + index * xStep;
      // Map dBm linearly to Y coordinate: maxDbmLimit is top (paddingTop), minDbmLimit is bottom (chartHeight - paddingBottom)
      const ratio = (point.dbm - minDbmLimit) / dbmRange;
      const y = chartHeight - paddingBottom - ratio * (chartHeight - paddingTop - paddingBottom);
      return { x, y, point, index };
    });
  }, [filteredPoints]);

  // Generate SVG path strings
  const svgPaths = useMemo(() => {
    if (pointsData.length < 2) return { linePath: "", areaPath: "" };
    
    let linePath = `M ${pointsData[0].x} ${pointsData[0].y}`;
    for (let i = 1; i < pointsData.length; i++) {
      // Draw smooth quadratic curved lines or simple lines. Let's do simple line for reliability
      linePath += ` L ${pointsData[i].x} ${pointsData[i].y}`;
    }

    const firstX = pointsData[0].x;
    const lastX = pointsData[pointsData.length - 1].x;
    const zeroY = chartHeight - paddingBottom;
    const areaPath = `${linePath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;

    return { linePath, areaPath };
  }, [pointsData]);

  // Handle pointer hover to fetch closest point data
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pointsData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Find nearest point
    let nearestIndex = 0;
    let minD = Infinity;
    pointsData.forEach((pt, i) => {
      const d = Math.abs(pt.x - x);
      if (d < minD) {
        minD = d;
        nearestIndex = i;
      }
    });
    setHoveredIndex(nearestIndex);
  };

  const hoveredPoint = hoveredIndex !== null ? pointsData[hoveredIndex] : null;

  // Format timestamps nicely
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col bg-[#0a0a0f] space-y-4">
      
      {/* Title */}
      <div className="text-center">
        <h3 className="text-xs font-mono font-bold tracking-widest text-[#00e5ff] uppercase">
          Signal Quality History
        </h3>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">Time-Series Telemetry Analysis</p>
      </div>

      {/* Time Range Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#141421] p-1 rounded-lg border border-[#1f1f2e] text-[10px] font-mono">
        <button
          onClick={() => { setTimeRange("hour"); setHoveredIndex(null); }}
          className={`py-1.5 rounded-md font-bold transition-all text-center uppercase cursor-pointer ${
            timeRange === "hour" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
          }`}
        >
          Last Hour
        </button>
        <button
          onClick={() => { setTimeRange("day"); setHoveredIndex(null); }}
          className={`py-1.5 rounded-md font-bold transition-all text-center uppercase cursor-pointer ${
            timeRange === "day" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
          }`}
        >
          Last Day
        </button>
        <button
          onClick={() => { setTimeRange("all"); setHoveredIndex(null); }}
          className={`py-1.5 rounded-md font-bold transition-all text-center uppercase cursor-pointer ${
            timeRange === "all" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
          }`}
        >
          Full Trace
        </button>
      </div>

      {/* Main Graph Card */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2.5 relative">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-1 text-[#00e5ff]">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="font-mono uppercase">RF DBm Time Plot</span>
          </div>
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tight">
            Compose-spec Chart simulation
          </span>
        </div>

        {/* The Graphic Canvas Block */}
        <div className="relative w-full overflow-hidden flex justify-center bg-[#0d0d16] p-2 rounded-lg border border-[#1f1f2e]">
          {filteredPoints.length >= 2 ? (
            <svg 
              className="w-full h-auto select-none overflow-visible"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ maxHeight: "150px" }}
            >
              {/* Definitions for gorgeous neon glows & areas fill */}
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                </linearGradient>
                <filter id="neonBlur" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal Reference Grids */}
              {[-50, -80, -110].map((gridVal) => {
                const ratio = (gridVal - minDbmLimit) / dbmRange;
                const gridY = chartHeight - paddingBottom - ratio * (chartHeight - paddingTop - paddingBottom);
                return (
                  <g key={gridVal} className="opacity-40">
                    <line
                      x1={paddingLeft}
                      y1={gridY}
                      x2={chartWidth - paddingRight}
                      y2={gridY}
                      stroke="#1e1e2d"
                      strokeDasharray="2,2"
                      strokeWidth="0.75"
                    />
                    <text
                      x={paddingLeft - 5}
                      y={gridY + 3}
                      fill="#5f5f6f"
                      fontSize="7"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {gridVal}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area Below Curve */}
              <path
                d={svgPaths.areaPath}
                fill="url(#chartAreaGradient)"
              />

              {/* Glowing Line Plot */}
              <path
                d={svgPaths.linePath}
                fill="transparent"
                stroke="#00e5ff"
                strokeWidth="1.75"
                strokeLinecap="round"
                filter="url(#neonBlur)"
              />

              {/* Interactive Hover Vertical Bar */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={chartHeight - paddingBottom}
                  stroke="#5f5f7f"
                  strokeWidth="0.75"
                  strokeDasharray="1,1"
                />
              )}

              {/* Key Highlights Data Points Circles */}
              {pointsData.map((pt) => {
                const isHovered = hoveredIndex === pt.index;
                const isFirstOrLast = pt.index === 0 || pt.index === pointsData.length - 1;
                
                if (isHovered || isFirstOrLast || pointsData.length < 15) {
                  return (
                    <circle
                      key={pt.index}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 4.5 : 2}
                      className="transition-all duration-150"
                      fill={isHovered ? "#ffffff" : "#00e5ff"}
                      stroke="#00e5ff"
                      strokeWidth={isHovered ? 2.5 : 0.5}
                    />
                  );
                }
                return null;
              })}

              {/* Interactive Tooltip Overlay inside SVG (Safe & Fully Compatible) */}
              {hoveredPoint && (
                <g>
                  {/* Subtle dynamic numeric tooltip text */}
                  <text
                    x={hoveredPoint.x > chartWidth - 80 ? hoveredPoint.x - 5 : hoveredPoint.x + 5}
                    y={Math.min(chartHeight - 35, Math.max(25, hoveredPoint.y - 12))}
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor={hoveredPoint.x > chartWidth - 80 ? "end" : "start"}
                  >
                    {hoveredPoint.point.dbm} dBm ({hoveredPoint.point.operator})
                  </text>
                  <text
                    x={hoveredPoint.x > chartWidth - 80 ? hoveredPoint.x - 5 : hoveredPoint.x + 5}
                    y={Math.min(chartHeight - 35, Math.max(25, hoveredPoint.y - 12)) + 10}
                    fill="#00e5ff"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor={hoveredPoint.x > chartWidth - 80 ? "end" : "start"}
                  >
                    {formatTime(hoveredPoint.point.timestamp)}
                  </text>
                </g>
              )}

              {/* Bottom Timeline Edge labels */}
              <text
                x={paddingLeft}
                y={chartHeight - 8}
                fill="#5f5f6f"
                fontSize="7"
                fontFamily="monospace"
                textAnchor="start"
              >
                {pointsData.length > 0 ? formatTime(pointsData[0].point.timestamp) : "START"}
              </text>
              <text
                x={chartWidth - paddingRight}
                y={chartHeight - 8}
                fill="#5f5f6f"
                fontSize="7"
                fontFamily="monospace"
                textAnchor="end"
              >
                {pointsData.length > 0 ? formatTime(pointsData[pointsData.length - 1].point.timestamp) : "END"}
              </text>
            </svg>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Clock className="w-6 h-6 text-cyan-400/50 animate-pulse mb-1.5" />
              <p className="text-[10px] text-gray-500 font-mono">
                Populating telemetry signal parameters...
              </p>
            </div>
          )}
        </div>

        {/* Hover info panel label helper */}
        <div className="h-6 flex items-center justify-center text-[9px] font-mono text-gray-500 border-t border-[#1a1a2b] pt-1">
          {hoveredPoint ? (
            <span className="text-white">
              Selected Point: <b className="text-cyan-400">{hoveredPoint.point.dbm} dBm</b> at {new Date(hoveredPoint.point.timestamp).toLocaleTimeString()} ({hoveredPoint.point.networkType} link)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500">
              <HelpCircle className="w-2.5 h-2.5" /> Move cursor or tap plot line to inspect timestamps
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[9px] text-gray-400">
        <div className="p-2.5 bg-[#141421] rounded-xl border border-[#1f1f2e]">
          <div className="flex items-center justify-center gap-0.5 text-red-500 font-bold mb-1">
            <TrendingDown className="w-3 h-3" />
            <span>MIN STRENGTH</span>
          </div>
          <div className="text-white text-[13px] font-extrabold">{stats.min} dBm</div>
          <div className="text-[8px] text-gray-600 mt-0.5">Worst Link</div>
        </div>

        <div className="p-2.5 bg-[#141421] rounded-xl border border-[#1f1f2e]">
          <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-bold mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>MAX STRENGTH</span>
          </div>
          <div className="text-white text-[13px] font-extrabold">{stats.max} dBm</div>
          <div className="text-[8px] text-gray-600 mt-0.5">Peak Link</div>
        </div>

        <div className="p-2.5 bg-[#141421] rounded-xl border border-[#1f1f2e]">
          <div className="flex items-center justify-center gap-0.5 text-cyan-400 font-bold mb-1">
            <Radio className="w-3 h-3" />
            <span>AVG CO-LOC</span>
          </div>
          <div className="text-white text-[13px] font-extrabold">{stats.avg} dBm</div>
          <div className="text-[8px] text-gray-500 mt-0.5 font-bold uppercase">{getSignalDescription(stats.avg).split(' ')[0]}</div>
        </div>
      </div>

      {/* Database Storage Specs Info Card */}
      <div className="p-3 bg-[#141421] rounded-xl border border-[#1f1f2e] space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
          <Database className="w-4 h-4 text-[#00e5ff]" />
          <span className="font-mono">TELEMETRY DATASTORES</span>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed font-mono">
          RF indices are committed locally to database simulation vectors. In native contexts, SQLite Room schemas write Telephony signals persistently to log link health over prolonged temporal cycles.
        </p>
        <div className="flex justify-between font-mono text-[9px] text-gray-600 border-t border-[#1b1b2d] pt-1.5">
          <span>Active Datastore:</span>
          <span className="text-[#00e5ff] font-bold">SQLite-Room / LocalDB</span>
        </div>
        <div className="flex justify-between font-mono text-[9px] text-gray-600">
          <span>Total Recorded Samples:</span>
          <span className="text-white font-bold">{historyPoints.length} nodes</span>
        </div>
      </div>

    </div>
  );
}
