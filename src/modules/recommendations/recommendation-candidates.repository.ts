import {
	CANDIDATE_LIMIT,
	EXCLUDED_ORDER_STATUSES,
	MAX_CO_PURCHASE_ORDERS,
	MAX_HISTORY_CODES,
} from '@/constants/recommendations';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';

export type ScoredCode = { productCode: string; score: number };

/** Bounded reads over order_lines; every query has a LIMIT and runs once per request. */
@Injectable()
export class RecommendationCandidatesRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/** The caller's distinct ordered product codes, most recent first. */
	async userHistory(userId: number): Promise<string[]> {
		const rows = await this.prisma.orderLine.groupBy({
			by: ['productCode'],
			where: { userId, status: { notIn: EXCLUDED_ORDER_STATUSES } },
			_max: { createdAt: true },
			orderBy: { _max: { createdAt: 'desc' } },
			take: MAX_HISTORY_CODES,
		});
		return rows.map((row) => row.productCode);
	}

	/** Products ordered in the same recent orders as any of `codes`, by co-occurring orders. */
	async coPurchased(codes: string[]): Promise<ScoredCode[]> {
		if (!codes.length) return [];
		const status = { notIn: EXCLUDED_ORDER_STATUSES };
		const seeds = await this.prisma.orderLine.findMany({
			where: { productCode: { in: codes }, status },
			select: { orderId: true },
			distinct: ['orderId'],
			orderBy: { orderId: 'desc' },
			take: MAX_CO_PURCHASE_ORDERS,
		});
		if (!seeds.length) return [];
		const rows = await this.prisma.orderLine.groupBy({
			by: ['productCode'],
			where: {
				orderId: { in: seeds.map((seed) => seed.orderId) },
				productCode: { notIn: codes },
				status,
			},
			_count: { orderId: true },
			orderBy: [{ _count: { orderId: 'desc' } }, { productCode: 'asc' }],
			take: CANDIDATE_LIMIT,
		});
		return rows.map((row) => ({
			productCode: row.productCode,
			score: row._count.orderId,
		}));
	}

	/** Globally most ordered products, excluding `exclude`. */
	async popular(exclude: string[]): Promise<ScoredCode[]> {
		const rows = await this.prisma.orderLine.groupBy({
			by: ['productCode'],
			where: {
				status: { notIn: EXCLUDED_ORDER_STATUSES },
				productCode: { notIn: exclude },
			},
			_count: { orderId: true },
			orderBy: [{ _count: { orderId: 'desc' } }, { productCode: 'asc' }],
			take: CANDIDATE_LIMIT,
		});
		return rows.map((row) => ({
			productCode: row.productCode,
			score: row._count.orderId,
		}));
	}
}
