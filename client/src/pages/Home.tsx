import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Database,
  Download,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  Droplets,
  FileText,
  Filter,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Save,
  Settings,
  Shirt,
  Sparkles,
  Store,
  Tag,
  UserRound,
  UsersRound,
  WalletCards,
  WashingMachine,
  X,
  Zap,
  BarChart3,
  ShieldCheck,
  Crown,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import NewBillModal from "@/components/NewBillModal";
import ActiveProcessView from "@/components/ActiveProcessView";
import BillsView from "@/components/BillsView";
import CustomersView from "@/components/CustomersView";
import StatementsView from "@/components/StatementsView";
import SettingsViewComponent from "@/components/SettingsView";
import RolesAndAccessView from "@/components/RolesAndAccessView";
import DashboardView from "@/components/DashboardView";
import BottomNav from "@/components/BottomNav";
import { useAccessControl, ROLE_DEFINITIONS } from "@/contexts/AccessControlContext";

type Section = "Overview" | "Orders" | "Active process" | "Customers" | "Expenses" | "Statements" | "Roles" | "Settings";

type Order = {
  id: string;
  customer: string;
  phone: string;
  items: string;
  amount: string;
  balance: string;
  status: "Received" | "Processing" | "Ready" | "Collected";
  due: string;
  initials: string;
  accent: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  amountPaid: number;
  structuredItems: { name: string; quantity: number; price: number }[];
};

type OverviewMetrics = {
  todaysRevenue: number;
  collectedToday: number;
  pendingDues: number;
  inProcessCount: number;
  readyCount: number;
  ordersReceived: number;
  itemsInProcess: number;
  processCounts: { Received: number; Processing: number; Ready: number };
};

type ShopSettings = {
  name: string;
  address: string;
  customerNotifications: boolean;
  pricingTier: string;
};

type NewOrderInput = {
  customerName: string;
  phone: string;
  items: { name: string; quantity: number; price: number }[];
  serviceType: string;
  totalAmount: number;
  amountPaid: number;
};

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Orders", icon: ClipboardList },
  { label: "Active process", icon: WashingMachine },
  { label: "Customers", icon: UsersRound },
  { label: "Expenses", icon: WalletCards },
  { label: "Statements", icon: BarChart3 },
];

const catalogItems = [
  { label: "Shirts", price: 80 },
  { label: "Pants", price: 110 },
  { label: "Dresses", price: 180 },
  { label: "Blankets", price: 260 },
  { label: "Sarees", price: 150 },
  { label: "Curtains", price: 220 },
];

const money = (value: string) => Number(value.replace(/[^0-9]/g, ""));
const uniqueOrders = (orderList: Order[]) => Array.from(new Map(orderList.map((order) => [order.id, order])).values());
export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const { role: activeRole, canViewReports, setRole, isSimulating } = useAccessControl();

  const [activeSection, setActiveSection] = useState<Section>("Overview");
  const { data: apiOrders } = trpc.orders.list.useQuery();
  const createOrderMutation = trpc.orders.create.useMutation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics>({ todaysRevenue: 0, collectedToday: 0, pendingDues: 0, inProcessCount: 0, readyCount: 0, ordersReceived: 0, itemsInProcess: 0, processCounts: { Received: 0, Processing: 0, Ready: 0 } });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");
  const { data: apiShop } = trpc.shops.list.useQuery();
  const shop = apiShop?.[0];
  const [settingsForm, setSettingsForm] = useState<ShopSettings>({ name: "Indiranagar shop", address: "Indiranagar, Bengaluru", customerNotifications: true, pricingTier: "Normal + Premium" });
  const utils = trpc.useUtils();
  const updateShopMutation = trpc.shops.updateSettings.useMutation({
    onSuccess: async (updated) => {
      utils.shops.list.setData(undefined, [updated]);
      await utils.shops.list.invalidate();
      toast.success("Shop settings saved", { description: `${updated.name} · saved to the database` });
    },
    onError: (mutationError) => toast.error("Could not save shop settings", { description: mutationError.message }),
  });
  const recordBackupMutation = trpc.shops.recordBackup.useMutation({
    onSuccess: async (result) => {
      utils.shops.list.setData(undefined, (current) => current?.map((entry) => ({ ...entry, lastBackupAt: result.lastBackupAt })));
      await utils.shops.list.invalidate();
      toast.success("Backup recorded", { description: "The latest workspace snapshot is saved." });
    },
    onError: (mutationError) => toast.error("Could not record backup", { description: mutationError.message }),
  });

  const filteredOrders = useMemo(() => {
    return uniqueOrders(orders).filter((order) => {
      const matchesQuery = `${order.id} ${order.customer} ${order.phone}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "All status" || order.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.label === "Statements" && !canViewReports) return false;
      return true;
    });
  }, [canViewReports]);

  useEffect(() => {
    if (!apiOrders) return;
    const nextOrders = uniqueOrders(apiOrders as Order[]);
    setOrders((currentOrders) => {
      const unchanged = currentOrders.length === nextOrders.length && currentOrders.every((order, index) => {
        const next = nextOrders[index];
        return next && order.id === next.id && order.status === next.status && order.amount === next.amount && order.balance === next.balance;
      });
      return unchanged ? currentOrders : nextOrders;
    });
  }, [apiOrders]);

  useEffect(() => {
    if (!shop) return;
    setSettingsForm({ name: shop.name, address: shop.address ?? "", customerNotifications: Boolean(shop.customerNotifications), pricingTier: shop.pricingTier });
  }, [shop]);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const active = orders.filter((order) => order.status !== "Collected");
    const today = orders.filter((order) => new Date(order.createdAt) >= start);
    const processCounts = { Received: active.filter((order) => order.status === "Received").length, Processing: active.filter((order) => order.status === "Processing").length, Ready: active.filter((order) => order.status === "Ready").length };
    setOverviewMetrics({
      todaysRevenue: today.reduce((sum, order) => sum + money(order.amount), 0),
      collectedToday: orders.filter((order) => new Date(order.updatedAt) >= start).reduce((sum, order) => sum + order.amountPaid, 0),
      pendingDues: orders.reduce((sum, order) => sum + Math.max(0, order.totalAmount - order.amountPaid), 0),
      inProcessCount: active.length,
      readyCount: processCounts.Ready,
      ordersReceived: today.length,
      itemsInProcess: active.reduce((sum, order) => sum + order.structuredItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
      processCounts,
    });
  }, [orders]);

  const navigate = (section: Section) => {
    setActiveSection(section);
    setStatusFilter("All status");
    setShowNotifications(false);
    setShowProfileMenu(false);
    setShowHelp(false);
    setShowMobileNav(false);
  };

  const sectionTitle = activeSection === "Overview" ? `Welcome, ${user?.name || "Ashfaq"}` : activeSection === "Roles" ? "Roles & Access Control" : activeSection;
  const sectionDescriptions: Record<Section, string> = {
    Overview: "Your daily command center for revenue, collections, dues, and orders.",
    Orders: "Capture, review, and follow every customer order from intake to pickup.",
    "Active process": "Track Processing and Ready orders so the next step is always clear.",
    Customers: "See customer history, billed totals, and pending dues in one view.",
    Expenses: "Track shop spending, recurring costs, and net balance with confidence.",
    Statements: "Financial reports, daily collections vs expenses, and net profit analysis.",
    Roles: "Configure team member roles, restrict staff deletions, hide financial reports, and manage access.",
    Settings: "Keep your shop profile, preferences, and workspace controls up to date.",
  };
  const sectionDescription = sectionDescriptions[activeSection];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSection]);

  const createOrder = (input: NewOrderInput) => {
    createOrderMutation.mutate(input, {
      onSuccess: (createdOrder) => {
        setOrders((currentOrders) => uniqueOrders([createdOrder as Order, ...currentOrders]));
        toast.success(`${createdOrder.id} created`, { description: `${createdOrder.customer} · saved to the database` });
      },
      onError: (error) => toast.error("Could not save the order", { description: error.message }),
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F4C5C] selection:bg-[#F7F3EE] selection:text-[#0F4C5C]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[254px] shrink-0 flex-col justify-between bg-[#0F4C5C] px-5 py-6 text-white lg:flex">
          <div>
            <div className="mb-10 flex items-center gap-3 px-2">
              <div className="grid size-10 place-items-center rounded-[14px] bg-[#F7F3EE] shadow-[0_8px_20px_rgba(15,76,92,.18)]">
                <img src="/fabric-care-logo.png" alt="Fabric Care logo" className="size-7 object-contain" />
              </div>
              <div>
                <p className="font-display text-[17px] font-semibold tracking-tight">Fabric Care</p>
                <p className="text-[10px] font-medium uppercase tracking-[.16em] text-[#F7F3EE]">You wear, we care</p>
              </div>
            </div>

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#F7F3EE]">Workspace</p>
            <nav className="space-y-1.5">
              {visibleNavItems.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => navigate(label)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-all duration-150 ${activeSection === label ? "bg-[#0F4C5C] text-white shadow-inner shadow-white/[.03]" : "text-[#F7F3EE] hover:bg-white/[.10] hover:text-white"}`}
                >
                  <Icon className={`size-[17px] ${activeSection === label ? "text-[#F7F3EE]" : "text-[#F7F3EE] group-hover:text-[#F7F3EE]"}`} strokeWidth={1.9} />
                  {label}
                  {label === "Active process" && <span className="ml-auto rounded-full bg-[#0F4C5C] px-1.5 py-0.5 text-[9px] font-bold text-[#0F4C5C]">12</span>}
                </button>
              ))}
            </nav>

            <div className="my-8 h-px bg-white/[.09]" />
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#F7F3EE]">Manage</p>
            <nav className="space-y-1.5">
              <button onClick={() => navigate("Roles")} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-all ${activeSection === "Roles" ? "bg-[#0F4C5C] text-white" : "text-[#F7F3EE] hover:bg-white/[.10] hover:text-white"}`}>
                <ShieldCheck className="size-[17px] text-[#F7F3EE] group-hover:text-[#F7F3EE]" strokeWidth={1.9} /> Roles & Access
              </button>
              <button onClick={() => navigate("Settings")} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-all ${activeSection === "Settings" ? "bg-[#0F4C5C] text-white" : "text-[#F7F3EE] hover:bg-white/[.10] hover:text-white"}`}>
                <Settings className="size-[17px] text-[#F7F3EE] group-hover:text-[#F7F3EE]" strokeWidth={1.9} /> Settings
              </button>
              <button onClick={() => setShowHelp(true)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#F7F3EE] transition-all hover:bg-white/[.10] hover:text-white">
                <HelpCircle className="size-[17px] text-[#F7F3EE] group-hover:text-[#F7F3EE]" strokeWidth={1.9} /> Help center
              </button>
            </nav>
          </div>

          <div className="rounded-2xl border border-white/[.08] bg-white/[.045] p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-medium text-[#F7F3EE]"><span className="size-2 rounded-full bg-[#F7F3EE] shadow-[0_0_0_4px_rgba(102,216,165,.12)]" /> Cloud sync on</span>
              <ChevronRight className="size-3.5 text-[#F7F3EE]" />
            </div>
            <p className="text-[10px] leading-4 text-[#F7F3EE]">Last synced just now across 2 devices</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#E5E5E5]/90 bg-[#E5E5E5]/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <button className="grid size-10 place-items-center rounded-xl border border-[#F7F3EE] bg-white text-[#0F4C5C] transition hover:border-[#F7F3EE] hover:text-[#0F4C5C] lg:hidden" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu className="size-[18px]" /></button>
              <div>
                <p className="hidden text-[11px] font-semibold uppercase tracking-[.13em] text-[#0F4C5C] sm:block">Tuesday, September 15, 2026</p>
                <p className="font-display text-[18px] font-semibold tracking-[-.02em] text-[#0F4C5C] sm:text-[20px]">{sectionTitle}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-[#F7F3EE] bg-white px-3 py-2 sm:flex">
                <div className="grid size-6 place-items-center rounded-full bg-[#F7F3EE] text-[#0F4C5C]"><Store className="size-3.5" /></div>
                <span className="text-[11px] font-semibold text-[#0F4C5C]">Indiranagar shop</span>
                <ChevronDown className="size-3.5 text-[#0F4C5C]" />
              </div>

              {/* Role badge with simulator click */}
              <button
                onClick={() => navigate("Roles")}
                className="hidden items-center gap-1.5 rounded-xl border border-[#F7F3EE] bg-white px-3 py-2 sm:flex hover:border-[#0F4C5C]/30 transition"
                title="Click to view permissions and switch role in simulator"
              >
                <ShieldCheck className="size-3.5 text-[#0F4C5C]" />
                <span className="text-[11px] font-bold text-[#0F4C5C] capitalize">{activeRole}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0F4C5C]/10 text-[#0F4C5C] font-bold uppercase">
                  Role
                </span>
              </button>

              <button onClick={() => { setShowNotifications((value) => !value); setShowProfileMenu(false); }} className="relative grid size-11 place-items-center rounded-xl border border-[#F7F3EE] bg-white text-[#0F4C5C] transition hover:border-[#F7F3EE] hover:text-[#0F4C5C]" aria-label="Notifications">
                <Bell className="size-[17px]" strokeWidth={1.8} />
                {!notificationsRead && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#0F4C5C] ring-2 ring-white" />}
              </button>
              <button onClick={() => { setShowProfileMenu((value) => !value); setShowNotifications(false); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#F7F3EE] bg-white px-2 py-1.5 text-left transition hover:border-[#F7F3EE]">
                <div className="grid size-7 place-items-center rounded-lg bg-[#F7F3EE] text-[10px] font-bold text-[#0F4C5C]">{(user?.name ?? "Ashfaq").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
                <span className="hidden text-[11px] font-semibold text-[#0F4C5C] sm:block">{user?.name ?? "Ashfaq"}</span>
                <ChevronDown className="hidden size-3.5 text-[#0F4C5C] sm:block" />
              </button>
              {showNotifications && <NotificationPanel orders={orders} notificationsEnabled={settingsForm.customerNotifications} onMarkRead={() => setNotificationsRead(true)} />}
              {showProfileMenu && (
                <ProfileMenu
                  user={user}
                  activeRole={activeRole}
                  onSettings={() => navigate("Settings")}
                  onRoles={() => navigate("Roles")}
                  onLogout={async () => {
                    try {
                      await logout();
                      toast.success("Signed out");
                    } catch (logoutError) {
                      toast.error("Could not sign out", {
                        description: logoutError instanceof Error ? logoutError.message : "Please try again.",
                      });
                    }
                  }}
                />
              )}
            </div>
          </header>

          <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-8 lg:px-10 lg:py-9">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1 text-[12px] text-[#0F4C5C]">{sectionDescription}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toast.success("Your latest data is already up to date.")} className="hidden items-center gap-2 rounded-xl border border-[#F7F3EE] bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#0F4C5C] transition hover:border-[#F7F3EE] hover:text-[#0F4C5C] sm:flex"><Zap className="size-3.5 text-[#0F4C5C]" /> Sync now</button>
                <button onClick={() => setShowNewOrder(true)} className="flex items-center gap-2 rounded-xl bg-[#0F4C5C] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(95,120,238,.22)] transition duration-150 hover:bg-[#0F4C5C] active:scale-[.97]"><Plus className="size-4" strokeWidth={2.5} /> New order</button>
              </div>
            </div>

            <SectionView
              section={activeSection}
              orders={activeSection === "Active process" ? orders : filteredOrders}
              query={query}
              setQuery={setQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onNewOrder={() => setShowNewOrder(true)}
              onNavigate={(s: any) => navigate(s)}
              shop={shop}
              settings={settingsForm}
              setSettings={setSettingsForm}
              onSaveSettings={() => updateShopMutation.mutate(settingsForm)}
              settingsSaving={updateShopMutation.isPending}
              onRecordBackup={() => recordBackupMutation.mutate()}
              backupSaving={recordBackupMutation.isPending}
            />
          </div>
        </main>
      </div>

      {showMobileNav && <div className="fixed inset-0 z-40 bg-[#0F4C5C]/35 backdrop-blur-[2px] lg:hidden" onClick={() => setShowMobileNav(false)}>
        <aside className="flex h-full w-[min(82vw,300px)] flex-col justify-between bg-[#0F4C5C] px-5 py-6 text-white shadow-[18px_0_50px_rgba(15,76,92,.25)]" onClick={(event) => event.stopPropagation()}>
          <div>
            <div className="mb-9 flex items-center justify-between px-2"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-[14px] bg-[#F7F3EE]"><img src="/fabric-care-logo.png" alt="Fabric Care logo" className="size-7 object-contain" /></div><div><p className="font-display text-[17px] font-semibold tracking-tight">Fabric Care</p><p className="text-[10px] font-medium uppercase tracking-[.16em] text-[#F7F3EE]">You wear, we care</p></div></div><button onClick={() => setShowMobileNav(false)} className="grid size-8 place-items-center rounded-lg text-[#F7F3EE] hover:bg-white/[.08] hover:text-white" aria-label="Close navigation"><X className="size-4" /></button></div>
            <div className="mb-8 rounded-2xl border border-white/[.08] bg-white/[.045] p-4"><p className="text-[12px] font-semibold text-white">Use the bottom bar to navigate</p><p className="mt-1.5 text-[10px] leading-4 text-[#F7F3EE]">Overview, orders, process, customers, and costs are always one tap away.</p></div>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#F7F3EE]">Manage</p>
            <nav className="space-y-1.5">
              <button onClick={() => { setShowMobileNav(false); navigate("Roles"); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#F7F3EE] hover:bg-white/[.10] hover:text-white">
                <ShieldCheck className="size-[17px] text-[#F7F3EE]" strokeWidth={1.9} /> Roles & Access
              </button>
              <button onClick={() => navigate("Settings")} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#F7F3EE] hover:bg-white/[.10] hover:text-white"><Settings className="size-[17px] text-[#F7F3EE]" strokeWidth={1.9} /> Settings</button>
              <button onClick={() => { setShowMobileNav(false); setShowHelp(true); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#F7F3EE] hover:bg-white/[.10] hover:text-white"><HelpCircle className="size-[17px] text-[#F7F3EE]" strokeWidth={1.9} /> Help center</button>
            </nav>
          </div>
          <div className="rounded-2xl border border-white/[.08] bg-white/[.045] p-3.5"><div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-medium text-[#F7F3EE]"><span className="size-2 rounded-full bg-[#F7F3EE]" /> Cloud sync on</span><ChevronRight className="size-3.5 text-[#F7F3EE]" /></div><p className="text-[10px] leading-4 text-[#F7F3EE]">Last synced just now across 2 devices</p></div>
        </aside>
      </div>}

      <BottomNav
        activeSection={activeSection}
        onNavigate={(s) => navigate(s as Section)}
        onNewOrder={() => setShowNewOrder(true)}
      />

      {showNewOrder && (
        <NewBillModal
          onClose={() => setShowNewOrder(false)}
          onSuccess={() => setShowNewOrder(false)}
        />
      )}
      {showHelp && <OverlayModal title="Fabric Care help center" onClose={() => setShowHelp(false)}><p className="text-[13px] leading-6 text-[#0F4C5C]">Need a hand? Start with the <strong className="text-[#0F4C5C]">Getting started</strong> guide for setting up pricing, team roles, and your first order. For shop-specific support, email support@fabriccare.in.</p><button onClick={() => { setShowHelp(false); toast.success("Guide opened in a new workspace tab."); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-[12px] font-bold text-white">Open getting started <ChevronRight className="size-4" /></button></OverlayModal>}
    </div>
  );
}

function Overview({ onNavigate, orders, metrics }: { onNavigate: (section: Section) => void; orders: Order[]; metrics: OverviewMetrics }) {
  const chartMax = Math.max(1, ...orders.map((order) => money(order.amount)));
  return <>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Today’s revenue" value={`₹${metrics.todaysRevenue.toLocaleString("en-IN")}`} delta="Live" hint="from database" icon={IndianRupee} tone="blue" />
      <MetricCard label="Collected today" value={`₹${metrics.collectedToday.toLocaleString("en-IN")}`} delta="Live" hint="from database" icon={CircleDollarSign} tone="mint" />
      <MetricCard label="Pending dues" value={`₹${metrics.pendingDues.toLocaleString("en-IN")}`} delta={`${orders.filter((order) => order.balance !== "Paid").length}`} hint="orders need attention" icon={Clock3} tone="coral" inverse />
      <MetricCard label="In process" value={`${metrics.inProcessCount} orders`} delta={`${metrics.readyCount} ready`} hint="for collection" icon={WashingMachine} tone="lavender" />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.85fr)]">
      <section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 shadow-[0_7px_30px_rgba(17,17,17,.05)] sm:p-6">
        <div className="mb-6 flex items-start justify-between">
          <div><div className="mb-1 flex items-center gap-2"><p className="text-[13px] font-bold text-[#0F4C5C]">Revenue overview</p><span className="rounded-full bg-[#F7F3EE] px-2 py-1 text-[9px] font-bold text-[#0F4C5C]">This week</span></div><p className="text-[11px] text-[#F7F3EE]">A calm view of your daily collections</p></div>
          <button onClick={() => toast.info("Date range picker is ready for custom reporting.")} className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] px-2.5 py-2 text-[10px] font-semibold text-[#0F4C5C]"><CalendarDays className="size-3.5" /> Sep 9–15 <ChevronDown className="size-3" /></button>
        </div>
        <div className="relative h-[215px] w-full">
          <div className="absolute inset-0 flex flex-col justify-between pb-7 pt-2 text-[10px] text-[#0F4C5C]"><span>₹{Math.ceil(chartMax / 1000)}k</span><span>₹{Math.ceil(chartMax * .75 / 1000)}k</span><span>₹{Math.ceil(chartMax * .5 / 1000)}k</span><span>₹{Math.ceil(chartMax * .25 / 1000)}k</span><span>₹0</span></div>
          <div className="absolute inset-x-0 bottom-7 top-2 ml-10 flex flex-col justify-between"><span className="border-t border-dashed border-[#E5E5E5]" /><span className="border-t border-dashed border-[#E5E5E5]" /><span className="border-t border-dashed border-[#E5E5E5]" /><span className="border-t border-dashed border-[#E5E5E5]" /><span className="border-t border-dashed border-[#E5E5E5]" /></div>
          <svg viewBox="0 0 700 180" className="absolute bottom-7 left-10 right-0 h-[178px] w-[calc(100%-40px)] overflow-visible" preserveAspectRatio="none"><polyline points={orders.map((order, index) => `${index * (700 / Math.max(1, orders.length - 1))},${160 - (money(order.amount) / Math.max(1, ...orders.map((entry) => money(entry.amount)))) * 135}`).join(" ")} fill="none" stroke="#0F4C5C" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>
          <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[10px] font-medium text-[#0F4C5C]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        </div>
        <div className="mt-3 flex items-center gap-5 border-t border-[#F7F3EE] pt-4 text-[10px] text-[#0F4C5C]"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#0F4C5C]" /> Revenue</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F7F3EE]" /> Last week</span><button onClick={() => onNavigate("Expenses")} className="ml-auto font-bold text-[#0F4C5C] hover:underline">View report <ChevronRight className="inline size-3" /></button></div>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-[#F7F3EE] bg-[#F7F3EE] p-5 shadow-[0_7px_30px_rgba(55,75,160,.05)] sm:p-6">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[13px] font-bold text-[#0F4C5C]">Today’s snapshot</p><p className="mt-1 text-[11px] text-[#0F4C5C]">Tuesday, Sep 15</p></div><div className="grid size-9 place-items-center rounded-xl bg-white/70 text-[#0F4C5C]"><Sparkles className="size-[17px]" /></div></div>
        <div className="space-y-2.5"><SnapshotRow icon={PackageCheck} label="Orders received" value={`${metrics.ordersReceived}`} color="blue" /><SnapshotRow icon={Shirt} label="Items in process" value={`${metrics.itemsInProcess}`} color="purple" /><SnapshotRow icon={Tag} label="Ready for pickup" value={`${metrics.readyCount}`} color="orange" /><SnapshotRow icon={CreditCard} label="Payments collected" value={`₹${metrics.collectedToday.toLocaleString("en-IN")}`} color="green" /></div>
        <div className="mt-5 rounded-xl bg-white/65 px-3.5 py-3 text-[10px] font-medium leading-4 text-[#0F4C5C]"><span className="font-bold text-[#0F4C5C]">Nice work.</span> You’re up 8% in collections compared to last Tuesday.</div>
      </section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
      <section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 shadow-[0_7px_30px_rgba(17,17,17,.05)] sm:p-6">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[13px] font-bold text-[#0F4C5C]">Recent orders</p><p className="mt-1 text-[11px] text-[#F7F3EE]">The latest movement in your shop</p></div><button onClick={() => onNavigate("Orders")} className="text-[11px] font-bold text-[#0F4C5C] hover:underline">View all <ChevronRight className="inline size-3.5" /></button></div>
        <div className="hidden grid-cols-[1.3fr_1fr_.8fr_.8fr_auto] gap-4 border-b border-[#F7F3EE] px-2 pb-3 text-[9px] font-bold uppercase tracking-[.12em] text-[#0F4C5C] sm:grid"><span>Customer</span><span>Order</span><span>Amount</span><span>Status</span><span /></div>
        <div className="divide-y divide-[#F7F3EE]">{uniqueOrders(orders).slice(0, 4).map((order) => <OrderRow key={order.id} order={order} />)}</div>
      </section>
      <section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 shadow-[0_7px_30px_rgba(17,17,17,.05)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[13px] font-bold text-[#0F4C5C]">Process pulse</p><p className="mt-1 text-[11px] text-[#F7F3EE]">Where orders are right now</p></div><button onClick={() => onNavigate("Active process")} className="grid size-8 place-items-center rounded-lg bg-[#F7F3EE] text-[#0F4C5C]"><MoreHorizontal className="size-4" /></button></div><div className="space-y-4"><ProcessBar label="Received" count={`${metrics.processCounts.Received}`} percent={metrics.inProcessCount ? metrics.processCounts.Received / metrics.inProcessCount * 100 : 0} color="#F7F3EE" /><ProcessBar label="Processing" count={`${metrics.processCounts.Processing}`} percent={metrics.inProcessCount ? metrics.processCounts.Processing / metrics.inProcessCount * 100 : 0} color="#0F4C5C" /><ProcessBar label="Ready" count={`${metrics.processCounts.Ready}`} percent={metrics.inProcessCount ? metrics.processCounts.Ready / metrics.inProcessCount * 100 : 0} color="#0F4C5C" /></div><div className="mt-6 flex items-center gap-2 rounded-xl bg-[#F7F3EE] p-3 text-[10px] text-[#0F4C5C]"><Clock3 className="size-3.5 text-[#0F4C5C]" /> Average turnaround <strong className="text-[#0F4C5C]">1.8 days</strong><ArrowDownRight className="ml-auto size-3.5 text-[#0F4C5C]" /></div></section>
    </div>
  </>;
}

function MetricCard({ label, value, delta, hint, icon: Icon, tone, inverse = false }: { label: string; value: string; delta: string; hint: string; icon: typeof IndianRupee; tone: "blue" | "mint" | "coral" | "lavender"; inverse?: boolean }) {
  const toneMap = { blue: "bg-[#F7F3EE] text-[#0F4C5C]", mint: "bg-[#F7F3EE] text-[#0F4C5C]", coral: "bg-[#F7F3EE] text-[#0F4C5C]", lavender: "bg-[#F7F3EE] text-[#0F4C5C]" };
  return <div className="rounded-[18px] border border-[#F7F3EE] bg-white p-5 shadow-[0_7px_30px_rgba(17,17,17,.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(17,17,17,.08)]"><div className="mb-5 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#0F4C5C]">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${toneMap[tone]}`}><Icon className="size-[17px]" strokeWidth={1.9} /></span></div><p className="font-display text-[26px] font-semibold tracking-[-.04em] text-[#0F4C5C]">{value}</p><div className="mt-2 flex items-center gap-1.5 text-[10px]"><span className={`flex items-center gap-0.5 font-bold ${inverse ? "text-[#0F4C5C]" : "text-[#0F4C5C]"}`}>{inverse ? <ArrowUpRight className="size-3" /> : <ArrowUpRight className="size-3" />}{delta}</span><span className="text-[#0F4C5C]">{hint}</span></div></div>;
}

function SnapshotRow({ icon: Icon, label, value, color }: { icon: typeof PackageCheck; label: string; value: string; color: string }) {
  const colors: Record<string, string> = { blue: "bg-[#F7F3EE] text-[#0F4C5C]", purple: "bg-[#F7F3EE] text-[#0F4C5C]", orange: "bg-[#F7F3EE] text-[#0F4C5C]", green: "bg-[#F7F3EE] text-[#0F4C5C]" };
  return <div className="flex items-center gap-3 rounded-xl bg-white/55 px-3 py-2.5"><span className={`grid size-8 place-items-center rounded-lg ${colors[color]}`}><Icon className="size-4" strokeWidth={1.9} /></span><span className="flex-1 text-[11px] font-semibold text-[#0F4C5C]">{label}</span><strong className="text-[12px] font-bold text-[#0F4C5C]">{value}</strong></div>;
}

function ProcessBar({ label, count, percent, color }: { label: string; count: string; percent: number; color: string }) { return <div><div className="mb-2 flex justify-between text-[11px]"><span className="font-semibold text-[#0F4C5C]">{label}</span><span className="font-bold text-[#0F4C5C]">{count} <span className="font-normal text-[#0F4C5C]">orders</span></span></div><div className="h-2 overflow-hidden rounded-full bg-[#E5E5E5]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} /></div></div>; }

const statusStyles = { Received: "bg-[#EAF2F8] text-[#3976A8]", Processing: "bg-[#FFF4D6] text-[#9A6A12]", Ready: "bg-[#E8F3EC] text-[#4E8C6A]", Collected: "bg-[#F2F2F2] text-[#6B7280]" };

function OrderRow({ order }: { order: Order }) {
  const [showDetails, setShowDetails] = useState(false);
  return <><button onClick={() => setShowDetails(true)} className="group grid w-full grid-cols-1 gap-2 px-2 py-3.5 text-left transition hover:bg-[#E5E5E5] sm:grid-cols-[1.3fr_1fr_.8fr_.8fr_auto] sm:items-center sm:gap-4"><div className="flex items-center gap-3"><span style={{ backgroundColor: `${order.accent}20`, color: order.accent }} className="grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold">{order.initials}</span><div><p className="text-[11px] font-bold text-[#0F4C5C]">{order.customer}</p><p className="text-[9px] text-[#0F4C5C]">{order.phone}</p></div></div><div className="ml-11 -mt-1 text-[10px] text-[#0F4C5C] sm:ml-0 sm:mt-0"><span className="font-bold text-[#0F4C5C]">{order.id}</span><span className="hidden xl:inline"> · {order.items}</span></div><span className="ml-11 -mt-1 text-[11px] font-bold text-[#0F4C5C] sm:ml-0 sm:mt-0">{order.amount}<span className="ml-2 text-[9px] font-medium text-[#0F4C5C]">{order.balance !== "Paid" ? order.balance : ""}</span></span><span className={`ml-11 -mt-1 w-fit rounded-full px-2 py-1 text-[9px] font-bold sm:ml-0 sm:mt-0 ${statusStyles[order.status]}`}>{order.status}</span><ChevronRight className="absolute right-2 hidden size-4 text-[#F7F3EE] transition group-hover:translate-x-0.5 group-hover:text-[#0F4C5C] sm:relative sm:right-auto sm:block" /></button>{showDetails && <OrderDetailsModal order={order} onClose={() => setShowDetails(false)} />}</>;
}

function OrderDetailsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: async (updatedOrder) => {
      utils.orders.list.setData(undefined, (current) => current?.map((existing) => existing.id === updatedOrder.id ? updatedOrder : existing));
      await utils.orders.list.invalidate();
      toast.success(`${order.id} moved to ${updatedOrder.status}`, { description: "The order status is saved to the database." });
      onClose();
    },
    onError: (error) => toast.error("Could not update order status", { description: error.message }),
  });
  const statuses: Order["status"][] = ["Received", "Processing", "Ready", "Collected"];
  const currentIndex = statuses.indexOf(order.status);
  const nextStatus = statuses[currentIndex + 1];
  return <OverlayModal title={`Order ${order.id}`} onClose={onClose}><div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#F7F3EE] p-3"><span style={{ backgroundColor: `${order.accent}20`, color: order.accent }} className="grid size-11 place-items-center rounded-xl text-[12px] font-bold">{order.initials}</span><div><p className="text-[13px] font-bold text-[#0F4C5C]">{order.customer}</p><p className="mt-1 text-[10px] text-[#0F4C5C]">{order.phone}</p></div><span className={`ml-auto rounded-full px-2.5 py-1 text-[9px] font-bold ${statusStyles[order.status]}`}>{order.status}</span></div><div className="grid grid-cols-2 gap-3"><DetailCell label="Bill amount" value={order.amount} /><DetailCell label="Balance" value={order.balance} danger={order.balance !== "Paid"} /><DetailCell label="Pickup" value={order.due} /><DetailCell label="Payment" value={order.balance === "Paid" ? "Paid in full" : "Advance received"} /></div><div className="mt-5 rounded-2xl border border-[#F7F3EE] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[12px] font-bold text-[#0F4C5C]">Order status</p><span className="text-[10px] text-[#0F4C5C]">Step {currentIndex + 1} of {statuses.length}</span></div><div className="grid grid-cols-4 gap-1.5">{statuses.map((status, index) => <div key={status} className="text-center"><div className={`mx-auto mb-1 grid size-7 place-items-center rounded-full text-[10px] font-bold ${index <= currentIndex ? "bg-[#0F4C5C] text-white" : "bg-[#F7F3EE] text-[#0F4C5C]"}`}>{index + 1}</div><span className="text-[9px] font-semibold text-[#0F4C5C]">{status}</span></div>)}</div>{nextStatus ? <button disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate({ id: order.id, status: nextStatus })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{updateStatusMutation.isPending ? "Saving…" : `Mark as ${nextStatus}`} <ArrowUpRight className="size-4" /></button> : <p className="mt-4 rounded-xl bg-[#F7F3EE] px-3 py-2.5 text-center text-[10px] font-semibold text-[#0F4C5C]">This order is complete and collected.</p>}</div><div className="mt-5 rounded-2xl border border-[#F7F3EE] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[12px] font-bold text-[#0F4C5C]">Items in this order</p><Shirt className="size-4 text-[#0F4C5C]" /></div><div className="flex flex-wrap gap-2">{order.items.split(" · ").slice(1).join(" · ").split(", ").map((item) => <span key={item} className="rounded-lg bg-[#F7F3EE] px-2.5 py-1.5 text-[10px] font-bold text-[#0F4C5C]">{item}</span>)}</div></div><button onClick={() => { downloadReceipt(order); toast.success(`${order.id} receipt downloaded`, { description: "Open the HTML receipt to print or save as PDF." }); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-[12px] font-bold text-white">Download receipt <FileText className="size-4" /></button></OverlayModal>;
}

function downloadReceipt(order: Order) {
  const items = order.items.split(" · ").slice(1).join(" · ");
  const receiptHtml = `<!doctype html><html><head><meta charset="UTF-8"><title>Fabric Care Receipt ${order.id}</title><style>body{margin:0;background:#E5E5E5;color:#0F4C5C;font:14px Arial,sans-serif}.receipt{box-sizing:border-box;width:680px;max-width:calc(100% - 32px);margin:32px auto;background:#fff;padding:40px;border-radius:18px;box-shadow:0 12px 35px rgba(17,17,17,.10)}.brand{color:#0F4C5C;font-size:24px;font-weight:700}.muted{color:#0F4C5C;font-size:12px}.rule{border:0;border-top:1px solid #F7F3EE;margin:24px 0}.row{display:flex;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid #F7F3EE}.label{color:#0F4C5C}.value{font-weight:700;text-align:right}.total{font-size:20px;color:#0F4C5C}.balance{color:#0F4C5C}.footer{margin-top:28px;color:#0F4C5C;font-size:11px;line-height:1.6}</style></head><body><main class="receipt"><div class="brand">Fabric Care</div><div class="muted">You wear, we care · Laundry receipt</div><hr class="rule"><div class="row"><span class="label">Bill number</span><span class="value">${order.id}</span></div><div class="row"><span class="label">Customer</span><span class="value">${order.customer}</span></div><div class="row"><span class="label">Phone</span><span class="value">${order.phone}</span></div><div class="row"><span class="label">Items</span><span class="value">${items}</span></div><div class="row"><span class="label">Pickup</span><span class="value">${order.due}</span></div><div class="row"><span class="label">Status</span><span class="value">${order.status}</span></div><hr class="rule"><div class="row"><span class="label">Bill amount</span><span class="value total">${order.amount}</span></div><div class="row"><span class="label">Balance</span><span class="value balance">${order.balance}</span></div><div class="footer">Thank you for choosing Fabric Care.<br>Generated from the Fabric Care laundry operations dashboard.</div></main></body></html>`;
  const blob = new Blob([receiptHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fabric-care-${order.id.toLowerCase()}-receipt.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DetailCell({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <div className="rounded-xl bg-[#E5E5E5] p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#0F4C5C]">{label}</p><p className={`mt-1.5 text-[12px] font-bold ${danger ? "text-[#0F4C5C]" : "text-[#0F4C5C]"}`}>{value}</p></div>; }

function NotificationPanel({ orders, notificationsEnabled, onMarkRead }: { orders: Order[]; notificationsEnabled: boolean; onMarkRead: () => void }) {
  const readyOrders = orders.filter((order) => order.status === "Ready");
  const dueOrders = orders.filter((order) => order.balance !== "Paid");
  return <div className="absolute right-[54px] top-[52px] z-30 w-[300px] rounded-2xl border border-[#F7F3EE] bg-white p-4 shadow-[0_16px_45px_rgba(17,17,17,.12)] sm:right-[174px]"><div className="mb-3 flex items-center justify-between"><div><p className="text-[12px] font-bold text-[#0F4C5C]">Notifications</p><p className="mt-1 text-[10px] text-[#0F4C5C]">Live from your current orders</p></div><span className="rounded-full bg-[#F7F3EE] px-2 py-1 text-[10px] font-semibold text-[#0F4C5C]">{notificationsEnabled ? readyOrders.length + dueOrders.length : 0} new</span></div>{notificationsEnabled ? <div className="space-y-3 text-[11px] text-[#0F4C5C]">{readyOrders.length ? <p><span className="font-semibold text-[#0F4C5C]">{readyOrders.length} order{readyOrders.length === 1 ? " is" : "s are"}</span> ready for pickup.</p> : null}{dueOrders.length ? <p><span className="font-semibold text-[#0F4C5C]">{dueOrders.length} customer{dueOrders.length === 1 ? " has" : "s have"}</span> an outstanding balance.</p> : null}<p>Workspace data is synced from the database.</p>{!readyOrders.length && !dueOrders.length && <p className="rounded-xl bg-[#F7F3EE] p-3">You are all caught up.</p>}</div> : <p className="rounded-xl bg-[#F7F3EE] p-3 text-[11px] text-[#0F4C5C]">Customer notifications are disabled in Settings.</p>}<button onClick={onMarkRead} className="mt-4 w-full rounded-xl border border-[#F7F3EE] py-2.5 text-[10px] font-bold text-[#0F4C5C] transition hover:bg-[#F7F3EE]">Mark as read</button></div>;
}

function ProfileMenu({
  user,
  activeRole,
  onSettings,
  onRoles,
  onLogout,
}: {
  user: { name?: string | null; email?: string | null; role?: string | null } | null;
  activeRole: string;
  onSettings: () => void;
  onRoles: () => void;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className="absolute right-0 top-[52px] z-30 w-[270px] rounded-2xl border border-[#F7F3EE] bg-white p-4 shadow-[0_16px_45px_rgba(17,17,17,.12)]">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#F7F3EE] p-3">
        <div className="grid size-10 place-items-center rounded-xl bg-white text-[11px] font-bold text-[#0F4C5C]">
          {(user?.name ?? "Ashfaq").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold text-[#0F4C5C]">{user?.name ?? "Ashfaq"}</p>
          <p className="mt-0.5 truncate text-[10px] text-[#0F4C5C]">{user?.email ?? "asfaq94.md@gmail.com"}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#0F4C5C]/10 text-[#0F4C5C] text-[9px] font-bold uppercase">
            Role: {activeRole}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <button
          onClick={onRoles}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-[#0F4C5C] transition hover:bg-[#F7F3EE]"
        >
          <ShieldCheck className="size-4" /> Roles & access control
        </button>
        <button
          onClick={onSettings}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-[#0F4C5C] transition hover:bg-[#F7F3EE]"
        >
          <Settings className="size-4" /> Account and shop settings
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function SettingsView({ shop, settings, setSettings, onSave, saving, onRecordBackup, backupSaving }: { shop?: { name: string; address: string | null; customerNotifications: number; pricingTier: string; lastBackupAt: Date | null }; settings: ShopSettings; setSettings: (value: ShopSettings) => void; onSave: () => void; saving: boolean; onRecordBackup: () => void; backupSaving: boolean }) {
  const backupLabel = shop?.lastBackupAt ? new Date(shop.lastBackupAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "No backup recorded yet";
  const exportWorkspace = () => { const blob = new Blob([JSON.stringify({ shop: settings, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "fabric-care-workspace-backup.json"; link.click(); URL.revokeObjectURL(url); onRecordBackup(); };
  return <div className="grid max-w-5xl gap-5 lg:grid-cols-[.85fr_1.35fr]"><section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 sm:p-6"><div className="mb-5 grid size-12 place-items-center rounded-2xl bg-[#F7F3EE] text-[#0F4C5C]"><Settings className="size-5" /></div><p className="font-display text-xl font-semibold text-[#0F4C5C]">Shop settings</p><p className="mt-2 text-[12px] leading-5 text-[#0F4C5C]">Update your business profile, customer communication preference, pricing tier, and workspace backup.</p><div className="mt-6 rounded-2xl bg-[#F7F3EE] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Current workspace</p><p className="mt-2 text-[13px] font-bold text-[#0F4C5C]">{settings.name}</p><p className="mt-1 text-[11px] text-[#0F4C5C]">{settings.address}</p><p className="mt-4 text-[10px] text-[#0F4C5C]">Pricing: <span className="font-bold">{settings.pricingTier}</span></p><p className="mt-1 text-[10px] text-[#0F4C5C]">Notifications: <span className="font-bold">{settings.customerNotifications ? "Enabled" : "Disabled"}</span></p></div></section><section className="space-y-4 rounded-[20px] border border-[#F7F3EE] bg-white p-5 sm:p-6"><div className="rounded-2xl border border-[#F7F3EE] p-4"><div className="mb-4 flex items-center justify-between"><div><p className="text-[12px] font-bold text-[#0F4C5C]">Business profile</p><p className="mt-1 text-[10px] text-[#0F4C5C]">Shown in your shop switcher and workspace exports.</p></div><Store className="size-4 text-[#0F4C5C]" /></div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-[#0F4C5C]">Business name</span><input value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 py-2.5 text-[11px] text-[#0F4C5C] outline-none focus:border-[#0F4C5C]" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-[#0F4C5C]">Address</span><input value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 py-2.5 text-[11px] text-[#0F4C5C] outline-none focus:border-[#0F4C5C]" /></label></div></div><div className="rounded-2xl border border-[#F7F3EE] p-4"><div className="flex items-center justify-between"><div><p className="text-[12px] font-bold text-[#0F4C5C]">Customer notifications</p><p className="mt-1 text-[10px] text-[#0F4C5C]">Use the bell to surface ready-for-pickup and outstanding-balance alerts.</p></div><button type="button" aria-label="Toggle customer notifications" onClick={() => setSettings({ ...settings, customerNotifications: !settings.customerNotifications })} className={`relative h-6 w-11 rounded-full transition ${settings.customerNotifications ? "bg-[#0F4C5C]" : "bg-[#E5E5E5]"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${settings.customerNotifications ? "right-1" : "left-1"}`} /></button></div></div><div className="rounded-2xl border border-[#F7F3EE] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-bold text-[#0F4C5C]">Pricing tier</p><p className="mt-1 text-[10px] text-[#0F4C5C]">Choose the active price-list label for new orders.</p></div><select value={settings.pricingTier} onChange={(event) => setSettings({ ...settings, pricingTier: event.target.value })} className="rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 py-2.5 text-[11px] font-semibold text-[#0F4C5C] outline-none"><option>Normal + Premium</option><option>Standard</option><option>Premium only</option></select></div></div><div className="rounded-2xl border border-[#F7F3EE] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-bold text-[#0F4C5C]">Data & backup</p><p className="mt-1 text-[10px] text-[#0F4C5C]">Last backup: {backupLabel}</p></div><Database className="size-4 text-[#0F4C5C]" /></div><button disabled={backupSaving} onClick={exportWorkspace} className="mt-3 flex items-center gap-2 rounded-xl border border-[#F7F3EE] px-3 py-2.5 text-[10px] font-bold text-[#0F4C5C] disabled:opacity-60"><Download className="size-3.5" /> {backupSaving ? "Recording…" : "Download workspace backup"}</button></div><button disabled={saving} onClick={onSave} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-[12px] font-bold text-white disabled:opacity-60"><Save className="size-4" /> {saving ? "Saving settings…" : "Save settings"}</button></section></div>;
}

function SectionView({ section, orders, query, setQuery, statusFilter, setStatusFilter, onNewOrder, onNavigate, shop, settings, setSettings, onSaveSettings, settingsSaving, onRecordBackup, backupSaving }: { section: Section; orders: Order[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onNewOrder: () => void; onNavigate: (section: Section) => void; shop?: { name: string; address: string | null; customerNotifications: number; pricingTier: string; lastBackupAt: Date | null }; settings: ShopSettings; setSettings: (value: ShopSettings) => void; onSaveSettings: () => void; settingsSaving: boolean; onRecordBackup: () => void; backupSaving: boolean }) {
  if (section === "Active process") return <ActiveProcessView onNewOrder={onNewOrder} />;
  if (section === "Orders") return <BillsView onNewOrder={onNewOrder} />;
  if (section === "Customers") return <CustomersView />;
  if (section === "Statements") return <StatementsView />;
  if (section === "Roles") return <RolesAndAccessView />;
  if (section === "Settings") return <SettingsViewComponent />;
  if (section === "Overview") return <DashboardView onNavigate={onNavigate} onNewOrder={onNewOrder} />;

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { data: apiCustomers } = trpc.customers.list.useQuery();
  const { data: apiExpenses } = trpc.expenses.list.useQuery();
  const createExpenseMutation = trpc.expenses.create.useMutation();
  const [expenses, setExpenses] = useState<any[]>([]);
  useEffect(() => { if (apiExpenses) setExpenses(apiExpenses.map((expense) => ({ id: expense.id, label: expense.title, category: expense.category, amount: `₹${Number(expense.amount).toLocaleString("en-IN")}`, amountValue: Number(expense.amount), date: new Date(expense.expenseDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }), method: expense.paymentMethod }))); }, [apiExpenses]);
  if (section === "Expenses") return <><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 sm:p-6"><div className="mb-5 flex justify-end"><button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 rounded-xl bg-[#F7F3EE] px-3 py-2 text-[10px] font-bold text-[#0F4C5C]"><Plus className="size-3.5" /> Add expense</button></div><div className="mb-5 grid gap-3 sm:grid-cols-3"><MiniStat label="Total expenses" value={`₹${expenses.reduce((sum, expense) => sum + money(expense.amount), 0).toLocaleString("en-IN")}`} tone="coral" /><MiniStat label="Net balance" value={`₹${(orders.reduce((sum, order) => sum + money(order.amount), 0) - expenses.reduce((sum, expense) => sum + money(expense.amount), 0)).toLocaleString("en-IN")}`} tone="mint" /><MiniStat label="Recurring" value="₹0" tone="lavender" /></div><div className="divide-y divide-[#F7F3EE]">{expenses.map((expense) => <ExpenseRow key={expense.id} label={expense.label} category={expense.category} amount={expense.amount} date={`${expense.date} · ${expense.method}`} />)}</div></section><section className="rounded-[20px] border border-[#F7F3EE] bg-[#F7F3EE] p-5 sm:p-6"><p className="text-[13px] font-bold text-[#0F4C5C]">Money movement</p><div className="mt-6 flex h-[160px] items-end gap-3 border-b border-[#F7F3EE] pb-0">{[42, 72, 55, 91, 65, 82, 48].map((height, index) => <div key={index} className="group flex flex-1 flex-col items-center justify-end gap-2"><span className="hidden text-[9px] font-bold text-[#0F4C5C] group-hover:block">₹{index === 3 ? "20.8k" : "14.2k"}</span><div className="w-full rounded-t-md bg-[#0F4C5C] transition-all hover:bg-[#0F4C5C]" style={{ height: `${height}%` }} /></div>)}</div><div className="mt-3 flex justify-between text-[9px] font-semibold text-[#0F4C5C]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></section></div>{showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} onAdd={(expense) => { createExpenseMutation.mutate({ title: expense.label, category: expense.category, amount: money(expense.amount), paymentMethod: expense.method, expenseDate: new Date().toISOString() }, { onSuccess: (created) => { setExpenses((current) => [{ id: created.id, label: created.title, category: created.category, amount: `₹${Number(created.amount).toLocaleString("en-IN")}`, amountValue: Number(created.amount), date: new Date(created.expenseDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }), method: created.paymentMethod }, ...current]); setShowExpenseModal(false); toast.success("Expense added", { description: `${created.title} · saved to the database` }); }, onError: (error) => toast.error("Could not save the expense", { description: error.message }) }); }} />}</>;
  return null;
}

function ExpenseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (expense: { label: string; category: string; amount: string; date: string; method: string }) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Supplies");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState("2026-09-15");
  const [notes, setNotes] = useState("");
  return <OverlayModal title="Add an expense" onClose={onClose}><p className="mb-5 text-[12px] leading-5 text-[#0F4C5C]">Record shop costs so your revenue and net balance stay accurate.</p><div className="space-y-3"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Expense name</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3.5 py-3 text-[12px] outline-none focus:border-[#0F4C5C] focus:ring-4 focus:ring-[#F7F3EE]" placeholder="e.g. Detergent supplies" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 py-3 text-[11px] outline-none focus:border-[#0F4C5C]"><option>Supplies</option><option>Wages</option><option>Utilities</option><option>Rent</option><option>Maintenance</option><option>Other</option></select></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Amount</span><div className="flex items-center rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 focus-within:border-[#0F4C5C] focus-within:ring-4 focus-within:ring-[#F7F3EE]"><span className="text-[12px] text-[#0F4C5C]">₹</span><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-transparent px-2 py-3 text-[12px] outline-none" placeholder="0" /></div></label></div><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Payment method</span><select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 py-3 text-[11px] outline-none focus:border-[#0F4C5C]"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option></select></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3 py-3 text-[11px] outline-none focus:border-[#0F4C5C]" /></label></div><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Notes <span className="font-normal normal-case tracking-normal text-[#0F4C5C]">(optional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[70px] w-full resize-none rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3.5 py-3 text-[12px] outline-none focus:border-[#0F4C5C] focus:ring-4 focus:ring-[#F7F3EE]" placeholder="Add a short note for your records..." /></label></div><button onClick={() => { if (!title.trim()) { toast.error("Add an expense name first."); return; } if (!amount || Number(amount) <= 0) { toast.error("Enter an amount greater than zero."); return; } const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { month: "short", day: "numeric" }); onAdd({ label: title.trim(), category, amount: `₹${Number(amount).toLocaleString("en-IN")}`, date: formattedDate, method }); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(15,76,92,.16)] transition hover:bg-[#0F4C5C] active:scale-[.98]">Save expense <Check className="size-4" /></button></OverlayModal>;
}

function CustomerView({ orders, apiCustomers, query, setQuery }: { orders: Order[]; apiCustomers: { id: number; name: string; phone: string }[]; query: string; setQuery: (value: string) => void }) {
  const customers = apiCustomers.map((record) => {
    const customerOrders = orders.filter((order) => order.phone === record.phone);
    const latestOrder = customerOrders[0] ?? { id: `customer-${record.id}`, customer: record.name, phone: record.phone, initials: record.name.slice(0, 2).toUpperCase(), accent: "#0F4C5C", amount: "₹0", balance: "Paid", totalAmount: 0, amountPaid: 0, structuredItems: [], createdAt: "", updatedAt: "", status: "Collected" as const, due: "" };
    const billed = customerOrders.reduce((total, order) => total + money(order.amount), 0);
    const outstanding = customerOrders.reduce((total, order) => total + Math.max(0, order.totalAmount - order.amountPaid), 0);
    return { ...latestOrder, customer: record.name, phone: record.phone, orderCount: customerOrders.length, billed, outstanding };
  }).filter((customer) => `${customer.customer} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  const totalBilled = customers.reduce((total, customer) => total + customer.billed, 0);
  const totalOutstanding = customers.reduce((total, customer) => total + customer.outstanding, 0);
  return <section className="rounded-[20px] border border-[#F7F3EE] bg-white p-5 shadow-[0_7px_30px_rgba(17,17,17,.05)] sm:p-6"><div className="mb-5 flex justify-end"><div className="flex items-center gap-2 rounded-xl border border-[#F7F3EE] px-3 py-2.5"><Search className="size-3.5 text-[#0F4C5C]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-[150px] bg-transparent text-[11px] outline-none placeholder:text-[#0F4C5C] sm:w-[210px]" placeholder="Search customers..." /></div></div><div className="mb-5 grid gap-3 sm:grid-cols-3"><MiniStat label="Customers" value={`${customers.length}`} tone="lavender" /><MiniStat label="Total billed" value={`₹${totalBilled.toLocaleString("en-IN")}`} tone="mint" /><MiniStat label="Pending balances" value={`₹${totalOutstanding.toLocaleString("en-IN")}`} tone="coral" /></div>{customers.length ? <div className="divide-y divide-[#F7F3EE]">{customers.map((customer) => <button key={customer.phone} onClick={() => toast.info(`${customer.customer} · ${customer.orderCount} order${customer.orderCount === 1 ? "" : "s"}`, { description: `${customer.phone} · ₹${customer.outstanding.toLocaleString("en-IN")} outstanding` })} className="group flex w-full items-center gap-3 px-2 py-4 text-left transition hover:bg-[#E5E5E5]"><span style={{ backgroundColor: `${customer.accent}20`, color: customer.accent }} className="grid size-10 shrink-0 place-items-center rounded-full text-[11px] font-bold">{customer.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-[#0F4C5C]">{customer.customer}</span><span className="mt-1 block text-[10px] text-[#0F4C5C]">{customer.phone}</span></span><span className="hidden text-right sm:block"><span className="block text-[11px] font-bold text-[#0F4C5C]">{customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}</span><span className="mt-1 block text-[9px] text-[#0F4C5C]">Latest: {customer.id}</span></span><span className="text-right"><span className="block text-[11px] font-bold text-[#0F4C5C]">₹{customer.billed.toLocaleString("en-IN")}</span><span className={`mt-1 block text-[9px] font-semibold ${customer.outstanding ? "text-[#0F4C5C]" : "text-[#0F4C5C]"}`}>{customer.outstanding ? `₹${customer.outstanding.toLocaleString("en-IN")} due` : "Paid up"}</span></span><ChevronRight className="size-4 text-[#F7F3EE] transition group-hover:translate-x-0.5 group-hover:text-[#0F4C5C]" /></button>)}</div> : <div className="grid place-items-center py-20 text-center"><div className="grid size-12 place-items-center rounded-2xl bg-[#F7F3EE] text-[#0F4C5C]"><UsersRound className="size-5" /></div><p className="mt-3 text-[13px] font-bold text-[#0F4C5C]">No customers found</p><p className="mt-1 text-[11px] text-[#0F4C5C]">Try searching by name or phone number.</p></div>}</section>;
}

function SettingRow({ title, description, toggle = false }: { title: string; description: string; toggle?: boolean }) { return <button onClick={() => toast.info(`${title} settings opened.`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-[#E5E5E5]"><span className="flex-1"><p className="text-[12px] font-bold text-[#0F4C5C]">{title}</p><p className="mt-1 text-[10px] text-[#0F4C5C]">{description}</p></span>{toggle ? <span className="relative h-5 w-9 rounded-full bg-[#0F4C5C]"><span className="absolute right-1 top-1 size-3 rounded-full bg-white" /></span> : <ChevronRight className="size-4 text-[#F7F3EE]" />}</button>; }
function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className={`rounded-xl p-3 ${tone === "coral" ? "bg-[#F7F3EE]" : tone === "mint" ? "bg-[#F7F3EE]" : "bg-[#F7F3EE]"}`}><p className="text-[10px] font-semibold text-[#0F4C5C]">{label}</p><p className="mt-1 text-[15px] font-bold text-[#0F4C5C]">{value}</p></div>; }
function ExpenseRow({ label, category, amount, date }: { label: string; category: string; amount: string; date: string }) { return <div className="flex items-center gap-3 py-3"><div className="grid size-8 place-items-center rounded-lg bg-[#F7F3EE] text-[#0F4C5C]"><WalletCards className="size-4" /></div><div className="flex-1"><p className="text-[11px] font-bold text-[#0F4C5C]">{label}</p><p className="mt-1 text-[9px] text-[#0F4C5C]">{category} · {date}</p></div><p className="text-[11px] font-bold text-[#0F4C5C]">{amount}</p></div>; }

function NewOrderModal({ onClose, onCreateOrder }: { onClose: () => void; onCreateOrder: (order: NewOrderInput) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Wash & Iron");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({ Shirts: 1 });
  const serviceDetails: Record<string, { base: number }> = {
    "Wash & Iron": { base: 120 },
    "Premium dry clean": { base: 220 },
    "Wash & Fold": { base: 80 },
    "Steam press": { base: 60 },
  };
  const itemEntries = Object.entries(selectedItems).filter(([, quantity]) => quantity > 0);
  const selectedItemNames = itemEntries.map(([item]) => item);
  const totalItemCount = itemEntries.reduce((total, [, quantity]) => total + quantity, 0);
  const itemTotal = itemEntries.reduce((total, [item, quantity]) => total + ((catalogItems.find((catalogItem) => catalogItem.label === item)?.price ?? 0) * quantity), 0);
  const updateQuantity = (itemLabel: string, delta: number) => setSelectedItems((current) => ({ ...current, [itemLabel]: Math.max(0, (current[itemLabel] ?? 0) + delta) }));
  return <OverlayModal title="Create a new order" onClose={onClose}><p className="mb-5 text-[12px] leading-5 text-[#0F4C5C]">Capture the customer, choose a service, and select every garment you receive.</p><div className="space-y-3"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Customer name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3.5 py-3 text-[12px] outline-none transition focus:border-[#0F4C5C] focus:ring-4 focus:ring-[#F7F3EE]" placeholder="e.g. Meera Rao" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Phone number</span><input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3.5 py-3 text-[12px] outline-none transition focus:border-[#0F4C5C] focus:ring-4 focus:ring-[#F7F3EE]" placeholder="+91 98765 43210" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Service</span><select value={service} onChange={(event) => setService(event.target.value)} className="w-full appearance-none rounded-xl border border-[#F7F3EE] bg-[#E5E5E5] px-3.5 py-3 text-[12px] outline-none focus:border-[#0F4C5C]"><option>Wash & Iron</option><option>Premium dry clean</option><option>Wash & Fold</option><option>Steam press</option></select></label><div><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#0F4C5C]">Select items & quantity</span><div className="grid grid-cols-2 gap-2">{catalogItems.map((item) => { const quantity = selectedItems[item.label] ?? 0; const selected = quantity > 0; return <div key={item.label} className={`flex min-h-11 items-center justify-between rounded-xl border px-3 transition ${selected ? "border-[#F7F3EE] bg-[#F7F3EE] text-[#0F4C5C]" : "border-[#F7F3EE] bg-[#E5E5E5] text-[#0F4C5C]"}`}><span><span className="block text-[11px] font-bold">{item.label}</span><span className="text-[9px]">₹{item.price} each</span></span><span className="flex items-center gap-1"><button type="button" aria-label={`Decrease ${item.label}`} onClick={() => updateQuantity(item.label, -1)} className="grid size-6 place-items-center rounded-md border border-[#F7F3EE] bg-white text-[15px] font-medium text-[#0F4C5C] transition hover:bg-[#F7F3EE]">−</button><span className="w-4 text-center text-[11px] font-bold text-[#0F4C5C]">{quantity}</span><button type="button" aria-label={`Increase ${item.label}`} onClick={() => updateQuantity(item.label, 1)} className="grid size-6 place-items-center rounded-md bg-[#0F4C5C] text-[15px] font-medium text-white transition hover:bg-[#0F4C5C]">+</button></span></div>; })}</div></div></div><div className="mt-4 flex items-center justify-between rounded-xl bg-[#F7F3EE] px-3.5 py-3"><span className="text-[10px] font-semibold text-[#0F4C5C]">{totalItemCount} item{totalItemCount === 1 ? "" : "s"} · estimated total</span><strong className="text-[16px] text-[#0F4C5C]">₹{itemTotal + serviceDetails[service].base}</strong></div><button onClick={() => { if (!name.trim()) { toast.error("Add a customer name first."); return; } if (!totalItemCount) { toast.error("Add at least one item."); return; } const details = serviceDetails[service]; const total = itemTotal + details.base; const structuredItems = itemEntries.map(([item, quantity]) => ({ name: item, quantity, price: catalogItems.find((catalogItem) => catalogItem.label === item)?.price ?? 0 })); onCreateOrder({ customerName: name.trim(), phone: phone.trim() || "No phone added", items: structuredItems, serviceType: service, totalAmount: total, amountPaid: 0 }); onClose(); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-3 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(15,76,92,.16)] transition hover:bg-[#0F4C5C] active:scale-[.98]">Create bill <ArrowUpRight className="size-4" /></button></OverlayModal>;
}

function OverlayModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F4C5C]/40 px-4 py-4 backdrop-blur-sm"><div className="max-h-[calc(100dvh-32px)] w-full max-w-[420px] overflow-y-auto rounded-[24px] border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(17,17,17,.12)] sm:p-7"><div className="mb-1 flex items-center justify-between"><h2 className="font-display text-[20px] font-semibold tracking-[-.03em] text-[#0F4C5C]">{title}</h2><button onClick={onClose} className="grid size-10 place-items-center rounded-lg bg-[#E5E5E5] text-[#0F4C5C] transition hover:bg-[#F7F3EE] hover:text-[#0F4C5C]" aria-label="Close"><X className="size-4" /></button></div>{children}</div></div>; }
