import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdSequence, IdSequenceSchema } from './id-sequence.schema.js';
import { IdSequenceService } from './id-sequence.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IdSequence.name, schema: IdSequenceSchema },
    ]),
  ],
  providers: [IdSequenceService],
  exports: [IdSequenceService],
})
export class CommonModule {}
