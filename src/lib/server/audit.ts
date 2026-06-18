/**
 * Audit log writer. Best-effort; failures should not break the user-facing
 * action they're auditing.
 */
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';

export interface AuditEntry {
	userId: string;
	action: string; // e.g. 'transaction.create'
	entityType: string; // e.g. 'transaction'
	entityId: string;
	before?: unknown;
	after?: unknown;
}

export async function audit(entry: AuditEntry): Promise<void> {
	try {
		await db.insert(auditLog).values({
			userId: entry.userId,
			action: entry.action,
			entityType: entry.entityType,
			entityId: entry.entityId,
			beforeJson: entry.before === undefined ? null : JSON.stringify(entry.before),
			afterJson: entry.after === undefined ? null : JSON.stringify(entry.after),
		});
	} catch (err) {
		console.error('[audit] failed to write entry', entry, err);
	}
}
