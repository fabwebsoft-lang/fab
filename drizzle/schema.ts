import { integer, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  clothTags?: string[];
};

export const roleEnum = pgEnum("role", ["user", "admin", "manager", "staff"]);
export const shopRoleEnum = pgEnum("shopRole", ["owner", "manager", "staff"]);
export const customerTypeEnum = pgEnum("customerType", ["Normal", "Premium"]);
export const advanceOptionEnum = pgEnum("advanceOption", ["full", "half", "none", "custom"]);
export const deliveryTypeEnum = pgEnum("deliveryType", ["Shop Collection", "Home Delivery"]);
export const orderStatusEnum = pgEnum("orderStatus", ["Received", "Processing", "Ready", "Collected"]);
export const workerRoleEnum = pgEnum("workerRole", ["admin", "manager", "staff", "owner", "worker"]);

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  shopCode: varchar("shopCode", { length: 10 }).notNull().default("FC01"),
  address: varchar("address", { length: 320 }),
  customerNotifications: integer("customerNotifications").notNull().default(1),
  pricingTier: varchar("pricingTier", { length: 80 }).notNull().default("Normal + Premium"),
  lastBackupAt: timestamp("lastBackupAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  shopId: integer("shopId").references(() => shops.id),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  shopRole: shopRoleEnum("shopRole").default("owner").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull().references(() => shops.id),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  customerType: customerTypeEnum("customerType").default("Normal").notNull(),
  address: varchar("address", { length: 320 }),
  alternatePhone: varchar("alternatePhone", { length: 40 }),
  notes: text("notes"),
  storedClothesCode: varchar("storedClothesCode", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  shopPhoneIdx: uniqueIndex("customers_shop_phone_idx").on(table.shopId, table.phone),
  shopClothesCodeIdx: uniqueIndex("customers_shop_code_idx").on(table.shopId, table.storedClothesCode),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull().references(() => shops.id),
  customerId: integer("customerId").notNull().references(() => customers.id),
  orderNumber: varchar("orderNumber", { length: 60 }).notNull().unique(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  serviceType: varchar("serviceType", { length: 120 }).notNull(),
  customerType: customerTypeEnum("customerType").default("Normal").notNull(),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  amountPaid: numeric("amountPaid", { precision: 10, scale: 2 }).notNull().default("0.00"),
  advanceOption: advanceOptionEnum("advanceOption").default("none").notNull(),
  deliveryType: deliveryTypeEnum("deliveryType"),
  status: orderStatusEnum("status").notNull().default("Received"),
  dueAt: timestamp("dueAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull().references(() => shops.id),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 80 }).notNull(),
  expenseDate: timestamp("expenseDate", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull().references(() => shops.id),
  name: varchar("name", { length: 160 }).notNull(),
  role: workerRoleEnum("role").default("staff").notNull(),
  pinHash: varchar("pinHash", { length: 128 }),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull().references(() => shops.id),
  deviceLabel: varchar("deviceLabel", { length: 160 }).notNull(),
  userAgent: text("userAgent"),
  lastSeenAt: timestamp("lastSeenAt", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type Device = typeof devices.$inferSelect;
