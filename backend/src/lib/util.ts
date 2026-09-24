import { randomBytes } from 'node:crypto';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function randomCryptoId(prefix: string): string {
  return `${prefix}_${randomBytes(5).toString('hex')}`;
}

export function safeFileName(name: string): string {
  // oxlint-disable-next-line no-control-regex -- intentionally nukes control chars from filenames
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120);
}

/** Verify a file extension against a set of allowed extensions (case-insensitive). */
export function hasAllowedExtension(fileName: string, allowed: string[]): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return allowed.includes(ext);
}

export function detectFileType(fileName: string): 'pdf' | 'docx' | 'txt' | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'txt' || ext === 'md' || ext === 'text') return 'txt';
  return null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const MAX_PAGE_SIZE = 100;

export function parsePagination(query: Record<string, unknown>): Pagination {
  const rawPage = Number(query.page ?? '1');
  const rawSize = Number(query.pageSize ?? '20');
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1 ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE) : 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function normalizeDates(rows: unknown[]): Array<Record<string, unknown>> {
  // Date objects are handled transparently by Fastify's JSON serializer.
  return rows as Array<Record<string, unknown>>;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function stripMarkdown(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[#>*_~|[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(src: string, max = 120): string {
  const clean = stripMarkdown(src);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}