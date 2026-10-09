import { AuthUser } from '@/types/jwt-payload.type';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): AuthUser =>
		ctx.switchToHttp().getRequest().user
);
