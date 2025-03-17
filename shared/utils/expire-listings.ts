import { db } from "../../shared/db";
import { eq, lt, and, gte, lte } from "drizzle-orm";
import { listings } from "../../shared/schemas";

import { Listing } from "../../shared/schema";
import { sendExpirationEmail, sendExpirationWarningEmail } from "@shared/services/expiration-notification";

// Helper to convert DB Listing to Email Listing interface
function adaptListingForEmail(dbListing: any): any {
  return {
    id: dbListing.id.toString(),
    title: dbListing.title,
    userId: dbListing.userId?.toString(),
    createdAt: dbListing.createdAt,
    expiresAt: dbListing.expiresAt,
    isActive: dbListing.active
  };
}

// İlanların süresini kontrol eden ve pasif yapan fonksiyon
export async function deactivateExpiredListings() {
  try {
    const now = new Date();

    // Debug için tüm aktif ilanları log'la
    const activeListings = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.active, true),
          eq(listings.approved, true), // Sadece onaylanmış ilanları kontrol et
          lt(listings.expiresAt!, now), // Süresi geçmiş olanları bul
        ),
      );

    console.log(`Toplam aktif ilan sayısı: ${activeListings.length}`);
    console.log(
      "Süresi dolan ilanlar:",
      activeListings.map((l) => ({
        id: l.id,
        title: l.title,
        expiresAt: l.expiresAt,
      })),
    );

    // Süresi dolan ilanları pasif yap
    const result = await db
      .update(listings)
      .set({
        active: false,
      })
      .where(
        and(
          eq(listings.active, true),
          eq(listings.approved, true), // Sadece onaylanmış ilanları kontrol et
          lt(listings.expiresAt!, now), // Süresi geçmiş olanları bul
        ),
      )
      .returning();

    // Pasif yapılan ilanların detaylarını log'la
    console.log(`${result.length} adet süresi dolan ilan pasif hale getirildi`);
    result.forEach((listing) => {
      console.log(
        `Pasif yapılan ilan: ID=${listing.id}, Başlık=${listing.title}, Bitiş Tarihi=${listing.expiresAt}`,
      );
      // Süre dolum bildirimi gönder
      if (listing.userId) {
        sendExpirationEmail(adaptListingForEmail(listing));
      }
    });

    return result;
  } catch (error) {
    console.error("İlan pasif etme hatası:", error);
    throw error;
  }
}

// Süresi yaklaşan ilanları kontrol eden ve bildirim gönderen fonksiyon
export async function checkExpirationWarnings() {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Debug için sorgu kriterlerini logla
    console.log("Süre uyarısı kontrol zamanı:", {
      currentTime: now.toISOString(),
      warningThreshold: threeDaysLater.toISOString(),
    });

    // Süresi 3 gün içinde dolacak aktif ilanları bul
    const expiringListings = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.active, true),
          eq(listings.approved, true),
          gte(listings.expiresAt!, now), // Henüz süresi dolmamış
          lte(listings.expiresAt!, threeDaysLater), // 3 gün içinde dolacak
        ),
      );

    console.log(
      `${expiringListings.length} adet ilanın süresi 3 gün içinde dolacak`,
    );
    console.log(
      "Uyarı gönderilecek ilanlar:",
      expiringListings.map((l) => ({
        id: l.id,
        title: l.title,
        expiresAt: l.expiresAt,
      })),
    );

    // Her bir ilan için bildirim gönder
    for (const listing of expiringListings) {
      if (listing.userId) {
        try {
          await sendExpirationWarningEmail(adaptListingForEmail(listing));
          console.log(
            `Süre uyarı e-postası gönderildi: İlan ID=${listing.id}, Başlık=${listing.title}`,
          );
        } catch (error) {
          console.error(
            `Uyarı e-postası gönderme hatası (İlan ID=${listing.id}):`,
            error,
          );
        }
      }
    }

    return expiringListings;
  } catch (error) {
    console.error("Süre uyarısı gönderme hatası:", error);
    throw error;
  }
} 