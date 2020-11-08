import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import router from './routes'

export const port = process.env.PORT || 3000

class App {
  constructor () {
    this.app = express()
    this.initializeMiddlewares()
    this.initializeRoutes()
  }

  initializeMiddlewares () {
    this.app.use(helmet())
    this.app.use(express.json())
    this.app.use(cors())
  }

  initializeRoutes () {
    this.app.use('/', router)
  }
}

export default new App().app
