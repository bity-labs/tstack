import {
  configForStage,
  topology,
  validateAccount,
  validateStage,
} from './infra/config.js';
import { project } from './infra/project.js';

// Validate non-secret inputs before loading providers. Plan is not an offline
// check: resolving its state layer can bootstrap or upgrade cloud resources.
const config = configForStage(project, process.env.DEPLOY_STAGE);
// The native credential resolver reads its account selector from the environment.
// Keep the versioned project configuration authoritative for CLI and CI alike.
process.env.CLOUDFLARE_ACCOUNT_ID = config.accountId;

const [Alchemy, Cloudflare, { ConfigProvider, Effect, Layer }] =
  await Promise.all([
    import('alchemy'),
    import('@alchemy.run/cloudflare'),
    import('effect'),
  ]);
const { cloudflare } = await import('./infra/cloudflare.js');

export default Alchemy.Stack(
  topology(config).identity,
  {
    providers: Cloudflare.providers(),
    // This account-pinned native backend is authenticated and encrypted, and
    // lives outside the application stack's destroy lifecycle.
    state: Layer.unwrap(
      Effect.gen(function* () {
        validateStage(config, yield* Alchemy.Stage);
        const account = yield* Cloudflare.CloudflareEnvironment.current;
        validateAccount(config, account.accountId);
        return Cloudflare.state({
          accountId: config.accountId,
          workerName: topology(config).names.state,
        });
      }),
    ).pipe(
      // Stack builds state before application providers in beta.87. Supply
      // the auth foundation explicitly so this pre-state account check works.
      Layer.provide(Cloudflare.CloudflareApiLive()),
      Layer.orDie,
    ),
  },
  Effect.gen(function* () {
    validateStage(config, yield* Alchemy.Stage);
    const account = yield* Cloudflare.CloudflareEnvironment.current;
    validateAccount(config, account.accountId);
    const fallback = yield* ConfigProvider.ConfigProvider;
    const bound = ConfigProvider.fromUnknown({
      DEPLOY_CONFIG: JSON.stringify(config),
    }).pipe(ConfigProvider.orElse(fallback));
    return yield* cloudflare.pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, bound),
    );
  }),
);
