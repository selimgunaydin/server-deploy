import { badWords } from './bad-words';

/**
 * Verilen metinde kötü sözcük kontrolü yapar
 * @param text Kontrol edilecek metin
 * @returns Kötü sözcük varsa true, yoksa false döner
 */
export function containsBadWords(text: string): { hasBadWord: boolean; foundBadWords: string[] } {
  // Metni küçük harfe çevir
  const lowerText = text.toLowerCase();
  
  // Bulunan kötü sözcükleri sakla
  const foundBadWords: string[] = [];
  
  // Her bir kötü sözcüğü kontrol et
  for (const word of badWords) {
    // Kelime sınırlarını kontrol et (\b kelime sınırı belirtir)
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      foundBadWords.push(word);
    }
  }
  
  return {
    hasBadWord: foundBadWords.length > 0,
    foundBadWords
  };
} 