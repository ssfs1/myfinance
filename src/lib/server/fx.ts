/**
 * FX rate lookup with caching. Uses Frankfurter.app (ECB rates, no key).
 *
 * Convention: `fx_rates.rate` is "1 unit of `base` = `rate` units of `quote`".
 * So `amountBaseCents = round(amountCents * rate)`.
 */
import { eq, and, lte, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { fxRates } from '$lib/server/db/schema';

export class UnsupportedCurrencyError extends Error {
	constructor(base: string, quote: string, date: string) {
		super(`FX rate not available for ${base}→${quote} on ${date}`);
		this.name = 'UnsupportedCurrencyError';
	}
}

interface FrankfurterResponse {
	amount: number;
	base: string;
	date: string;
	rates: Record<string, number>;
}

const FRANKFURTER = 'https://api.frankfurter.dev/v1';

async function fetchRate(
	base: string,
	quote: string,
	date: string,
): Promise<number | null> {
	const url = `${FRANKFURTER}/${date}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
	try {
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (!res.ok) return null;
		const data = (await res.json()) as FrankfurterResponse;
		const rate = data.rates?.[quote];
		return typeof rate === 'number' ? rate : null;
	} catch {
		return null;
	}
}

/**
 * Look up an FX rate for `base → quote` on `date` (YYYY-MM-DD). Falls back to
 * the most recent rate strictly before `date` if the exact date is a weekend,
 * holiday, or otherwise unavailable.
 */
export async function getRate(
	base: string,
	quote: string,
	date: string,
): Promise<number> {
	if (base === quote) return 1;

	// 1. Cache hit on exact date.
	const exact = await db
		.select()
		.from(fxRates)
		.where(and(eq(fxRates.base, base), eq(fxRates.quote, quote), eq(fxRates.date, date)))
		.limit(1);
	if (exact[0]) return exact[0].rate;

	// 2. Cache hit on most recent prior date.
	const recent = await db
		.select()
		.from(fxRates)
		.where(
			and(
				eq(fxRates.base, base),
				eq(fxRates.quote, quote),
				lte(fxRates.date, date),
			),
		)
		.orderBy(desc(fxRates.date))
		.limit(1);
	if (recent[0]) return recent[0].rate;

	// 3. Fetch from Frankfurter.
	const rate = await fetchRate(base, quote, date);
	if (rate !== null) {
		await db
			.insert(fxRates)
			.values({ base, quote, date, rate })
			.onConflictDoNothing();
		return rate;
	}

	// 4. Try the prior business day if Frankfurter returns 404 (weekends/holidays).
	const fallbackDate = await findFallbackDate(base, quote, date);
	if (fallbackDate) {
		const fb = recent[0] ?? (await fetchAndCache(base, quote, fallbackDate));
		if (fb) return fb;
	}

	throw new UnsupportedCurrencyError(base, quote, date);
}

async function fetchAndCache(
	base: string,
	quote: string,
	date: string,
): Promise<number | null> {
	const rate = await fetchRate(base, quote, date);
	if (rate !== null) {
		await db
			.insert(fxRates)
			.values({ base, quote, date, rate })
			.onConflictDoNothing();
		return rate;
	}
	return null;
}

async function findFallbackDate(
	_base: string,
	_quote: string,
	_date: string,
): Promise<string | null> {
	// Try up to 7 prior business days.
	const start = new Date(_date + 'T00:00:00Z');
	for (let i = 1; i <= 7; i++) {
		const d = new Date(start);
		d.setUTCDate(d.getUTCDate() - i);
		const iso = d.toISOString().slice(0, 10);
		const cached = await db
			.select()
			.from(fxRates)
			.where(and(eq(fxRates.base, _base), eq(fxRates.quote, _quote), eq(fxRates.date, iso)))
			.limit(1);
		if (cached[0]) return iso;
	}
	return null;
}
