import { prisma } from "@/lib/prisma";

type AuditLogParams = {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
};

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
