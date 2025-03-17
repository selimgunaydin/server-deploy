import { sendEmail } from '@shared/services/email';
import { Listing } from "@shared/schemas";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { storage } from '@shared/storage';

// İlan süresi dolduğunda gönderilecek e-posta
// Hiç bir şart altında bozulmaması gereken kod!
export async function sendExpirationEmail(listing: Listing) {
  try {
    // İlan sahibinin bilgilerini al
    const user = await storage.getUser(Number(listing.userId!));
    if (!user || !user.email) {
      console.error(`Kullanıcı veya e-posta bulunamadı. Listing ID: ${listing.id}`);
      return;
    }

    const subject = "İlanınızın Süresi Doldu";
    const content = `
      Sayın ${user.username},

      "${listing.title}" başlıklı ilanınızın süresi dolmuştur ve otomatik olarak pasif duruma geçirilmiştir.

      İlanınızı tekrar aktif hale getirmek için lütfen hesabınıza giriş yapın ve ilanı yenileyin.

      İlan Detayları:
      - Başlık: ${listing.title}
      - İlan Tarihi: ${format(new Date(listing.createdAt!), 'dd MMMM yyyy', { locale: tr })}
      - Bitiş Tarihi: ${format(new Date(listing.expiresAt!), 'dd MMMM yyyy', { locale: tr })}

      Saygılarımızla,
      İlan Yönetim Sistemi
    `;

    await sendEmail({
      to: user.email,
      subject: subject,
      text: content
    });
  } catch (error) {
    console.error("Süre dolum e-postası gönderme hatası:", error);
  }
}

// İlan süresi dolmak üzere olduğunda gönderilecek uyarı e-postası
export async function sendExpirationWarningEmail(listing: Listing) {
  try {
    // İlan sahibinin bilgilerini al
    const user = await storage.getUser(Number(listing.userId!));
    if (!user || !user.email) {
      console.error(`Kullanıcı veya e-posta bulunamadı. Listing ID: ${listing.id}`);
      return;
    }

    const subject = "İlan Süreniz Dolmak Üzere";
    const expiryDate = new Date(listing.expiresAt!);
    const content = `
      Sayın ${user.username},

      "${listing.title}" başlıklı ilanınızın süresi ${format(expiryDate, 'dd MMMM yyyy', { locale: tr })} tarihinde dolacaktır.

      İlanınızın pasif duruma geçmemesi için lütfen süresini uzatın veya yenileyin.

      İlan Detayları:
      - Başlık: ${listing.title}
      - İlan Tarihi: ${format(new Date(listing.createdAt!), 'dd MMMM yyyy', { locale: tr })}
      - Bitiş Tarihi: ${format(expiryDate, 'dd MMMM yyyy', { locale: tr })}

      Saygılarımızla,
      İlan Yönetim Sistemi
    `;

    await sendEmail({
      to: user.email,
      subject: subject,
      text: content
    });
  } catch (error) {
    console.error("Süre uyarı e-postası gönderme hatası:", error);
  }
} 