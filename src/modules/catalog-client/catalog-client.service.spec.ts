import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { NEVER, of, throwError } from 'rxjs';
import { CatalogClientService } from './catalog-client.service';

const item = (over: Record<string, unknown> = {}) => ({
	code: 'yac-1',
	found: true,
	available: true,
	title: 'Camera',
	endsAt: '2030-01-01T00:00:00.000Z',
	price: { usd: '12.50', jpy: '1900' },
	category: { code: 'cameras', name: 'Cameras' },
	...over,
});

describe('CatalogClientService', () => {
	const savedTimeout = process.env.CATALOG_RPC_TIMEOUT_MS;
	let send: jest.Mock;
	let service: CatalogClientService;

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(Logger.prototype, 'warn').mockImplementation();
		send = jest.fn();
		service = new CatalogClientService({ send } as never);
	});

	afterEach(() => {
		if (savedTimeout === undefined) delete process.env.CATALOG_RPC_TIMEOUT_MS;
		else process.env.CATALOG_RPC_TIMEOUT_MS = savedTimeout;
	});

	it('sends de-duplicated codes and maps available products by code', async () => {
		send.mockReturnValue(of({ items: [item(), item({ code: 'yac-2' })] }));
		const res = await service.getAvailable(['yac-1', 'yac-2', 'yac-1']);
		expect(send).toHaveBeenCalledWith('catalog.products.validate', {
			codes: ['yac-1', 'yac-2'],
		});
		expect([...res.keys()]).toEqual(['yac-1', 'yac-2']);
		expect(res.get('yac-1')).toEqual({
			code: 'yac-1',
			title: 'Camera',
			endsAt: '2030-01-01T00:00:00.000Z',
			price: { usd: '12.50', jpy: '1900', exchangedAt: null },
			category: { code: 'cameras', name: 'Cameras' },
		});
	});

	it('keeps exchangedAt and maps a missing category to null', async () => {
		send.mockReturnValue(
			of({
				items: [
					item({
						price: { usd: '1', jpy: '2', exchangedAt: '2026-10-01' },
						category: null,
					}),
				],
			})
		);
		const res = await service.getAvailable(['yac-1']);
		expect(res.get('yac-1')).toMatchObject({
			price: { exchangedAt: '2026-10-01' },
			category: null,
		});
	});

	it.each([
		['not found', { found: false }],
		['unavailable', { available: false }],
		['no title', { title: undefined }],
		['no endsAt', { endsAt: undefined }],
		['bad endsAt', { endsAt: 'not-a-date' }],
		['non-decimal usd', { price: { usd: '1e3', jpy: '5' } }],
		['missing jpy', { price: { usd: '1' } }],
		['no price', { price: undefined }],
	])('skips a malformed or unavailable item: %s', async (_n, over) => {
		send.mockReturnValue(of({ items: [item(over)] }));
		expect((await service.getAvailable(['yac-1'])).size).toBe(0);
	});

	it('skips null items in the reply', async () => {
		send.mockReturnValue(of({ items: [null, item()] }));
		expect((await service.getAvailable(['yac-1'])).size).toBe(1);
	});

	it('throws 503 CATALOG_UNAVAILABLE when RabbitMQ is disabled', async () => {
		const disabled = new CatalogClientService();
		const error = await disabled.getAvailable(['a']).catch((e) => e);
		expect(error).toBeInstanceOf(ServiceUnavailableException);
		expect(error.getStatus()).toBe(503);
		expect(error.message).toBe('CATALOG_UNAVAILABLE');
	});

	it('throws 503 when the transport errors', async () => {
		send.mockReturnValue(throwError(() => new Error('connection refused')));
		await expect(service.getAvailable(['a'])).rejects.toBeInstanceOf(
			ServiceUnavailableException
		);
	});

	it('throws 503 when the transport throws a non-Error value', async () => {
		send.mockReturnValue(throwError(() => 'bad'));
		await expect(service.getAvailable(['a'])).rejects.toThrow(
			'CATALOG_UNAVAILABLE'
		);
	});

	it('throws 503 when the reply times out', async () => {
		process.env.CATALOG_RPC_TIMEOUT_MS = '20';
		send.mockReturnValue(NEVER);
		await expect(service.getAvailable(['a'])).rejects.toBeInstanceOf(
			ServiceUnavailableException
		);
	});

	it.each([
		['no items', {}],
		['items not an array', { items: 'x' }],
		['null reply', null],
	])('throws 503 for a malformed reply: %s', async (_n, reply) => {
		send.mockReturnValue(of(reply));
		await expect(service.getAvailable(['a'])).rejects.toBeInstanceOf(
			ServiceUnavailableException
		);
	});
});
