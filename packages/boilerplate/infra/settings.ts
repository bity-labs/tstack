import { Config, Effect } from 'effect';
import { deploymentConfig } from './config.js';

// Read the bound deployment in the current runtime, not mutable process.env.
export const deployment = Config.String('DEPLOY_CONFIG').pipe(
  Effect.map((value) => deploymentConfig(JSON.parse(value))),
);
