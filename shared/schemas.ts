import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, type InferModel } from "drizzle-orm";

// Users table definition - moved to top
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
  lastSeen: timestamp("last_seen"),
  used_free_ad: integer("used_free_ad").default(0),
  profileImage: text("profile_image"),
  profileVisibility: boolean("profile_visibility").default(true),
  gender: text("gender").default("unspecified"),
  age: integer("age"),
  city: text("city"),
  aboutMe: text("about_me"),
  avatar: text("avatar"),
  yuksekUye: boolean("yuksek_uye").default(false),
  status: boolean("status").default(true),
  phone: text("phone"),
  ip_address: text("ip_address"),
});

// Categories table definition
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  slug: text("slug").notNull().unique(),
  order: integer("order").notNull().default(0),
  customTitle: text("custom_title"),
  metaDescription: text("meta_description"),
  content: text("content"),
  faqs: text("faqs"),
} as const);

// Single categoriesRelations definition
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  listings: many(listings),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parentCategory",
  }),
  children: many(categories, {
    relationName: "childCategories",
  }),
}));

// Type definitions
export type Category = InferModel<typeof categories, "select">;
export type InsertCategory = InferModel<typeof categories, "insert">;

// Kategori ilişkilerini tanımlayan helper fonksiyon güncellendi (removed duplicate)

//favorites table
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  listingId: integer("listing_id")
    .references(() => listings.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const admin_users = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  images: text("images").array(),
  listingType: text("listing_type").notNull().default("standard"),
  paymentStatus: text("payment_status"),
  approved: boolean("approved").default(false),
  userId: integer("user_id").references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").default(true),
  user_ip: text("user_ip"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id")
    .references(() => listings.id)
    .notNull(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    senderId: integer("sender_id")
      .references(() => users.id)
      .notNull(),
    receiverId: integer("receiver_id").references(() => users.id),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    sender_ip: text("sender_ip"),
    files: text("files").array(),
    fileTypes: text("file_types").array(),
  },
  (table) => ({
    conversationIdIdx: index("message_conversation_id_idx").on(
      table.conversationId,
    ),
    senderIdIdx: index("message_sender_id_idx").on(table.senderId),
    receiverIdIdx: index("message_receiver_id_idx").on(table.receiverId),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings, { relationName: "userListings" }),
  sentMessages: many(messages, { relationName: "sender" }),
  sentConversations: many(conversations, { relationName: "sender" }),
  receivedConversations: many(conversations, { relationName: "receiver" }),
  favorites: many(favorites, { relationName: "userFavorites" }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [favorites.listingId],
    references: [listings.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  user: one(users, {
    fields: [listings.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    listing: one(listings, {
      fields: [conversations.listingId],
      references: [listings.id],
    }),
    sender: one(users, {
      fields: [conversations.senderId],
      references: [users.id],
    }),
    receiver: one(users, {
      fields: [conversations.receiverId],
      references: [users.id],
    }),
    messages: many(messages),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type AdminUser = typeof admin_users.$inferSelect;
export type InsertAdminUser = typeof admin_users.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;


export const payment_settings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  premium_listing_price: integer("premium_listing_price").notNull().default(0),
  listing_duration: integer("listing_duration").notNull().default(30),
  premium_member_price: integer("premium_member_price").notNull().default(0),
  default_payment_gateway: text("default_payment_gateway")
    .notNull()
    .default("paytr"),
  paytr_merchant_id: text("paytr_merchant_id"),
  paytr_secret_key: text("paytr_secret_key"),
  paytr_merchant_key: text("paytr_merchant_key"),
  paytr_sandbox: boolean("paytr_sandbox").default(true),
  iyzico_api_key: text("iyzico_api_key"),
  iyzico_secret_key: text("iyzico_secret_key"),
  iyzico_base_url: text("iyzico_base_url").default(
    "https://sandbox-api.iyzipay.com",
  ),
  stripe_public_key: text("stripe_public_key"),
  stripe_secret_key: text("stripe_secret_key"),
  stripe_webhook_secret: text("stripe_webhook_secret"),
  stripe_currency: text("stripe_currency").default("try"),
  updated_at: timestamp("updated_at").defaultNow(),
  updated_by: integer("updated_by").references(() => users.id),
});

export type PaymentSettings = typeof payment_settings.$inferSelect;
export type InsertPaymentSettings = typeof payment_settings.$inferInsert;

export const insertPaymentSettingsSchema = createInsertSchema(
  payment_settings,
  {
    premium_listing_price: z.number().min(0, "Fiyat 0'dan küçük olamaz"),
    listing_duration: z.number().min(1, "Süre en az 1 gün olmalıdır"),
    premium_member_price: z.number().min(0, "Fiyat 0'dan küçük olamaz"),
    default_payment_gateway: z.enum(["paytr", "iyzico", "stripe"], {
      required_error: "Lütfen ödeme altyapısı seçiniz",
      invalid_type_error: "Geçersiz ödeme altyapısı",
    }),
  },
);

export const insertUserSchema = createInsertSchema(users, {
  username: z
    .string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalıdır")
    .max(20, "Kullanıcı adı en fazla 20 karakter olabilir")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir",
    ),
  email: z
    .string()
    .email("Geçerli bir email adresi giriniz")
    .min(5, "Email adresi çok kısa")
    .max(50, "Email adresi çok uzun"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  gender: z.enum(["male", "female", "unspecified"], {
    required_error: "Lütfen cinsiyet seçiniz",
    invalid_type_error: "Lütfen cinsiyet seçiniz",
  }),
  age: z
    .number()
    .min(18, "Yaş en az 18 olmalıdır")
    .max(90, "Yaş en fazla 90 olabilir")
    .optional(),
  city: z.string().optional(),
  aboutMe: z
    .string()
    .max(1000, "Hakkımda yazısı en fazla 1000 karakter olabilir")
    .optional(),
  profileVisibility: z.boolean().optional(),
  profileImage: z.string().optional(),
  ip_address: z.string().optional(),
});

export const insertListingSchema = createInsertSchema(listings, {
  title: z
    .string()
    .min(10, "Başlık en az 10 karakter olmalıdır")
    .max(100, "Başlık en fazla 100 karakter olabilir"),
  description: z.string().min(30, "Açıklama en az 30 karakter olmalıdır"),
  city: z.string(),
  categoryId: z.number(),
  listingType: z.enum(["standard", "premium"]),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1, "Mesaj içeriği boş olamaz"),
  files: z.array(z.string()).optional(),
  fileTypes: z.array(z.string()).optional(),
});
export const insertFavoriteSchema = createInsertSchema(favorites);