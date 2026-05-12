import { useQuery } from "@tanstack/react-query";
import { api, PaginatedResponse, ReviewQueueItem } from "@/lib/api";
import { useState } from "react";
import { cn, statusColor, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const STATUSES = [
  "All",
  "Pending Review",
  "In Review",
  "Approved",
  "Rejected",
  "Processed",
] as const;

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["review-queue", page, statusFilter],
    queryFn: () => api.getReviewQueue(page, statusFilter),
  });

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Review Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve parsed documents before processing
          </p>
        </div>
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const value = s === "All" ? "" : s.toLowerCase().replace(/ /g, "_");
          const isActive = statusFilter === value;
          return (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
          <span className="ml-3 text-sm text-gray-500">Loading review queue...</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">
            Failed to load review queue
          </p>
          <p className="mt-1 text-sm text-red-600">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Subject / Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center text-sm text-gray-400"
                    >
                      No items found.
                    </td>
                  </tr>
                ) : (
                  items.map((item: ReviewQueueItem) => {
                    const confidencePct = Math.round(item.overall_confidence * 100);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/review-queue/${item.id}`)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        {/* Status */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              statusColor(item.status)
                            )}
                          >
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          <span
                            className={cn(
                              confidencePct >= 80
                                ? "text-green-600"
                                : confidencePct >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                            )}
                          >
                            {confidencePct}%
                          </span>
                        </td>

                        {/* Channel */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 capitalize">
                          {item.channel}
                        </td>

                        {/* Sender */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {item.sender_name || item.sender_id}
                        </td>

                        {/* Subject / Preview */}
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-900">
                          {item.subject
                            ? item.subject
                            : item.document_type.length > 60
                              ? `${item.document_type.slice(0, 60)}...`
                              : item.document_type}
                        </td>

                        {/* Type */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            {item.document_type.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                          {item.line_item_count}
                        </td>

                        {/* Time */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {data?.page ?? 1} of {totalPages}
              {data?.total != null && (
                <span className="ml-1">({data.total} total items)</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  page <= 1
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                )}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  page >= totalPages
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                )}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
