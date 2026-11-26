import { describe, expect, it } from 'vitest';
import {
  configForStage,
  deploymentConfig,
  topology,
  validateAccount,
  validateStage,
} from './config.js';

const input = {
  name: 'acme',
  stage: 'staging',
  accountId: 'a'.repeat(32),
  zoneId: 'b'.repeat(32),
  zone: 'example.com',
  emailFrom: 'signin@example.com',
  stateWorker: 'acme-state',
  domains: {
    web: 'app.staging.example.com',
    api: 'api.staging.example.com',
    website: 'staging.example.com',
    docs: 'docs.staging.example.com',
  },
};

describe('Cloudflare configuration (no provider imports)', () => {
  it('requires an explicit sender in the owned zone without header injection', () => {
    const emailInput = { ...input, emailFrom: 'signin@example.com' };
    expect(deploymentConfig(emailInput).emailFrom).toBe('signin@example.com');
    for (const emailFrom of [
      undefined,
      '',
      'bad',
      'signin@other.test',
      'Site <signin@example.com>',
      'signin@example.com\r\nBcc: attacker@example.com',
    ]) {
      expect(() => deploymentConfig({ ...emailInput, emailFrom })).toThrow();
    }
  });

  it('preserves the existing Cloudflare resource identities without selecting a target', () => {
    expect(topology(deploymentConfig(input))).toEqual({
      identity: 'acme-cloudflare-staging',
      names: {
        state: 'acme-state',
        api: 'acme-cloudflare-staging-api',
        web: 'acme-cloudflare-staging-web',
        website: 'acme-cloudflare-staging-website',
        docs: 'acme-cloudflare-staging-docs',
        database: 'acme-cloudflare-staging-database',
      },
      origins: {
        web: 'https://app.staging.example.com',
        api: 'https://api.staging.example.com',
        website: 'https://staging.example.com',
        docs: 'https://docs.staging.example.com',
      },
      protectedResources: ['Database'],
    });
  });

  it('requires a project-prefixed explicit state name and bounds provider names including role suffixes', () => {
    for (const stateWorker of [
      'shared-state',
      'acme-',
      'acme',
      'acme-' + 'x'.repeat(50),
    ]) {
      expect(() => deploymentConfig({ ...input, stateWorker })).toThrow();
    }
    expect(() =>
      deploymentConfig({ ...input, name: 'a'.repeat(25) }),
    ).toThrow();
    expect(
      deploymentConfig({ ...input, stateWorker: 'acme-' + 'x'.repeat(49) })
        .stateWorker,
    ).toHaveLength(54);
    const longest = topology(
      deploymentConfig({
        ...input,
        name: 'a'.repeat(24),
        stage: 'production',
        stateWorker: 'a'.repeat(24) + '-state',
      }),
    );
    expect(longest.names.database).toHaveLength(55);
    expect(
      Object.values(longest.names).every((name) => name.length <= 63),
    ).toBe(true);
  });

  it('keeps distinct projects and application stages disjoint, with immutable domain-independent names', () => {
    const projects = ['saas1', 'saas2'].map((name) =>
      topology(
        deploymentConfig({ ...input, name, stateWorker: `${name}-state` }),
      ),
    );
    for (const [index, project] of projects.entries()) {
      expect(
        Object.values(project.names).every((name) =>
          name.startsWith(`saas${index + 1}-`),
        ),
      ).toBe(true);
    }
    expect(
      Object.values(projects[0]!.names).filter((name) =>
        Object.values(projects[1]!.names).includes(name),
      ),
    ).toEqual([]);
    const staging = topology(deploymentConfig(input));
    const production = topology(
      deploymentConfig({ ...input, stage: 'production' }),
    );
    // The explicit state Worker can be shared by this project's stages.
    const { state: stagingState, ...stagingNames } = staging.names;
    const { state: productionState, ...productionNames } = production.names;
    expect(stagingState).toBe(productionState);
    expect(
      Object.values(stagingNames).filter((name) =>
        Object.values(productionNames).includes(name),
      ),
    ).toEqual([]);
    expect(
      topology(
        deploymentConfig({
          ...input,
          domains: { ...input.domains, web: 'renamed.example.com' },
        }),
      ).names,
    ).toEqual(staging.names);
  });

  it('rejects incomplete inputs, obsolete platform options, malformed domains and state collisions in either stage', () => {
    for (const change of [
      { stage: undefined },
      { stage: '' },
      { stage: 'pr-42' },
      { stage: 'Production' },
      { name: '' },
      { name: '../acme' },
      { name: 'Acme' },
      { accountId: 'not-an-account' },
      { zoneId: '' },
      { zone: 'https://example.com' },
      { stateWorker: '' },
      { target: 'cloudflare' },
      { target: 'other' },
      { ports: {} },
      ...['staging', 'production'].flatMap((stage) =>
        ['api', 'web', 'website', 'docs'].map((role) => ({
          stateWorker: `acme-cloudflare-${stage}-${role}`,
        })),
      ),
      ...[
        'https://api.example.com',
        'api.other.com',
        input.domains.web,
        '*.example.com',
        'api.example.com/path',
        'api.example.com:443',
        '-api.example.com',
        'API.example.com',
        'api.example.com.',
        'notexample.com',
        'localhost',
        '127.0.0.1',
        `${'a'.repeat(64)}.example.com`,
      ].map((api) => ({ domains: { ...input.domains, api } })),
    ]) {
      expect(
        () => deploymentConfig({ ...input, ...change }),
        JSON.stringify(change),
      ).toThrow();
    }
  });

  it('selects only the requested stage from versioned project configuration and validates its account', () => {
    const { stage: _, domains, ...shared } = input;
    const project = {
      ...shared,
      stages: {
        staging: { domains },
        production: {
          domains: {
            web: 'app.example.com',
            api: 'api.example.com',
            website: 'example.com',
            docs: 'docs.example.com',
          },
        },
      },
    };
    expect(configForStage(project, 'staging')).toEqual(input);
    expect(configForStage(project, 'production')).toEqual({
      ...shared,
      stage: 'production',
      domains: project.stages.production.domains,
    });
    for (const stage of [undefined, '', 'dev', 'Production', 'toString']) {
      expect(() => configForStage(project, stage)).toThrow();
    }
    for (const accountId of ['', 'not-an-account']) {
      expect(() =>
        configForStage({ ...project, accountId }, 'staging'),
      ).toThrow();
    }
    const config = configForStage(project, 'staging');
    expect(() => validateStage(config, 'staging')).not.toThrow();
    for (const stage of ['dev', 'production', '']) {
      expect(() => validateStage(config, stage)).toThrow(/stage/i);
    }
    expect(() => validateAccount(config, input.accountId)).not.toThrow();
    expect(() => validateAccount(config, 'c'.repeat(32))).toThrow(/account/i);
  });
});
