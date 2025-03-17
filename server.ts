import { Server, Socket } from "socket.io";
import { db, schema } from "./shared/db"; // .js uzantısını ekleyelim
import { messages, conversations } from "./shared/schemas"; // .js uzantısını ekleyelim
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { storage } from "./app/lib/storage";
import { containsBadWords } from './shared/utils';
import { runDailyTasks } from './shared/utils/scheduler';
// .env dosyasını yükle
dotenv.config();

// Socket tipini genişleterek userId ekleyelim
interface SocketWithAuth extends Socket {
  userId?: string;
}

// NEXTAUTH_SECRET kontrolü
const JWT_SECRET = process.env.NEXTAUTH_SECRET
if (!JWT_SECRET) {
  console.error(
    "HATA: NEXTAUTH_SECRET veya JWT_SECRET tanımlanmamış! Lütfen .env dosyasını kontrol edin."
  );
  process.exit(1);
}

const io = new Server(3001, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
  },
});

// Her gün saat 00:00'da çalışacak zamanlanmış görev
function scheduleTask() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // yarın
    0, // saat 00
    0, // dakika 00
    0  // saniye 00
  );
  
  const timeToMidnight = night.getTime() - now.getTime();
  
  console.log(`Zamanlanmış görev ${timeToMidnight / 1000 / 60} dakika sonra başlayacak`);
  
  // İlk çalışma için zamanlayıcı ayarla
  setTimeout(async () => {
    console.log("Zamanlanmış görev çalıştırılıyor...");
    await runDailyTasks();
    
    // Sonraki günler için 24 saatte bir çalışacak şekilde ayarla
    setInterval(async () => {
      console.log("Günlük zamanlanmış görev çalıştırılıyor...");
      await runDailyTasks();
    }, 24 * 60 * 60 * 1000); // 24 saat
    
  }, timeToMidnight);
}

// Zamanlanmış görevi başlat
scheduleTask();

// Server başladığında bir kez çalıştır
(async () => {
  console.log("Başlangıç kontrol görevi çalıştırılıyor...");
  await runDailyTasks();
})();

// Her kullanıcı için oda (conversationId) yönetimi
io.on("connection", (socket: SocketWithAuth) => {
  console.log("Yeni bir istemci bağlandı:", socket.id);

  // Bağlantı sırasında auth token'ı kontrol et
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === "object" && decoded.sub) {
        socket.userId = decoded.sub;
        console.log(`Kullanıcı doğrulandı: ${socket.userId}`);
      }
    } else {
      // Token yoksa authenticate event bekle
      console.log("Token bulunamadı, authenticate olayı bekleniyor...");
    }
  } catch (error) {
    console.error("Kimlik doğrulama hatası:", error);
    // Bağlantıyı hemen kesme, authenticate event ile tekrar denenebilir
  }

  // Kullanıcı kimlik doğrulaması (örneğin, token ile)
  socket.on("authenticate", async (token: string) => {
    try {
      if (!token) {
        throw new Error("Token sağlanmadı");
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === "object" && decoded.sub) {
        socket.userId = decoded.sub;
        console.log(`Kullanıcı doğrulandı: ${socket.userId}`);
      } else {
        throw new Error("Geçersiz token formatı");
      }
    } catch (error) {
      console.error("Kimlik doğrulama hatası:", error);
      socket.disconnect();
    }
  });

  // Kullanıcı bir konuşmaya katıldığında
  socket.on("joinConversation", (conversationId: string) => {
    socket.join(conversationId);
    console.log(
      `Kullanıcı ${
        socket.userId || "bilinmeyen"
      } konuşmaya katıldı: ${conversationId}`
    );
  });

  // Mesaj gönderme
  socket.on(
    "sendMessage",
    async (data: {
      conversationId: string;
      content: string;
      files?: any;
      receiverId: number;
      listingId: number;
      senderId: number;
    }, callback: (response: { success: boolean; error?: string }) => void) => {
      const {
        conversationId,
        content,
        files,
        listingId,
        receiverId,
        senderId,
      } = data;
      
      if (!socket.userId) {
        callback({ success: false, error: "Kimlik doğrulama gerekli" });
        return;
      }

      // Kötü sözcük kontrolü
      const badWordsCheck = containsBadWords(content);
      if (badWordsCheck.hasBadWord) {
        callback({ success: false, error: "Mesajınız uygunsuz içerik içerdiği için gönderilemedi." });
        return;
      }

      let conversation = await storage.findConversation(
        listingId,
        parseInt(socket.userId),
        receiverId
      );
      if (conversation) {
        try {
          // Mesajı veritabanına kaydet
          const [newMessage] = await db
            .insert(messages)
            .values({
              conversationId: parseInt(conversation.id),
              senderId: parseInt(socket.userId),
              receiverId: receiverId,
              content,
              files,
              createdAt: new Date(),
              isRead: false,
            })
            .returning();

          // Mesajı hem gönderen hem de alıcıya ilet
          io.to(conversationId).emit("newMessage", {
            ...newMessage,
            sender: {
              id: parseInt(socket.userId),
            },
          });

          // Alıcıya özel bildirim gönder
          const receiverSocket = Array.from(io.sockets.sockets.values()).find(
            (s: any) => s.userId === data.receiverId.toString()
          );

          if (receiverSocket) {
            receiverSocket.emit("messageNotification", {
              conversationId,
              message: newMessage,
            });
          }

          callback({ success: true });
        } catch (error) {
          console.error("Mesaj gönderme hatası:", error);
          callback({ success: false, error: "Mesaj gönderilemedi" });
        }
      } else {
        try {
          conversation = await storage.createConversation(
            listingId,
            parseInt(socket.userId),
            receiverId
          );
          console.log("Yeni konuşma oluşturuldu:", conversation);
          console.log("Yeni mesaj oluşturuluyor:", {
            conversationId: parseInt(conversation.id),
            senderId: parseInt(conversation.senderId),
            receiverId: parseInt(conversation.receiverId),
            content,
            files,
          });
          const [newMessage] = await db
            .insert(messages)
            .values({
              conversationId: parseInt(conversation.id),
              senderId: parseInt(conversation.senderId),
              receiverId: parseInt(conversation.receiverId),
              content,
              files,
              createdAt: new Date(),
              isRead: false,
            })
            .returning();
          console.log("Yeni mesaj kaydedildi:", newMessage);
          callback({ success: true });
        } catch (error) {
          console.error("newConversation hatası:", error);
          callback({ success: false, error: "Yeni konuşma oluşturulamadı" });
        }
      }
    }
  );

  // Mesaj okundu işaretleme
  socket.on("markAsRead", async (conversationId: string) => {
    if (!socket.userId) {
      socket.emit("error", "Kimlik doğrulama gerekli");
      return;
    }

    try {
      await db
        .update(messages)
        .set({ isRead: true })
        .where(eq(messages.conversationId, parseInt(conversationId)));

      io.to(conversationId).emit("messageRead", { conversationId });
    } catch (error) {
      console.error("Mesaj okundu işaretlenirken hata:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Bir istemci ayrıldı:", socket.id);
  });
});

console.log("Socket.IO sunucusu 3001 portunda çalışıyor");
