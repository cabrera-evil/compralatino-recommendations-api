import { AppConfig } from '@/config/app.config';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard } from './guards/throttler.guard';
import { EncryptionInterceptor } from './interceptors/encryption.interceptor';
import { RpcEncryptionInterceptor } from './interceptors/rpc-encryption.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';

@Module({
	imports: [
		AppConfig,
		AuthModule,
		CloudinaryModule,
		EncryptionModule,
		EventsModule,
		HealthModule,
		PdfModule,
		PrismaModule,
		RecommendationsModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: EncryptionInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: RpcEncryptionInterceptor,
		},
	],
})
export class AppModule {}
