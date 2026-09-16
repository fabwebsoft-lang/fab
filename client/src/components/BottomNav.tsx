import { trpc } from "@/lib/trpc";
import { useAccessControl } from "@/contexts/AccessControlContext";
import {
  LayoutDashboard,
  PlusCircle,
  WashingMachine,
  FileText,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";

export type NavSection =
  | "Overview"
  | "Orders"
  | "Active process"
  | "Customers"
  | "Expenses"
  | "Statements"
  | "Roles"
  | "Settings";

export default function BottomNav({
  activeSection,
  onNavigate,
  onNewOrder,
}: {
  activeSection: string;
  onNavigate: (section: NavSection) => void;
  onNewOrder: () => void;
}) {
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { canViewReports } = useAccessControl();
  const activeCount = orders.filter((o) => o.status !== "Collected").length;

  const rawItems: { label: NavSection; displayLabel: string; icon: any; isAction?: boolean; hide?: boolean }[] = [
    { label: "Overview", displayLabel: "Home", icon: LayoutDashboard },
    { label: "Active process", displayLabel: "Process", icon: WashingMachine },
    { label: "Orders", displayLabel: "Bills", icon: FileText },
    { label: "Overview", displayLabel: "New Bill", icon: PlusCircle, isAction: true },
    { label: "Customers", displayLabel: "Customers", icon: Users },
    { label: "Statements", displayLabel: "Reports", icon: BarChart3, hide: !canViewReports },
    { label: "Settings", displayLabel: "Settings", icon: Settings },
  ];

  const items = rawItems.filter((i) => !i.hide);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around lg:hidden shadow-lg">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeSection === item.label && !item.isAction;

        if (item.isAction) {
          return (
            <button
              key={idx}
              onClick={onNewOrder}
              className="flex flex-col items-center justify-center text-[#0F4C5C] hover:scale-105 transition"
            >
              <div className="size-10 bg-[#0F4C5C] text-white rounded-full flex items-center justify-center shadow-md">
                <Icon className="size-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5 text-[#0F4C5C]">
                {item.displayLabel}
              </span>
            </button>
          );
        }

        return (
          <button
            key={idx}
            onClick={() => onNavigate(item.label)}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              isActive ? "text-[#0F4C5C] font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="relative">
              <Icon className="size-5" />
              {item.label === "Active process" && activeCount > 0 && (
                <span className="absolute -top-1 -right-1.5 size-4 bg-amber-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                  {activeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{item.displayLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
