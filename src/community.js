import cheerio from 'cheerio'
import Crawler from 'simplecrawler'
import { log } from './shared/helpers'
import database from '../db/models'
import { BASE_URL } from './shared/constants'

const debug = (args) => log({ ...args, message: `[THREADS]: ${args.message}` })

export const CREATE_THREADS_URL = ({ hl, productCode, maxResults = 60 }) => {
  const url = new URL(BASE_URL.toString())
  url.pathname = `/${productCode}/threads`
  if (hl) url.searchParams.set('hl', hl)
  if (maxResults) url.searchParams.set('max_results', maxResults)
  return url
}

export const crawl = ({ product, language, options = {} }) => new Promise(resolve => {
  const url = CREATE_THREADS_URL({
    hl: language.code,
    productCode: product.code
  })
  const crawler = Crawler(url.toString())
  global.crawler_community = crawler
  let threads = []

  crawler.on('fetchcomplete', async function (queueItem, buffer) {
    const $ = cheerio.load(buffer.toString('utf8'))
    const listThreadsItems = $('a.thread-list-thread')
    threads = listThreadsItems.map((i, e) => {
      const uuid = parseInt($(e).attr('data-stats-id'))
      const title = $(e).find('.thread-list-thread__title')
      const description = $(e).find('.thread-list-thread__snippet')
      const hasReply = $(e).find('.thread-list-counts--has-reply').length > 0
      const hasRecommendedAnswer = $(e).find('.thread-list-counts--has-recommended-answer').length > 0
      const isNonIssue = $(e).find('.thread-list-counts--non-issue').length > 0
      return database.Thread.build({
        uuid: uuid,
        title: title.text().trim().substring(0, 200),
        description: description.text().trim().substring(0, 200),
        hasRecommendedAnswer: hasRecommendedAnswer,
        hasReply: hasReply,
        isNonIssue: isNonIssue,
        LanguageId: language.id,
        ProductId: product.id
      })
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

  crawler.maxDepth = options.maxDepth || 1
  crawler.start()
})

export const crawlThreads = async ({ products, languages, options }) => {
  const promises = []
  for (const product of products) {
    for (const language of languages) {
      const threads = await crawl({ product, language, options })
      await database.Thread.destroy({
        where: {
          LanguageId: language.id,
          ProductId: product.id
        }
      })
      const saveThreads = async () => {
        for (const thread of threads) {
          try {
            await thread.save()
          } catch (error) {
            global.Sentry.captureException(error)
            console.error(error)
          }
        }
        debug({
          status: 'success',
          message: `[${product.name}/${language.code}]: ${threads.length} threads added`
        })
        return { nbAdded: threads.length, product, language }
      }

      // Don't need to wait for adding threads
      promises.push(saveThreads())
    }
  }
  return promises
}
