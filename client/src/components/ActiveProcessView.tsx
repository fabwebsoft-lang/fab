import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { WashingMachine, CheckCircle2, Clock, PackageCheck, Search, ArrowRight, CreditCard, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  Received: "bg-amber-100 text-amber-800 border-amber-200",
  Processing: "bg-blue-100 text-blue-800 border-blue-200",
  Ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Collected: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ActiveProcessView({ onNewOrder }: { onNewOrder: () => void }) {
  const utils = trpc.useUtils();
  const { data: orders = [], isLoading } = trpc.orders.list.useQuery();

  const [activeTab, setActiveTab] = useState<"All" | "Received" | "Processing" | "Ready">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForPickup, setSelectedOrderForPickup] = useState<any | null>(null);

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: async (data) => {
      await utils.orders.list.invalidate();
      await utils.dashboard.stats.invalidate();
      toast.success(`Order ${data.id} updated`, {
        description: `Moved to ${data.status}`,
      });
    },
    onError: (err) => {
      toast.error("Failed to update status", { description: err.message });
    },
  });

  const settlePaymentMutation = trpc.orders.settlePayment.useMutation({
    onSuccess: async (data) => {
      await utils.orders.list.invalidate();
      await utils.dashboard.stats.invalidate();
      toast.success(`Order ${data.id} collected!`, {
        description: `Payment settled. Status changed to Collected.`,
      });
      setSelectedOrderForPickup(null);
    },
    onError: (err) => {
      toast.error("Failed to settle order", { description: err.message });
    },
  });

  const activeOrders = orders.filter((o) => o.status !== "Collected");

  const filteredOrders = activeOrders.filter((o) => {
    const matchesTab = activeTab === "All" || o.status === activeTab;
    const matchesQuery =
      `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const counts = {
    All: activeOrders.length,
    Received: activeOrders.filter((o) => o.status === "Received").length,
    Processing: activeOrders.filter((o) => o.status === "Processing").length,
    Ready: activeOrders.filter((o) => o.status === "Ready").length,
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F4C5C] flex items-center gap-2">
            <WashingMachine className="size-6 text-[#0F4C5C]" />
            Active Laundry Process
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track garments through Received, Processing, and Ready for Collection
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order # or customer..."
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        {(["All", "Received", "Processing", "Ready"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === tab
                ? "bg-[#0F4C5C] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            {tab}
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                activeTab === tab
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading process board...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="size-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <PackageCheck className="size-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No orders in this stage</p>
          <p className="text-xs text-slate-500">All caught up! Create a new order to start processing.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const dueAmount = order.totalAmount - order.amountPaid;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#0F4C5C]">
                        {order.id}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">
                        {order.customer}
                      </p>
                      <p className="text-[11px] text-slate-500">{order.phone}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                        statusStyles[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl text-slate-700 font-medium">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Garments / Items:</span>
                      {order.items}
                    </div>

                    <div className="flex justify-between items-center text-slate-600 pt-1">
                      <span>Total Bill:</span>
                      <span className="font-bold text-slate-800">₹{order.totalAmount}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Balance Due:</span>
                      <span
                        className={`font-bold ${
                          dueAmount > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {dueAmount > 0 ? `₹${dueAmount}` : "Paid in Full"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  {order.status === "Received" && (
                    <button
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ id: order.id, status: "Processing" })
                      }
                      className="w-full py-2 bg-[#0F4C5C] text-white text-xs font-semibold rounded-xl hover:bg-[#0F4C5C]/90 transition flex items-center justify-center gap-1.5"
                    >
                      Start Washing / Dry Cleaning <ArrowRight className="size-3.5" />
                    </button>
                  )}

                  {order.status === "Processing" && (
                    <button
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ id: order.id, status: "Ready" })
                      }
                      className="w-full py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                    >
                      Mark as Ready for Pickup <CheckCircle2 className="size-3.5" />
                    </button>
                  )}

                  {order.status === "Ready" && (
                    <button
                      onClick={() => setSelectedOrderForPickup(order)}
                      className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CreditCard className="size-4" />
                      Shop Collection / Deliver
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shop Collection / Payment Modal */}
      {selectedOrderForPickup && (
        <PickupModal
          order={selectedOrderForPickup}
          onClose={() => setSelectedOrderForPickup(null)}
          onSettle={(id, amountPaid) =>
            settlePaymentMutation.mutate({ id, amountPaid })
          }
          isPending={settlePaymentMutation.isPending}
        />
      )}
    </div>
  );
}

function PickupModal({
  order,
  onClose,
  onSettle,
  isPending,
}: {
  order: any;
  onClose: () => void;
  onSettle: (id: string, amountPaid: number) => void;
  isPending: boolean;
}) {
  const dueAmount = Math.max(0, order.totalAmount - order.amountPaid);
  const [collectionAmount, setCollectionAmount] = useState<number>(dueAmount);
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#0F4C5C]">Shop Collection / Pickup</h3>
            <p className="text-xs text-slate-500">Settle balance & hand over garments</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Bill Number:</span>
            <span className="font-mono font-bold text-slate-800">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-bold text-slate-800">{order.customer} ({order.phone})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Bill Amount:</span>
            <span className="font-bold text-slate-800">₹{order.totalAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Previously Paid:</span>
            <span className="font-bold text-emerald-600">₹{order.amountPaid}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-bold text-slate-700">Remaining Balance:</span>
            <span className="font-bold text-rose-600">₹{dueAmount}</span>
          </div>
        </div>

        {dueAmount > 0 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Collecting Amount Now (₹)
              </label>
              <input
                type="number"
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["UPI", "Cash", "Card"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      paymentMethod === m
                        ? "bg-[#0F4C5C] text-white border-[#0F4C5C]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onSettle(order.id, collectionAmount)}
            className="flex-1 py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-md disabled:opacity-60"
          >
            {isPending ? "Processing..." : "Complete Pickup & Settle"}
          </button>
        </div>
      </div>
    </div>
  );
}
