import { Schema } from 'effect';

export class Health extends Schema.Class<Health>('Health')({
  status: Schema.Literal('ok'),
  storage: Schema.Literal('sqlite'),
}) {}
