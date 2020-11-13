import cheerio from 'cheerio'
import Crawler from 'simplecrawler'
import database from '../db/models'
import { IS_DEV, BASE_URL } from './shared/constants'
import { getUuid, isUrl, log, relativePath } from './shared/helpers'

const debug = (args) => IS_DEV && log({ ...args, message: `[ANSWER]: ${args.message}` })

export const CREATE_HELP_CENTER_URL = ({ hl, productCode }) => {
  const url = new URL(BASE_URL.toString())
  url.pathname = `/${productCode}`
  if (hl) url.searchParams.set('hl', hl)
  return url
}

const isDifferentLanguage = ($, language) => {
  // e.g: For pt-BR, lang is pt
  return !language.startsWith($('html').attr('lang'))
}

const isGuideSteps = ($) => {
  return $('body').find('.guide-button').length > 0
}

export const crawl = ({ product, language, options = {} }) => new Promise(resolve => {
  const url = CREATE_HELP_CENTER_URL({
    productCode: product.code,
    hl: language.code
  })
  const crawler = Crawler(url.toString())
  global.crawler_threads = crawler

  const answers = []

  crawler.on('crawlstart', () => {
    log({
      status: 'debug',
      message: `Start crawling answers for ${product.name} in ${language.code.toUpperCase()}`
    })
  })

  crawler.discoverResources = (buffer, queueItem) => {
    const $ = cheerio.load(buffer.toString('utf8'))
    const resources = $('a')
      .map((i, elem) => relativePath($(elem).attr('href') || '', queueItem.url))
      .filter((i, url) => isUrl(url))
      .map((i, href) => {
        const url = new URL(href)
        url.hash = ''
        url.search = ''
        url.searchParams.set('hl', language.code)
        return url.toString()
      }).get()
    return resources
  }

  crawler.addFetchCondition((queueItem, referrerQueueItem) => {
    if (isUrl(queueItem.url)) {
      if (queueItem.url.startsWith(CREATE_HELP_CENTER_URL({ productCode: product.code }).toString())) {
        return queueItem.path.includes('/answer') || queueItem.path.includes('/topic') || queueItem.path.includes('/troubleshooter')
      }
    }
    return false
  })

  crawler.addDownloadCondition((queueItem, referrerQueueItem) => {
    return !queueItem.url.includes('visit_id')
  })

  crawler.on('fetchcomplete', (queueItem, buffer) => {
    const $ = cheerio.load(buffer.toString('utf8'))
    const title = (($('h1').text()) || '').substring(0, 200)
    const description = ($('meta[name=description]').attr('content') || '').substring(0, 200)
    const uuid = getUuid(queueItem.url)

    if (!queueItem.url.includes('/answer/') && !queueItem.url.includes('/troubleshooter/')) {
      // e.g https://support.google.com/youtube/topic/9257108
      return
    }

    if (isNaN(uuid) || !title) {
      debug({
        status: 'warn',
        message: `URL [${queueItem.url}] is not a valid answer`
      })
      return
    }

    if (isGuideSteps($)) {
      // e.g https://support.google.com/chrome/a/answer/9270224
      debug({
        status: 'warn',
        message: `${queueItem.url} is a guide with multiples steps`
      })
      return
    }

    if (isDifferentLanguage($, language.code)) {
      // e.g https://support.google.com/youtube/answer/9891124?hl=fr
      debug({
        status: 'warn',
        message: `Answer [${uuid}] for ${product.name} has not been translated in ${language.code.toUpperCase()}`
      })
      return
    }
    answers.push({
      title,
      description,
      uuid,
      LanguageId: language.id,
      ProductId: product.id
    })
    debug({
      status: 'success',
      message: `[${product.name}/${language.code}][${answers.length}]: ${title}`
    })
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
      message: `Status 404 on [${queueItem.url}]: ${response.statusMessage} ${queueItem.referrer}`
    })
  })

  crawler.on('fetch410', (queueItem, response) => {
    debug({
      status: 'error',
      message: `Status 410 on [${queueItem.url}]: ${response.statusMessage}`
    })
  })
  crawler.on('complete', () => resolve(answers))

  crawler.maxConcurrency = options.maxConcurrency = 3
  crawler.maxDepth = options.maxDepth || 8
  crawler.start()
})

export const crawlAnswers = async ({ products, languages, options }) => {
  const promises = []
  for (const product of products) {
    for (const language of languages) {
      const answers = await crawl({ product, language, options })

      const saveAnswers = async () => {
        let nbAdded = 0
        for (const answer of answers) {
          try {
            const [item, created] = await database.Answer.findOrCreate({
              where: {
                uuid: answer.uuid,
                LanguageId: answer.LanguageId,
                ProductId: answer.ProductId
              },
              defaults: answer
            })
            if (!created) {
              await database.Answer.update(item, {
                where: {
                  uuid: answer.uuid,
                  LanguageId: answer.LanguageId,
                  ProductId: answer.ProductId
                }
              })
            } else nbAdded++
          } catch (error) {
            global.Sentry.captureException(error)
            console.error(error)
          }
        }
        log({ status: 'debug', message: `[ANSWER]: ${nbAdded} answers added for ${product.name} in ${language.code}` })
        log({ status: 'debug', message: `[ANSWER]: ${answers.length - nbAdded} answers updated for ${product.name} in ${language.code}` })
        return { nbAdded, nbUpdated: answers.length - nbAdded, product, language }
      }

      // Don't need to wait for adding threads
      promises.push(saveAnswers())
    }
  }

  return promises
}
