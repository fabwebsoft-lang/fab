import { createHash } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { InsertUser, customers, devices, expenses, orders, shops, users, workers } from "../drizzle/schema";
import { ENV } from './_core/env';

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available, returning fallback user");
    return {
      id: 1,
      openId: openId || "dev-owner-asfaq",
      name: "Ashfaq",
      email: "asfaq94.md@gmail.com",
      loginMethod: "google",
      role: "admin" as const,
      shopRole: "owner" as const,
      shopId: 1,
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function ensureShopForUser(userId: number, name?: string | null, email?: string | null): Promise<number> {
  const db = await getDb();
  if (!db) return 1;

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length > 0 && userRows[0].shopId) {
    return userRows[0].shopId;
  }

  const existingShops = await db.select().from(shops).limit(1);
  let shopId: number;
  if (existingShops.length > 0) {
    shopId = existingShops[0].id;
  } else {
    const shopName = name ? `${name}'s Shop` : "Fabric Care Shop";
    const inserted = await db.insert(shops).values({
      name: shopName,
      pricingTier: "Normal + Premium",
    }).returning();
    shopId = inserted[0].id;
  }

  if (userRows.length > 0) {
    await db.update(users).set({ shopId }).where(eq(users.id, userId));
  }

  return shopId;
}

// In-Memory Fallback State (used when DATABASE_URL is not configured)
let _inMemoryCustomers: any[] = [
  {
    id: 1,
    shopId: 1,
    name: "Anish Sharma",
    phone: "9876543210",
    customerType: "Normal",
    address: "Indiranagar 10th Main",
    alternatePhone: null,
    notes: null,
    storedClothesCode: "C-3210",
    createdAt: new Date(),
  },
  {
    id: 2,
    shopId: 1,
    name: "Priya Patel",
    phone: "9123456789",
    customerType: "Premium",
    address: "Koramangala 4th Block",
    alternatePhone: null,
    notes: "Starch sarees well",
    storedClothesCode: "C-6789",
    createdAt: new Date(),
  },
];

let _inMemoryOrders: any[] = [
  {
    order: {
      id: 1,
      shopId: 1,
      customerId: 1,
      orderNumber: "WP-20260916-001-FC01",
      items: [
        { name: "Shirt", quantity: 2, price: 50, clothTags: ["0001", "0002"] },
        { name: "Pant", quantity: 1, price: 60, clothTags: ["0003"] },
      ],
      serviceType: "Standard Laundry",
      customerType: "Normal",
      deliveryType: "Shop Collection",
      totalAmount: "160.00",
      discount: "0.00",
      amountPaid: "100.00",
      advanceOption: "custom",
      status: "Processing",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    customer: {
      id: 1,
      shopId: 1,
      name: "Anish Sharma",
      phone: "9876543210",
      customerType: "Normal",
      storedClothesCode: "C-3210",
    },
  },
  {
    order: {
      id: 2,
      shopId: 1,
      customerId: 2,
      orderNumber: "WP-20260916-002-FC01",
      items: [
        { name: "Saree", quantity: 1, price: 180, clothTags: ["0004"] },
        { name: "Suit (2-pc)", quantity: 1, price: 250, clothTags: ["0005"] },
      ],
      serviceType: "Premium Dry Clean",
      customerType: "Premium",
      deliveryType: "Home Delivery",
      totalAmount: "430.00",
      discount: "30.00",
      amountPaid: "400.00",
      advanceOption: "full",
      status: "Ready",
      dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    customer: {
      id: 2,
      shopId: 1,
      name: "Priya Patel",
      phone: "9123456789",
      customerType: "Premium",
      storedClothesCode: "C-6789",
    },
  },
];

let _inMemoryExpenses: any[] = [
  {
    id: 1,
    shopId: 1,
    title: "Detergent & Softener Supplies",
    category: "Chemicals & Detergents",
    amount: "1500.00",
    paymentMethod: "UPI",
    expenseDate: new Date(),
    notes: "20L Bulk Liquid Detergent",
  },
];

export function saveInMemoryOrder(orderRecord: any, customerRecord: any) {
  _inMemoryOrders.unshift({
    order: orderRecord,
    customer: customerRecord,
  });
}

export function updateInMemoryOrderStatus(orderNumber: string, status: string, deliveryType?: string) {
  const entry = _inMemoryOrders.find(e => e.order.orderNumber === orderNumber);
  if (entry) {
    entry.order.status = status;
    if (deliveryType) entry.order.deliveryType = deliveryType;
    entry.order.updatedAt = new Date();
    return entry;
  }
  return null;
}

export function settleInMemoryOrderPayment(orderNumber: string, amountPaid: number, deliveryType?: string) {
  const entry = _inMemoryOrders.find(e => e.order.orderNumber === orderNumber);
  if (entry) {
    const total = Number(entry.order.totalAmount);
    const newPaid = Math.min(total, Number(entry.order.amountPaid) + amountPaid);
    entry.order.amountPaid = newPaid.toFixed(2);
    if (newPaid >= total) entry.order.status = "Collected";
    if (deliveryType) entry.order.deliveryType = deliveryType;
    entry.order.updatedAt = new Date();
    return entry;
  }
  return null;
}

export function deleteInMemoryOrder(orderNumber: string) {
  _inMemoryOrders = _inMemoryOrders.filter(e => e.order.orderNumber !== orderNumber);
}

export function createInMemoryExpense(expenseRecord: any) {
  _inMemoryExpenses.unshift(expenseRecord);
  return expenseRecord;
}

export async function listOrders(shopId: number) {
  const db = await getDb();
  if (!db) return _inMemoryOrders;

  const rows = await db
    .select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.shopId, shopId))
    .orderBy(desc(orders.createdAt));

  return rows;
}

export async function createCustomer(
  shopId: number,
  name: string,
  phone: string,
  options?: {
    customerType?: "Normal" | "Premium";
    address?: string | null;
    alternatePhone?: string | null;
    notes?: string | null;
    storedClothesCode?: string;
  }
) {
  const db = await getDb();
  const clothesCode = options?.storedClothesCode || `C-${phone.slice(-4)}`;

  if (!db) {
    const existing = _inMemoryCustomers.find(c => c.phone === phone);
    if (existing) return existing;
    const newCust = {
      id: _inMemoryCustomers.length + 1,
      shopId,
      name,
      phone,
      customerType: options?.customerType || "Normal",
      address: options?.address || null,
      alternatePhone: options?.alternatePhone || null,
      notes: options?.notes || null,
      storedClothesCode: clothesCode,
      createdAt: new Date(),
    };
    _inMemoryCustomers.unshift(newCust);
    return newCust;
  }

  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.shopId, shopId), eq(customers.phone, phone)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db.insert(customers).values({
    shopId,
    name,
    phone,
    customerType: options?.customerType || "Normal",
    address: options?.address || null,
    alternatePhone: options?.alternatePhone || null,
    notes: options?.notes || null,
    storedClothesCode: clothesCode,
  }).returning();

  return inserted[0];
}

export async function listCustomers(shopId: number) {
  const db = await getDb();
  if (!db) return _inMemoryCustomers;

  return db.select().from(customers).where(eq(customers.shopId, shopId));
}

export async function listExpenses(shopId: number) {
  const db = await getDb();
  if (!db) return _inMemoryExpenses;

  return db
    .select()
    .from(expenses)
    .where(eq(expenses.shopId, shopId))
    .orderBy(desc(expenses.expenseDate));
}

export async function getDashboardStats(shopId: number) {
  const db = await getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (!db) {
    const todaysOrders = _inMemoryOrders.filter(e => new Date(e.order.createdAt) >= startOfDay);
    let todaysGarmentCount = 0;
    let todaysSales = 0;
    let todaysCollected = 0;
    let todaysPending = 0;

    todaysOrders.forEach(e => {
      const total = Number(e.order.totalAmount || 0);
      const paid = Number(e.order.amountPaid || 0);
      todaysSales += total;
      todaysCollected += paid;
      todaysPending += Math.max(0, total - paid);

      const items = Array.isArray(e.order.items) ? e.order.items : [];
      items.forEach((item: any) => {
        todaysGarmentCount += Number(item.quantity || 0);
      });
    });

    const todaysExpenses = _inMemoryExpenses
      .filter(exp => new Date(exp.expenseDate) >= startOfDay)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    let totalPending = 0;
    _inMemoryOrders.forEach(e => {
      const total = Number(e.order.totalAmount || 0);
      const paid = Number(e.order.amountPaid || 0);
      if (total > paid) totalPending += total - paid;
    });

    return {
      todaysBillCount: todaysOrders.length,
      todaysGarmentCount,
      todaysSales,
      todaysCollected,
      todaysPending,
      todaysExpenses,
      totalCustomers: _inMemoryCustomers.length,
      totalPending,
    };
  }

  const allOrders = await db.select().from(orders).where(eq(orders.shopId, shopId));
  const todaysOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfDay);
  const todaysExpList = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.shopId, shopId), gte(expenses.expenseDate, startOfDay)));

  const allCust = await db.select().from(customers).where(eq(customers.shopId, shopId));

  const todaysBillCount = todaysOrders.length;
  let todaysGarmentCount = 0;
  let todaysSales = 0;
  let todaysCollected = 0;
  let todaysPending = 0;

  todaysOrders.forEach(o => {
    const total = Number(o.totalAmount || 0);
    const paid = Number(o.amountPaid || 0);
    todaysSales += total;
    todaysCollected += paid;
    todaysPending += Math.max(0, total - paid);

    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      todaysGarmentCount += Number(item.quantity || 0);
    });
  });

  const todaysExpenses = todaysExpList.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCustomers = allCust.length;

  let totalPending = 0;
  allOrders.forEach(o => {
    const total = Number(o.totalAmount || 0);
    const paid = Number(o.amountPaid || 0);
    if (total > paid) {
      totalPending += total - paid;
    }
  });

  return {
    todaysBillCount,
    todaysGarmentCount,
    todaysSales,
    todaysCollected,
    todaysPending,
    todaysExpenses,
    totalCustomers,
    totalPending,
  };
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export async function generateClothTags(shopId: number, itemCount: number): Promise<string[]> {
  const db = await getDb();
  let startCounter = 1;
  if (db) {
    const allOrders = await db.select().from(orders).where(eq(orders.shopId, shopId));
    let totalPieces = 0;
    allOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        totalPieces += Number(item.quantity || 0);
      });
    });
    startCounter = totalPieces + 1;
  }

  const tags: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const num = (startCounter + i).toString().padStart(4, "0");
    tags.push(num);
  }
  return tags;
}

export async function generateBillNumber(shopId: number): Promise<string> {
  const db = await getDb();
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let shopCode = "FC01";
  let countToday = 1;

  if (db) {
    const shopList = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
    if (shopList.length > 0 && shopList[0].shopCode) {
      shopCode = shopList[0].shopCode;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.shopId, shopId), gte(orders.createdAt, startOfDay)));
    countToday = todayOrders.length + 1;
  }

  const nnn = countToday.toString().padStart(3, "0");
  return `WP-${todayStr}-${nnn}-${shopCode}`;
}

export async function listWorkers(shopId: number) {
  const db = await getDb();
  if (!db) {
    return [
      { id: 1, shopId, name: "Shop Owner", role: "owner" as const, active: 1, hasPin: true, createdAt: new Date() },
    ];
  }

  const rows = await db.select().from(workers).where(eq(workers.shopId, shopId));
  if (rows.length === 0) {
    const inserted = await db.insert(workers).values({
      shopId,
      name: "Shop Owner",
      role: "owner",
      active: 1,
    }).returning();
    return inserted.map(w => ({ ...w, hasPin: Boolean(w.pinHash) }));
  }

  return rows.map(w => ({ ...w, hasPin: Boolean(w.pinHash) }));
}

export type WorkerRole = "admin" | "manager" | "staff" | "owner" | "worker";

export async function createWorker(shopId: number, name: string, role: WorkerRole = "staff") {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), shopId, name, role, active: 1, hasPin: false, createdAt: new Date() };
  }

  const inserted = await db.insert(workers).values({ shopId, name, role, active: 1 }).returning();
  return { ...inserted[0], hasPin: Boolean(inserted[0].pinHash) };
}

export async function updateWorkerRole(shopId: number, workerId: number, role: WorkerRole) {
  const db = await getDb();
  if (!db) return { success: true };
  await db.update(workers).set({ role }).where(and(eq(workers.id, workerId), eq(workers.shopId, shopId)));
  return { success: true };
}

export async function deleteWorker(shopId: number, workerId: number) {
  const db = await getDb();
  if (!db) return { success: true };
  await db.delete(workers).where(and(eq(workers.id, workerId), eq(workers.shopId, shopId)));
  return { success: true };
}

export async function setWorkerPin(shopId: number, workerId: number, pin: string) {
  const db = await getDb();
  const pinHash = hashPin(pin);

  if (!db) return { success: true };

  await db.update(workers).set({ pinHash }).where(and(eq(workers.id, workerId), eq(workers.shopId, shopId)));
  return { success: true };
}

export async function verifyWorkerPin(shopId: number, workerId: number, pin: string) {
  const db = await getDb();
  if (!db) return true;

  const target = await db.select().from(workers).where(and(eq(workers.id, workerId), eq(workers.shopId, shopId))).limit(1);
  if (target.length === 0 || !target[0].pinHash) return false;
  return target[0].pinHash === hashPin(pin);
}

export async function listDevices(shopId: number) {
  const db = await getDb();
  if (!db) {
    return [{ id: 1, shopId, deviceLabel: "Primary POS Terminal", lastSeenAt: new Date(), userAgent: "Browser" }];
  }

  return db.select().from(devices).where(eq(devices.shopId, shopId));
}

export async function registerDevice(shopId: number, deviceLabel: string, userAgent?: string) {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), shopId, deviceLabel, lastSeenAt: new Date(), userAgent: userAgent || null };
  }

  const existingDevices = await db.select().from(devices).where(eq(devices.shopId, shopId));
  const activeCount = existingDevices.length;

  const match = existingDevices.find(d => d.deviceLabel.toLowerCase() === deviceLabel.toLowerCase());
  if (match) {
    await db.update(devices).set({ lastSeenAt: new Date(), userAgent: userAgent || null }).where(eq(devices.id, match.id));
    const updated = await db.select().from(devices).where(eq(devices.id, match.id)).limit(1);
    return updated[0];
  }

  if (activeCount >= 5) {
    throw new Error("Maximum 5 active devices allowed per shop");
  }

  const inserted = await db.insert(devices).values({
    shopId,
    deviceLabel,
    userAgent: userAgent || null,
    lastSeenAt: new Date(),
  }).returning();

  return inserted[0];
}

export async function getBusinessStatements(shopId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  if (!db) {
    let totalSales = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let itemsProcessedCount = 0;
    const itemMap: Record<string, { quantity: number; revenue: number }> = {};
    const dailyMap: Record<string, { sales: number; collected: number; expenses: number }> = {};

    _inMemoryOrders.forEach(entry => {
      const o = entry.order;
      const sale = Number(o.totalAmount || 0);
      const paid = Number(o.amountPaid || 0);
      totalSales += sale;
      totalCollected += paid;
      if (sale > paid) totalPending += sale - paid;

      const dateKey = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { sales: 0, collected: 0, expenses: 0 };
      dailyMap[dateKey].sales += sale;
      dailyMap[dateKey].collected += paid;

      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        itemsProcessedCount += qty;
        if (!itemMap[item.name]) itemMap[item.name] = { quantity: 0, revenue: 0 };
        itemMap[item.name].quantity += qty;
        itemMap[item.name].revenue += qty * price;
      });
    });

    let totalExpenses = 0;
    _inMemoryExpenses.forEach(e => {
      const amt = Number(e.amount || 0);
      totalExpenses += amt;
      const dateKey = new Date(e.expenseDate).toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { sales: 0, collected: 0, expenses: 0 };
      dailyMap[dateKey].expenses += amt;
    });

    const netRevenue = totalCollected - totalExpenses;
    const topItems = Object.entries(itemMap)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.revenue - a.revenue);

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, stat]) => ({ date, ...stat, net: stat.collected - stat.expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSales,
      totalCollected,
      totalPending,
      totalExpenses,
      netRevenue,
      orderCount: _inMemoryOrders.length,
      itemsProcessedCount,
      topItems,
      dailyBreakdown,
    };
  }

  const filteredOrders = (await db.select().from(orders).where(eq(orders.shopId, shopId))).filter(
    o => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
  );

  const filteredExpenses = (await db.select().from(expenses).where(eq(expenses.shopId, shopId))).filter(
    e => new Date(e.expenseDate) >= start && new Date(e.expenseDate) <= end
  );

  let totalSales = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let itemsProcessedCount = 0;
  const itemMap: Record<string, { quantity: number; revenue: number }> = {};
  const dailyMap: Record<string, { sales: number; collected: number; expenses: number }> = {};

  filteredOrders.forEach(o => {
    const sale = Number(o.totalAmount || 0);
    const paid = Number(o.amountPaid || 0);
    totalSales += sale;
    totalCollected += paid;
    if (sale > paid) totalPending += sale - paid;

    const dateKey = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!dailyMap[dateKey]) dailyMap[dateKey] = { sales: 0, collected: 0, expenses: 0 };
    dailyMap[dateKey].sales += sale;
    dailyMap[dateKey].collected += paid;

    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      itemsProcessedCount += qty;
      if (!itemMap[item.name]) itemMap[item.name] = { quantity: 0, revenue: 0 };
      itemMap[item.name].quantity += qty;
      itemMap[item.name].revenue += qty * price;
    });
  });

  let totalExpenses = 0;
  filteredExpenses.forEach(e => {
    const amt = Number(e.amount || 0);
    totalExpenses += amt;
    const dateKey = new Date(e.expenseDate).toISOString().slice(0, 10);
    if (!dailyMap[dateKey]) dailyMap[dateKey] = { sales: 0, collected: 0, expenses: 0 };
    dailyMap[dateKey].expenses += amt;
  });

  const netRevenue = totalCollected - totalExpenses;
  const topItems = Object.entries(itemMap)
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.revenue - a.revenue);

  const dailyBreakdown = Object.entries(dailyMap)
    .map(([date, stat]) => ({ date, ...stat }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSales,
    totalCollected,
    totalPending,
    totalExpenses,
    netRevenue,
    orderCount: filteredOrders.length,
    itemsProcessedCount,
    topItems,
    dailyBreakdown,
  };
}
