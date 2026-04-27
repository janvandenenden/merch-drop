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
  "closed",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "submitted",
  "shipped",
  "cancelled",
]);

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
    placement: json("placement").$type<{ x: number; y: number; scale: number }>(),
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
  status: orderStatusEnum("status").notNull().default("pending"),
  size: text("size").notNull(),
  shippingAddress: json("shipping_address").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  totalCents: integer("total_cents").notNull(),
  markupCents: integer("markup_cents").notNull(),
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
