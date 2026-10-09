const MAX_INT = 2147483647;
const MAX_ITEMS = 200;

export type OrderCreatedPayload = {
	eventId: string;
	orderId: number;
	userId: number;
	status: string;
	items: { productCode: string; quantity: number }[];
};

export type OrderUpdatedPayload = {
	eventId: string | null;
	orderId: number;
	status: string;
};

type Raw = Record<string, unknown>;

const isId = (value: unknown): value is number =>
	Number.isInteger(value) &&
	(value as number) > 0 &&
	(value as number) <= MAX_INT;
const isText = (value: unknown, max: number): value is string =>
	typeof value === 'string' && value.length > 0 && value.length <= max;

/** Returns null for a malformed payload; duplicate product codes are merged. */
export function parseOrderCreated(data: unknown): OrderCreatedPayload | null {
	const raw = data as Raw | null;
	if (!raw || typeof raw !== 'object') return null;
	const { eventId, orderId, userId, items } = raw;
	if (
		!isText(eventId, 64) ||
		!isId(orderId) ||
		!isId(userId) ||
		!Array.isArray(items) ||
		items.length === 0 ||
		items.length > MAX_ITEMS
	)
		return null;
	const merged = new Map<string, number>();
	for (const item of items as Raw[]) {
		if (!isText(item?.productCode, 100) || !isId(item.quantity)) return null;
		merged.set(
			item.productCode,
			(merged.get(item.productCode) ?? 0) + item.quantity
		);
	}
	return {
		eventId,
		orderId,
		userId,
		status: isText(raw.status, 32) ? raw.status : 'pending',
		items: [...merged].map(([productCode, quantity]) => ({
			productCode,
			quantity,
		})),
	};
}

export function parseOrderUpdated(data: unknown): OrderUpdatedPayload | null {
	const raw = data as Raw | null;
	if (!raw || typeof raw !== 'object') return null;
	const { eventId, orderId, status } = raw;
	if (!isId(orderId) || !isText(status, 32)) return null;
	return { eventId: isText(eventId, 64) ? eventId : null, orderId, status };
}
