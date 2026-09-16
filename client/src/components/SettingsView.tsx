import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAccessControl } from "@/contexts/AccessControlContext";
import RolesAndAccessView from "./RolesAndAccessView";
import {
  Settings,
  Store,
  ShieldCheck,
  Smartphone,
  Cloud,
  LogOut,
  Save,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsView({ initialTab = "general" }: { initialTab?: "general" | "roles" | "devices" | "account" }) {
  const { user, logout } = useAuth();
  const { canManageSettings, role } = useAccessControl();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"general" | "roles" | "devices" | "account">(initialTab);

  const { data: shops = [] } = trpc.shops.list.useQuery();
  const shop = shops[0];
  const { data: devices = [] } = trpc.devices.list.useQuery();

  const [shopName, setShopName] = useState(shop?.name || "Indiranagar shop");
  const [shopAddress, setShopAddress] = useState(shop?.address || "");

  const updateShopMutation = trpc.shops.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.shops.list.invalidate();
      toast.success("Shop settings updated");
    },
    onError: (err) => toast.error("Failed to update shop", { description: err.message }),
  });

  const registerDeviceMutation = trpc.devices.register.useMutation({
    onSuccess: async () => {
      await utils.devices.list.invalidate();
      toast.success("Device registered successfully");
    },
    onError: (err) => toast.error("Could not register device", { description: err.message }),
  });

  const handleRegisterCurrentDevice = () => {
    const userAgent = navigator.userAgent;
    let deviceLabel = "Web Browser Counter";
    if (userAgent.includes("Mobile")) deviceLabel = "Mobile Counter App";
    else if (userAgent.includes("Chrome")) deviceLabel = "Chrome Counter";

    registerDeviceMutation.mutate({
      deviceLabel,
      userAgent,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F4C5C] flex items-center gap-2">
              <Settings className="size-6 text-[#0F4C5C]" />
              Shop Settings & Operations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage business profile, team roles and access permissions, counter devices, and cloud sync
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "general"
                  ? "bg-white text-[#0F4C5C] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store className="size-3.5" /> Shop Profile
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "roles"
                  ? "bg-white text-[#0F4C5C] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="size-3.5" /> Roles & Access
            </button>
            <button
              onClick={() => setActiveTab("devices")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "devices"
                  ? "bg-white text-[#0F4C5C] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone className="size-3.5" /> Devices
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "account"
                  ? "bg-white text-[#0F4C5C] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Cloud className="size-3.5" /> Account
            </button>
          </div>
        </div>
      </div>

      {/* Render selected tab content */}
      {activeTab === "roles" && <RolesAndAccessView />}

      {activeTab === "general" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Business Profile */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="size-4 text-[#0F4C5C]" /> Shop Profile & Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  disabled={!canManageSettings}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  disabled={!canManageSettings}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] disabled:opacity-60"
                />
              </div>

              <button
                onClick={() =>
                  updateShopMutation.mutate({
                    name: shopName,
                    address: shopAddress,
                    customerNotifications: true,
                    pricingTier: "Normal + Premium",
                  })
                }
                disabled={updateShopMutation.isPending || !canManageSettings}
                className="w-full py-2.5 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl hover:bg-[#0F4C5C]/90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="size-3.5" /> Save Shop Profile
              </button>
              {!canManageSettings && (
                <p className="text-[10px] text-amber-600 font-medium text-center">
                  Editing shop profile requires Admin privileges.
                </p>
              )}
            </div>
          </div>

          {/* Quick Access Overview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="size-4 text-[#0F4C5C]" /> Roles & Access Overview
            </h3>
            <p className="text-xs text-slate-500">
              Role permissions are active. Go to the <strong>Roles & Access</strong> tab to configure staff restrictions, toggle permissions, or test roles.
            </p>

            <button
              onClick={() => setActiveTab("roles")}
              className="w-full py-2.5 bg-slate-50 border border-slate-200 text-[#0F4C5C] text-xs font-bold rounded-xl hover:bg-slate-100 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="size-4" /> Open Roles & Access Control
            </button>
          </div>
        </div>
      )}

      {activeTab === "devices" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Smartphone className="size-4 text-[#0F4C5C]" /> Connected Counter Devices ({devices.length} / 5)
              </h3>
              <p className="text-xs text-slate-500">Authorize up to 5 shop phones/tablets for synchronized billing</p>
            </div>
            <button
              onClick={handleRegisterCurrentDevice}
              disabled={registerDeviceMutation.isPending || devices.length >= 5}
              className="px-3 py-1.5 bg-slate-100 text-[#0F4C5C] text-xs font-semibold rounded-xl hover:bg-slate-200 transition disabled:opacity-50"
            >
              Register This Device
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {devices.map((d: any) => (
              <div key={d.id} className="border border-slate-200 p-3.5 rounded-xl text-xs space-y-1 bg-slate-50/50">
                <p className="font-bold text-slate-800">{d.deviceLabel}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">{d.deviceCode || "Active"}</p>
                <span className="text-emerald-600 font-bold text-[10px] inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Connected
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cloud className="size-4 text-[#0F4C5C]" /> Account & Cloud Sync
          </h3>

          <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="size-11 bg-[#0F4C5C] text-white rounded-full flex items-center justify-center font-bold text-sm">
                {user?.name?.slice(0, 2).toUpperCase() || "FC"}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{user?.name || "Shop Owner"}</p>
                <p className="text-[#0F4C5C] font-mono text-[11px]">{user?.email || "Google Account Connected"}</p>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Role: {role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full mt-2 py-2 border border-slate-200 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-50 transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="size-3.5" /> Sign Out
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cloud className="size-5 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-900">Cloud Sync Active</p>
                <p className="text-[11px] text-emerald-700">Database connected & synced</p>
              </div>
            </div>
            <span className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
