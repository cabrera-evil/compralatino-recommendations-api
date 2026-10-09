import { CatalogClientModule } from '@/modules/catalog-client/catalog-client.module';
import { Module } from '@nestjs/common';
import { RecommendationCandidatesRepository } from './recommendation-candidates.repository';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
	imports: [CatalogClientModule],
	controllers: [RecommendationsController],
	providers: [RecommendationsService, RecommendationCandidatesRepository],
})
export class RecommendationsModule {}
