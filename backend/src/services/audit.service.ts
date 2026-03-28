import { prisma } from "../db/client.js";

interface AuditLogInput {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string | string[];
  metadata?: Record<string, unknown>;
}

/**
 * Write an immutable audit log entry for a sensitive operation.
 * Failures are non-fatal — logged to console only.
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        ipAddress: input.ipAddress,
        userAgent: Array.isArray(input.userAgent)
          ? input.userAgent[0]
          : input.userAgent,
        metadata: input.metadata as any,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
