import { Logger } from '@nestjs/common';
import { OrderEventsController } from './order-events.controller';

const created = {
	eventId: 'evt-1',
	orderId: 4,
	userId: 2,
	status: 'pending',
	items: [{ productCode: 'yac-1', quantity: 1 }],
};
const updated = { eventId: 'evt-2', orderId: 4, status: 'paid' };

describe('OrderEventsController', () => {
	let history: { recordCreated: jest.Mock; recordUpdated: jest.Mock };
	let channel: { ack: jest.Mock; nack: jest.Mock };
	let message: object;
	let context: never;
	let controller: OrderEventsController;
	let logError: jest.SpyInstance;
	let logWarn: jest.SpyInstance;
	let logInfo: jest.SpyInstance;

	beforeEach(() => {
		jest.resetAllMocks();
		logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
		logWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
		logInfo = jest.spyOn(Logger.prototype, 'log').mockImplementation();
		history = {
			recordCreated: jest.fn().mockResolvedValue(true),
			recordUpdated: jest.fn().mockResolvedValue(true),
		};
		channel = { ack: jest.fn(), nack: jest.fn() };
		message = { id: 'm' };
		context = {
			getChannelRef: () => channel,
			getMessage: () => message,
		} as never;
		controller = new OrderEventsController(history as never);
	});

	it('records a created event and acks', async () => {
		await controller.handleOrderCreated(created, context);
		expect(history.recordCreated).toHaveBeenCalledWith(
			expect.objectContaining({ eventId: 'evt-1', orderId: 4 })
		);
		expect(channel.ack).toHaveBeenCalledWith(message);
		expect(channel.nack).not.toHaveBeenCalled();
	});

	it('records an updated event and acks', async () => {
		await controller.handleOrderUpdated(updated, context);
		expect(history.recordUpdated).toHaveBeenCalledWith({
			eventId: 'evt-2',
			orderId: 4,
			status: 'paid',
		});
		expect(channel.ack).toHaveBeenCalledWith(message);
	});

	it.each([
		['null', null],
		['string', 'x'],
		['missing items', { ...created, items: [] }],
		['bad orderId', { ...created, orderId: -1 }],
	])('acks and ignores a malformed created payload: %s', async (_n, data) => {
		await controller.handleOrderCreated(data, context);
		expect(history.recordCreated).not.toHaveBeenCalled();
		expect(channel.ack).toHaveBeenCalledWith(message);
		expect(channel.nack).not.toHaveBeenCalled();
		expect(logWarn).toHaveBeenCalled();
	});

	it('acks and ignores a malformed updated payload', async () => {
		await controller.handleOrderUpdated({ orderId: 1 }, context);
		expect(history.recordUpdated).not.toHaveBeenCalled();
		expect(channel.ack).toHaveBeenCalledTimes(1);
	});

	it('acks a duplicate event without error', async () => {
		history.recordCreated.mockResolvedValue(false);
		await controller.handleOrderCreated(created, context);
		expect(channel.ack).toHaveBeenCalledWith(message);
		expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Duplicate'));
	});

	it('requeues (nack) when persistence fails on a created event', async () => {
		history.recordCreated.mockRejectedValue(new Error('db down'));
		await controller.handleOrderCreated(created, context);
		expect(channel.nack).toHaveBeenCalledWith(message, false, true);
		expect(channel.ack).not.toHaveBeenCalled();
		expect(logError).toHaveBeenCalled();
	});

	it('requeues (nack) when persistence fails on an updated event', async () => {
		history.recordUpdated.mockRejectedValue(new Error('db down'));
		await controller.handleOrderUpdated(updated, context);
		expect(channel.nack).toHaveBeenCalledWith(message, false, true);
	});
});
