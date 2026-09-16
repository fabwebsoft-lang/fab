import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export type UserRole = "admin" | "manager" | "staff";

export interface RolePermissions {
  canViewReports: boolean;
  canDeleteOrders: boolean;
  canDeleteExpenses: boolean;
  canDeleteCustomers: boolean;
  canManageSettings: boolean;
  canManageRoles: boolean;
  canCreateOrders: boolean;
  canUpdateOrderStatus: boolean;
  canSettlePayments: boolean;
  canRecordExpenses: boolean;
}

export const ROLE_DEFINITIONS: Record<
  UserRole,
  {
    name: string;
    description: string;
    badgeColor: string;
    permissions: RolePermissions;
  }
> = {
  admin: {
    name: "Admin (Shop Owner)",
    description: "Full master access across all business operations, financial reports, shop settings, and staff role management.",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    permissions: {
      canViewReports: true,
      canDeleteOrders: true,
      canDeleteExpenses: true,
      canDeleteCustomers: true,
      canManageSettings: true,
      canManageRoles: true,
      canCreateOrders: true,
      canUpdateOrderStatus: true,
      canSettlePayments: true,
      canRecordExpenses: true,
    },
  },
  manager: {
    name: "Store Manager",
    description: "Operational management: manage staff, billing, counter devices, and delete erroneous orders. Financial reports are hidden.",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    permissions: {
      canViewReports: false,
      canDeleteOrders: true,
      canDeleteExpenses: true,
      canDeleteCustomers: true,
      canManageSettings: false,
      canManageRoles: false,
      canCreateOrders: true,
      canUpdateOrderStatus: true,
      canSettlePayments: true,
      canRecordExpenses: true,
    },
  },
  staff: {
    name: "Counter Staff",
    description: "Front-desk operations: create bills, update laundry statuses, and collect dues. Deletion and financial reports are restricted.",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    permissions: {
      canViewReports: false,
      canDeleteOrders: false,
      canDeleteExpenses: false,
      canDeleteCustomers: false,
      canManageSettings: false,
      canManageRoles: false,
      canCreateOrders: true,
      canUpdateOrderStatus: true,
      canSettlePayments: true,
      canRecordExpenses: true,
    },
  },
};

interface AccessControlContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  permissions: RolePermissions;
  canViewReports: boolean;
  canDelete: boolean;
  canManageSettings: boolean;
  canManageRoles: boolean;
  isSimulating: boolean;
  resetToAuthRole: () => void;
}

const AccessControlContext = createContext<AccessControlContextType | undefined>(undefined);

const STORAGE_KEY = "fabriccare_active_role";

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Default to stored role, or user's auth role, or "admin"
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "admin" || saved === "manager" || saved === "staff") {
      return saved;
    }
    if (user?.role === "admin") return "admin";
    return "admin"; // Default admin for development/owner
  });

  const [isSimulating, setIsSimulating] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setIsSimulating(true);
    localStorage.setItem(STORAGE_KEY, newRole);
  };

  const resetToAuthRole = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsSimulating(false);
    setRoleState((user?.role as UserRole) || "admin");
  };

  const permissions = ROLE_DEFINITIONS[role].permissions;

  return (
    <AccessControlContext.Provider
      value={{
        role,
        setRole,
        permissions,
        canViewReports: permissions.canViewReports,
        canDelete: permissions.canDeleteOrders,
        canManageSettings: permissions.canManageSettings,
        canManageRoles: permissions.canManageRoles,
        isSimulating,
        resetToAuthRole,
      }}
    >
      {children}
    </AccessControlContext.Provider>
  );
}

export function useAccessControl() {
  const context = useContext(AccessControlContext);
  if (!context) {
    throw new Error("useAccessControl must be used within an AccessControlProvider");
  }
  return context;
}
