import helmet from 'helmet'
import express from 'express'
import errorhandler from 'errorhandler'
import bodyParser from 'body-parser'
import routes from './routes'

const isProduction = false

const app = express()
app.use(helmet())
app.use(bodyParser.json())

if (!isProduction) app.use(errorhandler())

app.use(routes)

export default app
