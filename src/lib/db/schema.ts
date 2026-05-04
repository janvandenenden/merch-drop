import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const dropStatusEnum = pgEnum("drop_status", [
  "pre_live",
  "live",
  "paused",
  "closed",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "submitted",
  "shipped",
  "cancelled",
]);

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const ORDER_TRANSITIONS = {
  pending:   ["paid", "cancelled"],
  paid:      ["submitted", "cancelled"],
  submitted: ["shipped", "cancelled"],
  shipped:   [],
  cancelled: [],
} satisfies Record<OrderStatus, OrderStatus[]>;

export const drop = pgTable(
  "drop",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    supportEmail: text("support_email").notNull(),
    markupCents: integer("markup_cents").notNull(),
    shirtColor: text("shirt_color").notNull().default("white"),
    status: dropStatusEnum("status").notNull().default("pre_live"),
    designFileKey: text("design_file_key"),
    printFileKey: text("print_file_key"),
    mockupUrl: text("mockup_url"),
    mockupKey: text("mockup_key"),
    placement: json("placement").$type<{ x: number; y: number; scale: number; rotate: number }>(),
    firstSaleAt: timestamp("first_sale_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.slug)]
);

export const order = pgTable("order", {
  id: uuid("id").primaryKey().defaultRandom(),
  dropId: uuid("drop_id").notNull(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  printfulOrderId: text("printful_order_id"),
  trackingNumber: text("tracking_number"),
  status: orderStatusEnum("status").notNull().default("pending"),
  size: text("size").notNull(),
  shippingAddress: json("shipping_address").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  totalCents: integer("total_cents").notNull(),
  markupCents: integer("markup_cents").notNull(),
  fulfillmentCents: integer("fulfillment_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  refundedAt: timestamp("refunded_at"),
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at"),
  shippingEmailSentAt: timestamp("shipping_email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// BetterAuth user extension — add these columns to the BetterAuth-managed user table
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  slug: text("slug").unique(),
  stripeAccountId: text("stripe_account_id"),
  chargesEnabled: boolean("charges_enabled").notNull().default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
