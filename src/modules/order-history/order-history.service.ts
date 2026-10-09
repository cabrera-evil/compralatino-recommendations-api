import { OrderEventPattern } from '@/constants/events';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';
import { OrderCreatedPayload, OrderUpdatedPayload } from './order-event.parser';

/** Persists order lines learned from events; each event is applied at most once. */
@Injectable()
export class OrderHistoryService {
	constructor(private readonly prisma: PrismaClient) {}

	/** Returns false when the event was already processed (no change made). */
	async recordCreated(event: OrderCreatedPayload): Promise<boolean> {
		return this.prisma.$transaction(async (tx) => {
			const { count } = await tx.processedEvent.createMany({
				data: [{ eventId: event.eventId, pattern: OrderEventPattern.CREATED }],
				skipDuplicates: true,
			});
			if (!count) return false;
			await tx.orderLine.createMany({
				data: event.items.map((item) => ({
					orderId: event.orderId,
					userId: event.userId,
					productCode: item.productCode,
					quantity: item.quantity,
					status: event.status,
					eventId: event.eventId,
				})),
				skipDuplicates: true,
			});
			return true;
		});
	}

	/** Returns false when the event was already processed (no change made). */
	async recordUpdated(event: OrderUpdatedPayload): Promise<boolean> {
		return this.prisma.$transaction(async (tx) => {
			if (event.eventId) {
				const { count } = await tx.processedEvent.createMany({
					data: [
						{ eventId: event.eventId, pattern: OrderEventPattern.UPDATED },
					],
					skipDuplicates: true,
				});
				if (!count) return false;
			}
			await tx.orderLine.updateMany({
				where: { orderId: event.orderId },
				data: { status: event.status },
			});
			return true;
		});
	}
}
