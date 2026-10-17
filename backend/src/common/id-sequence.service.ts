import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdSequence } from './id-sequence.schema.js';

@Injectable()
export class IdSequenceService {
  constructor(
    @InjectModel(IdSequence.name) private readonly model: Model<IdSequence>,
  ) {}

  async next(name: string): Promise<number> {
    const sequence = await this.model.findOneAndUpdate(
      { name },
      { $inc: { value: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return sequence.value;
  }
}
