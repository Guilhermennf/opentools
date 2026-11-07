/** Lowercases and strips diacritics so "codificacao" matches "codificação". */
export function normalizeSearch(input: string): string {
  return input.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
