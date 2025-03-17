import {
  deactivateExpiredListings,
  checkExpirationWarnings,
} from "./expire-listings";

// Her gün çalışacak kontrol fonksiyonu
export async function runDailyTasks() {
  try {
    console.log("Günlük görevler çalıştırılıyor...");
    
    // Süresi dolan ilanları kontrol et ve pasif yap
    await deactivateExpiredListings();

    // Süresi yaklaşan ilanlar için uyarı gönder
    await checkExpirationWarnings();
    
    console.log("Günlük görevler tamamlandı.");
  } catch (error) {
    console.error("Zamanlanmış görev hatası:", error);
  }
} 