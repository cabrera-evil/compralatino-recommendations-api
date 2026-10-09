import { OrderEventPattern } from '@/constants/events';
import {
	parseOrderCreated,
	parseOrderUpdated,
} from '@/modules/order-history/order-event.parser';
import { OrderHistoryService } from '@/modules/order-history/order-history.service';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class OrderEventsController {
	private readonly logger = new Logger(OrderEventsController.name);

	constructor(private readonly history: OrderHistoryService) {}

	@EventPattern(OrderEventPattern.CREATED)
	async handleOrderCreated(
		@Payload() data: unknown,
		@Ctx() context: RmqContext
	): Promise<void> {
		const event = parseOrderCreated(data);
		await this.settle(context, OrderEventPattern.CREATED, event, (e) =>
			this.history.recordCreated(e)
		);
	}

	@EventPattern(OrderEventPattern.UPDATED)
	async handleOrderUpdated(
		@Payload() data: unknown,
		@Ctx() context: RmqContext
	): Promise<void> {
		const event = parseOrderUpdated(data);
		await this.settle(context, OrderEventPattern.UPDATED, event, (e) =>
			this.history.recordUpdated(e)
		);
	}

	/** Malformed: ack without change. Duplicate: ack. Persistence failure: requeue. */
	private async settle<T>(
		context: RmqContext,
		pattern: string,
		event: T | null,
		apply: (event: T) => Promise<boolean>
	): Promise<void> {
		const channel = context.getChannelRef();
		const message = context.getMessage();
		if (!event) {
			this.logger.warn(`Ignoring malformed "${pattern}" payload`);
			channel.ack(message);
			return;
		}
		try {
			const applied = await apply(event);
			if (!applied) this.logger.log(`Duplicate "${pattern}" ignored`);
			channel.ack(message);
		} catch (error) {
			this.logger.error(`Failed to process "${pattern}": ${String(error)}`);
			channel.nack(message, false, true);
		}
	}
}
