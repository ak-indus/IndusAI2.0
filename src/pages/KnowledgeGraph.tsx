import { useQuery } from "@tanstack/react-query";
import { getGraphStats, searchGraphParts } from "@/lib/api";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Loader2,
  Database,
  GitBranch,
  Sparkles,
  Play,
  FileText,
  Beaker,
  Shield,
  Wrench,
  Clock,
  RotateCcw,
  Layers,
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
  { name: "Products", count: "50K+", description: "SKUs with chemical properties, SDS data, TDS specs", bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", icon: Box },
  { name: "Substrates", count: "1,870", description: "Materials, compatibility matrices, surface types", bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-400", icon: FlaskConical },
  { name: "Regulations", count: "640", description: "FDA, REACH, EPA, MIL-spec, NSF standards", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400", icon: ShieldCheck },
  { name: "Industries", count: "95", description: "Aerospace, food processing, pharma, water treatment", bg: "bg-green-500/15", border: "border-green-500/30", text: "text-green-400", icon: Factory },
  { name: "Applications", count: "1,240", description: "Degreasing, coating prep, CIP, synthesis, lubrication", bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-400", icon: Pipette },
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
  { mode: "Mode 1: Graph-First", icon: GitBranch, color: "from-blue-500/20 to-blue-600/5", borderColor: "border-blue-500/30", accentColor: "text-blue-400", query: '"What works with polypropylene under FDA requirements?"', flow: "Graph traversal \u2192 candidate products \u2192 RAG retrieves supporting TDS sections", best: "Compatibility queries with specific constraints" },
  { mode: "Mode 2: RAG-First", icon: BookOpen, color: "from-purple-500/20 to-purple-600/5", borderColor: "border-purple-500/30", accentColor: "text-purple-400", query: '"Tell me about solvents for precision cleaning"', flow: "Semantic search \u2192 relevant doc chunks \u2192 Graph enriches with relationships", best: "Open-ended discovery and exploration" },
  { mode: "Mode 3: Combined", icon: Sparkles, color: "from-orange-500/20 to-orange-600/5", borderColor: "border-orange-500/30", accentColor: "text-orange-400", query: '"What\'s compatible for polycarbonate cleaning under 200\u00b0F?"', flow: "Graph narrows by constraints \u2192 RAG provides thermal data \u2192 Claude reasons across both", best: "Multi-constraint queries (most valuable)" },
];

// ── Data Sources ────────────────────────────────────────────────────────────

const DATA_SOURCES = [
  { source: "Manufacturer TDS", type: "Technical specs", records: "50K+", example: "Bore size, load ratings, RPM limits, dimensions", icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  { source: "Safety Data Sheets", type: "Hazard / handling", records: "45K+", example: "GHS classifications, PPE requirements, flash points", icon: Shield, color: "text-red-400", bg: "bg-red-500/10" },
  { source: "Cross-Reference Tables", type: "Equivalences", records: "15K+", example: "SKF \u2194 NSK \u2194 FAG \u2194 Timken mappings", icon: RotateCcw, color: "text-purple-400", bg: "bg-purple-500/10" },
  { source: "Compatibility Matrices", type: "Material safety", records: "185K+", example: "Solvent + substrate lab-verified test results", icon: Beaker, color: "text-teal-400", bg: "bg-teal-500/10" },
  { source: "Regulatory Databases", type: "Compliance", records: "640", example: "FDA 21 CFR, REACH, EPA, NSF, MIL-spec", icon: ShieldCheck, color: "text-orange-400", bg: "bg-orange-500/10" },
  { source: "BOM Structures", type: "Assemblies", records: "2K+", example: "Component trees with quantities and alternates", icon: Wrench, color: "text-green-400", bg: "bg-green-500/10" },
  { source: "Transaction History", type: "Co-purchase", records: "41K+", example: '"Customers who bought X also bought Y"', icon: Layers, color: "text-amber-400", bg: "bg-amber-500/10" },
  { source: "Application Guides", type: "Use cases", records: "1.2K+", example: "Industry-specific recommendations and constraints", icon: Factory, color: "text-cyan-400", bg: "bg-cyan-500/10" },
];

// ── Interactive Graph Data ──────────────────────────────────────────────────

interface GNode {
  id: string;
  label: string;
  type: "product" | "substrate" | "regulation" | "industry" | "application";
  x: number;
  y: number;
  detail?: string;
}

interface GEdge {
  from: string;
  to: string;
  label: string;
}

const ALL_NODES: GNode[] = [
  { id: "p1", label: "MC-710", type: "product", x: 40, y: 35, detail: "MicroClean 710 Solvent Degreaser — ChemStar — $285/case" },
  { id: "p2", label: "SC-200", type: "product", x: 25, y: 60, detail: "SaniChem 200 CIP Detergent — IndusClean — $142/case" },
  { id: "p3", label: "DG-450", type: "product", x: 60, y: 18, detail: "DeGrease 450 Aqueous Cleaner — ChemStar — $210/case" },
  { id: "p4", label: "LB-320", type: "product", x: 12, y: 28, detail: "LubeCoat 320 Dry Film Lubricant — TechLube — $165/case" },
  { id: "p5", label: "Novec 7200", type: "product", x: 55, y: 52, detail: "3M Novec 7200 Engineered Fluid — 3M — $342/case" },
  { id: "p6", label: "Vertrel MCA", type: "product", x: 72, y: 42, detail: "Chemours Vertrel MCA HFC Solvent — $285/case" },
  { id: "s1", label: "Polypropylene", type: "substrate", x: 75, y: 58, detail: "Thermoplastic polymer — Chemical resistance: Excellent" },
  { id: "s2", label: "Stainless Steel", type: "substrate", x: 48, y: 72, detail: "304/316 grade — Corrosion resistance: High" },
  { id: "s3", label: "Polycarbonate", type: "substrate", x: 88, y: 30, detail: "Engineering thermoplastic — Stress cracking: Sensitive" },
  { id: "s4", label: "Aluminum", type: "substrate", x: 18, y: 48, detail: "6061/7075 alloy — Anodize compatible" },
  { id: "r1", label: "FDA 21 CFR", type: "regulation", x: 30, y: 12, detail: "Indirect food contact — 21 CFR 175-178" },
  { id: "r2", label: "NSF/ANSI 60", type: "regulation", x: 38, y: 88, detail: "Drinking water treatment chemicals" },
  { id: "r3", label: "REACH", type: "regulation", x: 90, y: 72, detail: "EU chemicals regulation — SVHC screening" },
  { id: "r4", label: "MIL-PRF-680", type: "regulation", x: 8, y: 12, detail: "Military spec — Degreasing solvent" },
  { id: "i1", label: "Aerospace", type: "industry", x: 8, y: 65, detail: "Boeing/Airbus QPL — NADCAP processes" },
  { id: "i2", label: "Food Processing", type: "industry", x: 62, y: 85, detail: "HACCP / FSMA compliant facilities" },
  { id: "i3", label: "Pharma", type: "industry", x: 85, y: 85, detail: "cGMP / EU Annex 15 validated" },
  { id: "a1", label: "Degreasing", type: "application", x: 35, y: 48, detail: "Precision cleaning — vapor / immersion / spray" },
  { id: "a2", label: "CIP", type: "application", x: 78, y: 78, detail: "Clean-In-Place — automated pipeline cleaning" },
  { id: "a3", label: "Coating Prep", type: "application", x: 10, y: 82, detail: "Surface preparation before coating/painting" },
];

const ALL_EDGES: GEdge[] = [
  { from: "p1", to: "s1", label: "COMPATIBLE" },
  { from: "p1", to: "s2", label: "COMPATIBLE" },
  { from: "p1", to: "s4", label: "COMPATIBLE" },
  { from: "p1", to: "r1", label: "CERTIFIED" },
  { from: "p1", to: "a1", label: "USED_IN" },
  { from: "p1", to: "p2", label: "SUBSTITUTES" },
  { from: "p2", to: "s2", label: "COMPATIBLE" },
  { from: "p2", to: "i2", label: "SERVES" },
  { from: "p2", to: "a2", label: "USED_IN" },
  { from: "p2", to: "r2", label: "CERTIFIED" },
  { from: "p3", to: "s3", label: "INCOMPATIBLE" },
  { from: "p3", to: "s2", label: "COMPATIBLE" },
  { from: "p3", to: "s4", label: "COMPATIBLE" },
  { from: "p3", to: "r4", label: "CERTIFIED" },
  { from: "p3", to: "a1", label: "USED_IN" },
  { from: "p3", to: "i1", label: "SERVES" },
  { from: "p4", to: "i1", label: "SERVES" },
  { from: "p4", to: "a3", label: "USED_IN" },
  { from: "p4", to: "s2", label: "COMPATIBLE" },
  { from: "p4", to: "s4", label: "COMPATIBLE" },
  { from: "p5", to: "s1", label: "COMPATIBLE" },
  { from: "p5", to: "s3", label: "COMPATIBLE" },
  { from: "p5", to: "r1", label: "CERTIFIED" },
  { from: "p5", to: "r3", label: "CERTIFIED" },
  { from: "p5", to: "a1", label: "USED_IN" },
  { from: "p6", to: "s1", label: "COMPATIBLE" },
  { from: "p6", to: "r1", label: "CERTIFIED" },
  { from: "p6", to: "a1", label: "USED_IN" },
  { from: "p6", to: "p5", label: "SUBSTITUTES" },
  { from: "i2", to: "r2", label: "REQUIRES" },
  { from: "i2", to: "r1", label: "REQUIRES" },
  { from: "i3", to: "r3", label: "REQUIRES" },
  { from: "a2", to: "r2", label: "REGULATED" },
  { from: "i1", to: "r4", label: "REQUIRES" },
];

const NODE_COLORS: Record<GNode["type"], { fill: string; stroke: string; text: string; glow: string }> = {
  product: { fill: "#3b82f6", stroke: "#60a5fa", text: "#dbeafe", glow: "#3b82f680" },
  substrate: { fill: "#8b5cf6", stroke: "#a78bfa", text: "#ede9fe", glow: "#8b5cf680" },
  regulation: { fill: "#ef4444", stroke: "#f87171", text: "#fee2e2", glow: "#ef444480" },
  industry: { fill: "#22c55e", stroke: "#4ade80", text: "#dcfce7", glow: "#22c55e80" },
  application: { fill: "#14b8a6", stroke: "#2dd4bf", text: "#ccfbf1", glow: "#14b8a680" },
};

// ── Demo Scenarios ──────────────────────────────────────────────────────────

interface TraversalStep {
  hop: number;
  fromId: string;
  edgeLabel: string;
  toId: string;
  detail: string;
  durationMs: number;
}

interface DemoScenario {
  id: string;
  label: string;
  question: string;
  icon: typeof Search;
  color: string;
  traversal: TraversalStep[];
  answer: string;
  insight: string;
  highlightNodes: string[];
  highlightEdges: Array<[string, string]>;
  timingMs: number;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "compliance",
    label: "The Compliance Question",
    question: "I need a degreaser for polypropylene parts in a food processing plant",
    icon: Shield,
    color: "from-red-500 to-orange-500",
    traversal: [
      { hop: 1, fromId: "a1", edgeLabel: "USED_IN", toId: "p1", detail: "Find products used in Degreasing", durationMs: 35 },
      { hop: 1, fromId: "a1", edgeLabel: "USED_IN", toId: "p5", detail: "Also: Novec 7200 used in Degreasing", durationMs: 12 },
      { hop: 1, fromId: "a1", edgeLabel: "USED_IN", toId: "p6", detail: "Also: Vertrel MCA used in Degreasing", durationMs: 8 },
      { hop: 2, fromId: "p1", edgeLabel: "COMPATIBLE", toId: "s1", detail: "MC-710 compatible with Polypropylene? YES", durationMs: 18 },
      { hop: 2, fromId: "p5", edgeLabel: "COMPATIBLE", toId: "s1", detail: "Novec 7200 compatible with Polypropylene? YES", durationMs: 15 },
      { hop: 2, fromId: "p6", edgeLabel: "COMPATIBLE", toId: "s1", detail: "Vertrel MCA compatible with Polypropylene? YES", durationMs: 12 },
      { hop: 3, fromId: "p1", edgeLabel: "CERTIFIED", toId: "r1", detail: "MC-710 FDA 21 CFR certified? YES", durationMs: 22 },
      { hop: 3, fromId: "p5", edgeLabel: "CERTIFIED", toId: "r1", detail: "Novec 7200 FDA certified? YES", durationMs: 18 },
      { hop: 3, fromId: "p6", edgeLabel: "CERTIFIED", toId: "r1", detail: "Vertrel MCA FDA certified? YES", durationMs: 15 },
      { hop: 4, fromId: "i2", edgeLabel: "REQUIRES", toId: "r1", detail: "Food Processing requires FDA 21 CFR? YES — chain complete", durationMs: 10 },
    ],
    answer: "3 products qualify: MC-710 ($285/case), Novec 7200 ($342/case), Vertrel MCA ($285/case). All verified: PP-compatible + FDA 21 CFR + Food Processing approved.",
    insight: "RAG might find these products in documents, but it cannot GUARANTEE the compliance chain. The graph traversal proves: Product \u2192 COMPATIBLE \u2192 Polypropylene \u2192 CERTIFIED \u2192 FDA \u2192 REQUIRED_BY \u2192 Food Processing.",
    highlightNodes: ["a1", "p1", "p5", "p6", "s1", "r1", "i2"],
    highlightEdges: [["p1", "s1"], ["p5", "s1"], ["p6", "s1"], ["p1", "r1"], ["p5", "r1"], ["p6", "r1"], ["i2", "r1"], ["p1", "a1"], ["p5", "a1"], ["p6", "a1"]],
    timingMs: 165,
  },
  {
    id: "substitution",
    label: "Emergency Substitution",
    question: "Vertrel MCA is out of stock. What's an equivalent that works on polycarbonate too?",
    icon: RotateCcw,
    color: "from-purple-500 to-blue-500",
    traversal: [
      { hop: 1, fromId: "p6", edgeLabel: "SUBSTITUTES", toId: "p5", detail: "Vertrel MCA substitutes: Novec 7200 (verified equivalent)", durationMs: 15 },
      { hop: 2, fromId: "p5", edgeLabel: "COMPATIBLE", toId: "s1", detail: "Novec 7200 + Polypropylene? YES", durationMs: 18 },
      { hop: 2, fromId: "p5", edgeLabel: "COMPATIBLE", toId: "s3", detail: "Novec 7200 + Polycarbonate? YES", durationMs: 15 },
      { hop: 3, fromId: "p5", edgeLabel: "CERTIFIED", toId: "r1", detail: "Novec 7200 FDA certified? YES", durationMs: 12 },
      { hop: 3, fromId: "p5", edgeLabel: "CERTIFIED", toId: "r3", detail: "Novec 7200 REACH compliant? YES", durationMs: 10 },
      { hop: 4, fromId: "p3", edgeLabel: "INCOMPATIBLE", toId: "s3", detail: "Cross-check: DG-450 + Polycarbonate? INCOMPATIBLE \u2014 eliminated", durationMs: 22 },
    ],
    answer: "Novec 7200 is the verified substitute. Polycarbonate-safe (unlike DG-450 which would cause stress cracking). FDA + REACH certified. $342/case vs $285 \u2014 $57 premium but broader compatibility.",
    insight: "A vector search for 'Vertrel MCA alternative' might suggest DG-450 (similar text). The graph KNOWS DG-450 is INCOMPATIBLE with polycarbonate \u2014 preventing a potentially costly material failure.",
    highlightNodes: ["p6", "p5", "p3", "s1", "s3", "r1", "r3"],
    highlightEdges: [["p6", "p5"], ["p5", "s1"], ["p5", "s3"], ["p5", "r1"], ["p5", "r3"], ["p3", "s3"]],
    timingMs: 92,
  },
  {
    id: "aerospace",
    label: "Aerospace BOM Check",
    question: "Spec a complete cleaning + coating prep kit for aerospace aluminum parts",
    icon: Wrench,
    color: "from-green-500 to-teal-500",
    traversal: [
      { hop: 1, fromId: "i1", edgeLabel: "REQUIRES", toId: "r4", detail: "Aerospace requires MIL-PRF-680 qualification", durationMs: 12 },
      { hop: 2, fromId: "p3", edgeLabel: "CERTIFIED", toId: "r4", detail: "DG-450 is MIL-PRF-680 qualified", durationMs: 18 },
      { hop: 2, fromId: "p3", edgeLabel: "COMPATIBLE", toId: "s4", detail: "DG-450 + Aluminum? YES", durationMs: 15 },
      { hop: 2, fromId: "p3", edgeLabel: "USED_IN", toId: "a1", detail: "DG-450 for Degreasing: confirmed", durationMs: 10 },
      { hop: 3, fromId: "p4", edgeLabel: "SERVES", toId: "i1", detail: "LB-320 is Aerospace qualified", durationMs: 15 },
      { hop: 3, fromId: "p4", edgeLabel: "COMPATIBLE", toId: "s4", detail: "LB-320 + Aluminum? YES", durationMs: 12 },
      { hop: 3, fromId: "p4", edgeLabel: "USED_IN", toId: "a3", detail: "LB-320 for Coating Prep: confirmed", durationMs: 10 },
    ],
    answer: "Kit: (1) DG-450 Degreaser \u2014 $210/case, MIL-PRF-680, Al-safe + (2) LB-320 Dry Film Lubricant \u2014 $165/case, Aerospace QPL, Al-safe. Total: $375. Both verified for aluminum substrate.",
    insight: "The graph connects Industry requirements \u2192 Regulatory specs \u2192 Qualified products \u2192 Material compatibility \u2192 Application use cases. Five hops that would take a sales rep 15+ minutes of manual catalog lookup.",
    highlightNodes: ["i1", "r4", "p3", "p4", "s4", "a1", "a3"],
    highlightEdges: [["i1", "r4"], ["p3", "r4"], ["p3", "s4"], ["p3", "a1"], ["p4", "i1"], ["p4", "s4"], ["p4", "a3"]],
    timingMs: 92,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [traversalProgress, setTraversalProgress] = useState<number>(-1); // index of completed steps
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

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

  const mergedNodes = stats?.nodes && Object.keys(stats.nodes).length > 0 ? stats.nodes : DEMO_STATS.nodes;
  const mergedEdges = stats?.edges && Object.keys(stats.edges).length > 0 ? stats.edges : DEMO_STATS.edges;
  const totalNodes = Object.values(mergedNodes).reduce((a, b) => a + (b as number), 0);
  const totalEdges = Object.values(mergedEdges).reduce((a, b) => a + (b as number), 0);

  const DEMO_PRODUCTS = useMemo(() => [
    { sku: "MC-710", name: "MicroClean 710 Solvent Degreaser", manufacturer: "ChemStar", category: "Solvent Cleaners", description: "High-purity solvent degreaser. Compatible with most metals and select plastics. FDA 21 CFR compliant." },
    { sku: "SC-200", name: "SaniChem 200 CIP Detergent", manufacturer: "IndusClean", category: "CIP Cleaners", description: "Alkaline CIP detergent for food processing. NSF/ANSI 60 certified." },
    { sku: "DG-450", name: "DeGrease 450 Aqueous Cleaner", manufacturer: "ChemStar", category: "Aqueous Cleaners", description: "Water-based degreaser for aerospace. MIL-PRF qualified." },
    { sku: "LB-320", name: "LubeCoat 320 Dry Film Lubricant", manufacturer: "TechLube", category: "Lubricants", description: "PTFE-based dry film lubricant. Aerospace qualified." },
    { sku: "CP-100", name: "CoatPrep 100 Surface Treatment", manufacturer: "SurfTech", category: "Surface Treatments", description: "Chromate-free conversion coating for aluminum. REACH compliant." },
    { sku: "RX-880", name: "RustX 880 Corrosion Inhibitor", manufacturer: "ProteChem", category: "Corrosion Inhibitors", description: "VCI corrosion inhibitor. MIL-PRF-22019 qualified." },
    { sku: "PH-550", name: "PharmaClean 550 Residue Remover", manufacturer: "IndusClean", category: "Pharma Cleaners", description: "Validated cleaning agent for pharma. FDA and EU GMP compliant." },
    { sku: "WT-300", name: "WaterTreat 300 Biocide", manufacturer: "AquaChem", category: "Water Treatment", description: "Non-oxidizing biocide for cooling water. EPA registered, NSF/ANSI 60." },
  ], []);

  const localResults = useMemo(() => {
    if (!searchTerm) return null;
    const q = searchTerm.toLowerCase();
    const matched = DEMO_PRODUCTS.filter((p) =>
      p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.manufacturer.toLowerCase().includes(q)
    );
    return { results: matched, total: matched.length, query: searchTerm };
  }, [searchTerm, DEMO_PRODUCTS]);

  const displayResults = searchResults || localResults;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchQuery.trim());
  };

  // Determine which nodes/edges to highlight based on active scenario + progress
  const activeHighlightNodes = useMemo(() => {
    if (!activeScenario || traversalProgress < 0) return new Set<string>();
    const nodes = new Set<string>();
    for (let i = 0; i <= traversalProgress && i < activeScenario.traversal.length; i++) {
      nodes.add(activeScenario.traversal[i].fromId);
      nodes.add(activeScenario.traversal[i].toId);
    }
    return nodes;
  }, [activeScenario, traversalProgress]);

  const activeHighlightEdges = useMemo(() => {
    if (!activeScenario || traversalProgress < 0) return new Set<string>();
    const edges = new Set<string>();
    for (let i = 0; i <= traversalProgress && i < activeScenario.traversal.length; i++) {
      const step = activeScenario.traversal[i];
      edges.add(`${step.fromId}-${step.toId}`);
      edges.add(`${step.toId}-${step.fromId}`);
    }
    return edges;
  }, [activeScenario, traversalProgress]);

  const runScenario = useCallback(async (scenario: DemoScenario) => {
    if (isAnimating) return;
    setActiveScenario(scenario);
    setTraversalProgress(-1);
    setIsAnimating(true);

    // Scroll to graph
    setTimeout(() => {
      graphRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    // Animate traversal steps
    for (let i = 0; i < scenario.traversal.length; i++) {
      await new Promise((r) => setTimeout(r, Math.min(scenario.traversal[i].durationMs * 8, 600)));
      setTraversalProgress(i);
    }

    setIsAnimating(false);
  }, [isAnimating]);

  const resetScenario = useCallback(() => {
    setActiveScenario(null);
    setTraversalProgress(-1);
    setIsAnimating(false);
  }, []);

  // Auto-scroll traversal panel
  const traversalEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    traversalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [traversalProgress]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-6 py-14">
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
            Open-source intelligence aggregated from 8 data sources into a unified trust backbone
          </p>
          <div className="mt-8 flex flex-wrap gap-8">
            {[
              { label: "Entity Nodes", value: totalNodes.toLocaleString(), accent: "text-blue-400" },
              { label: "Relationships", value: totalEdges.toLocaleString(), accent: "text-teal-400" },
              { label: "Data Sources", value: "8", accent: "text-orange-400" },
              { label: "Relationship Types", value: "8", accent: "text-purple-400" },
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

        {/* ── Aggregated Intelligence / Data Sources ──────────────────── */}
        <section>
          <SectionHeading title="Aggregated Intelligence" subtitle="Data that exists in silos — brought together for the first time" />
          <p className="mt-2 text-sm text-slate-400 max-w-3xl">
            TDS documents, SDS sheets, cross-reference tables, compatibility matrices, regulatory databases, BOM structures — all open-source, all scattered. We connected them.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DATA_SOURCES.map((ds) => {
              const Icon = ds.icon;
              return (
                <div key={ds.source} className={`rounded-xl border border-slate-800 ${ds.bg} p-4 transition-colors hover:border-slate-700`}>
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4.5 w-4.5 ${ds.color}`} />
                    <h3 className="text-sm font-bold text-white">{ds.source}</h3>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-lg font-extrabold ${ds.color}`}>{ds.records}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">{ds.type}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{ds.example}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Entity Types ──────────────────────────────────────────── */}
        <section>
          <SectionHeading title="Entity Types" subtitle="Five core node types form the graph ontology" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ENTITY_TYPES.map((et) => {
              const Icon = et.icon;
              return (
                <div key={et.name} className={`rounded-xl border ${et.border} ${et.bg} p-5 transition-transform hover:scale-[1.02]`}>
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
                RAG retrieves document chunks by similarity. It <span className="font-semibold text-white">cannot reason through multi-hop relationships</span> or <span className="font-semibold text-white">guarantee safety-critical compliance chains</span>.
              </p>
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 px-5 py-3">
                <p className="font-mono text-sm text-slate-200">
                  <span className="text-blue-400">Product</span>
                  <span className="text-slate-500"> &rarr; COMPATIBLE_WITH &rarr; </span>
                  <span className="text-purple-400">Substrate</span>
                  <span className="text-slate-500"> &rarr; USED_IN &rarr; </span>
                  <span className="text-teal-400">Application</span>
                  <span className="text-slate-500"> &rarr; CERTIFIED_FOR &rarr; </span>
                  <span className="text-red-400">Regulation</span>
                  <span className="text-slate-500"> &rarr; REQUIRED_BY &rarr; </span>
                  <span className="text-green-400">Industry</span>
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
              <div key={rel.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3.5 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs font-bold text-slate-200">{rel.name}</span>
                  <span className="text-xs text-slate-500">&larr; {rel.source}</span>
                </div>
                <div>
                  {rel.critical === true ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400"><CheckCircle2 className="h-3 w-3" /> Safety-Critical</span>
                  ) : rel.critical === "medium" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400"><AlertTriangle className="h-3 w-3" /> Medium</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400"><Info className="h-3 w-3" /> Informational</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Three Retrieval Modes ─────────────────────────────────── */}
        <section>
          <SectionHeading title="Three Retrieval Modes" subtitle="RAG + Graph intelligence working together" />
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {RETRIEVAL_MODES.map((rm) => {
              const Icon = rm.icon;
              return (
                <div key={rm.mode} className={`rounded-2xl border ${rm.borderColor} bg-gradient-to-b ${rm.color} p-6`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${rm.accentColor}`} />
                    <h3 className={`font-bold ${rm.accentColor}`}>{rm.mode}</h3>
                  </div>
                  <p className="mt-3 text-sm italic text-slate-300">{rm.query}</p>
                  <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
                    <p className="flex items-start gap-2 text-xs text-slate-400">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />{rm.flow}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-slate-500"><span className="font-semibold text-slate-300">Best for:</span> {rm.best}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Live Demo Scenarios ─────────────────────────────────────── */}
        <section>
          <SectionHeading title="Live Graph Traversal Demos" subtitle="Click a scenario to watch the graph solve it in real-time" />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {DEMO_SCENARIOS.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = activeScenario?.id === scenario.id;
              return (
                <button
                  key={scenario.id}
                  onClick={() => isActive ? resetScenario() : runScenario(scenario)}
                  disabled={isAnimating && !isActive}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                    isActive
                      ? "border-orange-500/50 bg-slate-800/80 shadow-lg shadow-orange-500/10"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                  } disabled:opacity-40`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${scenario.color} opacity-0 transition-opacity ${isActive ? "opacity-5" : "group-hover:opacity-[0.03]"}`} />
                  <div className="relative">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${scenario.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{scenario.label}</h3>
                      {!isActive && <Play className="ml-auto h-4 w-4 text-slate-600 group-hover:text-slate-400" />}
                      {isActive && !isAnimating && <CheckCircle2 className="ml-auto h-4 w-4 text-green-400" />}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400 italic">"{scenario.question}"</p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600">
                      <Clock className="h-3 w-3" />
                      <span>{scenario.traversal.length} hops &middot; {scenario.timingMs}ms</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Interactive Graph + Traversal Panel ────────────────────── */}
        <section ref={graphRef}>
          <SectionHeading
            title="Interactive Graph Visualization"
            subtitle={activeScenario ? `Traversing: "${activeScenario.question}"` : "Select a scenario above to watch the graph traversal"}
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {/* Graph (3 cols) */}
            <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
              <div className="relative overflow-hidden rounded-xl bg-slate-950" style={{ height: 520 }}>
                {/* Edges */}
                <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
                  {ALL_EDGES.map((edge, i) => {
                    const fromNode = ALL_NODES.find((n) => n.id === edge.from);
                    const toNode = ALL_NODES.find((n) => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    const isIncompatible = edge.label === "INCOMPATIBLE";
                    const edgeKey = `${edge.from}-${edge.to}`;
                    const isHighlighted = activeHighlightEdges.has(edgeKey);
                    const fromColors = NODE_COLORS[fromNode.type];
                    return (
                      <line
                        key={i}
                        x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                        x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                        stroke={isHighlighted ? (isIncompatible ? "#ef4444" : fromColors.stroke) : isIncompatible ? "#ef444440" : "#1e293b"}
                        strokeWidth={isHighlighted ? 2.5 : isIncompatible ? 1.5 : 0.8}
                        strokeDasharray={isIncompatible ? "4 3" : undefined}
                        className="transition-all duration-500"
                        style={{ filter: isHighlighted ? `drop-shadow(0 0 6px ${isIncompatible ? "#ef4444" : fromColors.glow})` : undefined }}
                      />
                    );
                  })}
                </svg>
                {/* Nodes */}
                {ALL_NODES.map((node) => {
                  const colors = NODE_COLORS[node.type];
                  const isHighlighted = activeHighlightNodes.has(node.id);
                  const isDimmed = activeScenario && !isHighlighted;
                  const isHovered = hoveredNode === node.id;
                  return (
                    <div
                      key={node.id}
                      className="group absolute flex flex-col items-center"
                      style={{
                        left: `${node.x}%`, top: `${node.y}%`,
                        transform: `translate(-50%, -50%) scale(${isHighlighted ? 1.3 : isDimmed ? 0.8 : 1})`,
                        zIndex: isHighlighted ? 10 : 2,
                        opacity: isDimmed ? 0.2 : 1,
                        transition: "all 0.5s ease",
                      }}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <div
                        className="absolute h-12 w-12 rounded-full blur-md transition-opacity duration-500"
                        style={{ backgroundColor: colors.fill, opacity: isHighlighted ? 0.6 : 0.15 }}
                      />
                      <div
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-[9px] font-bold shadow-lg"
                        style={{ backgroundColor: colors.fill, borderColor: colors.stroke, color: colors.text }}
                      >
                        {node.label.slice(0, 3)}
                      </div>
                      <span
                        className="mt-1 whitespace-nowrap rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur"
                        style={{ color: colors.stroke }}
                      >
                        {node.label}
                      </span>
                      {/* Tooltip */}
                      {isHovered && node.detail && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] text-slate-300 shadow-xl" style={{ zIndex: 20 }}>
                          {node.detail}
                        </div>
                      )}
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
                </div>
              </div>
            </div>

            {/* Traversal Panel (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col" style={{ maxHeight: 556 }}>
              <div className="border-b border-slate-800 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Graph Traversal</h3>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {activeScenario ? `${activeScenario.traversal.length} hops` : "Select a scenario to begin"}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {!activeScenario && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Network className="h-10 w-10 text-slate-800 mb-3" />
                    <p className="text-sm text-slate-600">Click a demo scenario above</p>
                    <p className="text-[11px] text-slate-700 mt-1">Watch the graph traverse node by node</p>
                  </div>
                )}
                {activeScenario && activeScenario.traversal.map((step, i) => {
                  const isComplete = i <= traversalProgress;
                  const isCurrent = i === traversalProgress && isAnimating;
                  const fromNode = ALL_NODES.find((n) => n.id === step.fromId);
                  const toNode = ALL_NODES.find((n) => n.id === step.toId);
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border px-3 py-2.5 transition-all duration-300 ${
                        isCurrent ? "border-orange-500/50 bg-orange-950/30 shadow-sm shadow-orange-500/10" :
                        isComplete ? "border-slate-700/50 bg-slate-800/40" :
                        "border-slate-800/30 bg-slate-900/30 opacity-30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                          isComplete ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-600"
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-3 w-3" /> : step.hop}
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span style={{ color: fromNode ? NODE_COLORS[fromNode.type].stroke : "#94a3b8" }} className="font-semibold">
                            {fromNode?.label}
                          </span>
                          <span className="text-slate-600">&rarr;</span>
                          <span className="text-slate-500 font-mono text-[10px]">{step.edgeLabel}</span>
                          <span className="text-slate-600">&rarr;</span>
                          <span style={{ color: toNode ? NODE_COLORS[toNode.type].stroke : "#94a3b8" }} className="font-semibold">
                            {toNode?.label}
                          </span>
                        </div>
                        {isComplete && (
                          <span className="ml-auto text-[9px] font-mono text-green-600">{step.durationMs}ms</span>
                        )}
                      </div>
                      {isComplete && (
                        <p className="mt-1 text-[10px] text-slate-500 pl-7">{step.detail}</p>
                      )}
                    </div>
                  );
                })}

                {/* Answer */}
                {activeScenario && traversalProgress >= activeScenario.traversal.length - 1 && !isAnimating && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-green-500/20 bg-green-950/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-xs font-bold text-green-400">RESULT</span>
                        <span className="ml-auto text-[10px] font-mono text-green-600">{activeScenario.timingMs}ms total</span>
                      </div>
                      <p className="text-xs leading-relaxed text-green-200">{activeScenario.answer}</p>
                    </div>
                    <div className="rounded-xl border border-orange-500/20 bg-orange-950/15 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-orange-400" />
                        <span className="text-xs font-bold text-orange-400">WHY THIS MATTERS</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-orange-200/80">{activeScenario.insight}</p>
                    </div>
                  </div>
                )}
                <div ref={traversalEndRef} />
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
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by SKU, product name, substrate, or keyword..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
                <Search className="h-4 w-4" /> Search
              </button>
            </form>
            {searchLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Searching graph...</div>
            )}
            {displayResults && searchTerm && (
              <div className="mt-6">
                <p className="mb-4 text-sm text-slate-500">
                  {displayResults.total} result{displayResults.total !== 1 ? "s" : ""} for{" "}
                  <span className="font-medium text-slate-300">"{displayResults.query}"</span>
                  {!searchResults && <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-500">demo data</span>}
                </p>
                {displayResults.total === 0 && <p className="text-sm text-slate-600">No matching results.</p>}
                <div className="space-y-3">
                  {displayResults.results.map((part: Record<string, unknown>, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 transition-colors hover:border-slate-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{(part.name as string) || (part.sku as string)}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono text-blue-400">{part.sku as string}</span>
                            {part.manufacturer && <><span className="mx-1.5 text-slate-700">|</span>{part.manufacturer as string}</>}
                            {part.category && <><span className="mx-1.5 text-slate-700">|</span>{part.category as string}</>}
                          </p>
                        </div>
                      </div>
                      {part.description && <p className="mt-2 text-sm leading-relaxed text-slate-400">{part.description as string}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
          <div className="flex items-center justify-center gap-2">
            <Database className="h-3.5 w-3.5" />
            <span>Powered by Neo4j &middot; {totalNodes.toLocaleString()} nodes &middot; {totalEdges.toLocaleString()} relationships</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
