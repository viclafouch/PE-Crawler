import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'

global.initSentry = (app) => Sentry.init({
  dsn: 'https://97b04b4a82844298b062d7eaa79257f8@o473538.ingest.sentry.io/5508510',
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: false }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app })
  ],
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0
})

global.Sentry = Sentry
