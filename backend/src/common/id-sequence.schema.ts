import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IdSequenceDocument = HydratedDocument<IdSequence>;

@Schema({ versionKey: false })
export class IdSequence {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, default: 0 })
  value!: number;
}

export const IdSequenceSchema = SchemaFactory.createForClass(IdSequence);
