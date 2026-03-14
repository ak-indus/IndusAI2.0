import { useQuery } from "@tanstack/react-query";
import { api, RMA as RMAType } from "@/lib/api";
import { DEMO_RMAS } from "@/lib/demoData";
import { statusColor, cn } from "@/lib/utils";
import { useState } from "react";

export default function RMA() {
  const [page, setPage] = useState(1);

  const rmaQuery = useQuery({
    queryKey: ["rmas", page],
    queryFn: () => api.getRMAs(page),
  });

  const useFallback = rmaQuery.isError || (!rmaQuery.isLoading && !rmaQuery.data);
  const rmaItems = useFallback ? DEMO_RMAS : (rmaQuery.data?.items ?? []);

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {useFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          <span className="font-semibold">Demo Mode</span> — Showing sample data. Connect backend for live data.
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RMA / Returns</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage return merchandise authorizations and track return status.
        </p>
      </div>

      {/* Loading */}
      {rmaQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">Loading RMAs...</span>
        </div>
      )}

      {/* Table */}
      {!rmaQuery.isLoading && (rmaQuery.data || useFallback) && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    RMA #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rmaItems.map((rma: RMAType) => (
                  <tr
                    key={rma.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                      {rma.rma_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {rma.customer_name || rma.customer_id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          statusColor(rma.status)
                        )}
                      >
                        {rma.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {rma.reason}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(rma.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {rmaItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      No RMAs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!useFallback && rmaQuery.data && rmaQuery.data.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {rmaQuery.data.page} of {rmaQuery.data.total_pages} (
                {rmaQuery.data.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(rmaQuery.data!.total_pages, p + 1)
                    )
                  }
                  disabled={page >= rmaQuery.data.total_pages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
