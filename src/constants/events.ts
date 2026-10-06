// Published by orders_svc, consumed by recommendations_svc and admin_svc.
// See Fase-2-CompraLatino-Mermaid.md 2.2 (Recomendaciones) and 3.2 (diagrama de contenedores).
export const OrderEventPattern = {
	CREATED: 'order.created',
	UPDATED: 'order.updated',
} as const;
