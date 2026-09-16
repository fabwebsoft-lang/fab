import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { WalletCards, Plus, ChevronRight, Check, X, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export default function ExpensesView() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { data: apiExpenses = [], isLoading } = trpc.expenses.list.useQuery();
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const utils = trpc.useUtils();

  const createExpenseMutation = trpc.expenses.create.useMutation({
    onSuccess: async (created) => {
      await utils.expenses.list.invalidate();
      await utils.dashboard.stats.invalidate();
      setShowExpenseModal(false);
      toast.success("Expense added", { description: `${created.title} · saved to the database` });
    },
    onError: (error) => toast.error("Could not save expense", { description: error.message }),
  });

  const totalExpenseAmount = apiExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalOrderRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const netBalance = totalOrderRevenue - totalExpenseAmount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F4C5C] flex items-center gap-2">
            <WalletCards className="size-6 text-[#0F4C5C]" />
            Shop Expenses & Outflow
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record shop overheads, wages, and raw materials to maintain accurate net profit
          </p>
        </div>

        <button
          onClick={() => setShowExpenseModal(true)}
          className="px-4 py-2.5 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl hover:bg-[#0F4C5C]/90 transition shadow-sm flex items-center gap-1.5"
        >
          <Plus className="size-4" /> Add Expense
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl p-3.5 bg-rose-50 border border-rose-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Expenses</p>
              <p className="mt-1 text-[17px] font-bold text-rose-800">
                ₹{totalExpenseAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Net Profit</p>
              <p className="mt-1 text-[17px] font-bold text-emerald-800">
                ₹{netBalance.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl p-3.5 bg-blue-50 border border-blue-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Recorded Items</p>
              <p className="mt-1 text-[17px] font-bold text-blue-800">
                {apiExpenses.length} entries
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#F7F3EE]">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading expenses...</div>
            ) : apiExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No expenses recorded yet.</div>
            ) : (
              apiExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 py-3.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#F7F3EE] text-[#0F4C5C]">
                    <WalletCards className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#0F4C5C] truncate">{expense.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {expense.category} · {new Date(expense.expenseDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} · {expense.paymentMethod}
                    </p>
                  </div>
                  <p className="text-[12px] font-bold text-rose-600">
                    ₹{Number(expense.amount).toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[20px] border border-[#F7F3EE] bg-[#F7F3EE]/60 p-5 sm:p-6">
          <p className="text-[13px] font-bold text-[#0F4C5C]">Expense Distribution</p>
          <p className="text-[11px] text-slate-500 mt-1">Operational cost allocation by category</p>
          
          <div className="mt-6 space-y-3">
            {["Supplies", "Utilities", "Rent", "Wages", "Maintenance", "Other"].map((cat) => {
              const catTotal = apiExpenses
                .filter((e) => e.category.toLowerCase() === cat.toLowerCase())
                .reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const percentage = totalExpenseAmount > 0 ? Math.round((catTotal / totalExpenseAmount) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>{cat}</span>
                    <span>₹{catTotal.toLocaleString("en-IN")} ({percentage}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-[#0F4C5C] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onAdd={(expense) => {
            createExpenseMutation.mutate({
              title: expense.title,
              category: expense.category,
              amount: expense.amount,
              paymentMethod: expense.method,
              expenseDate: new Date(`${expense.date}T12:00:00Z`).toISOString(),
              notes: expense.notes,
            });
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (expense: { title: string; category: string; amount: number; date: string; method: string; notes?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Supplies");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Add an expense name first.");
      return;
    }
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) {
      toast.error("Enter a valid amount greater than zero.");
      return;
    }
    onAdd({
      title: title.trim(),
      category,
      amount: num,
      date,
      method,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F4C5C]/40 px-4 py-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-32px)] w-full max-w-[420px] overflow-y-auto rounded-[24px] border border-white/70 bg-white p-6 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold text-[#0F4C5C]">Add an expense</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-5 text-[12px] leading-5 text-slate-500">
          Record shop costs so your revenue and net balance stay accurate.
        </p>

        <div className="space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-700">Expense name</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20"
              placeholder="e.g. Detergent supplies"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-700">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#0F4C5C]"
              >
                <option>Supplies</option>
                <option>Wages</option>
                <option>Utilities</option>
                <option>Rent</option>
                <option>Maintenance</option>
                <option>Other</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-700">Amount</span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#0F4C5C]">
                <span className="text-xs text-slate-400 font-bold">₹</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent px-2 py-2.5 text-xs outline-none font-bold text-slate-800"
                  placeholder="0"
                />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-700">Payment method</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#0F4C5C]"
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank transfer</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-700">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-[#0F4C5C]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-[#0F4C5C]"
              placeholder="Add details..."
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-xs font-bold text-white shadow-md hover:bg-[#0F4C5C]/90 active:scale-[.98]"
        >
          Save Expense <Check className="size-4" />
        </button>
      </div>
    </div>
  );
}
