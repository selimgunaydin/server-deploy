import {
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import {
  isAllowedFileSize,
  ALLOWED_IMAGE_TYPES,
  FILE_SIZE_LIMITS,
} from "./file-constants";
import multer from "multer";
import sharp from "sharp";
import { r2Client } from "./r2";

const ALLOWED_MEDIA_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4", // iPhone ses kaydı
  "audio/x-m4a", // iPhone ses kaydı alternatif
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov formatı
  "video/x-m4v", // iPhone video formatı
];

// Resim dosyalarını WebP formatına dönüştürmek için yardımcı fonksiyon
async function convertToWebP(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .webp({ quality: 80 }) // 80% kalite - dosya boyutu ve görüntü kalitesi dengesi için
      .toBuffer();
  } catch (error) {
    console.error("WebP dönüşüm hatası:", error);
    return buffer; // Hata durumunda orijinal buffer'ı geri dön
  }
}

export function isAllowedFileType(mimeType: string): boolean {
  // iPhone cihazlardan gelen özel MIME type'ları kontrol et
  if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) {
    return ALLOWED_MEDIA_TYPES.includes(mimeType);
  }

  // Diğer dosya türleri için mevcut kontroller devam edecek
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

// Cloudflare'e yüklemeden önce resmi optimize et
async function optimizeImageForUpload(
  file: Express.Multer.File
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Eğer dosya bir resim ise
  if (file.mimetype.startsWith("image/")) {
    try {
      const webpBuffer = await convertToWebP(file.buffer);
      return {
        buffer: webpBuffer,
        mimeType: "image/webp",
      };
    } catch (error) {
      console.error("Resim optimizasyon hatası:", error);
      return {
        buffer: file.buffer,
        mimeType: file.mimetype,
      };
    }
  }

  // Resim değilse orijinal dosyayı döndür
  return {
    buffer: file.buffer,
    mimeType: file.mimetype,
  };
}

export class ImageService {
  private bucket: string;
  private messageBucket: string;

  constructor() {
    this.bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    this.messageBucket = "seriilan-mesaj-dosyalar";
  }

  // Tek bir resim yükle - Merkezi dosya limit kontrolleri kullanılıyor
  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!isAllowedFileType(file.mimetype)) {
      throw new Error(
        "Geçersiz dosya formatı. Sadece izin verilen formatlar kabul edilmektedir."
      );
    }

    if (!isAllowedFileSize(file.size, file.mimetype)) {
      throw new Error(
        `Dosya boyutu çok büyük. Maksimum dosya boyutu ${
          FILE_SIZE_LIMITS.IMAGE / (1024 * 1024)
        }MB'dır.`
      );
    }

    // Resmi webp formatına dönüştür
    const webpBuffer = await this.convertToWebp(file.buffer);
    const fileName = this.generateUniqueFileName(file.originalname, true);

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
          Body: webpBuffer,
          ContentType: "image/webp",
        })
      );

      return fileName;
    } catch (error) {
      console.error("Resim yükleme hatası:", error);
      throw new Error("Resim yüklenirken bir hata oluştu");
    }
  }

  private generateUniqueFileName(
    originalName: string,
    convertToWebp: boolean = false
  ): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString("hex");
    const extension = convertToWebp ? "webp" : originalName.split(".").pop();
    return `${timestamp}-${random}.${extension}`;
  }

  private async convertToWebp(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer).webp({ quality: 80 }).toBuffer();
    } catch (error) {
      console.error("Webp dönüşüm hatası:", error);
      throw new Error("Resim webp formatına dönüştürülürken hata oluştu");
    }
  }

  async uploadSingleImage(file: Express.Multer.File): Promise<string> {
    return this.uploadImage(file);
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  async deleteImage(fileName: string): Promise<void> {
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
        })
      );
    } catch (error) {
      console.error("Resim silme hatası:", error);
      throw new Error("Resim silinirken bir hata oluştu");
    }
  }

  async deleteMultipleImages(fileNames: string[]): Promise<void> {
    if (fileNames.length === 0) return;

    try {
      await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: fileNames.map((fileName) => ({ Key: fileName })),
            Quiet: true,
          },
        })
      );
    } catch (error) {
      console.error("Toplu resim silme hatası:", error);
      throw new Error("Resimler silinirken bir hata oluştu");
    }
  }

  async uploadMessageFile(
    file: Express.Multer.File
  ): Promise<{ key: string; type: string }> {
    if (!isAllowedFileType(file.mimetype)) {
      throw new Error("Desteklenmeyen dosya formatı.");
    }

    if (!isAllowedFileSize(file.size, file.mimetype)) {
      throw new Error(
        this.isImageFile(file.mimetype)
          ? `Resim boyutu ${
              FILE_SIZE_LIMITS.IMAGE / (1024 * 1024)
            }MB'dan büyük olamaz.`
          : `Dosya boyutu ${
              FILE_SIZE_LIMITS.OTHER / (1024 * 1024)
            }MB'dan büyük olamaz.`
      );
    }

    let processedBuffer = file.buffer;
    let finalMimeType = file.mimetype;

    if (this.isImageFile(file.mimetype)) {
      processedBuffer = await this.convertToWebp(file.buffer);
      finalMimeType = "image/webp";
    }

    const fileName = this.generateUniqueFileName(
      file.originalname,
      this.isImageFile(file.mimetype)
    );

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: this.messageBucket,
          Key: fileName,
          Body: processedBuffer,
          ContentType: finalMimeType,
        })
      );

      return {
        key: fileName,
        type: finalMimeType,
      };
    } catch (error) {
      console.error("Dosya yükleme hatası:", error);
      throw new Error("Dosya yüklenirken bir hata oluştu");
    }
  }

  async uploadMessageFiles(
    files: Express.Multer.File[]
  ): Promise<Array<{ key: string; type: string }>> {
    const uploadPromises = files.map((file) => this.uploadMessageFile(file));
    return Promise.all(uploadPromises);
  }

  async deleteMessageFile(fileName: string): Promise<void> {
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: this.messageBucket,
          Key: fileName,
        })
      );
    } catch (error) {
      if ((error as any).name === "NoSuchKey") {
        console.log(`Dosya zaten silinmiş: ${fileName}`);
        return;
      }
      console.error("Dosya silme hatası:", error);
      throw new Error("Dosya silinirken bir hata oluştu");
    }
  }

  async deleteMessageFiles(fileNames: string[]): Promise<void> {
    if (fileNames.length === 0) return;

    try {
      await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: this.messageBucket,
          Delete: {
            Objects: fileNames.map((fileName) => ({ Key: fileName })),
            Quiet: true,
          },
        })
      );
    } catch (error) {
      console.error("Toplu dosya silme hatası:", error);
      if ((error as any).name !== "NoSuchKey") {
        throw new Error("Dosyalar silinirken bir hata oluştu");
      }
    }
  }
  private isImageFile(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
  }
}

export const imageService = new ImageService();
