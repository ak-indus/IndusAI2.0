import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Headphones,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
  Mail,
  Globe,
  Star,
  Sparkles,
  Send,
  Pencil,
  Database,
  FileText,
  Server,
  ChevronRight,
  User,
  Bot,
  Shield,
  Flame,
  CircleDot,
  ArrowDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Priority = "critical" | "high" | "medium" | "low";
type Channel = "whatsapp" | "email" | "web";
type TicketStatus =
  | "open"
  | "in-progress"
  | "waiting-customer"
  | "escalated"
  | "resolved";

interface Ticket {
  id: string;
  priority: Priority;
  customer: string;
  subject: string;
  channel: Channel;
  status: TicketStatus;
  assignedTo: string;
  age: string;
  customerMessage?: string;
  aiDraft?: string;
  confidence?: number;
}

interface ResolvedTicket {
  id: string;
  customer: string;
  subject: string;
  resolutionTime: string;
  rating: number;
  resolvedBy: string;
  resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; bg: string; text: string; icon: typeof Flame }
> = {
  critical: {
    label: "Critical",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: Flame,
  },
  high: {
    label: "High",
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: CircleDot,
  },
  low: {
    label: "Low",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: ArrowDown,
  },
};

const CHANNEL_CONFIG: Record<
  Channel,
  { label: string; icon: typeof MessageSquare; color: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    color: "text-green-600",
  },
  email: { label: "Email", icon: Mail, color: "text-blue-600" },
  web: { label: "Web", icon: Globe, color: "text-purple-600" },
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-800",
  "waiting-customer": "bg-purple-100 text-purple-700",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-green-100 text-green-700",
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const TICKETS: Ticket[] = [
  {
    id: "TKT-2024-0312",
    priority: "critical",
    customer: "Acme Manufacturing",
    subject:
      "Urgent: pump failure at Acme Mfg, need emergency 6206-2RS stock",
    channel: "whatsapp",
    status: "open",
    assignedTo: "Sarah Chen",
    age: "8 min",
    customerMessage:
      "URGENT — Our main coolant pump just seized up on Line 3. We need SKF 6206-2RS bearings ASAP. Production is down and we're losing $4,200/hour. Do you have stock? Can you get them here today? We need at least 4 units.",
    aiDraft:
      "Hi Team at Acme Manufacturing,\n\nI understand the urgency — production downtime is critical. Here's what I've found:\n\n**SKF 6206-2RS Deep Groove Ball Bearing**\n• Bore: 30mm | OD: 62mm | Width: 16mm\n• Dynamic load: 20.3 kN | Speed rating: 11,000 RPM\n• Current stock: 18 units @ Warehouse A (Dallas)\n\n**Availability: IN STOCK — Ready for immediate dispatch**\n\nI've flagged this for emergency same-day courier delivery. Estimated arrival at your facility: 2:30 PM today (within 3 hours).\n\n**Pricing (emergency order):**\n• 4x SKF 6206-2RS @ $24.50/ea = $98.00\n• Emergency same-day shipping: $45.00\n• Total: $143.00\n\nI'm also cross-referencing the NSK 6206DDU as a backup — we have 12 units of those as well if you need additional spares.\n\nShall I process this order immediately? I can have a PO confirmation to you in under 5 minutes.\n\nBest regards,\nIndusAI Support",
    confidence: 97,
  },
  {
    id: "TKT-2024-0311",
    priority: "high",
    customer: "Pacific Motors Inc.",
    subject:
      "SKF 6204-2RS wrong quantity shipped — need 24, got 12",
    channel: "email",
    status: "in-progress",
    assignedTo: "Mike Torres",
    age: "1.2 hrs",
    customerMessage:
      "Hi, we received our order ORD-2024-0102 today but only got 12 units of SKF 6204-2RS instead of the 24 we ordered. Please advise on getting the remaining 12 shipped ASAP. Our assembly line needs them by Thursday.",
    aiDraft:
      "Dear Pacific Motors Inc.,\n\nThank you for alerting us to this shipment discrepancy. I've verified the issue:\n\n**Order ORD-2024-0102 — Shipment Verification:**\n• Ordered: 24x SKF 6204-2RS\n• Shipped (per warehouse log): 12x SKF 6204-2RS\n• Discrepancy: 12 units short\n\n**Root cause:** Warehouse pick error — inventory system shows 48 units available. The shortage is not a stock issue.\n\n**Resolution:**\nI've initiated an immediate replacement shipment for the remaining 12 units:\n• Shipping via UPS Next Day Air (no additional charge)\n• Estimated delivery: Wednesday, Mar 11 — ahead of your Thursday deadline\n• A $25 shipping credit has been applied to your account for the inconvenience\n\nTracking details will be sent within the hour.\n\nSincerely,\nIndusAI Support",
    confidence: 94,
  },
  {
    id: "TKT-2024-0310",
    priority: "medium",
    customer: "Delta Industrial Supply",
    subject:
      "Need TDS for Mobil SHC 630 synthetic lubricant",
    channel: "email",
    status: "waiting-customer",
    assignedTo: "Sarah Chen",
    age: "3.5 hrs",
    customerMessage:
      "Hi, we're evaluating Mobil SHC 630 for our enclosed gear drives. Can you send us the full technical data sheet? We need to verify viscosity at operating temperature and the pour point before we can approve it for our cold-storage facility.",
    aiDraft:
      "Dear Delta Industrial Supply,\n\nThank you for your interest in the Mobil SHC 630. Here are the key specifications from the TDS:\n\n**Mobil SHC 630 — Synthetic Gear & Bearing Oil**\n• ISO Viscosity Grade: 220\n• Kinematic Viscosity @ 40°C: 220 cSt\n• Kinematic Viscosity @ 100°C: 26.0 cSt\n• Viscosity Index: 168 (excellent for wide temp range)\n• Pour Point: -39°C / -38°F — well suited for cold-storage\n• Flash Point: 266°C / 510°F\n• FZG Load Stage: 12+ (pass)\n• Bearing Life Extension: Up to 6x vs. mineral oils\n\n**Highlights for your application:**\n- Outstanding performance in enclosed gear drives at both high and low temperatures\n- The -39°C pour point makes it an excellent choice for cold-storage environments\n- PAO-based synthetic — compatible with standard gear drive seals\n\n**Download full TDS:** [Mobil SHC 630 TDS (PDF)](link)\n\nWe have this product in stock in both 5-gallon pails ($485/pail) and 55-gallon drums ($4,250/drum). Would you like a quote for your facility?\n\nBest regards,\nIndusAI Support",
    confidence: 96,
  },
  {
    id: "TKT-2024-0309",
    priority: "high",
    customer: "Rodriguez Machining Co.",
    subject:
      "Order ORD-2024-0089 delayed — customer on WhatsApp asking ETA",
    channel: "whatsapp",
    status: "in-progress",
    assignedTo: "James Park",
    age: "4 hrs",
  },
  {
    id: "TKT-2024-0308",
    priority: "medium",
    customer: "Summit Engineering LLC",
    subject:
      "Cross-reference request: FAG to NSK for 22310 spherical roller",
    channel: "web",
    status: "open",
    assignedTo: "Mike Torres",
    age: "5.2 hrs",
    customerMessage:
      "We currently use FAG 22310-E1-K spherical roller bearings in our heavy-duty conveyor pulleys. We're looking at switching to NSK to consolidate vendors. Can you provide the exact NSK cross-reference with load ratings and dimensions so our engineering team can approve the swap?",
    aiDraft:
      "Dear Summit Engineering LLC,\n\nGreat news — there is a direct NSK cross-reference for the FAG 22310-E1-K. Here's the comparison:\n\n**Cross-Reference: FAG 22310-E1-K → NSK 22310EAE4**\n\n| Specification | FAG 22310-E1-K | NSK 22310EAE4 |\n|--------------|----------------|----------------|\n| Type | Spherical Roller | Spherical Roller |\n| Bore (d) | 50mm | 50mm |\n| OD (D) | 110mm | 110mm |\n| Width (B) | 40mm | 40mm |\n| Dynamic Load (Cr) | 170 kN | 173 kN |\n| Static Load (C0r) | 166 kN | 170 kN |\n| Limiting Speed | 5,600 RPM | 5,600 RPM |\n| Cage | Pressed steel | Pressed steel |\n| Bore Type | Tapered 1:12 | Tapered 1:12 |\n\nThe NSK 22310EAE4 is a **drop-in replacement** with slightly higher load ratings (+1.7% dynamic, +2.4% static). Both use a tapered bore suitable for adapter sleeve mounting on your conveyor pulleys.\n\n**Availability & Pricing:**\n• FAG 22310-E1-K: In stock (8 units) — $89.50/ea\n• NSK 22310EAE4: In stock (14 units) — $82.75/ea (7.5% savings)\n\nThe NSK option saves $6.75/unit while meeting or exceeding all FAG specifications. Want me to prepare a quote for your next order quantity?\n\nBest regards,\nIndusAI Support",
    confidence: 92,
  },
  {
    id: "TKT-2024-0307",
    priority: "high",
    customer: "Titan Bearings Ltd.",
    subject:
      "RMA pending — corroded bearings, lot #BRG-2024-1180",
    channel: "email",
    status: "escalated",
    assignedTo: "Sarah Chen",
    age: "1.2 days",
  },
  {
    id: "TKT-2024-0306",
    priority: "medium",
    customer: "Great Lakes Hydraulics",
    subject:
      "Invoice INV-2024-0156 discrepancy — pricing doesn't match quote QT-0078",
    channel: "web",
    status: "in-progress",
    assignedTo: "James Park",
    age: "1.5 days",
  },
  {
    id: "TKT-2024-0305",
    priority: "low",
    customer: "Midwest Power Systems",
    subject:
      "Technical: customer needs viscosity compatibility data for Gates PowerGrip belt",
    channel: "email",
    status: "open",
    assignedTo: "Mike Torres",
    age: "2 days",
  },
];

const RESOLVED_TICKETS: ResolvedTicket[] = [
  {
    id: "TKT-2024-0304",
    customer: "Sterling Valve Corp.",
    subject: "Replacement gasket set for Garlock 3200 — need exact P/N",
    resolutionTime: "18 min",
    rating: 5,
    resolvedBy: "Sarah Chen",
    resolvedAt: "Today, 9:42 AM",
  },
  {
    id: "TKT-2024-0303",
    customer: "Apex Fluid Power",
    subject: "Bulk pricing request for 500x M10 hex bolts Grade 8.8",
    resolutionTime: "34 min",
    rating: 5,
    resolvedBy: "Mike Torres",
    resolvedAt: "Today, 8:15 AM",
  },
  {
    id: "TKT-2024-0302",
    customer: "Northern Conveyor Systems",
    subject: "Belt tension specs for Gates B68 — new installation",
    resolutionTime: "12 min",
    rating: 4,
    resolvedBy: "James Park",
    resolvedAt: "Yesterday, 4:50 PM",
  },
  {
    id: "TKT-2024-0301",
    customer: "Coastal Marine Services",
    subject: "Corrosion-resistant bearing alternatives for saltwater environment",
    resolutionTime: "45 min",
    rating: 5,
    resolvedBy: "Sarah Chen",
    resolvedAt: "Yesterday, 2:30 PM",
  },
  {
    id: "TKT-2024-0300",
    customer: "ProTech Automation",
    subject: "Order confirmation missing — ORD-2024-0085 placed via web portal",
    resolutionTime: "6 min",
    rating: 4,
    resolvedBy: "Mike Torres",
    resolvedAt: "Yesterday, 11:20 AM",
  },
];

// ---------------------------------------------------------------------------
// KPI Card Component
// ---------------------------------------------------------------------------

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Headphones;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; iconText: string }> = {
    emerald: {
      bg: "border-emerald-200",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
    },
    blue: {
      bg: "border-blue-200",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },
    amber: {
      bg: "border-amber-200",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
    },
    red: {
      bg: "border-red-200",
      iconBg: "bg-red-100",
      iconText: "text-red-600",
    },
  };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-5 py-4 shadow-sm transition-all hover:shadow-md",
        c.bg
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            c.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", c.iconText)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Star Rating Component
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DemoSupport() {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    TICKETS[0].id
  );

  const selectedTicket = TICKETS.find((t) => t.id === selectedTicketId) || TICKETS[0];
  const hasAiDraft = !!selectedTicket.aiDraft;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/demo" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">&larr; Back to Demo Hub</Link>
          <h1 className="text-xl font-bold text-gray-900">
            Customer Support Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            AI-assisted support queue &mdash; MRO distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">
              AI Copilot Active
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500">
            Agent: <span className="font-semibold text-gray-900">Sarah Chen</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Open Tickets"
          value={12}
          subtitle="3 critical, 4 high priority"
          icon={Headphones}
          color="emerald"
        />
        <KPICard
          title="Avg Response Time"
          value="2.4 min"
          subtitle="AI-assisted, down from 18 min"
          icon={Clock}
          color="blue"
        />
        <KPICard
          title="Resolution Rate"
          value="94%"
          subtitle="First-contact resolution"
          icon={CheckCircle2}
          color="amber"
        />
        <KPICard
          title="Escalations Today"
          value={3}
          subtitle="1 RMA, 1 pricing, 1 stockout"
          icon={ArrowUpRight}
          color="red"
        />
      </div>

      {/* Main Content: Queue + AI Panel */}
      <div className="flex gap-4">
        {/* Active Support Queue */}
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-gray-900">
                Active Support Queue
              </h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {TICKETS.length} tickets
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> Critical: 1
              </span>
              <span className="mx-1 text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> High: 3
              </span>
              <span className="mx-1 text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Medium: 3
              </span>
              <span className="mx-1 text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Low: 1
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Priority
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Customer
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Channel
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Assigned To
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Age
                  </th>
                </tr>
              </thead>
              <tbody>
                {TICKETS.map((ticket) => {
                  const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                  const channelCfg = CHANNEL_CONFIG[ticket.channel];
                  const PriorityIcon = priorityCfg.icon;
                  const ChannelIcon = channelCfg.icon;
                  const isSelected = ticket.id === selectedTicketId;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={cn(
                        "cursor-pointer border-b border-gray-50 transition-colors",
                        isSelected
                          ? "bg-emerald-50/60 border-l-2 border-l-emerald-500"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            priorityCfg.bg,
                            priorityCfg.text
                          )}
                        >
                          <PriorityIcon className="h-3 w-3" />
                          {priorityCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {ticket.customer}
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-2.5 text-gray-600">
                        {ticket.subject}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            channelCfg.color
                          )}
                        >
                          <ChannelIcon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium">
                            {channelCfg.label}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            STATUS_STYLES[ticket.status]
                          )}
                        >
                          {ticket.status
                            .split("-")
                            .map(
                              (w) => w.charAt(0).toUpperCase() + w.slice(1)
                            )
                            .join(" ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {ticket.assignedTo}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            ticket.priority === "critical"
                              ? "text-red-600"
                              : "text-gray-500"
                          )}
                        >
                          {ticket.age}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI-Assisted Response Panel */}
        <div className="w-[420px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          {/* Panel Header */}
          <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  AI Response Assistant
                </h3>
                <p className="text-[10px] text-emerald-100">
                  GraphRAG-powered draft for {selectedTicket.id}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {hasAiDraft ? (
              <div className="p-4 space-y-4">
                {/* Customer Message */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Customer Message
                    </span>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                    <p className="text-[11px] leading-relaxed text-gray-700">
                      {selectedTicket.customerMessage}
                    </p>
                  </div>
                </div>

                {/* AI Draft */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                        AI Draft Response
                      </span>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5">
                      <Shield className="h-3 w-3 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700">
                        {selectedTicket.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 px-3.5 py-2.5">
                    <div className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {selectedTicket.aiDraft}
                    </div>
                  </div>
                </div>

                {/* Sources */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: "Neo4j Knowledge Graph",
                        icon: Database,
                        color: "text-blue-600 bg-blue-50 border-blue-200",
                      },
                      {
                        label: "TDS Database",
                        icon: FileText,
                        color:
                          "text-purple-600 bg-purple-50 border-purple-200",
                      },
                      {
                        label: "Inventory System",
                        icon: Server,
                        color:
                          "text-emerald-600 bg-emerald-50 border-emerald-200",
                      },
                    ].map((source) => (
                      <div
                        key={source.label}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5",
                          source.color
                        )}
                      >
                        <source.icon className="h-3 w-3" />
                        <span className="text-[10px] font-medium">
                          {source.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
                    <Send className="h-3.5 w-3.5" />
                    Send to Customer
                  </button>
                  <div className="flex gap-2">
                    <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Draft
                    </button>
                    <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Escalate to Sales
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* No AI draft available for this ticket */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Sparkles className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  Select a ticket with AI draft
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  AI drafts are available for critical and high-priority tickets.
                  Select <span className="font-semibold">TKT-2024-0312</span> or{" "}
                  <span className="font-semibold">TKT-2024-0311</span> to see the
                  AI-assisted response.
                </p>
                <button
                  onClick={() => setSelectedTicketId(TICKETS[0].id)}
                  className="mt-4 flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  View critical ticket
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Resolutions */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">
              Recent Resolutions
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              Last 24 hours
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>
              Avg satisfaction:{" "}
              <span className="font-semibold text-gray-700">4.6 / 5</span>
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {RESOLVED_TICKETS.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-gray-400">
                      {ticket.id}
                    </span>
                    <span className="text-[11px] font-medium text-gray-900">
                      {ticket.customer}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 max-w-[450px]">
                    {ticket.subject}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Resolution time</p>
                  <p className="text-[11px] font-semibold text-gray-700">
                    {ticket.resolutionTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 mb-0.5">Satisfaction</p>
                  <StarRating rating={ticket.rating} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Resolved by</p>
                  <p className="text-[11px] font-medium text-gray-600">
                    {ticket.resolvedBy}
                  </p>
                </div>
                <div className="text-right min-w-[110px]">
                  <p className="text-[10px] text-gray-400">When</p>
                  <p className="text-[11px] text-gray-500">
                    {ticket.resolvedAt}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
