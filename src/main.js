import './sentry'
import './shared/console'
import Crawler from 'simplecrawler'
import server, { port } from './server'
import { crawlThreads } from './community'
import { crawlAnswers } from './help-center'
import database from '../db/models'
import { log, wait } from './shared/helpers'

async function recursion (fn) {
  const args = arguments
  const context = this
  await fn.apply(context, args)
  return recursion(fn)
}

const listener = server.listen(port, async () => {
  try {
    log({ status: 'debug', message: 'Server opened' })
    await database.connectToDatabase()
    log({ status: 'debug', message: 'Database connected' })

    await database.sequelize.sync()

    recursion(async () => {
      try {
        const products = await database.Product.findAll()
        const languages = await database.Language.findAll()
        await crawlAnswers({ products, languages })
      } catch (error) {
        console.error(error)
        global.Sentry.captureException(error)
        if (global.crawler_community instanceof Crawler) {
          global.crawler_community.stop()
          global.crawler_community = null
        }
        log({ status: 'error', message: 'Restart answers crawler in 5min' })
        await wait(1000 * 60 * 5)
      }
    })
    recursion(async () => {
      try {
        const products = await database.Product.findAll()
        const languages = await database.Language.findAll()
        await crawlThreads({ products, languages })
      } catch (error) {
        console.error(error)
        global.Sentry.captureException(error)
        if (global.crawler_threads instanceof Crawler) {
          global.crawler_threads.stop()
          global.crawler_threads = null
        }
        log({ status: 'error', message: 'Restart threads crawler in 5min' })
        await wait(1000 * 60 * 5)
      }
    })
  } catch (error) {
    console.error(error)
    listener.close()
    process.exit(0)
  }
})
