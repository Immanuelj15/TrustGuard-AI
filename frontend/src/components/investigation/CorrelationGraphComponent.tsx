import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CorrelationGraphData, GraphNode } from '../../types';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  FileText, 
  Phone, 
  Mail, 
  Globe, 
  Link as LinkIcon, 
  Server, 
  CreditCard,
  Maximize2,
  FolderLock,
  ArrowRight,
  Database,
  Layers,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
    const w = 840;
    const h = 540;
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
    if (type === 'case') return '#3b82f6'; // blue
    if (type === 'evidence') return '#6366f1'; // indigo
    // IOCs
    switch (subType?.toUpperCase()) {
      case 'PHONE':
        return '#0284c7'; // sky
      case 'EMAIL':
        return '#4f46e5'; // indigo
      case 'URL':
        return '#d97706'; // amber
      case 'DOMAIN':
        return '#059669'; // emerald
      case 'IPV4':
        return '#9333ea'; // purple
      case 'UPI':
        return '#e11d48'; // rose
      default:
        return '#64748b'; // slate
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-700">Generating relational topology graph...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting evidence nodes to extracted indicators and communication endpoints</p>
      </div>
    );
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="py-16 px-6 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-4 shadow-xs">
          <Network className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-slate-900">No Graph Nodes Available</h4>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          This case has no ingested evidence files or extracted indicators to graph yet. Once evidence is analyzed in the workspace, relational edges between suspect contacts and artifacts will visualize here.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            to="/analysis"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <span>Analyze Evidence in Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topology Header & Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Interactive Correlation Topology</h4>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold font-mono">
                {graphData.nodes.length} Nodes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {graphData.edges.length} relational edges &bull; Drag to pan &bull; Scroll or use buttons to zoom &bull; Click node to inspect
            </p>
          </div>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
              title="Zoom In"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:shadow-xs transition cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              title="Zoom Out"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:shadow-xs transition cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <button
              onClick={handleReset}
              title="Reset View"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:shadow-xs transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        className="relative border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-md"
        style={{ height: '560px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Cyber Canvas Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{ transformOrigin: `${width / 2}px ${height / 2}px` }}
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
                    stroke={isHighlighted ? '#38bdf8' : '#334155'}
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeDasharray={edge.relation === 'MATCHES' ? '4,4' : undefined}
                    opacity={selectedNodeId ? (isHighlighted ? 1 : 0.2) : 0.6}
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
                  opacity={selectedNodeId ? (isConnected ? 1 : 0.3) : 1}
                >
                  {/* Outer halo if selected */}
                  {isSelected && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke="#38bdf8"
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
                    strokeWidth={isSelected ? 3.5 : 2}
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
                    fill="#f1f5f9"
                    fontSize="10"
                    fontWeight="500"
                    fontFamily="sans-serif"
                    className="select-none pointer-events-none drop-shadow-md"
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
              className="absolute right-3 top-3 bottom-3 w-80 bg-slate-900/95 border border-blue-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between overflow-y-auto text-slate-200"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Entity Inspector
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Category / Subtype
                  </span>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/30 uppercase">
                    {selectedNode.type} {selectedNode.subType ? `• ${selectedNode.subType}` : ''}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Identifier / Value
                  </span>
                  <p className="text-xs text-white font-mono break-all p-3 rounded-xl bg-slate-950 border border-slate-800">
                    {selectedNode.label}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Node ID
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono break-all">
                    {selectedNode.id}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Connected links highlighted on topology canvas.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend Overlay */}
        <div className="absolute left-3 bottom-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 backdrop-blur-md text-[11px] space-y-1.5 font-mono shadow-lg">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-blue-400" />
            <span>Topology Legend</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-200">Case Root</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-slate-200">Evidence File</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span className="text-slate-200">Phone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-200">URL / Domain</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-slate-200">IP Address</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-200">UPI / Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
