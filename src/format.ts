import type { UiLanguage } from './types';

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatWhen(iso: string | null | undefined, lang: UiLanguage) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'te' ? 'te-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function personName(value: { fullName?: string } | string | null | undefined) {
  if (!value || typeof value === 'string') return '';
  return value.fullName || '';
}

export function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}
