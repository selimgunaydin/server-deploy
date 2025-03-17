import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createSeoUrl(text: string): string {
  const turkishChars: { [key: string]: string } = {
    Ğ: "g",
    ğ: "g",
    Ü: "u",
    ü: "u",
    Ş: "s",
    ş: "s",
    İ: "i",
    ı: "i",
    Ö: "o",
    ö: "o",
    Ç: "c",
    ç: "c",
  };

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ğüşıöçİĞÜŞÖÇ]/g, (letter) => turkishChars[letter] || letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}
