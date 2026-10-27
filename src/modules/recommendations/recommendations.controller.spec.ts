import { JwtStrategy } from '@/modules/auth/jwt.strategy';
import { INestApplication, VersioningType } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

const TEST_KEY = 'unit-test-signing-key';

describe('RecommendationsController (HTTP)', () => {
	const savedSecret = process.env.JWT_SECRET;
	let app: INestApplication;
	let service: { findAll: jest.Mock };
	const jwt = new JwtService({ secret: TEST_KEY });
	const bearer = (payload: object, secret = TEST_KEY) =>
		`Bearer ${new JwtService({ secret }).sign(payload)}`;

	beforeEach(async () => {
		process.env.JWT_SECRET = TEST_KEY;
		service = {
			findAll: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
		};
		const moduleRef = await Test.createTestingModule({
			imports: [PassportModule],
			controllers: [RecommendationsController],
			providers: [
				JwtStrategy,
				{ provide: RecommendationsService, useValue: service },
			],
		}).compile();
		app = moduleRef.createNestApplication();
		app.enableVersioning({ type: VersioningType.URI });
		await app.init();
	});

	afterEach(async () => {
		process.env.JWT_SECRET = savedSecret;
		await app.close();
	});

	it('returns 200 and passes the token user id and default paging', async () => {
		await request(app.getHttpServer())
			.get('/v1/recommendations')
			.set('Authorization', bearer({ id: '7' }))
			.expect(200)
			.expect({ data: [], pagination: {} });
		expect(service.findAll).toHaveBeenCalledWith(7, { take: 10, skip: 0 });
	});

	it('decodes the Rison q param into take/skip', async () => {
		await request(app.getHttpServer())
			.get('/v1/recommendations?q=(page:3,pageSize:5)')
			.set('Authorization', bearer({ id: '7' }))
			.expect(200);
		expect(service.findAll).toHaveBeenCalledWith(7, { take: 5, skip: 10 });
	});

	it('accepts a numeric id claim', async () => {
		await request(app.getHttpServer())
			.get('/v1/recommendations')
			.set('Authorization', bearer({ id: 3 }))
			.expect(200);
		expect(service.findAll).toHaveBeenCalledWith(3, expect.any(Object));
	});

	it('returns 401 without a token', async () => {
		await request(app.getHttpServer()).get('/v1/recommendations').expect(401);
		expect(service.findAll).not.toHaveBeenCalled();
	});

	it('returns 401 for a token signed with another key', async () => {
		await request(app.getHttpServer())
			.get('/v1/recommendations')
			.set('Authorization', bearer({ id: 1 }, 'some-other-key'))
			.expect(401);
	});

	it('returns 401 for an expired token', async () => {
		const expired = jwt.sign({ id: 1 }, { expiresIn: -10 });
		await request(app.getHttpServer())
			.get('/v1/recommendations')
			.set('Authorization', `Bearer ${expired}`)
			.expect(401);
	});

	it.each([
		['missing id', {}],
		['non-numeric id', { id: 'abc' }],
		['zero id', { id: 0 }],
		['fractional id', { id: '1.5' }],
	])('returns 401 INVALID_TOKEN for a token with %s', async (_n, payload) => {
		const res = await request(app.getHttpServer())
			.get('/v1/recommendations')
			.set('Authorization', bearer(payload))
			.expect(401);
		expect(res.body.message).toBe('INVALID_TOKEN');
		expect(service.findAll).not.toHaveBeenCalled();
	});

	it('ignores a malformed Rison q and falls back to defaults', async () => {
		await request(app.getHttpServer())
			.get('/v1/recommendations?q=((((')
			.set('Authorization', bearer({ id: 7 }))
			.expect(200);
		// RisonQuery swallows decode errors and returns {}; the service applies defaults.
		expect(service.findAll).toHaveBeenCalledWith(7, {});
	});

	// Known defect: getPagination() yields take/skip NaN for a non-numeric pageSize.
	it.failing(
		'falls back to default paging for a non-numeric pageSize',
		async () => {
			await request(app.getHttpServer())
				.get('/v1/recommendations?q=(pageSize:abc)')
				.set('Authorization', bearer({ id: 7 }))
				.expect(200);
			expect(service.findAll).toHaveBeenCalledWith(7, { take: 10, skip: 0 });
		}
	);

	it('returns 500 when the service fails', async () => {
		service.findAll.mockRejectedValue(new Error('boom'));
		await request(app.getHttpServer())
			.get('/v1/recommendations')
			.set('Authorization', bearer({ id: 7 }))
			.expect(500);
	});
});
