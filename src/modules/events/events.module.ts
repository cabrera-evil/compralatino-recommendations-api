import { Module } from '@nestjs/common';
import { OrderEventsController } from './order-events.controller';

@Module({
	controllers: [OrderEventsController],
})
export class EventsModule {}
