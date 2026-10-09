import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { CatalogProduct } from '@/modules/catalog-client/catalog-product.type';
import { RecommendationCandidatesRepository } from './recommendation-candidates.repository';
import { RecommendationsService } from './recommendations.service';

const product = (code: string, category: string | null): CatalogProduct => ({
	code,
	title: `Lot ${code}`,
	endsAt: '2030-01-01T00:00:00.000Z',
	price: { usd: '10.00', jpy: '1500', exchangedAt: null },
	category: category ? { code: category, name: category } : null,
});

const build = (
	history: string[],
	co: { productCode: string; score: number }[],
	popular: { productCode: string; score: number }[],
	catalog: CatalogProduct[]
) => {
	const repo = {
		userHistory: jest.fn().mockResolvedValue(history),
		coPurchased: jest.fn().mockResolvedValue(co),
		popular: jest.fn().mockResolvedValue(popular),
	};
	const client = {
		getAvailable: jest
			.fn()
			.mockResolvedValue(new Map(catalog.map((p) => [p.code, p]))),
	};
	return {
		repo,
		client,
		service: new RecommendationsService(
			repo as unknown as RecommendationCandidatesRepository,
			client as unknown as CatalogClientService
		),
	};
};

describe('RecommendationsService ranking (yac-* codes)', () => {
	it('ranks co-purchases first, then popular in the user category, then the rest', async () => {
		const { service, repo } = build(
			['yac-1'],
			[{ productCode: 'yac-10', score: 2 }],
			[
				{ productCode: 'yac-20', score: 9 },
				{ productCode: 'yac-21', score: 5 },
			],
			[
				product('yac-1', 'watches'),
				product('yac-10', 'bags'),
				product('yac-20', 'toys'),
				product('yac-21', 'watches'),
			]
		);
		const res = await service.findAll(5, {});
		expect(repo.userHistory).toHaveBeenCalledWith(5);
		expect(res.data.map((r) => r.productCode)).toEqual([
			'yac-10',
			'yac-21',
			'yac-20',
		]);
		expect(res.data.map((r) => r.source)).toEqual([
			'co_purchase',
			'popular',
			'popular',
		]);
	});

	it('deduplicates a code present in both lists, preferring co_purchase', async () => {
		const { service } = build(
			[],
			[{ productCode: 'yac-3', score: 4 }],
			[{ productCode: 'yac-3', score: 100 }],
			[product('yac-3', null)]
		);
		const res = await service.findAll(1, {});
		expect(res.data).toHaveLength(1);
		expect(res.data[0]).toMatchObject({ source: 'co_purchase', score: 4 });
	});

	it('drops candidates the catalog no longer has available', async () => {
		const { service } = build(
			[],
			[],
			[
				{ productCode: 'yac-1', score: 3 },
				{ productCode: 'yac-2', score: 2 },
			],
			[product('yac-2', null)]
		);
		const res = await service.findAll(1, {});
		expect(res.data.map((r) => r.productCode)).toEqual(['yac-2']);
	});

	it('returns empty without calling the catalog when there are no candidates', async () => {
		const { service, client } = build([], [], [], []);
		const res = await service.findAll(1, {});
		expect(res.data).toEqual([]);
		expect(client.getAvailable).not.toHaveBeenCalled();
	});

	it('breaks score ties by product code and paginates', async () => {
		const { service } = build(
			[],
			[],
			[
				{ productCode: 'yac-b', score: 1 },
				{ productCode: 'yac-a', score: 1 },
				{ productCode: 'yac-c', score: 1 },
			],
			[product('yac-a', null), product('yac-b', null), product('yac-c', null)]
		);
		const res = await service.findAll(1, { take: 1, skip: 1 });
		expect(res.data.map((r) => r.productCode)).toEqual(['yac-b']);
	});
});
