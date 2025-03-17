import {
  users,
  type User,
  type InsertUser,
  type Listing,
  type Category,
  type Conversation,
  type Message,
  type Favorite,
  listings,
  categories,
  conversations,
  messages,
  favorites,
  admin_users,
} from "../../shared/schemas";
import { db } from "../../shared/db";
import { eq, and, gte, ilike, sql, or, inArray, ne, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "../../shared/db";
import { getMessageFileUrl, getMessageFilesUrls, getListingImageUrl, getListingImagesUrls } from "./r2";
import { randomBytes } from "crypto";
import { SQL } from "drizzle-orm";
import { imageService } from "./image-service";

interface MessageDeleteEvent {
  messageId: number;
  conversationId: number;
  deletedAt: Date;
}

interface AdminUser {
  id: number;
  username: string;
  password: string;
  createdAt: Date;
  type: "admin";
}

interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(userId: number): Promise<void>;
  getListing(listingId: number, userId?: number): Promise<Listing | undefined>;
  getListingsByCategory(
    categoryId: number,
    city?: string,
    search?: string,
    limit?: number,
    offset?: number
  ): Promise<{ listings: Listing[]; total: number }>;
  getUserListings(userId: number): Promise<Listing[]>;
  createListing(
    insertListing: Omit<Listing, "id" | "createdAt">
  ): Promise<Listing>;
  getCategories(): Promise<Category[]>;
  getAllUsers(): Promise<User[]>;
  getAllListings(): Promise<Listing[]>;
  getListingsByStatusPaginated(
    approved: boolean,
    active: boolean,
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ data: Listing[]; total: number }>;
  deleteListing(listingId: number, userId?: number): Promise<void>;
  updateListing(
    listingId: number,
    userId: number,
    updates: Partial<Listing>
  ): Promise<Listing>;
  updateUser(userId: number, updates: Partial<User>): Promise<User>;
  updateListingStatus(listingId: number, approved: boolean): Promise<void>;
  getPriorityListings(): Promise<Listing[]>;
  getNewUsers(since: Date): Promise<User[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;
  findConversation(
    listingId: number,
    senderId: number,
    receiverId: number
  ): Promise<Conversation | undefined>;
  createConversation(
    listingId: number,
    senderId: number,
    receiverId: number
  ): Promise<Conversation>;
  createMessage(
    conversationId: number,
    senderId: number,
    content: string,
    sender_ip?: string,
    files?: string[],
    fileTypes?: string[]
  ): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;
  updateUserLastSeen(userId: number): Promise<void>;
  deleteUser(userId: number): Promise<void>;
  deleteMessage(messageId: number, userId: number): Promise<MessageDeleteEvent>;
  getMessageEvents(
    conversationId: number,
    since: Date
  ): Promise<MessageDeleteEvent[]>;
  clearVerificationToken(userId: number): Promise<void>;
  createPasswordResetToken(email: string): Promise<string>;
  verifyPasswordResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: number, newPassword: string): Promise<void>;
  clearPasswordResetToken(userId: number): Promise<void>;
  addToFavorites(userId: number, listingId: number): Promise<Favorite>;
  removeFromFavorites(userId: number, listingId: number): Promise<void>;
  getUserFavorites(userId: number): Promise<Listing[]>;
  isFavorite(userId: number, listingId: number): Promise<boolean>;
  updateUserProfile(userId: number, updates: Partial<User>): Promise<User>;
  activateListing(listingId: number, userId: number): Promise<void>;
  deactivateListing(listingId: number, userId: number): Promise<void>;
  canUserModifyListingStatus(
    listingId: number,
    userId: number
  ): Promise<boolean>;
  getAdminByUsername(username: string): Promise<AdminUser | null>;
  getAdmin(id: number): Promise<AdminUser | null>;
  // Kategori işlemleri için yeni metodlar
  createCategory(category: Omit<Category, "id">): Promise<Category>;
  updateCategory(id: number, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  reorderCategories(
    updates: Array<{ id: number; order: number; parentId: number | null }>
  ): Promise<Category[]>;
}

const PostgresqlStore = connectPg(session);

const createSearchCondition = (search: string | undefined) => {
  if (!search) return undefined;
  return or(
    ilike(listings.title, `%${search}%`),
    ilike(listings.description, `%${search}%`)
  );
};

const createOrderByClause = (
  sortBy: string | undefined,
  sortOrder: "asc" | "desc" | undefined
) => {
  if (!sortBy || !(sortBy in listings)) {
    return sql`created_at ${sortOrder === "desc" ? sql`DESC` : sql`ASC`}`;
  }
  return sql`${listings[sortBy as keyof typeof listings]} ${
    sortOrder === "desc" ? sql`DESC` : sql`ASC`
  }`;
};

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresqlStore({
      pool,
      tableName: "session",
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Creating user with data:", insertUser);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date(),
        ip_address: insertUser.ip_address || null,
      })
      .returning();
    console.log("Created user:", user);
    return user;
  }

  async verifyUser(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
      })
      .where(eq(users.id, userId));
  }

  async getListing(
    listingId: number,
    userId?: number
  ): Promise<Listing | undefined> {
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });

    if (!listing) {
      console.log("Listing not found:", listingId);
      return undefined;
    }

    if (userId && listing.userId === userId) {
      if (listing.images) {
        console.log("Original images:", listing.images);
        listing.images = getListingImagesUrls(listing.images);
        console.log("Transformed images:", listing.images);
      }
      return listing;
    }

    if (listing.approved && listing.active) {
      if (listing.images) {
        listing.images = getListingImagesUrls(listing.images);
      }
      return listing;
    }

    return listing.userId === userId ? listing : undefined;
  }

  async getListingsByCategory(
    categoryId: number,
    city?: string,
    search?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ listings: Listing[]; total: number }> {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    const subCategories =
      category?.parentId === null
        ? await db
            .select()
            .from(categories)
            .where(eq(categories.parentId, categoryId))
        : [];

    const categoryIds =
      subCategories.length > 0
        ? [categoryId, ...subCategories.map((c) => c.id)]
        : [categoryId];

    const conditions: SQL<unknown>[] = [
      inArray(listings.categoryId, categoryIds),
      eq(listings.approved, true),
      eq(listings.active, true),
    ];

    if (city) {
      conditions.push(eq(listings.city, city));
    }

    if (search) {
      const searchCondition = createSearchCondition(search);
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);

    const result = await Promise.all([
      db
        .select()
        .from(listings)
        .where(whereClause)
        .orderBy(sql`CASE WHEN listing_type = 'premium' THEN 1 ELSE 2 END`)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(whereClause),
    ]);

    const [data, countResult] = result;

    const listingsWithUrls = data.map((listing) => ({
      ...listing,
      images: listing.images ? getListingImagesUrls(listing.images) : [],
    }));

    return {
      listings: listingsWithUrls,
      total: Number(countResult[0].count),
    };
  }

  async getUserListings(userId: number): Promise<Listing[]> {
    const userListings = await db.query.listings.findMany({
      where: eq(listings.userId, userId),
      with: {
        category: true,
        conversations: true,
      },
    });

    return userListings.map((listing) => ({
      ...listing,
      images: listing.images ? getListingImagesUrls(listing.images) : [],
    }));
  }
  async createListing(
    insertListing: Omit<Listing, "id" | "createdAt">
  ): Promise<Listing> {
    const [listing] = await db
      .insert(listings)
      .values(insertListing)
      .returning();
    return listing;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.order));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAllListings(): Promise<Listing[]> {
    return await db.select().from(listings);
  }

  async getListingsByStatusPaginated(
    approved: boolean,
    active: boolean,
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ data: Listing[]; total: number }> {
    const offset = (page - 1) * limit;

    const conditions: SQL<unknown>[] = [
      eq(listings.approved, approved),
      eq(listings.active, active),
    ];

    if (search) {
      const searchCondition = createSearchCondition(search);
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);
    const orderByClause = createOrderByClause(sortBy, sortOrder);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(listings)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
    };
  }

  async deleteListing(listingId: number, userId?: number): Promise<void> {
    try {
      console.log(
        `Deleting listing ${listingId}. Messages and conversations will be preserved.`
      );

      const whereConditions = [eq(listings.id, listingId)];
      if (userId) {
        whereConditions.push(eq(listings.userId, userId));
      }

      const result = await db.delete(listings).where(and(...whereConditions));

      if (!result.rowCount || result.rowCount === 0) {
        throw new Error("İlan silinemedi");
      }

      console.log(
        `Listing ${listingId} deleted successfully. Related messages and conversations preserved.`
      );
    } catch (error) {
      console.error("Error in deleteListing:", error);
      throw error;
    }
  }

  async updateListing(
    listingId: number,
    userId: number,
    updates: Partial<Listing>
  ): Promise<Listing> {
    try {
      console.log("Updating listing with data:", {
        listingId,
        userId,
        updates,
      });

      const [existingListing] = await db
        .select()
        .from(listings)
        .where(and(eq(listings.id, listingId), eq(listings.userId, userId)));

      if (!existingListing) {
        console.error("Listing not found or unauthorized");
        throw new Error("İlan bulunamadı veya düzenleme yetkiniz yok");
      }

      const updateData = {
        ...updates,
        approved: false,
        active: true,
        createdAt: new Date(),
      };

      console.log("Update data prepared:", updateData);

      const [updatedListing] = await db
        .update(listings)
        .set(updateData)
        .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
        .returning();

      if (!updatedListing) {
        console.error("Update operation failed");
        throw new Error("İlan güncellenemedi");
      }

      console.log("Listing updated successfully:", updatedListing);

      if (updatedListing.images) {
        updatedListing.images = getListingImagesUrls(updatedListing.images);
      }

      return updatedListing;
    } catch (error) {
      console.error("Error in updateListing:", error);
      throw error;
    }
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    console.log("Updating user data:", { userId, updates });
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        ip_address: updates.ip_address || undefined, // Only update if provided
      })
      .where(eq(users.id, userId))
      .returning();
    console.log("Updated user:", user);
    return user;
  }

  async updateListingStatus(
    listingId: number,
    approved: boolean
  ): Promise<void> {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId));

    if (listing && approved && listing.listingType === "standard") {
      await db
        .update(users)
        .set({ used_free_ad: 1 })
        .where(eq(users.id, listing.userId!));
    }

    await db
      .update(listings)
      .set({ approved })
      .where(eq(listings.id, listingId));
  }

  async getPriorityListings(): Promise<Listing[]> {
    return await db
      .select()
      .from(listings)
      .where(eq(listings.listingType, "priority"));
  }

  async getNewUsers(since: Date): Promise<User[]> {
    return await db.select().from(users).where(gte(users.createdAt, since));
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug));
    return category || null;
  }

  async findConversation(
    listingId: number,
    senderId: number,
    receiverId: number
  ): Promise<Conversation | undefined> {
    try {
      console.log("Konuşma aranıyor:", { listingId, senderId, receiverId });

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.listingId, listingId),
            or(
              and(
                eq(conversations.senderId, senderId),
                eq(conversations.receiverId, receiverId)
              ),
              and(
                eq(conversations.senderId, receiverId),
                eq(conversations.receiverId, senderId)
              )
            )
          )
        );

      console.log("Bulunan konuşma:", conversation);
      return conversation;
    } catch (error) {
      console.error("Konuşma arama hatası:", error);
      throw error;
    }
  }

  async createConversation(
    listingId: number,
    senderId: number,
    receiverId: number
  ): Promise<Conversation> {
    try {
      console.log("Yeni konuşma oluşturuluyor:", {
        listingId,
        senderId,
        receiverId,
      });

      const [conversation] = await db
        .insert(conversations)
        .values({
          listingId,
          senderId,
          receiverId,
          createdAt: new Date(),
        })
        .returning();

      console.log("Yeni konuşma oluşturuldu:", conversation);
      return conversation;
    } catch (error) {
      console.error("Konuşma oluşturma hatası:", error);
      throw error;
    }
  }

  async createMessage(
    conversationId: number,
    senderId: number,
    content: string,
    sender_ip?: string,
    files?: string[],
    fileTypes?: string[]
  ): Promise<Message> {
    try {
      console.log("Mesaj oluşturuluyor:", {
        conversationId,
        senderId,
        content,
        sender_ip,
        files,
        fileTypes,
      });

      // Önce conversation'ı bul
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));

      if (!conversation) {
        console.error("Conversation bulunamadı:", conversationId);
        throw new Error("Conversation bulunamadı");
      }

      // Mesajı gönderen kişi conversation'daki sender ise, receiver_id olarak receiver'ı al
      // Değilse sender'ı al. Bu sayede her mesaj için doğru receiver_id set edilmiş olur
      const receiverId =
        senderId === conversation.senderId
          ? conversation.receiverId
          : conversation.senderId;

      console.log("Hesaplanan receiver_id:", receiverId);

      // Mesajı oluştur ve receiver_id'yi kaydet
      const [message] = await db
        .insert(messages)
        .values({
          conversationId,
          senderId,
          receiverId, // Receiver ID'yi ekle
          content,
          isRead: false,
          createdAt: new Date(),
          sender_ip,
          files,
          fileTypes,
        })
        .returning();

      // Dosya URL'lerini oluştur
      const messageWithUrls = {
        ...message,
        files: message.files ? getMessageFilesUrls(message.files) : [],
      };

      console.log("Yeni mesaj oluşturuldu:", messageWithUrls);
      return messageWithUrls;
    } catch (error) {
      console.error("Mesaj oluşturma hatası:", error);
      throw error;
    }
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    try {
      console.log(`Mesajlar getiriliyor - Conversation ID: ${conversationId}`);

      // Join ile kullanıcı bilgilerini de çek
      const messageRecords = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
          files: messages.files,
          fileTypes: messages.fileTypes,
          receiverId: messages.receiverId,
          isRead: messages.isRead,
          sender: {
            id: users.id,
            username: users.username,
            profileImage: users.profileImage,
            gender: users.gender,
            avatar: users.avatar,
          },
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      // Mesaj kayıtlarını logla
      console.log("Ham mesaj kayıtları:", messageRecords);

      // Mesajlardaki dosya URL'lerini düzenle
      const transformedMessages = messageRecords.map((message) => ({
        ...message,
        // Eğer mesajda dosya varsa, URL'lerini oluştur
        files:
          message.files && Array.isArray(message.files)
            ? getMessageFilesUrls(message.files)
            : [],
        // Dosya tiplerini koru
        fileTypes: message.fileTypes || [],
      }));

      console.log("Dönüştürülmüş mesajlar:", transformedMessages);
      return transformedMessages as any;
    } catch (error) {
      console.error("Mesajları getirme hatası:", error);
      throw error;
    }
  }

  async markMessagesAsRead(
    conversationId: number,
    userId: number
  ): Promise<any> {
    try {
      // Önce konuşmayı bul
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));

      if (!conversation) {
        throw new Error("Konuşma bulunamadı");
      }

      // Kullanıcının bu konuşmanın alıcısı olduğunu doğrula
      if (conversation.receiverId !== userId) {
        throw new Error(
          "Bu konuşmadaki mesajları okundu olarak işaretleme yetkiniz yok"
        );
      }

      // Sadece gönderenden gelen ve okunmamış mesajları güncelle
      const updatedMessages = await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, conversation.senderId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        )
        .returning();

      await this.updateUserLastSeen(userId);

      return updatedMessages;
    } catch (error) {
      console.error("Mesajları okundu olarak işaretleme hatası:", error);
      throw error;
    }
  }

  async updateUserLastSeen(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db
      .delete(conversations)
      .where(
        or(
          eq(conversations.senderId, userId),
          eq(conversations.receiverId, userId)
        )
      );
    await db.delete(listings).where(eq(listings.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async deleteMessage(
    messageId: number,
    userId: number
  ): Promise<MessageDeleteEvent> {
    try {
      // Önce mesajı bul ve dosyalarını kontrol et
      const [message] = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)));

      if (!message) {
        throw new Error("Message not found or unauthorized");
      }

      // Eğer mesajın dosyaları varsa, önce onları sil
      if (message.files && message.files.length > 0) {
        try {
          await deleteMessageFiles(message.files);
        } catch (error) {
          console.error("Error deleting message files:", error);
          // Dosya silme hatası olsa bile mesaj silinmeye devam edecek
        }
      }

      // Mesajı sil
      const [deletedMessage] = await db
        .delete(messages)
        .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
        .returning();

      if (!deletedMessage) {
        throw new Error("Failed to delete message");
      }

      return {
        messageId: deletedMessage.id,
        conversationId: deletedMessage.conversationId,
        deletedAt: new Date(),
      };
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }

  async getMessageEvents(
    conversationId: number,
    since: Date
  ): Promise<MessageDeleteEvent[]> {
    return [];
  }

  async clearVerificationToken(userId: number): Promise<void> {
    try {
      await db
        .update(users)
        .set({ verificationToken: null })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error clearing verification token:", error);
      throw error;
    }
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("Kullanıcı bulunamadı");
    }

    if (!user.emailVerified) {
      throw new Error("Onaylanmamış üye şifresini sıfırlayamaz");
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await db
      .update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      })
      .where(eq(users.id, user.id));

    return token;
  }

  async verifyPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetPasswordToken, token),
          gte(users.resetPasswordExpires!, new Date())
        )
      );

    return user;
  }

  async resetPassword(userId: number, newPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: newPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        resetPasswordToken: null,
        resetPasswordExpires: null,
      })
      .where(eq(users.id, userId));
  }

  async addToFavorites(userId: number, listingId: number): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values({
        userId,
        listingId,
        createdAt: new Date(),
      })
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: number, listingId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
      );
  }

  async getUserFavorites(userId: number): Promise<Listing[]> {
    const userFavorites = await db
      .select({
        listing: listings,
      })
      .from(favorites)
      .innerJoin(listings, eq(favorites.listingId, listings.id))
      .where(eq(favorites.userId, userId));

    return userFavorites.map((f) => ({
      ...f.listing,
      images: f.listing.images ? getListingImagesUrls(f.listing.images) : [],
    }));
  }

  async isFavorite(userId: number, listingId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(
        and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
      );
    return !!favorite;
  }

  async updateUserProfile(
    userId: number,
    updates: Partial<User>
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async canUserModifyListingStatus(
    listingId: number,
    userId: number
  ): Promise<boolean> {
    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.userId, userId)));

    if (!listing) return false;

    const now = new Date();
    return (
      listing.approved === true &&
      listing.expiresAt !== null &&
      new Date(listing.expiresAt) > now
    );
  }

  async activateListing(listingId: number, userId: number): Promise<void> {
    const canModify = await this.canUserModifyListingStatus(listingId, userId);
    if (!canModify) {
      throw new Error(
        "İlanı aktif hale getirme yetkiniz yok veya ilan süresi dolmuş"
      );
    }

    await db
      .update(listings)
      .set({ active: true })
      .where(and(eq(listings.id, listingId), eq(listings.userId, userId)));
  }

  async deactivateListing(listingId: number, userId: number): Promise<void> {
    const canModify = await this.canUserModifyListingStatus(listingId, userId);
    if (!canModify) {
      throw new Error(
        "İlanı pasif hale getirme yetkiniz yok veya ilan süresi dolmuş"
      );
    }

    await db
      .update(listings)
      .set({ active: false })
      .where(and(eq(listings.id, listingId), eq(listings.userId, userId)));
  }
  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    try {
      const [admin] = await db
        .select()
        .from(admin_users)
        .where(eq(admin_users.username, username));

      if (!admin) return null;

      return {
        ...admin,
        type: "admin" as const,
        createdAt: admin.createdAt as Date,
      };
    } catch (error) {
      console.error("Error fetching admin by username:", error);
      return null;
    }
  }

  async getAdmin(id: number): Promise<AdminUser | null> {
    try {
      const [admin] = await db
        .select()
        .from(admin_users)
        .where(eq(admin_users.id, id));

      if (!admin) return null;

      return {
        ...admin,
        type: "admin" as const,
        createdAt: admin.createdAt as Date,
      };
    } catch (error) {
      console.error("Error fetching admin by id:", error);
      return null;
    }
  }
  // Yeni kategori oluştur
  async createCategory(category: Omit<Category, "id">): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Kategori güncelle
  async updateCategory(
    id: number,
    updates: Partial<Category>
  ): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  // Kategori sil
  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Kategorileri yeniden sırala
  async reorderCategories(
    updates: Array<{ id: number; order: number; parentId: number | null }>
  ): Promise<Category[]> {
    return await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(categories)
          .set({
            order: update.order,
            parentId: update.parentId,
          })
          .where(eq(categories.id, update.id));
      }

      return await tx.select().from(categories).orderBy(asc(categories.order));
    });
  }
  // Kategori silme öncesi kontrolleri yapan yeni method
  async getCategoryListingCount(categoryId: number): Promise<number> {
    try {
      // Kategoriye ait ilan sayısını getir
      const [result] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(eq(listings.categoryId, categoryId));

      return result.count;
    } catch (error) {
      console.error("Kategori ilan sayısı alma hatası:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();

// Mesaj silindiğinde ilişkili dosyaları silen fonksiyon
async function deleteMessageFiles(files: string[]): Promise<void> {
  try {
    // Dosyaları Cloudflare R2'den sil
    await imageService.deleteMessageFiles(files);
  } catch (error) {
    console.error("Dosya silme hatası:", error);
    // Hata durumunda bile işlemi devam ettir
  }
}
