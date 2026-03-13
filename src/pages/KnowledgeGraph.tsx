import { useQuery } from "@tanstack/react-query";
import { getGraphStats, searchGraphParts } from "@/lib/api";
import { useState, useMemo } from "react";
import {
  Search,
  Network,
  Box,
  FlaskConical,
  ShieldCheck,
  Factory,
  Pipette,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Zap,
  BookOpen,
  Layers,
  Loader2,
  ChevronRight,
  Database,
  GitBranch,
  Sparkles,
} from "lucide-react";

// ── Demo / fallback data ────────────────────────────────────────────────────

const DEMO_STATS = {
  nodes: { Product: 52_340, Substrate: 1_870, Regulation: 640, Industry: 95, Application: 1_240 },
  edges: {
    COMPATIBLE_WITH: 184_500,
    INCOMPATIBLE_WITH: 23_100,
    CERTIFIED_FOR: 12_400,
    REQUIRES_HANDLING: 8_750,
    REGULATED_BY: 6_320,
    SUBSTITUTES_FOR: 14_900,
    CO_PURCHASED_WITH: 41_200,
    USED_IN_APPLICATION: 29_600,
  },
};

const ENTITY_TYPES = [
  {
    name: "Products",
    count: "50K+",
    description: "SKUs with chemical properties, SDS data, TDS specs",
    color: "blue",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
    icon: Box,
  },
  {
    name: "Substrates",
    count: "1,870",
    description: "Materials, compatibility matrices, surface types",
    color: "purple",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    text: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300",
    icon: FlaskConical,
  },
  {
    name: "Regulations",
    count: "640",
    description: "FDA, REACH, EPA, MIL-spec, NSF standards",
    color: "red",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
    icon: ShieldCheck,
  },
  {
    name: "Industries",
    count: "95",
    description: "Aerospace, food processing, pharma, water treatment",
    color: "green",
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    text: "text-green-400",
    badge: "bg-green-500/20 text-green-300",
    icon: Factory,
  },
  {
    name: "Applications",
    count: "1,240",
    description: "Degreasing, coating prep, CIP, synthesis, lubrication",
    color: "teal",
    bg: "bg-teal-500/15",
    border: "border-teal-500/30",
    text: "text-teal-400",
    badge: "bg-teal-500/20 text-teal-300",
    icon: Pipette,
  },
];

const RELATIONSHIPS = [
  { name: "COMPATIBLE_WITH", source: "Lab test / TDS", critical: true },
  { name: "INCOMPATIBLE_WITH", source: "Lab test / TDS", critical: true },
  { name: "CERTIFIED_FOR", source: "Quality agreement", critical: true },
  { name: "REQUIRES_HANDLING", source: "SDS / DOT", critical: true },
  { name: "REGULATED_BY", source: "Regulatory DB", critical: true },
  { name: "SUBSTITUTES_FOR", source: "Product mgmt", critical: "medium" as const },
  { name: "CO_PURCHASED_WITH", source: "Transaction data", critical: false },
  { name: "USED_IN_APPLICATION", source: "App guide", critical: false },
];

const RETRIEVAL_MODES = [
  {
    mode: "Mode 1: Graph-First",
    icon: GitBranch,
    color: "from-blue-500/20 to-blue-600/5",
    borderColor: "border-blue-500/30",
    accentColor: "text-blue-400",
    query: '"What works with polypropylene under FDA requirements?"',
    flow: "Graph traversal \u2192 candidate products \u2192 RAG retrieves supporting TDS sections",
    best: "Compatibility queries with specific constraints",
  },
  {
    mode: "Mode 2: RAG-First",
    icon: BookOpen,
    color: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/30",
    accentColor: "text-purple-400",
    query: '"Tell me about solvents for precision cleaning"',
    flow: "Semantic search \u2192 relevant doc chunks \u2192 Graph enriches with relationships",
    best: "Open-ended discovery and exploration",
  },
  {
    mode: "Mode 3: Combined",
    icon: Sparkles,
    color: "from-orange-500/20 to-orange-600/5",
    borderColor: "border-orange-500/30",
    accentColor: "text-orange-400",
    query: '"What\'s compatible for polycarbonate cleaning under 200\u00b0F?"',
    flow: "Graph narrows by constraints \u2192 RAG provides thermal data \u2192 Claude reasons across both",
    best: "Multi-constraint queries (most valuable)",
  },
];

// ── Graph Visualization Data ────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  type: "product" | "substrate" | "regulation" | "industry" | "application";
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

const GRAPH_NODES: GraphNode[] = [
  // Products (blue)
  { id: "p1", label: "MC-710", type: "product", x: 50, y: 40 },
  { id: "p2", label: "SC-200", type: "product", x: 30, y: 65 },
  { id: "p3", label: "DG-450", type: "product", x: 70, y: 20 },
  { id: "p4", label: "LB-320", type: "product", x: 15, y: 30 },
  // Substrates (purple)
  { id: "s1", label: "Polypropylene", type: "substrate", x: 75, y: 55 },
  { id: "s2", label: "Stainless Steel", type: "substrate", x: 55, y: 70 },
  { id: "s3", label: "Polycarbonate", type: "substrate", x: 85, y: 35 },
  // Regulations (red)
  { id: "r1", label: "FDA 21 CFR", type: "regulation", x: 25, y: 15 },
  { id: "r2", label: "NSF/ANSI 60", type: "regulation", x: 40, y: 85 },
  { id: "r3", label: "REACH", type: "regulation", x: 88, y: 70 },
  // Industries (green)
  { id: "i1", label: "Aerospace", type: "industry", x: 10, y: 55 },
  { id: "i2", label: "Food Proc.", type: "industry", x: 65, y: 85 },
  // Applications (teal)
  { id: "a1", label: "Degreasing", type: "application", x: 38, y: 50 },
  { id: "a2", label: "CIP", type: "application", x: 82, y: 80 },
  { id: "a3", label: "Coating Prep", type: "application", x: 12, y: 80 },
];

const GRAPH_EDGES: GraphEdge[] = [
  { from: "p1", to: "s1", label: "COMPATIBLE" },
  { from: "p1", to: "s2", label: "COMPATIBLE" },
  { from: "p1", to: "r1", label: "CERTIFIED" },
  { from: "p1", to: "a1", label: "USED_IN" },
  { from: "p2", to: "s2", label: "COMPATIBLE" },
  { from: "p2", to: "i2", label: "CERTIFIED" },
  { from: "p2", to: "a2", label: "USED_IN" },
  { from: "p2", to: "r2", label: "REGULATED" },
  { from: "p3", to: "s3", label: "COMPATIBLE" },
  { from: "p3", to: "s1", label: "INCOMPATIBLE" },
  { from: "p3", to: "r1", label: "CERTIFIED" },
  { from: "p3", to: "a1", label: "USED_IN" },
  { from: "p4", to: "i1", label: "CERTIFIED" },
  { from: "p4", to: "a3", label: "USED_IN" },
  { from: "p4", to: "s2", label: "COMPATIBLE" },
  { from: "p1", to: "p2", label: "SUBSTITUTES" },
  { from: "i2", to: "r2", label: "REQUIRES" },
  { from: "a2", to: "r3", label: "REGULATED" },
];

const NODE_COLORS: Record<GraphNode["type"], { fill: string; stroke: string; text: string }> = {
  product: { fill: "#3b82f6", stroke: "#60a5fa", text: "#dbeafe" },
  substrate: { fill: "#8b5cf6", stroke: "#a78bfa", text: "#ede9fe" },
  regulation: { fill: "#ef4444", stroke: "#f87171", text: "#fee2e2" },
  industry: { fill: "#22c55e", stroke: "#4ade80", text: "#dcfce7" },
  application: { fill: "#14b8a6", stroke: "#2dd4bf", text: "#ccfbf1" },
};

// ── Demo search data ────────────────────────────────────────────────────────

const DEMO_PRODUCTS = [
  { sku: "MC-710", name: "MicroClean 710 Solvent Degreaser", manufacturer: "ChemStar", category: "Solvent Cleaners", description: "High-purity solvent degreaser for precision cleaning. Compatible with most metals and select plastics. FDA 21 CFR compliant." },
  { sku: "SC-200", name: "SaniChem 200 CIP Detergent", manufacturer: "IndusClean", category: "CIP Cleaners", description: "Alkaline CIP detergent for food processing equipment. NSF/ANSI 60 certified. Safe for stainless steel." },
  { sku: "DG-450", name: "DeGrease 450 Aqueous Cleaner", manufacturer: "ChemStar", category: "Aqueous Cleaners", description: "Water-based degreaser for aerospace applications. Removes oils, greases, and carbon deposits. MIL-PRF qualified." },
  { sku: "LB-320", name: "LubeCoat 320 Dry Film Lubricant", manufacturer: "TechLube", category: "Lubricants", description: "PTFE-based dry film lubricant for coating preparation. Aerospace and defense qualified." },
  { sku: "CP-100", name: "CoatPrep 100 Surface Treatment", manufacturer: "SurfTech", category: "Surface Treatments", description: "Chromate-free conversion coating for aluminum substrates. REACH compliant, replaces hexavalent chromium processes." },
  { sku: "RX-880", name: "RustX 880 Corrosion Inhibitor", manufacturer: "ProteChem", category: "Corrosion Inhibitors", description: "VCI corrosion inhibitor for ferrous and non-ferrous metals. MIL-PRF-22019 qualified." },
  { sku: "PH-550", name: "PharmaClean 550 Residue Remover", manufacturer: "IndusClean", category: "Pharma Cleaners", description: "Validated cleaning agent for pharmaceutical equipment. FDA and EU GMP compliant." },
  { sku: "WT-300", name: "WaterTreat 300 Biocide", manufacturer: "AquaChem", category: "Water Treatment", description: "Non-oxidizing biocide for cooling water systems. EPA registered. NSF/ANSI 60 certified." },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["graph-stats"],
    queryFn: getGraphStats,
    retry: 1,
    staleTime: 60_000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["graph-search", searchTerm],
    queryFn: () => searchGraphParts(searchTerm),
    enabled: searchTerm.length > 0,
    retry: 0,
  });

  // Merge API data with demo fallbacks
  const mergedNodes = stats?.nodes && Object.keys(stats.nodes).length > 0 ? stats.nodes : DEMO_STATS.nodes;
  const mergedEdges = stats?.edges && Object.keys(stats.edges).length > 0 ? stats.edges : DEMO_STATS.edges;

  const totalNodes = Object.values(mergedNodes).reduce((a, b) => a + (b as number), 0);
  const totalEdges = Object.values(mergedEdges).reduce((a, b) => a + (b as number), 0);

  // Local search fallback
  const localResults = useMemo(() => {
    if (!searchTerm) return null;
    const q = searchTerm.toLowerCase();
    const matched = DEMO_PRODUCTS.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q)
    );
    return { results: matched, total: matched.length, query: searchTerm };
  }, [searchTerm]);

  const displayResults = searchResults || localResults;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchQuery.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-6 py-14">
        {/* Decorative grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center gap-3 text-orange-400">
            <Network className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-widest">Neo4j-Powered</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Chemical Knowledge Graph
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-400">
            The authoritative trust backbone for chemical distribution intelligence
          </p>

          {/* Key stats ribbon */}
          <div className="mt-8 flex flex-wrap gap-8">
            {[
              { label: "Entity Nodes", value: totalNodes.toLocaleString(), accent: "text-blue-400" },
              { label: "Relationships", value: totalEdges.toLocaleString(), accent: "text-teal-400" },
              { label: "Entity Types", value: "5", accent: "text-purple-400" },
              { label: "Relationship Types", value: "8", accent: "text-orange-400" },
            ].map((s) => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        {/* ── Entity Types ──────────────────────────────────────────── */}
        <section>
          <SectionHeading title="Entity Types" subtitle="Five core node types form the graph ontology" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ENTITY_TYPES.map((et) => {
              const Icon = et.icon;
              return (
                <div
                  key={et.name}
                  className={`rounded-xl border ${et.border} ${et.bg} p-5 transition-transform hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${et.text}`} />
                    <h3 className={`font-bold ${et.text}`}>{et.name}</h3>
                  </div>
                  <p className={`mt-1 text-xl font-extrabold ${et.text}`}>{et.count}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{et.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Why a Knowledge Graph ─────────────────────────────────── */}
        <section className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/30 to-slate-900 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/20">
              <Zap className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-300">Why a Knowledge Graph, Not Just RAG?</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                RAG retrieves document chunks by similarity. It <span className="font-semibold text-white">cannot reason through multi-hop relationships</span>.
              </p>
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 px-5 py-3">
                <p className="font-mono text-sm text-slate-200">
                  <span className="text-blue-400">Product A</span>
                  <span className="text-slate-500"> &rarr; compatible with </span>
                  <span className="text-purple-400">Substrate B</span>
                  <span className="text-slate-500"> &rarr; used in </span>
                  <span className="text-teal-400">Application C</span>
                  <span className="text-slate-500"> &rarr; requires </span>
                  <span className="text-red-400">Certification D</span>
                  <span className="text-slate-500"> in </span>
                  <span className="text-green-400">Industry E</span>
                </p>
              </div>
              <p className="mt-4 text-sm font-medium text-orange-200">
                Chemical compatibility is a graph problem. The graph IS the trust backbone.
              </p>
            </div>
          </div>
        </section>

        {/* ── Safety-Critical Relationships ──────────────────────────── */}
        <section>
          <SectionHeading title="Safety-Critical Relationships" subtitle="8 relationship types with provenance and criticality classification" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {RELATIONSHIPS.map((rel) => (
              <div
                key={rel.name}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3.5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs font-bold text-slate-200">
                    {rel.name}
                  </span>
                  <span className="text-xs text-slate-500">&larr; {rel.source}</span>
                </div>
                <div>
                  {rel.critical === true ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                      <CheckCircle2 className="h-3 w-3" /> Safety-Critical
                    </span>
                  ) : rel.critical === "medium" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
                      <AlertTriangle className="h-3 w-3" /> Medium
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                      <Info className="h-3 w-3" /> Informational
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Three Retrieval Modes ─────────────────────────────────── */}
        <section>
          <SectionHeading
            title="Three Retrieval Modes"
            subtitle="RAG + Graph intelligence working together"
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {RETRIEVAL_MODES.map((rm) => {
              const Icon = rm.icon;
              return (
                <div
                  key={rm.mode}
                  className={`rounded-2xl border ${rm.borderColor} bg-gradient-to-b ${rm.color} p-6`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${rm.accentColor}`} />
                    <h3 className={`font-bold ${rm.accentColor}`}>{rm.mode}</h3>
                  </div>
                  <p className="mt-3 text-sm italic text-slate-300">{rm.query}</p>
                  <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
                    <p className="flex items-start gap-2 text-xs text-slate-400">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                      {rm.flow}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-300">Best for:</span> {rm.best}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Interactive Graph Visualization ────────────────────────── */}
        <section>
          <SectionHeading title="Interactive Graph Visualization" subtitle="Sample subgraph showing entity relationships" />
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
            <div className="relative overflow-hidden rounded-xl bg-slate-950" style={{ height: 480 }}>
              {/* Render edges as SVG lines */}
              <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
                {GRAPH_EDGES.map((edge, i) => {
                  const fromNode = GRAPH_NODES.find((n) => n.id === edge.from);
                  const toNode = GRAPH_NODES.find((n) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;
                  const isIncompatible = edge.label === "INCOMPATIBLE";
                  return (
                    <line
                      key={i}
                      x1={`${fromNode.x}%`}
                      y1={`${fromNode.y}%`}
                      x2={`${toNode.x}%`}
                      y2={`${toNode.y}%`}
                      stroke={isIncompatible ? "#ef444480" : "#334155"}
                      strokeWidth={isIncompatible ? 1.5 : 1}
                      strokeDasharray={isIncompatible ? "4 3" : undefined}
                    />
                  );
                })}
              </svg>
              {/* Render nodes */}
              {GRAPH_NODES.map((node) => {
                const colors = NODE_COLORS[node.type];
                return (
                  <div
                    key={node.id}
                    className="group absolute flex flex-col items-center"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 2,
                    }}
                  >
                    {/* Glow */}
                    <div
                      className="absolute h-10 w-10 rounded-full opacity-30 blur-md transition-opacity group-hover:opacity-60"
                      style={{ backgroundColor: colors.fill }}
                    />
                    {/* Circle */}
                    <div
                      className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-[9px] font-bold shadow-lg transition-transform group-hover:scale-125"
                      style={{
                        backgroundColor: colors.fill,
                        borderColor: colors.stroke,
                        color: colors.text,
                      }}
                    >
                      {node.id[0].toUpperCase()}
                    </div>
                    {/* Label */}
                    <span
                      className="mt-1 whitespace-nowrap rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur"
                      style={{ color: colors.stroke }}
                    >
                      {node.label}
                    </span>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 backdrop-blur" style={{ zIndex: 3 }}>
                {(["product", "substrate", "regulation", "industry", "application"] as const).map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[type].fill }} />
                    <span className="text-[10px] capitalize text-slate-400">{type}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="h-px w-4 border-t border-dashed border-red-400" />
                  <span className="text-[10px] text-slate-400">Incompatible</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Search ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeading title="Search Knowledge Graph" subtitle="Query products, substrates, and relationships" />
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by SKU, product name, substrate, or keyword (e.g., MC-710, degreaser, polycarbonate)..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>

            {searchLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching graph...
              </div>
            )}

            {displayResults && searchTerm && (
              <div className="mt-6">
                <p className="mb-4 text-sm text-slate-500">
                  {displayResults.total} result{displayResults.total !== 1 ? "s" : ""} for{" "}
                  <span className="font-medium text-slate-300">"{displayResults.query}"</span>
                  {!searchResults && (
                    <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-500">demo data</span>
                  )}
                </p>
                {displayResults.total === 0 && (
                  <p className="text-sm text-slate-600">No matching results. Try a different search term.</p>
                )}
                <div className="space-y-3">
                  {displayResults.results.map((part: Record<string, unknown>, i: number) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 transition-colors hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">
                            {(part.name as string) || (part.sku as string)}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono text-blue-400">{part.sku as string}</span>
                            {part.manufacturer && (
                              <>
                                <span className="mx-1.5 text-slate-700">|</span>
                                {part.manufacturer as string}
                              </>
                            )}
                            {part.category && (
                              <>
                                <span className="mx-1.5 text-slate-700">|</span>
                                {part.category as string}
                              </>
                            )}
                          </p>
                        </div>
                        {typeof part.score === "number" && (
                          <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
                            {(part.score as number).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {part.description && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{part.description as string}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Footer accent ──────────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
          <div className="flex items-center justify-center gap-2">
            <Database className="h-3.5 w-3.5" />
            <span>
              Powered by Neo4j &middot; {totalNodes.toLocaleString()} nodes &middot; {totalEdges.toLocaleString()} relationships
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
