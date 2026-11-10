import { prisma } from '@/lib/prisma';

export async function logAuthEvent(params: {
  event: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    // se prisma local falhar, tentamos logar local ou global. Vou implementar de uma forma resiliente.
    await prisma.authAuditLog.create({
      data: {
        event: params.event,
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: (params.metadata as any) || {},
      },
    });
  } catch (error) {
    // silencioso para não quebrar fluxo
    console.error('Falha ao gravar auth log:', error);
  }
}
