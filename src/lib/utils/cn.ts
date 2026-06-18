/**
 * Tiny className composer. No deps.
 */
export type ClassValue = string | number | false | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
	const out: string[] = [];
	const push = (v: ClassValue) => {
		if (!v && v !== 0) return;
		if (Array.isArray(v)) v.forEach(push);
		else out.push(String(v));
	};
	inputs.forEach(push);
	return out.join(' ');
}
