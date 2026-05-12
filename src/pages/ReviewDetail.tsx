import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ReviewQueueDetail, ParsedLineItem } from "@/lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const docTypeBadge: Record<string, string> = {
  purchase_order: "bg-blue-100 text-blue-700",
  rfq: "bg-purple-100 text-purple-700",
  inquiry: "bg-gray-100 text-gray-600",
  return_request: "bg-red-100 text-red-700",
};

const channelBadge: Record<string, string> = {
  email: "bg-indigo-100 text-indigo-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
  web: "bg-sky-100 text-sky-700",
  manual: "bg-orange-100 text-orange-700",
  sms: "bg-violet-100 text-violet-700",
  edi: "bg-amber-100 text-amber-700",
  fax: "bg-gray-100 text-gray-600",
};

function MatchBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Matched
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
        </svg>
        Fuzzy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      No match
    </span>
  );
}

function StockBadge({ inStock }: { inStock: boolean | null }) {
  if (inStock === true) {
    return <span className="text-xs font-medium text-green-700">Yes</span>;
  }
  if (inStock === false) {
    return <span className="text-xs font-medium text-red-700">No</span>;
  }
  return <span className="text-xs text-gray-400">&mdash;</span>;
}

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const {
    data: item,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["review-item", id],
    queryFn: () => api.getReviewItem(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveReview(id!, "admin"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["review-item", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order created successfully");
      if (data?.order?.id) navigate(`/orders/${data.order.id}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectReview(id!, "admin", reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      toast.success("Document rejected");
      navigate("/review-queue");
    },
  });

  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        <span className="ml-3 text-sm text-gray-500">
          Loading review details...
        </span>
      </div>
    );
  }

  /* Error */
  if (isError || !item) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/review-queue")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <span aria-hidden="true">&larr;</span> Back to Review Queue
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">
            Failed to load review item
          </p>
          <p className="mt-1 text-sm text-red-600">
            {error instanceof Error
              ? error.message
              : "Review item not found or an unexpected error occurred."}
          </p>
        </div>
      </div>
    );
  }

  const parsed = item.parsed_data;
  const lineItems: ParsedLineItem[] = parsed.line_items ?? [];

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate("/review-queue")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
      >
        <span aria-hidden="true">&larr;</span> Back to Review Queue
      </button>

      {/* Mutation error */}
      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {(approveMutation.error ?? rejectMutation.error) instanceof Error
              ? (approveMutation.error ?? rejectMutation.error)!.message
              : "Action failed. Please try again."}
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---- Left Column: Original Document (40%) ---- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    channelBadge[item.channel] ?? "bg-gray-100 text-gray-600"
                  )}
                >
                  {item.channel}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {item.sender_name ?? item.sender_id}
                </span>
                {item.sender_name && (
                  <span className="text-sm text-gray-500">
                    ({item.sender_id})
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Received{" "}
                {new Date(item.received_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Subject + Body */}
            <div className="px-6 py-4 space-y-3">
              {item.subject && (
                <p className="text-sm font-bold text-gray-900">{item.subject}</p>
              )}
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-4 text-sm text-gray-700">
                {item.original_body}
              </pre>
            </div>

            {/* Attachments */}
            {item.attachments && item.attachments.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Attachments
                </h3>
                <ul className="mt-2 space-y-1">
                  {item.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L18 9.828a4 4 0 00-5.656-5.656L5.757 10.757a6 6 0 008.486 8.486L20.5 13"
                        />
                      </svg>
                      <span className="font-medium">{att.filename}</span>
                      <span className="text-gray-400">
                        {att.content_type} &middot;{" "}
                        {(att.size_bytes / 1024).toFixed(1)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ---- Right Column: Parsed Data (60%) ---- */}
        <div className="lg:col-span-3 space-y-6">
          {/* Document Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Document Information
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    docTypeBadge[parsed.document_type] ?? "bg-gray-100 text-gray-600"
                  )}
                >
                  {parsed.document_type.replace(/_/g, " ")}
                </span>
              </div>
              {parsed.po_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">PO Number</span>
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {parsed.po_number}
                  </span>
                </div>
              )}
              {parsed.required_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Required Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(parsed.required_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
              {parsed.payment_terms && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payment Terms</span>
                  <span className="text-sm font-medium text-gray-900">
                    {parsed.payment_terms}
                  </span>
                </div>
              )}
              {parsed.special_instructions && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">
                    Special Instructions
                  </span>
                  <span className="text-sm text-gray-700 text-right max-w-xs">
                    {parsed.special_instructions}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Customer
            </h2>
            <dl className="mt-4 space-y-3">
              {parsed.customer_name && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {parsed.customer_name}
                  </dd>
                </div>
              )}
              {parsed.customer_email && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-700">
                    {parsed.customer_email}
                  </dd>
                </div>
              )}
              {parsed.customer_phone && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-700">
                    {parsed.customer_phone}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Resolution</dt>
                <dd>
                  {parsed._customer_resolved ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Matched
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Not Found
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Confidence</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {(parsed._customer_confidence * 100).toFixed(0)}%
                </dd>
              </div>
            </dl>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Line Items ({lineItems.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Part #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Manufacturer
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Req. Price
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Match
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Our SKU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Our Price
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      In Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-12 text-center text-sm text-gray-400"
                      >
                        No line items parsed.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {line.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-700">
                          {line.part_number ?? <span className="text-gray-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {line.manufacturer ?? <span className="text-gray-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                          {line.quantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {line.unit}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                          {line.requested_price != null
                            ? formatCurrency(line.requested_price)
                            : <span className="text-gray-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <MatchBadge confidence={line.match_confidence} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-700">
                          {line.resolved_sku ?? <span className="text-gray-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                          {line.resolved_unit_price != null
                            ? formatCurrency(line.resolved_unit_price)
                            : <span className="text-gray-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <StockBadge inStock={line.in_stock} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Review Reasons */}
          {item.review_reasons && item.review_reasons.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800">
                Review Reasons
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {item.review_reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-amber-700">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shipping / Billing Address */}
          {(parsed.shipping_address || parsed.billing_address) && (
            <div className="grid gap-6 sm:grid-cols-2">
              {parsed.shipping_address && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Shipping Address
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                    {parsed.shipping_address}
                  </p>
                </div>
              )}
              {parsed.billing_address && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Billing Address
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                    {parsed.billing_address}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {(item.status === "pending_review" || item.status === "in_review") && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    disabled={isMutating}
                    onClick={() => approveMutation.mutate()}
                    className={cn(
                      "rounded-md px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors",
                      isMutating
                        ? "cursor-not-allowed bg-green-400"
                        : "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    {approveMutation.isPending
                      ? "Creating Order..."
                      : "Approve & Create Order"}
                  </button>
                  <button
                    disabled={isMutating}
                    onClick={() => setShowRejectForm(true)}
                    className={cn(
                      "rounded-md border px-5 py-2.5 text-sm font-medium shadow-sm transition-colors",
                      isMutating
                        ? "cursor-not-allowed border-red-200 bg-red-50 text-red-300"
                        : "border-red-300 bg-white text-red-600 hover:bg-red-50"
                    )}
                  >
                    Reject
                  </button>
                </div>

                {showRejectForm && (
                  <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Rejection Reason
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Explain why this document is being rejected..."
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={isMutating || !rejectReason.trim()}
                        onClick={() => rejectMutation.mutate(rejectReason.trim())}
                        className={cn(
                          "rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors",
                          isMutating || !rejectReason.trim()
                            ? "cursor-not-allowed bg-red-400"
                            : "bg-red-600 hover:bg-red-700"
                        )}
                      >
                        {rejectMutation.isPending
                          ? "Rejecting..."
                          : "Confirm Rejection"}
                      </button>
                      <button
                        disabled={isMutating}
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason("");
                        }}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {item.status === "processed" && (
              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Order Created
                </span>
                {item.result_order_id && (
                  <button
                    onClick={() => navigate(`/orders/${item.result_order_id}`)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View Order &rarr;
                  </button>
                )}
              </div>
            )}

            {item.status === "rejected" && (
              <div className="space-y-2">
                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Rejected
                </span>
                {item.reviewed_by && (
                  <p className="text-sm text-gray-500">
                    by {item.reviewed_by}
                    {item.reviewed_at &&
                      ` on ${new Date(item.reviewed_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
