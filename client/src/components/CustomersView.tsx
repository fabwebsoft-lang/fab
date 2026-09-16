import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Search, Phone, Tag, CreditCard, ChevronRight, History } from "lucide-react";
import { toast } from "sonner";

export default function CustomersView() {
  const { data: customers = [], isLoading } = trpc.customers.list.useQuery();
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const customerStats = customers.map((c) => {
    const customerOrders = orders.filter((o) => o.phone === c.phone || o.customer === c.name);
    const totalBilled = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = customerOrders.reduce((sum, o) => sum + o.amountPaid, 0);
    const runningBalance = Math.max(0, totalBilled - totalPaid);

    return {
      ...c,
      orderCount: customerOrders.length,
      totalBilled,
      runningBalance,
      customerOrders,
    };
  });

  const filteredCustomers = customerStats.filter((c) =>
    `${c.name} ${c.phone} ${c.storedClothesCode || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F4C5C] flex items-center gap-2">
            <Users className="size-6 text-[#0F4C5C]" />
            Customer Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer accounts, saved garment codes, and running balances
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading directory...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No customers found matching your search.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{c.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="size-3" /> {c.phone}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#0F4C5C]/10 text-[#0F4C5C]">
                    {c.customerType || "Normal"}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  {c.storedClothesCode && (
                    <div className="flex justify-between items-center text-slate-600 bg-slate-50 p-2 rounded-xl">
                      <span className="text-[11px] text-slate-500">Clothes Tag Code:</span>
                      <span className="font-mono font-bold text-[#0F4C5C]">
                        {c.storedClothesCode}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Orders:</span>
                    <span className="font-bold text-slate-800">{c.orderCount} orders</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Running Balance:</span>
                    <span
                      className={`font-bold ${
                        c.runningBalance > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {c.runningBalance > 0 ? `₹${c.runningBalance} Due` : "Clear"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(c)}
                className="w-full py-2 bg-slate-50 border border-slate-200 text-[#0F4C5C] text-xs font-semibold rounded-xl hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
              >
                <History className="size-3.5" /> View Order History
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail / History Modal */}
      {selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

function CustomerHistoryModal({ customer, onClose }: { customer: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#0F4C5C]">{customer.name}</h3>
            <p className="text-xs text-slate-500">{customer.phone} · Tag Code: {customer.storedClothesCode || "N/A"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2">
            ✕
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 block">Total Billed:</span>
            <span className="text-sm font-bold text-slate-800">₹{customer.totalBilled}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Balance:</span>
            <span className={`text-sm font-bold ${customer.runningBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {customer.runningBalance > 0 ? `₹${customer.runningBalance} Due` : "Paid in Full"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Past Laundry Orders</h4>
          {customer.customerOrders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No order history found.</p>
          ) : (
            customer.customerOrders.map((o: any) => (
              <div key={o.id} className="border border-slate-100 p-3 rounded-xl space-y-1 text-xs bg-slate-50/50">
                <div className="flex justify-between font-mono font-bold text-[#0F4C5C]">
                  <span>{o.id}</span>
                  <span className="text-slate-700 font-sans font-normal">{o.status}</span>
                </div>
                <p className="text-slate-600 text-[11px]">{o.items}</p>
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                  <span>Bill: ₹{o.totalAmount}</span>
                  <span>Paid: ₹{o.amountPaid}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
