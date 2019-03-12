import { YOUTUBE_PRODUCT } from './constants'
const HCCrawler = require('headless-chrome-crawler')

const cards = []
const baseUrl = 'https://support.google.com/youtube'
const baseUrlAnswer = baseUrl + '/answer'
const baseUrlTopics = baseUrl + '/topic'

const getId = url => {
  const { pathname } = new URL(url)
  const id = pathname.slice(pathname.lastIndexOf('/') + 1)
  return parseInt(id, 10)
}

const crawl = orm =>
  HCCrawler.launch({
    maxDepth: 10,
    maxConcurrency: 1,
    delay: 5000,
    retryCount: 0,
    preRequest: options => {
      if (options.url.startsWith(baseUrlAnswer) || options.url.startsWith(baseUrlTopics) || options.url === baseUrl) {
        if (options.url.startsWith(baseUrlAnswer)) {
          const id = getId(options.url)
          if (cards.some(e => e.id === id)) return false
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
        if (!isNaN(id) && options.url.startsWith(baseUrlAnswer)) {
          const datas = {
            id,
            title: result.title,
            productId: YOUTUBE_PRODUCT,
            lang: 'fr',
            url: baseUrlAnswer + '/' + id
          }
          cards.push(datas)
          const card = await orm.Card.findOne({
            where: {
              id
            }
          })
          if (!card) {
            await orm.Card.create(datas)
          } else {
            await orm.Card.update(
              {
                title: datas.title
              },
              {
                where: {
                  id
                }
              }
            )
          }

          console.log('TCL: cards', cards.length)
        }
      } catch (error) {
        console.log(error)
      }
    },
    onError(error) {
      console.warn(error)
    }
  })

export default async orm => {
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
  return cards
}
