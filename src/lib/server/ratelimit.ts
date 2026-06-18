/**
 * Simple in-memory token-bucket rate limiter. Per-process, so on serverless
 * with multiple instances it's best-effort — still catches the common case
 * (single user spamming one endpoint).
 */
interface Bucket {
	tokens: number;
	lastRefill: number;
}

const buckets = new Map<string, Bucket>();

interface Limit {
	capacity: number;
	refillPerSecond: number;
}

const LIMITS: Record<string, Limit> = {
	'push:subscribe': { capacity: 5, refillPerSecond: 0.5 },
	'transactions:export': { capacity: 3, refillPerSecond: 0.1 },
	'import': { capacity: 3, refillPerSecond: 0.1 },
	'account:delete': { capacity: 1, refillPerSecond: 0.01 },
};

export function rateLimit(key: string, route: string): boolean {
	const limit = LIMITS[route] ?? { capacity: 10, refillPerSecond: 1 };
	const now = Date.now();
	const bucket = buckets.get(key) ?? { tokens: limit.capacity, lastRefill: now };

	const elapsed = (now - bucket.lastRefill) / 1000;
	bucket.tokens = Math.min(limit.capacity, bucket.tokens + elapsed * limit.refillPerSecond);
	bucket.lastRefill = now;

	if (bucket.tokens < 1) {
		buckets.set(key, bucket);
		return false;
	}
	bucket.tokens -= 1;
	buckets.set(key, bucket);
	return true;
}

export function rateLimitReset(key: string): void {
	buckets.delete(key);
}
