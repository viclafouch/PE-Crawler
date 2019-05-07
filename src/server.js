import express from 'express'
import errorhandler from 'errorhandler'
import bodyParser from 'body-parser'
import routes from './routes'
import models from './models'

const isProduction = process.env.NODE_ENV === 'production'

const app = express()
app.use(bodyParser.json())

let hasSynced = false
app.use(async (req, res, next) => {
  try {
    if (!hasSynced) {
      await models.sequelize.sync()
      hasSynced = true
    }
    next()
  } catch (e) {
    hasSynced = false
    res.status(500)
  }
})

if (!isProduction) app.use(errorhandler())

app.use('/', routes)

export default app
