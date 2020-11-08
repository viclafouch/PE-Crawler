import cheerio from 'cheerio'
import Crawler from 'simplecrawler'
import { log } from './shared/helpers'
import database from '../db/models'

const debug = (args) => log({ ...args, message: `[THREADS]: ${args.message}` })

const CREATE_THREADS_URL = (productCode) => `https://support.google.com/${productCode}/threads`

export const crawl = ({ product, language }) => new Promise(resolve => {
  const url = new URL(CREATE_THREADS_URL(product.code))
  url.searchParams.set('hl', language.code)
  url.searchParams.set('max_results', 60)
  const crawler = Crawler(url.toString())
  global.crawler_community = crawler
  let threads = []

  crawler.on('fetchcomplete', async function (queueItem, buffer) {
    const $ = cheerio.load(buffer.toString('utf8'))
    const listThreadsItems = $('a.thread-list-thread')
    threads = listThreadsItems.map((i, e) => {
      const uuid = $(e).attr('data-stats-id')
      const title = $(e).find('.thread-list-thread__title')
      const description = $(e).find('.thread-list-thread__snippet')
      return {
        uuid,
        title: title.text().trim(),
        description: description.text().trim()
      }
    }).get()
  })

  crawler.on('fetchredirect', async (queueItem, buffer) => {
    const productCode = queueItem.uriPath.split('/')[1]
    const product = await database.Product.findOne({ where: { code: productCode } })
    const languageCode = (new URL(queueItem.url)).searchParams.get('hl')
    debug({
      status: 'warn',
      message: `[Status: ${queueItem.status}] for ${product.name} in ${languageCode}`
    })
  })

  crawler.addFetchCondition((queueItem, referrerQueueItem) => {
    return !queueItem.url.startsWith('https://support.google.com/threads') // Avoid fetch redirection 404
  })

  crawler.on('fetcherror', (queueItem, response) => {
    debug({
      status: 'error',
      message: `An error occured on [${queueItem.url}]: ${response.statusMessage}`
    })
  })

  crawler.on('fetchclienterror', (queueItem, error) => {
    debug({
      status: 'error',
      message: `A client error occured on [${queueItem.url}]: ${error.message}`
    })
  })

  crawler.on('fetch404', (queueItem, response) => {
    debug({
      status: 'error',
      message: `Status 404 on [${queueItem.url}]: ${response.statusMessage}`
    })
  })

  crawler.on('fetch410', (queueItem, response) => {
    debug({
      status: 'warn',
      message: `Status 410 on [${queueItem.url}]: ${response.statusMessage}`
    })
  })

  crawler.on('complete', () => resolve(threads))

  crawler.maxDepth = 1
  crawler.start()
})

export const crawlThreads = async ({ products, languages }) => {
  for (const product of products) {
    for (const language of languages) {
      const threads = await crawl({ product, language })
      await database.Thread.destroy({
        where: {
          LanguageId: language.id,
          ProductId: product.id
        }
      })
      const promises = threads.map(thread => database.Thread.create({
        uuid: thread.uuid,
        title: thread.title,
        description: thread.description,
        LanguageId: language.id,
        ProductId: product.id
      }))
      // Don't need to wait for adding threads
      Promise.all(promises).then(threadsAdded => {
        debug({
          status: 'success',
          message: `[${product.name}/${language.code}]: ${threadsAdded.length} threads added`
        })
      })
    }
  }
}
