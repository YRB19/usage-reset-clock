# usage-reset-clock

Dependency-free TypeScript utilities for API usage reset countdowns, fixed recurring windows, and HTTP `Retry-After` values. Works in browsers and Node.js, with ESM and CommonJS exports and TypeScript declarations.

Inspired by the reset countdown problem in UsageOS. This is a standalone implementation; it does not connect to Claude, read accounts, or fetch usage data.

## Install

```sh
npm install usage-reset-clock
```

## Quick start

```js
import { getResetStatus } from 'usage-reset-clock';

const status = getResetStatus('2026-11-23T12:14:00Z', {
  now: new Date('2026-11-23T10:00:00Z'),
});
console.log(status.label); // Resets in 2h 14m
console.log(status.remainingSeconds); // 8040
console.log(status.hasReset); // false
```

CommonJS: `const { getResetStatus } = require('usage-reset-clock');`

## API

### `parseResetTime(value, { unit? }) → Date`

Accepts a `Date`, numeric timestamp, or ISO date-time string with seconds and an explicit timezone (for example `2026-11-23T15:30:00+05:30`). Returns a new Date. Numbers default to **milliseconds**; use `{ unit: 'seconds' }` for Unix seconds. The unit option applies only to numeric input. Ambiguous date strings, invalid calendar dates, and values outside JavaScript's Date range throw an error. Fractional milliseconds are truncated.

```js
import { parseResetTime } from 'usage-reset-clock';
parseResetTime(1805709600, { unit: 'seconds' });
```

### `getResetStatus(resetAt, options?) → ResetStatus`

Options: `now` (Date or epoch milliseconds, defaults to `Date.now()`), `unit`, `style`, and `maxUnits`.

| Field | Meaning |
| --- | --- |
| `resetAt` | Parsed Date |
| `remainingMs` | Milliseconds remaining, clamped to zero |
| `remainingSeconds` | Remaining seconds rounded up |
| `hasReset` | True at or after the timestamp |
| `label` | `Resets in 2h 14m` or `Reset available` |

A status is a snapshot. Call again on your application's update interval. The package does not create timers or make network requests. `hasReset` means the timestamp has passed; it does not confirm that a remote service restored your quota.

### `formatDuration(milliseconds, { style?, maxUnits? }) → string`

`style` is `compact` (default) or `long`. `maxUnits` is 1–4 (default 2). Units are days, hours, minutes, and seconds. Zero units are omitted. Positive durations round up to whole seconds before splitting into units; omitted smaller units are truncated. Negative durations display zero. Non-finite input throws.

```js
import { formatDuration } from 'usage-reset-clock';
formatDuration(8040000); // '2h 14m'
formatDuration(90000, { style: 'long' }); // '1 minute 30 seconds'
```

Labels are English; localization is not included in version 1.

### `getNextReset(anchor, intervalMs, { now?, unit? }) → Date`

Returns the first boundary **strictly after now** in a fixed recurring schedule. A future anchor is returned unchanged. At a boundary, it advances one interval. Missed windows are skipped without loops. `intervalMs` must be a positive safe integer.

```js
import { getNextReset } from 'usage-reset-clock';
getNextReset('2026-11-23T00:00:00Z', 5 * 60 * 60 * 1000, {
  now: new Date('2026-11-23T11:00:00Z'),
}); // 2026-11-23T15:00:00.000Z
```

Intervals are fixed elapsed milliseconds. Calendar months, local midnight schedules, and daylight-saving adjustments are outside this function's scope.

### `parseRetryAfter(value, { now? }) → Date | null`

Accepts nonnegative integer delay-seconds or a canonical HTTP date (`Mon, 23 Nov 2026 10:00:00 GMT`). Missing, invalid, overflowing, and obsolete HTTP date formats return `null`. An invalid `now` throws. HTTP dates in the past remain in the past.

```js
import { parseRetryAfter, getResetStatus } from 'usage-reset-clock';
const now = Date.now();
const retryAt = parseRetryAfter('90', { now });
if (retryAt) console.log(getResetStatus(retryAt, { now }).label);
// Resets in 1m 30s
```

For a response: `parseRetryAfter(response.headers.get('Retry-After'))`.

## Develop

Requires Node.js 18 or newer and npm. No runtime dependencies; TypeScript is a development dependency.

```sh
npm ci
npm test
npm run demo
npm pack
```

`npm test` builds both module formats and runs Node's built-in test runner. `npm pack` runs the same checks automatically and creates an installable `.tgz`. Only compiled files, the README, license, and package metadata are shipped.

## Publish your first version

1. Run `npm test` and `npm pack --dry-run` to review the release.
2. Check `npm view usage-reset-clock name` for a conflicting registration. An E404 means no package is currently registered under that name, but does not guarantee npm will accept the name. If necessary, change the package name to `@YOUR_NPM_USERNAME/usage-reset-clock` and update the imports in the examples and tests.
3. Run `npm login` and complete npm's authentication flow.
4. Run `npm publish --access public` from this directory and complete any npm authentication prompts.
5. Verify with `npm view usage-reset-clock version` and install it in another project.

Publishing instructions: https://docs.npmjs.com/cli/commands/npm-publish

For subsequent releases, update the version with `npm version patch --no-git-tag-version`, run checks, and publish again. npm does not allow overwriting an existing name/version pair.

## College demo

Run `npm run demo` to show a deterministic countdown, a recurring five-hour window, and a Retry-After conversion. Explain explicit timestamp units, exact reset boundaries, input validation, zero runtime dependencies, and support for both module formats. After publication, demonstrate installation in a fresh project.

## License

MIT. See LICENSE.
