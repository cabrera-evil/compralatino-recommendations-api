import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

/** JWT-authenticated route; the caller is read with @CurrentUser(). */
export const Auth = () =>
	applyDecorators(
		UseGuards(JwtAuthGuard),
		ApiBearerAuth(),
		ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
	);
