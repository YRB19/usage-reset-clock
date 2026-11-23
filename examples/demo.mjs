import { getResetStatus, getNextReset, parseRetryAfter } from 'usage-reset-clock';
const now = new Date('2026-11-23T10:00:00Z');
console.log(getResetStatus('2026-11-23T12:14:00Z', { now }));
console.log('Next 5-hour reset:', getNextReset(now, 5 * 3600_000, { now }));
console.log('Retry in 90 seconds:', parseRetryAfter('90', { now }));
