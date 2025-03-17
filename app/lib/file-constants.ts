// Merkezi dosya yükleme limitleri ve konfigürasyonları
// Bu dosya tüm uygulama genelinde kullanılan dosya limitleri için tek kaynak olarak kullanılır

// İzin verilen resim türleri
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

// İzin verilen döküman türleri
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
];

// İzin verilen arşiv türleri
export const ALLOWED_ARCHIVE_TYPES = [
  "application/zip",
  "application/x-rar-compressed",
];

// İzin verilen medya türleri
export const ALLOWED_MEDIA_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "audio/aac",
  "application/octet-stream", // Blob türü için
  "video/mp4",
  "video/webm",
];

// Tüm izin verilen dosya türleri
export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_ARCHIVE_TYPES,
  ...ALLOWED_MEDIA_TYPES,
];

// Dosya boyutu limitleri (bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB - Merkezi resim yükleme limiti
  OTHER: 20 * 1024 * 1024, // 20MB - Diğer dosyalar için limit
};

// Dosya türüne göre boyut limitini döndüren yardımcı fonksiyon
export function getFileSizeLimit(mimeType: string): number {
  return ALLOWED_IMAGE_TYPES.includes(mimeType)
    ? FILE_SIZE_LIMITS.IMAGE
    : FILE_SIZE_LIMITS.OTHER;
}

// Dosya türünü kontrol eden yardımcı fonksiyon
export function isAllowedFileType(mimeType: string): boolean {
  // Eğer mimeType blob ise true döndür
  if (mimeType === "application/octet-stream") {
    return true;
  }
  return ALLOWED_FILE_TYPES.includes(mimeType);
}

// Dosya boyutunu kontrol eden yardımcı fonksiyon
export function isAllowedFileSize(size: number, mimeType: string): boolean {
  const limit = getFileSizeLimit(mimeType);
  return size <= limit;
}

// Dosya uzantısına göre MIME tipini döndüren yardımcı fonksiyon
export function getMimeType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    odt: "application/vnd.oasis.opendocument.text",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    odp: "application/vnd.oasis.opendocument.presentation",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
  };
  return mimeTypes[extension || ""] || "application/octet-stream";
}
