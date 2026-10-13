import { Module } from '@nestjs/common';
import { RecordBookController } from './record-book.controller';
import { RecordBookService } from './record-book.service';

@Module({
  controllers: [RecordBookController],
  providers: [RecordBookService],
})
export class RecordBookModule {}
