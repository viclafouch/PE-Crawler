import { baseUrl } from './constants'
const HCCrawler = require('headless-chrome-crawler')

const getUuid = url => {
  const { pathname } = new URL(url)
  const uuid = pathname.slice(pathname.lastIndexOf('/') + 1)
  return parseInt(uuid, 10)
}

const isValidUrl = (url, product) =>
  url.startsWith(product.baseUrl + '/answer/') || url.startsWith(product.baseUrl + '/topic/') || url === product.baseUrl

const crawl = (models, product) =>
  HCCrawler.launch({
    maxDepth: 10,
    maxConcurrency: 5,
    // delay: 5000,
    retryCount: 0,
    preRequest: options => {
      if (isValidUrl(options.url, product)) {
        const url = new URL(options.url)
        url.hash = ''
        url.search = ''
        options.url = url.toString()
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
        const uuid = getUuid(options.url)
        const { title } = result
        const { url } = options
        const datas = {
          uuid,
          title,
          lang: 'fr',
          url: product.baseUrl + '/' + uuid
        }

        if (isNaN(uuid) || !url.includes('/answer/')) return
        if (
          !(await models.Card.findOne({
            where: {
              uuid
            }
          }))
        ) {
          console.count()
          await models.Card.create({
            ...datas,
            productId: product.id
          })
        } else
          await models.Card.update(
            { title: datas.title },
            {
              where: {
                uuid
              }
            }
          )
      } catch (error) {
        console.log(error)
      }
    },
    onError(error) {
      console.log(error)
    }
  })

export default async models => {
  const products = await models.Product.findAll()
  for (const product of products) {
    const crawler = await crawl(models, product)
    await crawler.queue({
      maxDepth: 3,
      url: product.baseUrl,
      skipDuplicates: true,
      skipRequestedRedirect: true,
      allowedDomains: [baseUrl.hostname]
    })
    await crawler.onIdle()
    await crawler.close()
  }
}
