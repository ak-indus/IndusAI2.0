import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Globe,
  Phone,
  Bot,
  User,
  Package,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Zap,
  ShoppingCart,
  RotateCcw,
  Star,
  Building2,
  ChevronDown,
  ChevronRight,
  Headphones,
  TrendingUp,
  DollarSign,
  Activity,
  Search,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelType = "whatsapp" | "email" | "web" | "phone" | "ai-chat";
type PersonaType = "support" | "sales" | "finance" | "ops";
type TouchpointStatus = "completed" | "active" | "upcoming";

interface Touchpoint {
  id: string;
  time: string;
  date: string;
  channel: ChannelType;
  persona: PersonaType;
  title: string;
  description: string;
  status: TouchpointStatus;
  aiAssisted: boolean;
  details?: {
    inbound?: string;
    outbound?: string;
    aiAction?: string;
    outcome?: string;
  };
}

interface CustomerProfile {
  name: string;
  company: string;
  segment: string;
  lifetime: string;
  totalOrders: number;
  avgOrderValue: string;
  nps: number;
  channels: ChannelType[];
}

// ---------------------------------------------------------------------------
// Channel & Persona config
// ---------------------------------------------------------------------------

const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: typeof MessageSquare; color: string; bg: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  email: { label: "Email", icon: Mail, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  web: { label: "Web Portal", icon: Globe, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  phone: { label: "Phone", icon: Phone, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  "ai-chat": { label: "AI Assistant", icon: Bot, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
};

const PERSONA_CONFIG: Record<PersonaType, { label: string; icon: typeof Headphones; color: string; bg: string; gradient: string }> = {
  support: { label: "Customer Support", icon: Headphones, color: "text-emerald-700", bg: "bg-emerald-50", gradient: "from-emerald-500 to-emerald-600" },
  sales: { label: "Inbound Sales", icon: TrendingUp, color: "text-blue-700", bg: "bg-blue-50", gradient: "from-blue-500 to-indigo-600" },
  finance: { label: "Finance", icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50", gradient: "from-amber-500 to-orange-600" },
  ops: { label: "Operations", icon: Activity, color: "text-slate-700", bg: "bg-slate-50", gradient: "from-slate-500 to-slate-700" },
};

// ---------------------------------------------------------------------------
// Customer data
// ---------------------------------------------------------------------------

const CUSTOMER: CustomerProfile = {
  name: "Rajesh Patel",
  company: "Patel Industrial Supplies",
  segment: "Mid-Market",
  lifetime: "3 years",
  totalOrders: 47,
  avgOrderValue: "$2,340",
  nps: 9,
  channels: ["whatsapp", "email", "web", "phone", "ai-chat"],
};

// ---------------------------------------------------------------------------
// Journey touchpoints — realistic MRO distributor story
// ---------------------------------------------------------------------------

const JOURNEY: Touchpoint[] = [
  {
    id: "t1",
    time: "09:12 AM",
    date: "Mon, Mar 9",
    channel: "whatsapp",
    persona: "support",
    title: "Initial Inquiry via WhatsApp",
    description: "Customer sends photo of worn bearing asking for replacement",
    status: "completed",
    aiAssisted: true,
    details: {
      inbound: "\"Hi, we have a conveyor bearing that's failing. Here's a photo. Need urgent replacement — line is down. Currently using SKF 6205-2RS.\"",
      aiAction: "AI Vision identifies SKF 6205-2RS from photo. Cross-references Neo4j graph: 3 equivalents found (NSK, FAG, NTN). Checks inventory — SKF in stock (24 units), NSK in stock (12 units).",
      outbound: "\"Hi Rajesh! I identified the SKF 6205-2RS from your photo. We have 24 in stock for same-day dispatch. I also found the NSK 6205DDU as a drop-in alternative at 8% lower cost. Want me to prepare a quote for either?\"",
      outcome: "Response time: 45 seconds (AI-assisted). Customer impressed by speed.",
    },
  },
  {
    id: "t2",
    time: "09:18 AM",
    date: "Mon, Mar 9",
    channel: "whatsapp",
    persona: "sales",
    title: "Handoff to Sales — Quote Request",
    description: "Customer requests quote for bulk order + additional parts",
    status: "completed",
    aiAssisted: true,
    details: {
      inbound: "\"Yes please quote the SKF. Actually, we need 50 units plus the matching seals and retaining rings. Can you do volume pricing?\"",
      aiAction: "AI auto-generates quote Q-2026-0312 with BOM expansion: SKF 6205-2RS x50, HMS5 seals x100, DIN 471 retaining rings x50. Applies tier-2 pricing (12% discount). Flags to sales rep for approval.",
      outbound: "\"Quote Q-2026-0312 ready! 50x SKF 6205-2RS @ $14.20/ea (12% volume discount), plus matching seals and rings. Total: $892.50. Valid 30 days. I've CC'd your sales rep Amir for any custom pricing.\"",
      outcome: "Quote generated in 2 minutes vs. typical 2-hour turnaround.",
    },
  },
  {
    id: "t3",
    time: "02:45 PM",
    date: "Mon, Mar 9",
    channel: "email",
    persona: "sales",
    title: "Email Follow-up with TDS Attachments",
    description: "Sales sends technical data sheets and comparison table",
    status: "completed",
    aiAssisted: true,
    details: {
      inbound: "\"Thanks for the quick quote. Can you send me the TDS for the SKF 6205 and the NSK equivalent? Our engineering team needs to approve.\"",
      aiAction: "AI pulls TDS documents from knowledge graph, generates side-by-side comparison table (load ratings, speed limits, dimensions, seal type). Auto-attaches PDFs to email.",
      outbound: "Email with subject \"TDS: SKF 6205-2RS vs NSK 6205DDU — Patel Industrial\" containing comparison table and 2 PDF attachments. Personalized note highlighting key specs for conveyor application.",
      outcome: "Engineering approval received same day. Cross-channel context preserved from WhatsApp.",
    },
  },
  {
    id: "t4",
    time: "10:30 AM",
    date: "Tue, Mar 10",
    channel: "web",
    persona: "finance",
    title: "PO Submitted via Web Portal",
    description: "Customer places order through self-service portal",
    status: "completed",
    aiAssisted: false,
    details: {
      inbound: "Customer logs into web portal, converts Quote Q-2026-0312 to PO with one click. Selects NET-30 payment terms.",
      aiAction: "System auto-validates: credit check passed ($15K limit, $3.2K utilized), PO matches quote exactly. Order ORD-2026-0189 created.",
      outbound: "Order confirmation email with estimated delivery: Mar 12. Portal shows real-time order tracking.",
      outcome: "Zero-touch order processing. Finance auto-approves based on credit standing.",
    },
  },
  {
    id: "t5",
    time: "11:15 AM",
    date: "Tue, Mar 10",
    channel: "ai-chat",
    persona: "ops",
    title: "Warehouse Pick & Pack Triggered",
    description: "Operations fulfills order with AI-optimized picking",
    status: "completed",
    aiAssisted: true,
    details: {
      inbound: "Order ORD-2026-0189 enters fulfillment queue. Priority: High (line-down situation flagged from original WhatsApp context).",
      aiAction: "AI optimizes pick path across Warehouse A (bearings in Aisle 3, Bay 12; seals in Aisle 5, Bay 8; rings in Aisle 5, Bay 9). Generates shipping label for next-day air based on urgency flag.",
      outbound: "Pick list generated. Warehouse team completes pick in 8 minutes. Package scanned and handed to UPS by 11:45 AM.",
      outcome: "Fulfillment time: 30 minutes. Urgency context from support interaction carried through entire chain.",
    },
  },
  {
    id: "t6",
    time: "03:20 PM",
    date: "Tue, Mar 10",
    channel: "email",
    persona: "ops",
    title: "Shipment Notification with Tracking",
    description: "Auto-generated shipping confirmation across channels",
    status: "completed",
    aiAssisted: true,
    details: {
      inbound: "UPS scan confirms package picked up. Tracking: 1Z999AA10123456784.",
      aiAction: "System sends shipping notification via customer's preferred channels (email + WhatsApp). Includes tracking link, expected delivery, and packing list.",
      outbound: "\"Your order ORD-2026-0189 has shipped! 📦 Tracking: 1Z999AA10123456784. Expected delivery: Wed Mar 11 by 3 PM. Contains: 50x SKF 6205-2RS, 100x seals, 50x retaining rings.\"",
      outcome: "Customer receives notification on both email and WhatsApp simultaneously.",
    },
  },
  {
    id: "t7",
    time: "02:55 PM",
    date: "Wed, Mar 11",
    channel: "whatsapp",
    persona: "support",
    title: "Delivery Confirmation & Installation Query",
    description: "Customer confirms receipt, asks about installation specs",
    status: "completed",
    aiAssisted: true,
    details: {
      inbound: "\"Received the shipment, thanks for the fast delivery! Quick question — what's the recommended press-fit tolerance for the 6205 on a 25mm shaft?\"",
      aiAction: "AI retrieves from knowledge graph: SKF 6205 inner ring bore = 25mm, recommended shaft tolerance = j5 to k5 (+0.002 to +0.015mm) for normal loads, m5 to n5 for heavy loads. Sources: SKF Bearing Installation Guide, ISO 286-2.",
      outbound: "\"Glad it arrived! For the 6205 on a 25mm shaft: use j5 tolerance (25.002-25.009mm) for your conveyor application. For heavier loads, go k5 (25.005-25.015mm). I've attached the SKF installation guide. Need anything else?\"",
      outcome: "Technical support resolved in 30 seconds via AI. No need to escalate to engineering.",
    },
  },
  {
    id: "t8",
    time: "09:00 AM",
    date: "Thu, Mar 12",
    channel: "email",
    persona: "finance",
    title: "Invoice Generated — NET-30",
    description: "Auto-invoice with payment link sent",
    status: "active",
    aiAssisted: true,
    details: {
      inbound: "Delivery confirmed by UPS signature. 48-hour invoice trigger fires.",
      aiAction: "System generates INV-2026-0189 matching PO. Applies volume discount, calculates tax. Sends via email with one-click payment link. Updates AR aging dashboard.",
      outbound: "\"Invoice INV-2026-0189 for $892.50 is attached. Payment due: Apr 11, 2026 (NET-30). Pay online: [secure link]. Thank you for your business!\"",
      outcome: "Automated invoicing. Finance team notified for AR tracking.",
    },
  },
  {
    id: "t9",
    time: "10:00 AM",
    date: "Fri, Mar 13",
    channel: "ai-chat",
    persona: "sales",
    title: "AI Proactive Upsell Recommendation",
    description: "AI identifies cross-sell opportunity based on purchase pattern",
    status: "upcoming",
    aiAssisted: true,
    details: {
      inbound: "AI analyzes purchase history: Rajesh orders bearings quarterly. Graph analysis shows conveyor systems also need lubrication and alignment tools.",
      aiAction: "AI generates personalized recommendation: Mobil SHC 100 synthetic grease (compatible with 6205-2RS), SKF TKBA 40 alignment tool. Schedules outreach for next week.",
      outbound: "\"Hi Rajesh — based on your conveyor bearing setup, I'd recommend the Mobil SHC 100 grease for extended bearing life (2x vs. standard). We also carry the SKF TKBA 40 alignment tool. Want me to add these to your next order?\"",
      outcome: "Predicted 23% increase in order value through AI-driven cross-sell.",
    },
  },
  {
    id: "t10",
    time: "—",
    date: "Ongoing",
    channel: "web",
    persona: "support",
    title: "Satisfaction Survey & NPS Follow-up",
    description: "Automated CSAT collection and account health scoring",
    status: "upcoming",
    aiAssisted: true,
    details: {
      inbound: "7-day post-delivery survey trigger. Customer portal prompts for rating.",
      aiAction: "AI compiles interaction summary: 5 channels used, 4 personas involved, avg response time 2.1 minutes, zero escalations. Predicts NPS score: 9-10 (Promoter).",
      outbound: "\"How was your experience with order ORD-2026-0189? Rate us 1-10. Your feedback helps us serve you better.\"",
      outcome: "Full journey analytics available in Leadership Dashboard for review.",
    },
  },
];

// ---------------------------------------------------------------------------
// Journey stats
// ---------------------------------------------------------------------------

const JOURNEY_STATS = [
  { label: "Channels Used", value: "5", sub: "WhatsApp, Email, Web, Phone, AI", icon: Globe },
  { label: "Personas Involved", value: "4", sub: "Support, Sales, Finance, Ops", icon: User },
  { label: "Avg Response Time", value: "2.1 min", sub: "vs. 45 min industry avg", icon: Clock },
  { label: "AI Assist Rate", value: "90%", sub: "9 of 10 touchpoints", icon: Zap },
  { label: "Time to Fulfill", value: "26 hrs", sub: "Inquiry → Delivered", icon: Truck },
  { label: "Zero Escalations", value: "0", sub: "Full AI-assisted resolution", icon: CheckCircle2 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoJourney() {
  const [expandedTouchpoint, setExpandedTouchpoint] = useState<string | null>("t1");
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | "all">("all");
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | "all">("all");

  const filteredJourney = JOURNEY.filter((tp) => {
    if (selectedChannel !== "all" && tp.channel !== selectedChannel) return false;
    if (selectedPersona !== "all" && tp.persona !== selectedPersona) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/demo"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-montserrat text-xl font-bold text-slate-900">
              Omnichannel Customer Journey
            </h1>
            <p className="text-xs text-slate-500">
              End-to-end view: inquiry to fulfillment across channels & personas
            </p>
          </div>
        </div>
      </div>

      {/* Customer Profile Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg">
              RP
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{CUSTOMER.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Building2 className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-600">{CUSTOMER.company}</span>
                <span className="text-[10px] rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 font-medium text-blue-700">
                  {CUSTOMER.segment}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{CUSTOMER.totalOrders}</p>
              <p className="text-[10px] text-slate-500">Lifetime Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{CUSTOMER.avgOrderValue}</p>
              <p className="text-[10px] text-slate-500">Avg Order Value</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{CUSTOMER.lifetime}</p>
              <p className="text-[10px] text-slate-500">Customer Since</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <p className="text-lg font-bold text-slate-900">{CUSTOMER.nps}</p>
              </div>
              <p className="text-[10px] text-slate-500">NPS Score</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {CUSTOMER.channels.map((ch) => {
                  const cfg = CHANNEL_CONFIG[ch];
                  return <cfg.icon key={ch} className={cn("h-3.5 w-3.5", cfg.color)} />;
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Active Channels</p>
            </div>
          </div>
        </div>
      </div>

      {/* Journey Stats */}
      <div className="grid grid-cols-6 gap-3">
        {JOURNEY_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
            </div>
            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            <p className="text-[10px] text-emerald-600">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Channel:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedChannel("all")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                selectedChannel === "all"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              All
            </button>
            {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelectedChannel(key as ChannelType)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                  selectedChannel === key
                    ? cn(cfg.bg, "border-current", cfg.color)
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Persona:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedPersona("all")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                selectedPersona === "all"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              All
            </button>
            {Object.entries(PERSONA_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelectedPersona(key as PersonaType)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                  selectedPersona === key
                    ? cn(cfg.bg, "border-current", cfg.color)
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Journey Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Journey Timeline</h3>
          <p className="text-[11px] text-slate-500">
            {filteredJourney.length} touchpoints — click to expand details
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredJourney.map((tp, idx) => {
            const chCfg = CHANNEL_CONFIG[tp.channel];
            const pCfg = PERSONA_CONFIG[tp.persona];
            const isExpanded = expandedTouchpoint === tp.id;
            const ChIcon = chCfg.icon;
            const PIcon = pCfg.icon;

            return (
              <div key={tp.id}>
                {/* Touchpoint row */}
                <button
                  onClick={() => setExpandedTouchpoint(isExpanded ? null : tp.id)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-slate-50/50 transition-colors"
                >
                  {/* Timeline dot + connector */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full border-2",
                        tp.status === "completed" && "bg-emerald-500 border-emerald-500",
                        tp.status === "active" && "bg-blue-500 border-blue-500 animate-pulse",
                        tp.status === "upcoming" && "bg-white border-slate-300"
                      )}
                    />
                  </div>

                  {/* Date/time */}
                  <div className="w-24 shrink-0">
                    <p className="text-[11px] font-semibold text-slate-700">{tp.date}</p>
                    <p className="text-[10px] text-slate-400">{tp.time}</p>
                  </div>

                  {/* Channel badge */}
                  <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 w-28 shrink-0", chCfg.bg)}>
                    <ChIcon className={cn("h-3 w-3", chCfg.color)} />
                    <span className={cn("text-[10px] font-medium", chCfg.color)}>{chCfg.label}</span>
                  </div>

                  {/* Persona badge */}
                  <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 w-32 shrink-0", pCfg.bg)}>
                    <PIcon className={cn("h-3 w-3", pCfg.color)} />
                    <span className={cn("text-[10px] font-medium", pCfg.color)}>{pCfg.label}</span>
                  </div>

                  {/* Title & description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{tp.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{tp.description}</p>
                  </div>

                  {/* AI badge */}
                  {tp.aiAssisted && (
                    <div className="flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 shrink-0">
                      <Bot className="h-3 w-3 text-violet-600" />
                      <span className="text-[10px] font-medium text-violet-600">AI</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="shrink-0">
                    {tp.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {tp.status === "active" && <Clock className="h-4 w-4 text-blue-500" />}
                    {tp.status === "upcoming" && <ArrowRight className="h-4 w-4 text-slate-300" />}
                  </div>

                  {/* Expand chevron */}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && tp.details && (
                  <div className="bg-slate-50/80 border-t border-slate-100 px-5 py-4">
                    <div className="ml-10 grid grid-cols-2 gap-4">
                      {/* Inbound */}
                      {tp.details.inbound && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ArrowRight className="h-3 w-3 text-blue-500 rotate-180" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Inbound</p>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">{tp.details.inbound}</p>
                        </div>
                      )}

                      {/* AI Action */}
                      {tp.details.aiAction && (
                        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Bot className="h-3 w-3 text-violet-600" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">AI Processing</p>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">{tp.details.aiAction}</p>
                        </div>
                      )}

                      {/* Outbound */}
                      {tp.details.outbound && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ArrowRight className="h-3 w-3 text-emerald-600" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Outbound Response</p>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">{tp.details.outbound}</p>
                        </div>
                      )}

                      {/* Outcome */}
                      {tp.details.outcome && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="h-3 w-3 text-amber-600" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Outcome</p>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">{tp.details.outcome}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredJourney.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No touchpoints match the selected filters</p>
              <button
                onClick={() => { setSelectedChannel("all"); setSelectedPersona("all"); }}
                className="mt-2 text-xs text-emerald-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Channel × Persona Heatmap */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Channel × Persona Matrix</h3>
          <p className="text-[11px] text-slate-500">
            How this customer interacts across channels and teams
          </p>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 pb-2 w-32" />
                {Object.entries(PERSONA_CONFIG).map(([key, cfg]) => (
                  <th key={key} className="text-center pb-2 px-2">
                    <div className={cn("flex items-center justify-center gap-1 rounded-full py-1", cfg.bg)}>
                      <cfg.icon className={cn("h-3 w-3", cfg.color)} />
                      <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(CHANNEL_CONFIG).map(([chKey, chCfg]) => (
                <tr key={chKey} className="border-t border-slate-100">
                  <td className="py-2">
                    <div className={cn("flex items-center gap-1.5 rounded-full border px-2 py-1 w-fit", chCfg.bg)}>
                      <chCfg.icon className={cn("h-3 w-3", chCfg.color)} />
                      <span className={cn("text-[10px] font-medium", chCfg.color)}>{chCfg.label}</span>
                    </div>
                  </td>
                  {Object.keys(PERSONA_CONFIG).map((pKey) => {
                    const count = JOURNEY.filter(
                      (tp) => tp.channel === chKey && tp.persona === pKey
                    ).length;
                    return (
                      <td key={pKey} className="text-center py-2 px-2">
                        {count > 0 ? (
                          <div
                            className={cn(
                              "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                              count >= 2
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-emerald-50 text-emerald-600"
                            )}
                          >
                            {count}
                          </div>
                        ) : (
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-300 text-xs">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insight */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Key Insight: Seamless Context Handoff</h3>
            <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
              This journey demonstrates how IndusAI preserves context across <strong>5 channels</strong> and <strong>4 personas</strong>.
              The urgency flag from the initial WhatsApp message ("line is down") automatically prioritized warehouse fulfillment.
              AI assisted <strong>90% of touchpoints</strong>, reducing the typical 3-day inquiry-to-delivery cycle to <strong>26 hours</strong> while
              maintaining personalized, technically accurate responses at every step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
