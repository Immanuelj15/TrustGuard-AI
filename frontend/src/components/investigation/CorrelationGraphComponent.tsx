import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CorrelationGraphData, GraphNode, GraphEdge } from '../../types';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  FolderLock, 
  FileText, 
  Phone, 
  Mail, 
  Globe, 
  Link as LinkIcon, 
  Server, 
  CreditCard,
  Maximize2
} from 'lucide-react';

interface CorrelationGraphProps {
  graphData: CorrelationGraphData;
  loading?: boolean;
  onSelectNode?: (node: GraphNode) => void;
}

export const CorrelationGraphComponent: React.FC<CorrelationGraphProps> = ({
  graphData,
  loading,
  onSelectNode,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Filter or layout coordinates
  const { nodePositions, width, height } = useMemo(() => {
    const w = 780;
    const h = 500;
    const center = { x: w / 2, y: h / 2 };

    const positions = new Map<string, { x: number; y: number; node: GraphNode }>();
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return { nodePositions: positions, width: w, height: h };
    }

    // Separate by type
    const caseNode = graphData.nodes.find((n) => n.type === 'case');
    const evidenceNodes = graphData.nodes.filter((n) => n.type === 'evidence');
    const iocNodes = graphData.nodes.filter((n) => n.type === 'ioc');

    if (caseNode) {
      positions.set(caseNode.id, { x: center.x, y: center.y, node: caseNode });
    }

    // Distribute evidence nodes in inner ring
    const evRadius = 150;
    const evCount = evidenceNodes.length;
    evidenceNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, evCount) - Math.PI / 2;
      positions.set(node.id, {
        x: center.x + evRadius * Math.cos(angle),
        y: center.y + evRadius * Math.sin(angle),
        node,
      });
    });

    // Distribute IOC nodes in outer ring
    const iocRadius = 240;
    const iocCount = iocNodes.length;
    iocNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, iocCount);
      positions.set(node.id, {
        x: center.x + iocRadius * Math.cos(angle),
        y: center.y + iocRadius * Math.sin(angle),
        node,
      });
    });

    return { nodePositions: positions, width: w, height: h };
  }, [graphData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  const selectedNode = selectedNodeId ? nodePositions.get(selectedNodeId)?.node : null;

  // Connected edges for the selected node
  const connectedEdgeIndices = useMemo(() => {
    if (!selectedNodeId || !graphData?.edges) return new Set<number>();
    const indices = new Set<number>();
    graphData.edges.forEach((edge, idx) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        indices.add(idx);
      }
    });
    return indices;
  }, [selectedNodeId, graphData]);

  const getNodeFill = (type: string, subType?: string) => {
    if (type === 'case') return '#06b6d4'; // cyan
    if (type === 'evidence') return '#3b82f6'; // blue
    // IOCs
    switch (subType?.toUpperCase()) {
      case 'PHONE':
        return '#06b6d4';
      case 'EMAIL':
        return '#60a5fa';
      case 'URL':
        return '#f59e0b';
      case 'DOMAIN':
        return '#10b981';
      case 'IPV4':
        return '#a855f7';
      case 'UPI':
        return '#f43f5e';
      default:
        return '#e2e8f0';
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs">Generating case infrastructure graph...</p>
      </div>
    );
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="py-16 text-center border border-slate-800 rounded-xl bg-slate-900/30">
        <Network className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-300 font-medium">No correlation graph nodes available</p>
        <p className="text-xs text-slate-500 mt-1">
          Upload and analyze evidence files to generate entity correlation linkages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Network className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Interactive Correlation Topology
            </h4>
            <p className="text-[11px] text-slate-400">
              {graphData.nodes.length} entities &bull; {graphData.edges.length} relationships
            </p>
          </div>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            title="Zoom In"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            title="Reset View"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        className="relative border border-slate-800/80 rounded-xl bg-slate-950/80 overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ height: '520px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            transform-origin={`${width / 2} ${height / 2}`}
          >
            {/* Draw Edges */}
            {graphData.edges.map((edge, idx) => {
              const srcPos = nodePositions.get(edge.source);
              const tgtPos = nodePositions.get(edge.target);
              if (!srcPos || !tgtPos) return null;

              const isHighlighted = connectedEdgeIndices.has(idx);

              return (
                <g key={idx}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={isHighlighted ? '#22d3ee' : '#334155'}
                    strokeWidth={isHighlighted ? 2.5 : 1}
                    strokeDasharray={edge.relation === 'MATCHES' ? '4,4' : undefined}
                    opacity={selectedNodeId ? (isHighlighted ? 1 : 0.25) : 0.6}
                  />
                  {isHighlighted && (
                    <text
                      x={(srcPos.x + tgtPos.x) / 2}
                      y={(srcPos.y + tgtPos.y) / 2 - 4}
                      fill="#38bdf8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.relation}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw Nodes */}
            {Array.from(nodePositions.values()).map(({ x, y, node }) => {
              const isSelected = selectedNodeId === node.id;
              const isConnected =
                isSelected ||
                (selectedNodeId &&
                  graphData.edges.some(
                    (e) =>
                      (e.source === selectedNodeId && e.target === node.id) ||
                      (e.target === selectedNodeId && e.source === node.id)
                  ));

              const nodeColor = getNodeFill(node.type, node.subType);
              const radius = node.type === 'case' ? 24 : node.type === 'evidence' ? 18 : 14;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(isSelected ? null : node.id);
                    if (onSelectNode) onSelectNode(node);
                  }}
                  className="cursor-pointer transition-transform hover:scale-110"
                  opacity={selectedNodeId ? (isConnected ? 1 : 0.35) : 1}
                >
                  {/* Outer halo if selected */}
                  {isSelected && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="animate-spin"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={radius}
                    fill="#0f172a"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />

                  {/* Centered Node Icon / Label */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={nodeColor}
                    fontSize={node.type === 'case' ? '11' : '10'}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {node.type === 'case'
                      ? 'CASE'
                      : node.type === 'evidence'
                      ? 'EV'
                      : (node.subType || 'IOC').slice(0, 3)}
                  </text>

                  {/* Label Text below node */}
                  <text
                    y={radius + 14}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="10"
                    fontFamily="sans-serif"
                    className="select-none pointer-events-none"
                  >
                    {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Node Details Drawer */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-3 top-3 bottom-3 w-72 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                    Entity Inspector
                  </span>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Type
                  </span>
                  <span className="text-xs font-semibold text-cyan-400 font-mono uppercase">
                    {selectedNode.type} {selectedNode.subType ? `(${selectedNode.subType})` : ''}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Identifier / Label
                  </span>
                  <p className="text-xs text-slate-200 font-mono break-all p-2 rounded bg-slate-950 border border-slate-800">
                    {selectedNode.label}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Entity ID
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono break-all">
                    {selectedNode.id}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                Connected edges highlighted on topology canvas.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend Overlay */}
        <div className="absolute left-3 bottom-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 backdrop-blur-sm text-[11px] space-y-1.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">Case Root</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-slate-300">Evidence File</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-300">URL / Domain</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span className="text-slate-300">IP Address</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <span className="text-slate-300">UPI / Financial</span>
          </div>
        </div>
      </div>
    </div>
  );
};
