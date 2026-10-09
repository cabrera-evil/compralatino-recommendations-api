import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

// Infra-free smoke test: boots the HTTP layer without database or RabbitMQ.
describe('AppController (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			controllers: [AppController],
			providers: [AppService],
		}).compile();
		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('GET / responds 200', () =>
		request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));
});
