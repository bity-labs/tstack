// Versioned, non-secret configuration. Customize before enabling deployments.
// Preserve name/stateWorker for existing deployments; renaming can replace state/data.
export const project = {
  name: 'saas1',
  accountId: '',
  zoneId: '',
  zone: 'example.com',
  emailFrom: 'signin@example.com',
  stateWorker: 'saas1-alchemy-state',
  stages: {
    staging: {
      domains: {
        web: 'app.staging.example.com',
        api: 'api.staging.example.com',
        website: 'staging.example.com',
        docs: 'docs.staging.example.com',
      },
    },
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
