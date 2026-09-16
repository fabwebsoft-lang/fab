import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAccessControl } from "@/contexts/AccessControlContext";
import { BarChart3, Download, EyeOff, ShieldAlert, Lock, Crown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { toast } from "sonner";

export default function StatementsView() {
  const { canViewReports, role, setRole } = useAccessControl();
  const { data: statements, isLoading } = trpc.reports.businessStatements.useQuery(
    {},
    { enabled: canViewReports }
  );
  const [timeRange, setTimeRange] = useState<"Today" | "Week" | "Month">("Week");

  if (!canViewReports) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-5">
        <div className="size-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <EyeOff className="size-8" />
        </div>

        <div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase">
            Access Restricted · {role.toUpperCase()} Role
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-3">Financial Reports & Statements are Hidden</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
            According to FabricCare access rules, detailed revenue statements, net profit breakdown, and financial reports are only accessible by <strong>Admin (Shop Owner)</strong>.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 text-left space-y-2 max-w-md mx-auto">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Lock className="size-3.5 text-slate-500" /> Current Permissions for {role}:
          </p>
          <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-500">
            <li>Customer orders & billing intake: <strong>Allowed</strong></li>
            <li>Active laundry workflow management: <strong>Allowed</strong></li>
            <li>Financial reports & net revenue statements: <strong className="text-rose-600">Hidden & Blocked</strong></li>
          </ul>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              setRole("admin");
              toast.success("Switched to Admin Role in Simulator");
            }}
            className="px-5 py-2.5 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl hover:bg-[#0F4C5C]/90 transition shadow-sm flex items-center gap-2"
          >
            <Crown className="size-4" /> Switch to Admin in Simulator
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !statements) {
    return <div className="text-center py-12 text-slate-400 text-sm">Loading business statements...</div>;
  }

  const { totalSales, totalCollected, totalPending, totalExpenses, netRevenue, dailyBreakdown } = statements;

  const handleExportStatement = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Date,Sales (Billed),Collected,Expenses,Net Revenue"]
        .concat(
          dailyBreakdown.map(
            (d: any) => `${d.date},${d.sales},${d.collected},${d.expenses},${d.net}`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial-statement-${timeRange.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Statement CSV exported!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F4C5C] flex items-center gap-2">
            <BarChart3 className="size-6 text-[#0F4C5C]" />
            Business Statements & Financials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time revenue, collections, expenses, and shop net profit/loss analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(["Today", "Week", "Month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  timeRange === r
                    ? "bg-white text-[#0F4C5C] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportStatement}
            className="px-3.5 py-2 bg-[#0F4C5C] text-white text-xs font-semibold rounded-xl hover:bg-[#0F4C5C]/90 transition shadow-sm flex items-center gap-1.5"
          >
            <Download className="size-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Total Billed</span>
          <p className="text-2xl font-bold text-[#0F4C5C]">₹{totalSales.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400 block">Gross revenue booked</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Total Collected</span>
          <p className="text-2xl font-bold text-emerald-600">₹{totalCollected.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400 block">Cash/UPI/Card received</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Total Expenses</span>
          <p className="text-2xl font-bold text-rose-600">₹{totalExpenses.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400 block">Detergents, wages, rent</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Net Profit / Revenue</span>
          <p
            className={`text-2xl font-bold ${
              netRevenue >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            ₹{netRevenue.toLocaleString("en-IN")}
          </p>
          <span className="text-[11px] text-slate-400 block">Collections − Expenses</span>
        </div>
      </div>

      {/* Recharts BarChart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-[#0F4C5C]">Revenue vs. Expenses Trend</h3>
            <p className="text-xs text-slate-500">Daily financial breakdown</p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {!dailyBreakdown || dailyBreakdown.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <BarChart3 className="size-8 text-slate-300" />
              <span>No transactions recorded for this period yet. Create an order or add an expense to see daily trend.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="collected" name="Collected (₹)" fill="#0F4C5C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses (₹)" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
