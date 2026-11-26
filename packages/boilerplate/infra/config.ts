import { Schema } from 'effect';

const Name = Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]{0,23}$/));
const CloudflareId = Schema.String.check(Schema.isPattern(/^[a-f0-9]{32}$/));
const Stage = Schema.Literals(['staging', 'production']);
const Domain = Schema.String.check(
  Schema.makeFilter(
    (value) =>
      value.length <= 253 &&
      value.split('.').length >= 2 &&
      /^[a-z]+$/.test(value.split('.').at(-1)!) &&
      value
        .split('.')
        .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)),
  ),
);

const DeploymentConfig = Schema.Struct({
  name: Name,
  stage: Stage,
  accountId: CloudflareId,
  zoneId: CloudflareId,
  zone: Domain,
  emailFrom: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9][a-zA-Z0-9._+-]*@[a-z0-9.-]+$/),
  ),
  stateWorker: Schema.String.check(
    Schema.isPattern(/^[a-z0-9][a-z0-9_-]{0,53}$/),
  ),
  domains: Schema.Struct({
    web: Domain,
    api: Domain,
    website: Domain,
    docs: Domain,
  }),
}).check(
  Schema.makeFilter((config) => {
    const domains = Object.values(config.domains);
    const senderDomain = config.emailFrom.split('@')[1]!;
    return (
      Schema.is(Domain)(senderDomain) &&
      (senderDomain === config.zone ||
        senderDomain.endsWith(`.${config.zone}`)) &&
      config.stateWorker.startsWith(`${config.name}-`) &&
      config.stateWorker.length > config.name.length + 1 &&
      `${config.name}-cloudflare-${config.stage}-database`.length <= 63 &&
      new Set(domains).size === domains.length &&
      domains.every(
        (domain) =>
          domain === config.zone || domain.endsWith(`.${config.zone}`),
      ) &&
      // State may be shared across stages; never let either stage own it.
      !['staging', 'production'].some((stage) =>
        ['api', 'web', 'website', 'docs'].some(
          (site) =>
            config.stateWorker === `${config.name}-cloudflare-${stage}-${site}`,
        ),
      )
    );
  }),
);

export const deploymentConfig = Schema.decodeUnknownSync(DeploymentConfig, {
  onExcessProperty: 'error',
});
export type DeploymentConfig = typeof DeploymentConfig.Type;

export function configForStage(
  project: Omit<DeploymentConfig, 'stage' | 'domains'> & {
    stages: Record<
      DeploymentConfig['stage'],
      { domains: DeploymentConfig['domains'] }
    >;
  },
  selectedStage: string | undefined,
) {
  const stage = Schema.decodeUnknownSync(Stage)(selectedStage);
  const { stages, ...shared } = project;
  return deploymentConfig({
    ...shared,
    ...stages[stage],
    stage,
  });
}

export function validateStage(config: DeploymentConfig, stage: string) {
  if (stage !== config.stage) {
    throw new Error(
      `Alchemy stage must equal DEPLOY_STAGE (${config.stage}); pass --stage ${config.stage}`,
    );
  }
}

export function validateAccount(config: DeploymentConfig, accountId: string) {
  if (accountId !== config.accountId) {
    throw new Error('Cloudflare provider account must equal project.accountId');
  }
}

export function topology(config: DeploymentConfig) {
  // Keep the historical Cloudflare stack/resource identities, including the
  // platform segment, even though there is no platform selection anymore.
  const identity = `${config.name}-cloudflare-${config.stage}`;
  return {
    identity,
    names: {
      state: config.stateWorker,
      api: `${identity}-api`,
      web: `${identity}-web`,
      website: `${identity}-website`,
      docs: `${identity}-docs`,
      database: `${identity}-database`,
    },
    origins: {
      web: `https://${config.domains.web}`,
      api: `https://${config.domains.api}`,
      website: `https://${config.domains.website}`,
      docs: `https://${config.domains.docs}`,
    },
    protectedResources: ['Database'],
  };
}
