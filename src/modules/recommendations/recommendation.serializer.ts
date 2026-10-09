import { CatalogProduct } from '@/modules/catalog-client/catalog-product.type';

export type RecommendationSource = 'co_purchase' | 'popular';

export type Recommendation = {
	productCode: string;
	title: string;
	endsAt: string;
	price: CatalogProduct['price'];
	category: CatalogProduct['category'];
	score: number;
	source: RecommendationSource;
};

export const toRecommendation = (
	candidate: {
		productCode: string;
		score: number;
		source: RecommendationSource;
	},
	product: CatalogProduct
): Recommendation => ({
	productCode: candidate.productCode,
	title: product.title,
	endsAt: product.endsAt,
	price: product.price,
	category: product.category,
	score: candidate.score,
	source: candidate.source,
});
