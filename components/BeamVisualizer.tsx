import React, { useMemo, useRef } from 'react';
import { BeamStructure, SupportType, LoadType } from '../types';
import { Download } from 'lucide-react';

interface BeamVisualizerProps {
  data: BeamStructure;
}

const PADDING_X = 60;
const PADDING_Y = 100;
const BEAM_Y = 150;

export const BeamVisualizer: React.FC<BeamVisualizerProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate scaling factor
  const scale = useMemo(() => {
    const availableWidth = 800 - (PADDING_X * 2);
    return data.totalLength > 0 ? availableWidth / data.totalLength : 1;
  }, [data.totalLength]);

  const getX = (pos: number) => PADDING_X + pos * scale;

  const handleDownloadSvg = () => {
    if (svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'beam_structure.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Renderers ---
  
  const renderSupport = (type: SupportType, x: number, y: number, id: string) => {
    const size = 15;
    switch (type) {
      case SupportType.FIXED:
        return (
            <g key={id}>
                 <line x1={x} y1={y - 25} x2={x} y2={y + 25} stroke="#1e293b" strokeWidth="4" strokeLinecap="round"/>
                 {[...Array(6)].map((_, i) => (
                     <line key={i} x1={x} y1={y - 25 + (i*8)} x2={x - 10} y2={y - 25 + (i*8) + 10} stroke="#94a3b8" strokeWidth="2" />
                 ))}
            </g>
        );
      case SupportType.PIN:
        return (
          <g key={id}>
            <path d={`M ${x} ${y} L ${x - 12} ${y + 20} L ${x + 12} ${y + 20} Z`} fill="white" stroke="#1e293b" strokeWidth="2" />
            <line x1={x - 18} y1={y + 20} x2={x + 18} y2={y + 20} stroke="#1e293b" strokeWidth="2" />
            {[...Array(4)].map((_, i) => (
                <line key={i} x1={x - 15 + (i*8)} y1={y + 20} x2={x - 21 + (i*8)} y2={y + 28} stroke="#94a3b8" strokeWidth="1.5" />
            ))}
          </g>
        );
      case SupportType.ROLLER:
        return (
          <g key={id}>
            <circle cx={x} cy={y + 10} r={10} fill="white" stroke="#1e293b" strokeWidth="2" />
            <line x1={x - 18} y1={y + 20} x2={x + 18} y2={y + 20} stroke="#1e293b" strokeWidth="2" />
             {[...Array(4)].map((_, i) => (
                <line key={i} x1={x - 15 + (i*8)} y1={y + 20} x2={x - 21 + (i*8)} y2={y + 28} stroke="#94a3b8" strokeWidth="1.5" />
            ))}
          </g>
        );
      case SupportType.HINGE:
          return (
              <g key={id}>
                  <circle cx={x} cy={y} r={4} fill="white" stroke="#1e293b" strokeWidth="2" />
              </g>
          )
      default:
        return null;
    }
  };

  const renderLoads = () => {
    return data.loads.map((load, idx) => {
      const startX = getX(load.start);
      const endX = getX(load.end);
      const width = endX - startX;
      const isUp = load.direction === 'UP';
      const isMoment = load.type === LoadType.MOMENT;
      const dirMult = isUp ? -1 : 1; 
      
      // Visual parameters
      const arrowHeight = 40;
      const arrowHeadY = BEAM_Y;
      const arrowTailY = BEAM_Y - (arrowHeight * dirMult); 
      const labelY = arrowTailY - (15 * dirMult);

      if (isMoment) {
        const r = 20;
        const cx = startX;
        const cy = BEAM_Y;
        const isClockwise = load.direction === 'CLOCKWISE';
        // Draw arc
        const startAngle = isClockwise ? 220 : -40;
        const endAngle = isClockwise ? -40 : 220;
        // Simple arc approximation for visualization
        return (
            <g key={load.id}>
                <path 
                    d={isClockwise 
                        ? `M ${cx-15} ${cy-15} A ${r} ${r} 0 1 1 ${cx+15} ${cy-15}` 
                        : `M ${cx+15} ${cy-15} A ${r} ${r} 0 1 0 ${cx-15} ${cy-15}`
                    }
                    fill="none" 
                    stroke="#d946ef" 
                    strokeWidth="3"
                />
                <path 
                    d={isClockwise 
                        ? `M ${cx+15} ${cy-15} l -5 -5 M ${cx+15} ${cy-15} l 2 -8`
                        : `M ${cx-15} ${cy-15} l 5 -5 M ${cx-15} ${cy-15} l -2 -8`
                    }
                    stroke="#d946ef" strokeWidth="3" fill="none"
                />
                 <text x={cx} y={cy - 35} textAnchor="middle" className="text-xs fill-fuchsia-600 font-bold">
                    {load.symbol} ({load.magnitude}{load.unit})
                </text>
            </g>
        )
      }

      if (load.type === LoadType.DISTRIBUTED) {
        const numArrows = Math.max(2, Math.floor(width / 15));
        const arrowSpacing = width / (numArrows > 1 ? numArrows - 1 : 1);
        
        return (
          <g key={load.id}>
            <rect x={startX} y={Math.min(arrowTailY, arrowHeadY)} width={width} height={Math.abs(arrowTailY - arrowHeadY)} fill="rgba(239, 68, 68, 0.1)" />
            <line x1={startX} y1={arrowTailY} x2={endX} y2={arrowTailY} stroke="#ef4444" strokeWidth="2" />
            
            {[...Array(numArrows)].map((_, i) => {
                const ax = startX + (i * arrowSpacing);
                return (
                    <g key={i}>
                        <line x1={ax} y1={arrowTailY} x2={ax} y2={arrowHeadY} stroke="#ef4444" strokeWidth="1.5" />
                        <path d={`M ${ax-3} ${arrowHeadY - (5*dirMult)} L ${ax} ${arrowHeadY} L ${ax+3} ${arrowHeadY - (5*dirMult)}`} fill="#ef4444" />
                    </g>
                );
            })}
            <text x={startX + width/2} y={labelY} textAnchor="middle" className="text-xs fill-red-600 font-bold">
                {load.symbol} = {load.magnitude}{load.unit}
            </text>
          </g>
        );
      } else {
        // Point Load
        return (
          <g key={load.id}>
            <line x1={startX} y1={arrowTailY} x2={startX} y2={arrowHeadY} stroke="#ef4444" strokeWidth="3" />
            <path d={`M ${startX-5} ${arrowHeadY - (8*dirMult)} L ${startX} ${arrowHeadY} L ${startX+5} ${arrowHeadY - (8*dirMult)}`} fill="#ef4444" />
            <text x={startX} y={labelY} textAnchor="middle" className="text-xs fill-red-600 font-bold">
                {load.symbol} = {load.magnitude}{load.unit}
            </text>
          </g>
        );
      }
    });
  };

  const renderDimensions = () => {
      return data.dimensions.map((dim) => {
          const y = BEAM_Y + 50 + (dim.yOffset || 0);
          const x1 = getX(dim.start);
          const x2 = getX(dim.end);
          
          if (Math.abs(x2 - x1) < 1) return null;

          return (
              <g key={dim.id}>
                  {/* Tick marks */}
                  <line x1={x1} y1={BEAM_Y + 15} x2={x1} y2={y+5} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />
                  <line x1={x2} y1={BEAM_Y + 15} x2={x2} y2={y+5} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />
                  
                  {/* Main line */}
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead-rev)" />
                  
                  {/* Label */}
                  <rect x={(x1+x2)/2 - 20} y={y-10} width="40" height="20" fill="rgba(255,255,255,0.9)" />
                  <text x={(x1+x2)/2} y={y+4} textAnchor="middle" className="text-xs fill-slate-700 font-mono">
                      {dim.symbol}={dim.value}{dim.unit}
                  </text>
              </g>
          )
      })
  }

  return (
    <div className="relative">
        <div className="absolute top-2 right-2 z-10">
             <button 
                onClick={handleDownloadSvg}
                className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                title="Download SVG"
            >
                 <Download size={16} />
             </button>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-inner">
        <svg ref={svgRef} width="800" height="300" className="w-full min-w-[600px]">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                </marker>
                <marker id="arrowhead-rev" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
                    <polygon points="10 0, 0 3.5, 10 7" fill="#475569" />
                </marker>
            </defs>

            {/* Beam Body */}
            <line x1={getX(0)} y1={BEAM_Y} x2={getX(data.totalLength)} y2={BEAM_Y} stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />

            {/* Elements */}
            {data.nodes.map(node => node.supportType && renderSupport(node.supportType, getX(node.position), BEAM_Y, node.id))}
            {data.nodes.map(node => node.hasHinge && renderSupport(SupportType.HINGE, getX(node.position), BEAM_Y, node.id))}
            {renderLoads()}
            {renderDimensions()}

            {/* Node Labels */}
            {data.nodes.map(node => (
                <text key={`lbl-${node.id}`} x={getX(node.position)} y={BEAM_Y + 30} textAnchor="middle" className="text-sm fill-slate-900 font-bold">
                    {node.label}
                </text>
            ))}
        </svg>
        </div>
    </div>
  );
};
