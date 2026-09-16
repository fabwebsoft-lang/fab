import { COOKIE_NAME } from "../shared/const";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { customers, expenses, orders, shops } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const statusSchema = z.enum(["Received", "Processing", "Ready", "Collected"]);
const customerTypeSchema = z.enum(["Normal", "Premium"]);
const deliveryTypeSchema = z.enum(["Shop Collection", "Home Delivery"]);

const orderItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  clothTags: z.array(z.string()).optional(),
});

function formatMoney(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatDue(value: Date) {
  const today = new Date();
  const sameDay = value.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = value.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";
  return `${value.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

function toUiOrder(row: Awaited<ReturnType<typeof db.listOrders>>[number]) {
  const total = Number(row.order.totalAmount);
  const paid = Number(row.order.amountPaid);
  const discount = Number(row.order.discount || 0);
  const items = Array.isArray(row.order.items) ? (row.order.items as any[]) : [];
  const totalItemCount = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  const initials = row.customer.name.trim().split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
  const allClothTags = items.flatMap((i: any) => (i.clothTags || []) as string[]);

  return {
    id: row.order.orderNumber,
    customer: row.customer.name,
    phone: row.customer.phone,
    customerType: row.order.customerType || row.customer.customerType || "Normal",
    clothesCode: row.customer.storedClothesCode,
    items: `${totalItemCount} items · ${row.order.serviceType}`,
    amount: formatMoney(total),
    balance: paid >= total ? "Paid" : `${formatMoney(total - paid)} due`,
    status: row.order.status,
    deliveryType: row.order.deliveryType || null,
    due: formatDue(new Date(row.order.dueAt)),
    initials,
    accent: "#0F4C5C",
    totalAmount: total,
    amountPaid: paid,
    discount,
    clothTags: allClothTags,
    structuredItems: items,
    createdAt: new Date(row.order.createdAt).toISOString(),
    updatedAt: new Date(row.order.updatedAt).toISOString(),
  };
}

async function getShopId(user: { id: number; name: string | null; email: string | null }) {
  return db.ensureShopForUser(user.id, user.name, user.email);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const shopId = await getShopId(ctx.user);
      const rows = await db.listOrders(shopId);
      return rows.map(toUiOrder);
    }),
    create: protectedProcedure.input(z.object({
      customerName: z.string().min(1),
      phone: z.string().min(1),
      customerType: customerTypeSchema.default("Normal"),
      address: z.string().optional(),
      alternatePhone: z.string().optional(),
      notes: z.string().optional(),
      storedClothesCode: z.string().optional(),
      items: z.array(orderItemSchema).min(1),
      serviceType: z.string().min(1),
      totalAmount: z.number().positive(),
      discount: z.number().nonnegative().default(0),
      amountPaid: z.number().nonnegative().default(0),
      advanceOption: z.enum(["full", "half", "none", "custom"]).default("none"),
      dueAt: z.string().datetime().optional(),
    })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const customer = await db.createCustomer(shopId, input.customerName, input.phone, {
        customerType: input.customerType,
        address: input.address,
        alternatePhone: input.alternatePhone,
        notes: input.notes,
        storedClothesCode: input.storedClothesCode,
      });

      const totalItemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);
      const tags = await db.generateClothTags(shopId, totalItemCount);

      let tagIdx = 0;
      const itemsWithTags = input.items.map(item => {
        const itemTags: string[] = [];
        for (let q = 0; q < item.quantity; q++) {
          if (tags[tagIdx]) itemTags.push(tags[tagIdx++]);
        }
        return {
          ...item,
          clothTags: itemTags,
        };
      });

      const orderNumber = await db.generateBillNumber(shopId);
      const dueAt = input.dueAt ? new Date(input.dueAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const database = await db.getDb();
      if (!database) {
        const orderRecord = {
          id: Date.now(),
          shopId,
          customerId: customer.id,
          orderNumber,
          items: itemsWithTags,
          serviceType: input.serviceType,
          customerType: input.customerType,
          deliveryType: null,
          totalAmount: input.totalAmount.toFixed(2),
          discount: input.discount.toFixed(2),
          amountPaid: input.amountPaid.toFixed(2),
          advanceOption: input.advanceOption,
          status: "Received" as const,
          dueAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.saveInMemoryOrder(orderRecord, customer);
        return toUiOrder({ order: orderRecord as any, customer: customer as any });
      }

      await database.insert(orders).values({
        shopId,
        customerId: customer.id,
        orderNumber,
        items: itemsWithTags,
        serviceType: input.serviceType,
        customerType: input.customerType,
        totalAmount: input.totalAmount.toFixed(2),
        discount: input.discount.toFixed(2),
        amountPaid: input.amountPaid.toFixed(2),
        advanceOption: input.advanceOption,
        status: "Received",
        dueAt,
      });

      const created = await db.listOrders(shopId);
      const row = created.find(entry => entry.order.orderNumber === orderNumber);
      if (!row) throw new Error("Created order could not be loaded");
      return toUiOrder(row);
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.string(),
      status: statusSchema,
      deliveryType: deliveryTypeSchema.optional(),
    })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        const entry = db.updateInMemoryOrderStatus(input.id, input.status, input.deliveryType);
        if (!entry) throw new Error("Order not found");
        return toUiOrder(entry);
      }

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.deliveryType) {
        updateData.deliveryType = input.deliveryType;
      }

      await database.update(orders).set(updateData).where(and(eq(orders.shopId, shopId), eq(orders.orderNumber, input.id)));
      const row = (await db.listOrders(shopId)).find(entry => entry.order.orderNumber === input.id);
      if (!row) throw new Error("Order not found");
      return toUiOrder(row);
    }),
    settlePayment: protectedProcedure.input(z.object({
      id: z.string(),
      amountPaid: z.number().nonnegative(),
      deliveryType: deliveryTypeSchema.optional(),
    })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        const entry = db.settleInMemoryOrderPayment(input.id, input.amountPaid, input.deliveryType);
        if (!entry) throw new Error("Order not found");
        return toUiOrder(entry);
      }

      const existing = (await db.listOrders(shopId)).find(e => e.order.orderNumber === input.id);
      if (!existing) throw new Error("Order not found");

      const total = Number(existing.order.totalAmount);
      const newPaid = Math.min(total, Number(existing.order.amountPaid) + input.amountPaid);
      const newStatus = newPaid >= total ? "Collected" : existing.order.status;

      const updateData: Record<string, unknown> = {
        amountPaid: newPaid.toFixed(2),
        status: newStatus,
      };
      if (input.deliveryType) {
        updateData.deliveryType = input.deliveryType;
      }

      await database.update(orders).set(updateData).where(and(eq(orders.shopId, shopId), eq(orders.orderNumber, input.id)));
      const updatedRow = (await db.listOrders(shopId)).find(entry => entry.order.orderNumber === input.id);
      if (!updatedRow) throw new Error("Order not found");
      return toUiOrder(updatedRow);
    }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        db.deleteInMemoryOrder(input.id);
        return { success: true } as const;
      }
      await database.delete(orders).where(and(eq(orders.shopId, shopId), eq(orders.orderNumber, input.id)));
      return { success: true } as const;
    }),
  }),

  customers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const shopId = await getShopId(ctx.user);
      const custs = await db.listCustomers(shopId);
      const allOrders = await db.listOrders(shopId);

      return custs.map(c => {
        const userOrders = allOrders.filter(o => o.customer.id === c.id);
        const totalSpent = userOrders.reduce((sum, o) => sum + Number(o.order.totalAmount), 0);
        const totalPaid = userOrders.reduce((sum, o) => sum + Number(o.order.amountPaid), 0);
        const pendingBalance = Math.max(0, totalSpent - totalPaid);

        return {
          ...c,
          orderCount: userOrders.length,
          totalSpent: formatMoney(totalSpent),
          pendingBalance: pendingBalance > 0 ? formatMoney(pendingBalance) : "Paid",
          pendingBalanceRaw: pendingBalance,
        };
      });
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      customerType: customerTypeSchema.optional(),
      address: z.string().optional(),
      alternatePhone: z.string().optional(),
      notes: z.string().optional(),
      storedClothesCode: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      return db.createCustomer(shopId, input.name, input.phone, {
        customerType: input.customerType,
        address: input.address,
        alternatePhone: input.alternatePhone,
        notes: input.notes,
        storedClothesCode: input.storedClothesCode,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
      phone: z.string().min(1),
      customerType: customerTypeSchema.optional(),
      address: z.string().optional(),
      alternatePhone: z.string().optional(),
      notes: z.string().optional(),
      storedClothesCode: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        return {
          id: input.id,
          shopId,
          name: input.name,
          phone: input.phone,
          customerType: input.customerType || "Normal",
          address: input.address || null,
          alternatePhone: input.alternatePhone || null,
          notes: input.notes || null,
          storedClothesCode: input.storedClothesCode || `C-${input.phone.slice(-4)}`,
          createdAt: new Date(),
        };
      }

      const updateData: Record<string, unknown> = {
        name: input.name,
        phone: input.phone,
      };
      if (input.customerType) updateData.customerType = input.customerType;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.alternatePhone !== undefined) updateData.alternatePhone = input.alternatePhone;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.storedClothesCode) updateData.storedClothesCode = input.storedClothesCode;

      await database.update(customers).set(updateData).where(and(eq(customers.id, input.id), eq(customers.shopId, shopId)));
      const updated = await database.select().from(customers).where(eq(customers.id, input.id)).limit(1);
      return updated[0];
    }),
  }),

  expenses: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listExpenses(await getShopId(ctx.user))),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      category: z.string().min(1),
      amount: z.number().positive(),
      paymentMethod: z.string().min(1),
      expenseDate: z.string().datetime(),
      notes: z.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        const exp = {
          id: Date.now(),
          shopId,
          title: input.title,
          category: input.category,
          amount: input.amount.toFixed(2),
          paymentMethod: input.paymentMethod,
          expenseDate: new Date(input.expenseDate),
          notes: input.notes ?? null,
          createdAt: new Date(),
        };
        return db.createInMemoryExpense(exp);
      }
      const inserted = await database.insert(expenses).values({ shopId, title: input.title, category: input.category, amount: input.amount.toFixed(2), paymentMethod: input.paymentMethod, expenseDate: new Date(input.expenseDate), notes: input.notes ?? null }).returning();
      return inserted[0];
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        return { success: true } as const;
      }
      await database.delete(expenses).where(and(eq(expenses.shopId, shopId), eq(expenses.id, input.id)));
      return { success: true } as const;
    }),
  }),

  workers: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listWorkers(await getShopId(ctx.user))),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      role: z.enum(["admin", "manager", "staff", "owner", "worker"]).default("staff"),
    })).mutation(async ({ ctx, input }) => db.createWorker(await getShopId(ctx.user), input.name, input.role)),
    updateRole: protectedProcedure.input(z.object({
      workerId: z.number().int().positive(),
      role: z.enum(["admin", "manager", "staff", "owner", "worker"]),
    })).mutation(async ({ ctx, input }) => db.updateWorkerRole(await getShopId(ctx.user), input.workerId, input.role)),
    delete: protectedProcedure.input(z.object({
      workerId: z.number().int().positive(),
    })).mutation(async ({ ctx, input }) => db.deleteWorker(await getShopId(ctx.user), input.workerId)),
    setPin: protectedProcedure.input(z.object({
      workerId: z.number().int().positive(),
      pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits"),
    })).mutation(async ({ ctx, input }) => db.setWorkerPin(await getShopId(ctx.user), input.workerId, input.pin)),
    verifyPin: protectedProcedure.input(z.object({
      workerId: z.number().int().positive(),
      pin: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const valid = await db.verifyWorkerPin(await getShopId(ctx.user), input.workerId, input.pin);
      return { success: valid };
    }),
  }),

  devices: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listDevices(await getShopId(ctx.user))),
    register: protectedProcedure.input(z.object({
      deviceLabel: z.string().min(1),
      userAgent: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await db.registerDevice(await getShopId(ctx.user), input.deviceLabel, input.userAgent);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err.message || "Could not register device",
        });
      }
    }),
  }),

  reports: router({
    businessStatements: protectedProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getBusinessStatements(await getShopId(ctx.user), input?.startDate, input?.endDate);
    }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => db.getDashboardStats(await getShopId(ctx.user))),
  }),

  shops: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        return [{
          id: shopId,
          name: "Indiranagar shop",
          address: "Indiranagar, Bengaluru",
          customerNotifications: 1,
          pricingTier: "Normal + Premium",
          shopCode: "FC01",
          lastBackupAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
      }
      return database.select().from(shops).where(eq(shops.id, shopId));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().min(1), address: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        return { id: shopId, name: input.name, address: input.address ?? null, customerNotifications: 1, pricingTier: "Normal + Premium", shopCode: "FC01", lastBackupAt: null, createdAt: new Date(), updatedAt: new Date() };
      }
      await database.update(shops).set({ name: input.name, address: input.address ?? null }).where(eq(shops.id, shopId));
      const updated = await database.select().from(shops).where(eq(shops.id, shopId));
      return updated[0];
    }),
    updateSettings: protectedProcedure.input(z.object({ name: z.string().min(1), address: z.string().min(1), customerNotifications: z.boolean(), pricingTier: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      if (!database) {
        return { id: shopId, name: input.name, address: input.address, customerNotifications: input.customerNotifications ? 1 : 0, pricingTier: input.pricingTier, shopCode: "FC01", lastBackupAt: null, createdAt: new Date(), updatedAt: new Date() };
      }
      await database.update(shops).set({ name: input.name, address: input.address, customerNotifications: input.customerNotifications ? 1 : 0, pricingTier: input.pricingTier }).where(eq(shops.id, shopId));
      const updated = await database.select().from(shops).where(eq(shops.id, shopId));
      return updated[0];
    }),
    recordBackup: protectedProcedure.mutation(async ({ ctx }) => {
      const shopId = await getShopId(ctx.user);
      const database = await db.getDb();
      const lastBackupAt = new Date();
      if (database) {
        await database.update(shops).set({ lastBackupAt }).where(eq(shops.id, shopId));
      }
      return { lastBackupAt };
    }),
  }),
});

export type AppRouter = typeof appRouter;

