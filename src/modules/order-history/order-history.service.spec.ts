import { PrismaClient } from 'prisma/generated/client';
import { parseOrderCreated } from './order-event.parser';
import { OrderHistoryService } from './order-history.service';

const event = parseOrderCreated({
	eventId: 'evt-1',
	orderId: 4,
	userId: 2,
	status: 'pending',
	items: [
		{ productCode: 'yac-1', quantity: 1 },
		{ productCode: 'yac-1', quantity: 2 },
		{ productCode: 'yac-2', quantity: 1 },
	],
})!;

const build = (count: number) => {
	const tx = {
		processedEvent: { createMany: jest.fn().mockResolvedValue({ count }) },
		orderLine: {
			createMany: jest.fn().mockResolvedValue({}),
			updateMany: jest.fn().mockResolvedValue({}),
		},
	};
	const prisma = {
		$transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
	};
	return {
		tx,
		service: new OrderHistoryService(prisma as unknown as PrismaClient),
	};
};

describe('order event parsing and persistence (yac-* codes)', () => {
	it('merges duplicate product codes', () => {
		expect(event.items).toEqual([
			{ productCode: 'yac-1', quantity: 3 },
			{ productCode: 'yac-2', quantity: 1 },
		]);
	});

	it('rejects malformed payloads', () => {
		expect(parseOrderCreated(null)).toBeNull();
		expect(parseOrderCreated({ ...event, items: [] })).toBeNull();
		expect(
			parseOrderCreated({ ...event, items: [{ productCode: '', quantity: 1 }] })
		).toBeNull();
	});

	it('persists order lines once per event', async () => {
		const { tx, service } = build(1);
		await expect(service.recordCreated(event)).resolves.toBe(true);
		expect(tx.orderLine.createMany.mock.calls[0][0].data).toHaveLength(2);
	});

	it('is a no-op for a duplicate event', async () => {
		const { tx, service } = build(0);
		await expect(service.recordCreated(event)).resolves.toBe(false);
		expect(tx.orderLine.createMany).not.toHaveBeenCalled();
	});
});
