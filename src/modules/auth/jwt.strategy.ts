import { AuthUser, JWTPayload } from '@/types/jwt-payload.type';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(req: Request) => req.cookies?.jwt ?? null,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
			algorithms: ['HS256'],
			secretOrKey: process.env.JWT_SECRET,
		});
	}

	validate(payload: JWTPayload): AuthUser {
		const id = Number(payload.id);
		if (!Number.isInteger(id) || id <= 0)
			throw new UnauthorizedException('INVALID_TOKEN');
		return { id };
	}
}
