import {
	CANDIDATE_LIMIT,
	HISTORY_ENRICH_LIMIT,
	MAX_RECOMMENDATION_PAGE_SIZE,
} from '@/constants/recommendations';
import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { paginatedResponse } from '@/utils/response.util';
import { Injectable } from '@nestjs/common';
import { RecommendationCandidatesRepository } from './recommendation-candidates.repository';
import {
	Recommendation,
	RecommendationSource,
	toRecommendation,
} from './recommendation.serializer';

export type RecommendationsQuery = { take?: number; skip?: number };

type Candidate = {
	productCode: string;
	score: number;
	source: RecommendationSource;
};

@Injectable()
export class RecommendationsService {
	constructor(
		private readonly candidates: RecommendationCandidatesRepository,
		private readonly catalog: CatalogClientService
	) {}

	async findAll(userId: number, { take, skip }: RecommendationsQuery) {
		const page = {
			take: Math.min(take ?? 10, MAX_RECOMMENDATION_PAGE_SIZE),
			skip: skip ?? 0,
		};
		const ranked = await this.rank(userId);
		return paginatedResponse(
			ranked.slice(page.skip, page.skip + page.take),
			ranked.length,
			page
		);
	}

	private async rank(userId: number): Promise<Recommendation[]> {
		const history = await this.candidates.userHistory(userId);
		const [coPurchased, popular] = await Promise.all([
			this.candidates.coPurchased(history),
			this.candidates.popular(history),
		]);
		const merged = new Map<string, Candidate>();
		for (const row of coPurchased)
			merged.set(row.productCode, { ...row, source: 'co_purchase' });
		for (const row of popular)
			if (!merged.has(row.productCode))
				merged.set(row.productCode, { ...row, source: 'popular' });
		const candidates = [...merged.values()].slice(0, CANDIDATE_LIMIT);
		if (!candidates.length) return [];

		const sample = history.slice(0, HISTORY_ENRICH_LIMIT);
		const products = await this.catalog.getAvailable([
			...sample,
			...candidates.map((c) => c.productCode),
		]);
		const userCategories = new Set(
			sample.flatMap((code) => products.get(code)?.category?.code ?? [])
		);

		return candidates
			.flatMap((candidate) => {
				const product = products.get(candidate.productCode);
				if (!product) return [];
				const tier =
					candidate.source === 'co_purchase'
						? 0
						: product.category && userCategories.has(product.category.code)
							? 1
							: 2;
				return [{ tier, item: toRecommendation(candidate, product) }];
			})
			.sort(
				(a, b) =>
					a.tier - b.tier ||
					b.item.score - a.item.score ||
					a.item.productCode.localeCompare(b.item.productCode)
			)
			.map(({ item }) => item);
	}
}
