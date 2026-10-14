import { RECOMMENDATIONS_PURCHASE_MATCH_PATTERN } from '@/constants/recommendations';
import { SkipEncryption } from '@/decorators/skip-encryption.decorator';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
	PurchaseMatchOrder,
	RecommendationsService,
} from './recommendations.service';

@Controller()
@SkipEncryption()
export class RecommendationsRpcController {
	constructor(private readonly recommendations: RecommendationsService) {}

	@MessagePattern(RECOMMENDATIONS_PURCHASE_MATCH_PATTERN)
	purchaseMatch(@Payload() payload: { orders?: PurchaseMatchOrder[] }) {
		return this.recommendations.purchaseMatch(payload?.orders ?? []);
	}
}
