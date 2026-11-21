/** Numeric timestamps are milliseconds unless unit: 'seconds' is explicit. */
export type ResetTime = Date | string | number;
export interface TimeOptions { unit?: 'milliseconds' | 'seconds' }
export interface DurationOptions { style?: 'compact' | 'long'; maxUnits?: number }
export interface ResetOptions extends TimeOptions, DurationOptions { now?: Date | number }
export interface ResetStatus {
  resetAt: Date;
  remainingMs: number;
  remainingSeconds: number;
  hasReset: boolean;
  label: string;
}

function validMs(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > 8.64e15) {
    throw new RangeError('Time must be finite and within the JavaScript Date range');
  }
  return Math.trunc(value);
}
function nowMs(now: Date | number = Date.now()): number {
  return validMs(now instanceof Date ? now.getTime() : now);
}

/** Parse an absolute timestamp. Strings require an ISO date-time with an explicit timezone. */
export function parseResetTime(value: ResetTime, options: TimeOptions = {}): Date {
  if (options.unit !== undefined && options.unit !== 'seconds' && options.unit !== 'milliseconds') {
    throw new RangeError('unit must be seconds or milliseconds');
  }
  let ms: number;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value === 'number') ms = value * (options.unit === 'seconds' ? 1000 : 1);
  else if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) throw new TypeError('Expected an ISO date-time with seconds and timezone, e.g. 2026-01-01T12:00:00Z');
    const [, year, month, day, hour, minute, second, zone] = match;
    const days = new Date(`${year}-${month}-01T00:00:00Z`);
    days.setUTCMonth(days.getUTCMonth() + 1, 0);
    if (+month < 1 || +month > 12 || +day < 1 || +day > days.getUTCDate() || +hour > 23 || +minute > 59 || +second > 59 ||
      (zone !== 'Z' && (+zone.slice(1, 3) > 23 || +zone.slice(4) > 59))) {
      throw new RangeError('Invalid calendar date or timezone');
    }
    ms = Date.parse(value);
  } else throw new TypeError('Expected a Date, ISO string, or numeric timestamp');
  return new Date(validMs(ms));
}

/** Round positive durations up to whole seconds; clamp elapsed durations to zero. */
export function formatDuration(milliseconds: number, options: DurationOptions = {}): string {
  if (!Number.isFinite(milliseconds)) throw new RangeError('Duration must be finite');
  const { style = 'compact', maxUnits = 2 } = options;
  if (style !== 'compact' && style !== 'long') throw new RangeError('Invalid duration style');
  if (!Number.isInteger(maxUnits) || maxUnits < 1 || maxUnits > 4) throw new RangeError('maxUnits must be an integer from 1 to 4');
  let remaining = Math.ceil(Math.max(0, milliseconds) / 1000);
  const parts: string[] = [];
  for (const [size, short, long] of [[86400, 'd', 'day'], [3600, 'h', 'hour'], [60, 'm', 'minute'], [1, 's', 'second']] as const) {
    const count = Math.floor(remaining / size);
    remaining %= size;
    if (count) parts.push(style === 'compact' ? `${count}${short}` : `${count} ${long}${count === 1 ? '' : 's'}`);
  }
  return parts.slice(0, maxUnits).join(' ') || (style === 'compact' ? '0s' : '0 seconds');
}

/** Return a snapshot; call again whenever your UI or scheduler needs an update. */
export function getResetStatus(resetAt: ResetTime, options: ResetOptions = {}): ResetStatus {
  const date = parseResetTime(resetAt, options);
  const remainingMs = Math.max(0, date.getTime() - nowMs(options.now));
  const hasReset = remainingMs === 0;
  return { resetAt: date, remainingMs, remainingSeconds: Math.ceil(remainingMs / 1000), hasReset,
    label: hasReset ? 'Reset available' : `Resets in ${formatDuration(remainingMs, options)}` };
}

/** Find the first fixed interval boundary strictly after now, anchored to anchor. */
export function getNextReset(anchor: ResetTime, intervalMs: number, options: Pick<ResetOptions, 'unit' | 'now'> = {}): Date {
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) throw new RangeError('intervalMs must be a positive safe integer');
  const start = parseResetTime(anchor, options).getTime();
  const current = nowMs(options.now);
  const periods = current < start ? 0 : Math.floor((current - start) / intervalMs) + 1;
  return new Date(validMs(start + periods * intervalMs));
}

/** Parse HTTP Retry-After delay-seconds or an IMF-fixdate. Invalid values return null. */
export function parseRetryAfter(value: string | null | undefined, options: { now?: Date | number } = {}): Date | null {
  const current = nowMs(options.now);
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (/^\d+$/.test(text)) {
    const target = current + Number(text) * 1000;
    return Number.isFinite(target) && Math.abs(target) <= 8.64e15 ? new Date(target) : null;
  }
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(text)) return null;
  const target = new Date(text);
  return Number.isFinite(target.getTime()) && target.toUTCString() === text ? target : null;
}
