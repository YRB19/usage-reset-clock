import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseResetTime, formatDuration, getResetStatus, getNextReset, parseRetryAfter } from 'usage-reset-clock';
const now = Date.parse('2026-11-23T10:00:00Z');
test('ISO offsets, milliseconds, explicit Unix seconds, and defensive Date copies', () => {
  assert.equal(+parseResetTime('2026-11-23T15:30:00+05:30'), now);
  assert.equal(+parseResetTime(now), now);
  assert.equal(+parseResetTime(now / 1000, { unit: 'seconds' }), now);
  const date = new Date(now);
  assert.notEqual(parseResetTime(date), date);
});
test('reject ambiguous strings, impossible calendar dates, invalid numbers and dates', () => {
  for (const value of ['2026-11-23', '2026-11-23T10:00:00', '2026-02-30T10:00:00Z', '2026-13-01T00:00:00Z', NaN, Infinity, new Date(NaN), '1730000000']) {
    assert.throws(() => parseResetTime(value));
  }
  assert.equal(parseResetTime('2024-02-29T00:00:00Z').getUTCDate(), 29);
  assert.throws(() => parseResetTime('2025-02-29T00:00:00Z'));
});
test('countdown boundary is exact with seconds rounded upward', () => {
  const pending = getResetStatus(now + 1, { now });
  assert.equal(pending.remainingSeconds, 1);
  assert.equal(pending.label, 'Resets in 1s');
  for (const reset of [now, now - 1]) {
    assert.deepEqual(getResetStatus(reset, { now }), { resetAt: new Date(reset), remainingMs: 0, remainingSeconds: 0, hasReset: true, label: 'Reset available' });
  }
  assert.throws(() => getResetStatus(now, { now: NaN }));
});
test('duration formatting handles elapsed values, precision, long units, and invalid options', () => {
  assert.equal(formatDuration(8_040_000), '2h 14m');
  assert.equal(formatDuration(90_061_000, { maxUnits: 4 }), '1d 1h 1m 1s');
  assert.equal(formatDuration(90_000, { style: 'long' }), '1 minute 30 seconds');
  assert.equal(formatDuration(-1), '0s');
  assert.equal(formatDuration(1), '1s');
  assert.throws(() => formatDuration(Infinity));
  assert.throws(() => formatDuration(1000, { maxUnits: 0 }));
});
test('recurring reset catches up missed windows and advances exact boundaries', () => {
  assert.equal(+getNextReset(now, 1000, { now: now - 1 }), now);
  assert.equal(+getNextReset(now, 1000, { now }), now + 1000);
  assert.equal(+getNextReset(now, 1000, { now: now + 3500 }), now + 4000);
  for (const value of [0, -1, 0.5, Infinity]) assert.throws(() => getNextReset(now, value));
  assert.throws(() => getNextReset(8.64e15, 1000, { now: 8.64e15 }));
});
test('Retry-After supports integer seconds and canonical HTTP dates', () => {
  assert.equal(+parseRetryAfter(' 90 ', { now }), now + 90_000);
  assert.equal(+parseRetryAfter('0', { now }), now);
  const http = new Date(now).toUTCString();
  assert.equal(+parseRetryAfter(http), now);
  for (const value of [null, undefined, '', '-1', '1.5', 'tomorrow', '2026-11-23', '9'.repeat(400), 'Sun, 30 Feb 2026 10:00:00 GMT']) assert.equal(parseRetryAfter(value), null);
});
test('CommonJS package entry point works with the same API', () => {
  const cjs = createRequire(import.meta.url)('usage-reset-clock');
  assert.equal(cjs.getResetStatus(now + 1000, { now }).label, 'Resets in 1s');
  assert.deepEqual(Object.keys(cjs).sort(), ['formatDuration', 'getNextReset', 'getResetStatus', 'parseResetTime', 'parseRetryAfter'].sort());
});
