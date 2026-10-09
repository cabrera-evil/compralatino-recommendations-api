import { Auth } from '@/decorators/auth.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import { AuthUser } from '@/types/jwt-payload.type';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
	RecommendationsQuery,
	RecommendationsService,
} from './recommendations.service';

@ApiTags('recommendations')
@Auth()
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationsController {
	constructor(private readonly recommendations: RecommendationsService) {}

	@ApiOperation({
		summary:
			'Ranked product recommendations for the caller (co-purchase, then popular)',
	})
	@ApiQuery({
		name: 'q',
		required: false,
		description: 'Rison: (page:1,pageSize:10); pageSize max 50',
	})
	@Get()
	findAll(
		@CurrentUser() user: AuthUser,
		@RisonQuery({ paginate: true }) query: RecommendationsQuery
	) {
		return this.recommendations.findAll(user.id, query);
	}
}
