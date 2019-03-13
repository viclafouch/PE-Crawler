import { YOUTUBE_PRODUCT } from './constants'
const HCCrawler = require('headless-chrome-crawler')

let cardsCrawled = []

const baseUrl = 'https://support.google.com/youtube'
const baseUrlAnswer = baseUrl + '/answer'
const baseUrlTopics = baseUrl + '/topic'

const getId = url => {
  const { pathname } = new URL(url)
  const id = pathname.slice(pathname.lastIndexOf('/') + 1)
  return parseInt(id, 10)
}

const isValidUrl = url => url.startsWith(baseUrlAnswer) || url.startsWith(baseUrlTopics) || url === baseUrl

const crawl = orm =>
  HCCrawler.launch({
    maxDepth: 10,
    maxConcurrency: 5,
    // delay: 5000,
    retryCount: 0,
    preRequest: options => {
      if (isValidUrl(options.url)) {
        if (options.url.startsWith(baseUrlAnswer)) {
          const id = getId(options.url)
          if (cardsCrawled.some(e => e.id === id)) return false
        }
        return options
      }
      return false
    },
    evaluatePage: () => ({
      title: $('h1')
        .text()
        .trim()
    }),
    onSuccess: async ({ result, options }) => {
      try {
        const id = getId(options.url)
        const { title } = result
        const { url } = options
        const datas = {
          id,
          title,
          productId: YOUTUBE_PRODUCT,
          lang: 'fr',
          url: baseUrlAnswer + '/' + id
        }

        if (isNaN(id) && !url.startsWith(baseUrlAnswer)) return

        cardsCrawled.push(datas)
        const card = await orm.Card.findOne({
          where: {
            id
          }
        })

        if (!card) await orm.Card.create(datas)
        else
          await orm.Card.update(
            { title: datas.title },
            {
              where: {
                id
              }
            }
          )
      } catch (error) {
        console.log(error)
      }
    },
    onError(error) {}
  })

export default async orm => {
  cardsCrawled = []
  const crawler = await crawl(orm)
  await crawler.queue({
    maxDepth: 3,
    url: baseUrl,
    skipDuplicates: true,
    skipRequestedRedirect: true,
    allowedDomains: ['support.google.com']
  })

  await crawler.onIdle() // Resolved when no queue is left
  await crawler.close() // Close the crawler
  return cardsCrawled
}
