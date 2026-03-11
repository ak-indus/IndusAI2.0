import { useQuery } from "@tanstack/react-query";
import { getGraphStats, searchGraphParts } from "@/lib/api";
import { useState } from "react";
import { Search, Network, Box, Tag, Wrench, ArrowRightLeft, Loader2 } from "lucide-react";

export default function KnowledgeGraph() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["graph-stats"],
    queryFn: getGraphStats,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["graph-search", searchTerm],
    queryFn: () => searchGraphParts(searchTerm),
    enabled: searchTerm.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchQuery);
  };

  const nodes = stats?.nodes || {};
  const edges = stats?.edges || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Graph</h1>
        <p className="mt-1 text-sm text-slate-500">
          Neo4j-powered MRO parts ontology with cross-references, specs, and assemblies
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Parts"
          value={nodes.Part || 0}
          icon={Box}
          loading={statsLoading}
        />
        <StatCard
          label="Manufacturers"
          value={nodes.Manufacturer || 0}
          icon={Wrench}
          loading={statsLoading}
        />
        <StatCard
          label="Categories"
          value={nodes.Category || 0}
          icon={Tag}
          loading={statsLoading}
        />
        <StatCard
          label="Cross-References"
          value={(edges.EQUIVALENT_TO || 0) + (edges.ALTERNATIVE_TO || 0)}
          icon={ArrowRightLeft}
          loading={statsLoading}
        />
      </div>

      {/* Graph Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Node Types</h2>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(nodes).map(([label, count]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{count as number}</span>
                </div>
              ))}
              {Object.keys(nodes).length === 0 && (
                <p className="text-sm text-slate-400">No graph data yet. Run seed to populate.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Edge Types</h2>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(edges).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
                  <span className="text-sm font-medium text-slate-700">{type}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{count as number}</span>
                </div>
              ))}
              {Object.keys(edges).length === 0 && (
                <p className="text-sm text-slate-400">No relationships yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Search Knowledge Graph</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts by SKU, name, or description (e.g., 6204-2RS, bearing, M8 bolt)..."
              className="w-full rounded-lg border bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {searchLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching graph...
          </div>
        )}

        {searchResults && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-slate-500">
              {searchResults.total} result{searchResults.total !== 1 ? "s" : ""} for "{searchResults.query}"
            </p>
            <div className="space-y-3">
              {searchResults.results.map((part: Record<string, unknown>, i: number) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {part.name as string || part.sku as string}
                      </h3>
                      <p className="text-sm text-slate-500">
                        SKU: {part.sku as string}
                        {part.manufacturer && <> | Manufacturer: {part.manufacturer as string}</>}
                        {part.category && <> | Category: {part.category as string}</>}
                      </p>
                    </div>
                    {typeof part.score === "number" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Score: {(part.score as number).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {part.description && (
                    <p className="mt-2 text-sm text-slate-600">{part.description as string}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : value.toLocaleString()}
      </p>
    </div>
  );
}
