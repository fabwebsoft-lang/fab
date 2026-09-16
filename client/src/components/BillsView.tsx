import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAccessControl } from "@/contexts/AccessControlContext";
import {
  FileText,
  Search,
  Download,
  ChevronRight,
  Filter,
  Eye,
  Tag,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  Received: "bg-amber-100 text-amber-800 border-amber-200",
  Processing: "bg-blue-100 text-blue-800 border-blue-200",
  Ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Collected: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function BillsView({ onNewOrder }: { onNewOrder: () => void }) {
  const { data: orders = [], isLoading } = trpc.orders.list.useQuery();
  const { canDelete, role } = useAccessControl();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;
    const matchesQuery =
      `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F4C5C] flex items-center gap-2">
            <FileText className="size-6 text-[#0F4C5C]" />
            Bills & Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full history of customer laundry bills, payment status, and cloth tags
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill #, customer, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
            />
          </div>
          <button
            onClick={onNewOrder}
            className="px-4 py-2 bg-[#0F4C5C] text-white text-xs font-semibold rounded-xl hover:bg-[#0F4C5C]/90 transition shadow-sm whitespace-nowrap"
          >
            + New Order
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["All", "Received", "Processing", "Ready", "Collected"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              statusFilter === st
                ? "bg-[#0F4C5C] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table / Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading invoices...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <FileText className="size-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700">No bills found</p>
          <p className="text-xs text-slate-500 mt-1">Try changing search filters or create a new order</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Garments / Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const dueAmount = Math.max(0, order.totalAmount - order.amountPaid);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F4C5C]">
                        {order.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{order.customer}</p>
                        <p className="text-slate-400 text-[10px]">{order.phone}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[240px] truncate">
                        {order.items}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {order.amount}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {dueAmount > 0 ? (
                          <span className="text-rose-600 font-bold">₹{dueAmount} due</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Paid</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                            statusStyles[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-slate-100 text-[#0F4C5C] font-semibold rounded-lg hover:bg-slate-200 transition text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="size-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedOrder && (
        <BillDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

function BillDetailsModal({ order, onClose }: { order: any; onClose: () => void }) {
  const { canDelete, role } = useAccessControl();
  const utils = trpc.useUtils();
  const dueAmount = Math.max(0, order.totalAmount - order.amountPaid);

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: async () => {
      await utils.orders.list.invalidate();
      toast.success(`Bill ${order.id} deleted`);
      onClose();
    },
    onError: (err) => toast.error("Failed to delete bill", { description: err.message }),
  });

  const handleDelete = () => {
    if (!canDelete) {
      toast.error("Permission Denied", { description: "Staff role is restricted from deleting bills. Contact an Admin or Manager." });
      return;
    }
    if (confirm(`Are you sure you want to delete Bill ${order.id}? This action cannot be undone.`)) {
      deleteOrderMutation.mutate({ id: order.id });
    }
  };

  const handleDownloadReceipt = () => {
    const receiptHtml = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fabric Care Receipt ${order.id}</title>
  <style>
    body { margin:0; background:#f8fafc; color:#0f172a; font:14px Arial,sans-serif; }
    .receipt { width:600px; margin:32px auto; background:#fff; padding:32px; border-radius:16px; border:1px solid #e2e8f0; }
    .brand { color:#0F4C5C; font-size:22px; font-weight:700; }
    .muted { color:#64748b; font-size:12px; }
    .rule { border:0; border-top:1px solid #e2e8f0; margin:20px 0; }
    .row { display:flex; justify-space-between; padding:8px 0; font-size:13px; }
    .value { font-weight:700; text-align:right; }
    .footer { margin-top:24px; color:#64748b; font-size:11px; text-align:center; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="brand">Fabric Care</div>
    <div class="muted">You wear, we care · Official Customer Receipt</div>
    <hr class="rule">
    <div class="row"><span>Bill Number:</span><span class="value">${order.id}</span></div>
    <div class="row"><span>Customer:</span><span class="value">${order.customer} (${order.phone})</span></div>
    <div class="row"><span>Items:</span><span class="value">${order.items}</span></div>
    <div class="row"><span>Status:</span><span class="value">${order.status}</span></div>
    <hr class="rule">
    <div class="row"><span>Total Amount:</span><span class="value">₹${order.totalAmount}</span></div>
    <div class="row"><span>Amount Paid:</span><span class="value">₹${order.amountPaid}</span></div>
    <div class="row"><span>Balance Due:</span><span class="value">₹${dueAmount}</span></div>
    <div class="footer">Thank you for trusting Fabric Care!</div>
  </div>
</body>
</html>`;

    const blob = new Blob([receiptHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded!");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <span className="font-mono text-xs font-bold text-[#0F4C5C]">Bill {order.id}</span>
            <h3 className="text-base font-bold text-slate-800">{order.customer}</h3>
            <p className="text-xs text-slate-500">{order.phone}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2">
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl space-y-1">
            <span className="text-slate-500 block font-semibold">Garments / Items:</span>
            <p className="text-slate-800">{order.items}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-500 block text-[11px]">Total Amount</span>
              <span className="text-sm font-bold text-slate-800">₹{order.totalAmount}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-500 block text-[11px]">Balance Due</span>
              <span className={`text-sm font-bold ${dueAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{dueAmount}
              </span>
            </div>
          </div>

          {/* Role access notice if Staff */}
          {!canDelete && (
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
              <Lock className="size-3.5 text-amber-600 shrink-0" />
              <span>Bill deletion is restricted for <strong>Staff</strong> role.</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDownloadReceipt}
            className="flex-1 py-3 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl hover:bg-[#0F4C5C]/90 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="size-4" /> Receipt
          </button>

          {canDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleteOrderMutation.isPending}
              className="py-3 px-4 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="size-4" /> {deleteOrderMutation.isPending ? "Deleting..." : "Delete Bill"}
            </button>
          ) : (
            <button
              disabled
              className="py-3 px-4 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
              title="Restricted for Staff"
            >
              <Lock className="size-4" /> Delete Restricted
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
