import { trpc } from "@/lib/trpc";
import {
  IndianRupee,
  CircleDollarSign,
  Clock,
  WashingMachine,
  Plus,
  ArrowRight,
  TrendingUp,
  PackageCheck,
  ChevronRight,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function DashboardView({
  onNavigate,
  onNewOrder,
}: {
  onNavigate: (section: any) => void;
  onNewOrder: () => void;
}) {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: statements } = trpc.reports.businessStatements.useQuery({});

  const metrics = stats || {
    todaysSales: 0,
    todaysCollected: 0,
    todaysPending: 0,
    todaysGarmentCount: 0,
  };

  const activeProcessCount = orders.filter((o) => o.status !== "Collected").length;
  const chartData = statements?.dailyBreakdown || [];
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0F4C5C]">Shop Overview & Dashboard</h2>
          <p className="text-xs text-slate-500">Live operational command center</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onNewOrder}
            className="px-4 py-2.5 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl hover:bg-[#0F4C5C]/90 transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="size-4" /> New Order Bill
          </button>
          <button
            onClick={() => onNavigate("Active process")}
            className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
          >
            <WashingMachine className="size-4" /> Process Board
          </button>
        </div>
      </div>

      {/* 2-Column Key Stat Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Today's Sales</span>
            <div className="p-2 bg-[#0F4C5C]/10 text-[#0F4C5C] rounded-xl">
              <IndianRupee className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F4C5C]">
            ₹{metrics.todaysSales.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-slate-400">Total new bills created today</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Collected Today</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CircleDollarSign className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            ₹{metrics.todaysCollected.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-slate-400">Actual cash/UPI received</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Outstanding Dues</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">
            ₹{metrics.todaysPending.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-slate-400">Uncollected customer balances</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Orders In Process</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <WashingMachine className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{activeProcessCount} Orders</p>
          <p className="text-[11px] text-slate-400">Currently in washing/ironing</p>
        </div>
      </div>

      {/* 7-Day Revenue Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-[#0F4C5C]">7-Day Sales & Collections Trend</h3>
            <p className="text-xs text-slate-500">Daily shop performance</p>
          </div>
          <button
            onClick={() => onNavigate("Statements")}
            className="text-xs font-bold text-[#0F4C5C] hover:underline flex items-center gap-1"
          >
            Full Report <ChevronRight className="size-3.5" />
          </button>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F4C5C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0F4C5C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              <Area type="monotone" dataKey="collected" name="Collections (₹)" stroke="#0F4C5C" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm">Recent Shop Orders</h3>
          <button
            onClick={() => onNavigate("Orders")}
            className="text-xs font-bold text-[#0F4C5C] hover:underline flex items-center gap-1"
          >
            View All Bills <ChevronRight className="size-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentOrders.map((order) => (
            <div key={order.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-[#0F4C5C] block">{order.id}</span>
                <span className="font-semibold text-slate-800">{order.customer}</span>
                <span className="text-slate-400 text-[11px] block">{order.items}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-800 block">₹{order.totalAmount}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
