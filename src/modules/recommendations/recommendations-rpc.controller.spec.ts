import { RecommendationsRpcController } from './recommendations-rpc.controller';

describe('RecommendationsRpcController', () => {
	let service: { purchaseMatch: jest.Mock };
	let controller: RecommendationsRpcController;

	beforeEach(() => {
		service = {
			purchaseMatch: jest
				.fn()
				.mockResolvedValue({ sampledOrders: 0, matchedOrders: 0, rate: 0 }),
		};
		controller = new RecommendationsRpcController(service as never);
	});

	it('forwards the orders and returns the service reply', async () => {
		const orders = [{ orderId: 1, userId: 2, productCodes: ['yac-1'] }];
		await expect(controller.purchaseMatch({ orders })).resolves.toEqual({
			sampledOrders: 0,
			matchedOrders: 0,
			rate: 0,
		});
		expect(service.purchaseMatch).toHaveBeenCalledWith(orders);
	});

	it.each([
		['missing orders', {}],
		['null payload', null],
		['undefined payload', undefined],
	])('treats %s as an empty order list', async (_n, payload) => {
		await controller.purchaseMatch(payload as never);
		expect(service.purchaseMatch).toHaveBeenCalledWith([]);
	});

	it('propagates service failures', async () => {
		service.purchaseMatch.mockRejectedValue(new Error('catalog down'));
		await expect(controller.purchaseMatch({ orders: [] })).rejects.toThrow(
			'catalog down'
		);
	});
});
