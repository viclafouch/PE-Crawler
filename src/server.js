import './sentry'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import router from './routes'

export const port = process.env.PORT || 3000

class App {
  constructor () {
    this.app = express()
    global.initSentry(this.app)
    this.initializeMiddlewares()
    this.initializeRoutes()
    this.initializeErrors()
  }

  initializeMiddlewares () {
    this.app.use(helmet())
    this.app.use(express.json())
    this.app.use(cors())
    this.app.use(global.Sentry.Handlers.requestHandler())
    this.app.use(global.Sentry.Handlers.tracingHandler())
  }

  initializeErrors () {
    this.app.use(global.Sentry.Handlers.errorHandler())
    this.app.use(this.errorHandler)
  }

  initializeRoutes () {
    this.app.use('/', router)
  }

  errorHandler (err, req, res, next) {
    res.statusCode = 500
    console.error(err)
    res.end(res.sentry + '\n')
  }
}

export default new App().app
