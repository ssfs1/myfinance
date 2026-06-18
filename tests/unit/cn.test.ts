import { describe, it, expect } from 'vitest';
import { cn } from '../../src/lib/utils/cn';

describe('cn', () => {
	it('joins truthy strings', () => {
		expect(cn('a', 'b', 'c')).toBe('a b c');
	});

	it('drops falsy values', () => {
		expect(cn('a', false, null, undefined, 'b')).toBe('a b');
	});

	it('flattens nested arrays', () => {
		expect(cn('a', ['b', 'c'], 'd')).toBe('a b c d');
	});

	it('preserves the literal 0', () => {
		expect(cn('a', 0, 'b')).toBe('a 0 b');
	});
});
