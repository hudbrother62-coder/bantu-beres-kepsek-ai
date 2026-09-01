export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', options ?? { dateStyle: 'medium' }).format(
    typeof value === 'string' ? new Date(value) : value,
  );
}

export function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
}

export function safeFilename(value: string) {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned.slice(0, 80) || 'dokumen-bantu-beres';
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function clampNumber(value: unknown, min = 0, max = 1_000_000) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : 0;
}
