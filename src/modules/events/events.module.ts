import { OrderHistoryModule } from '@/modules/order-history/order-history.module';
import { Module } from '@nestjs/common';
import { OrderEventsController } from './order-events.controller';

@Module({
	imports: [OrderHistoryModule],
	controllers: [OrderEventsController],
})
export class EventsModule {}
