import { baseUrl, products } from './constants'
const HCCrawler = require('headless-chrome-crawler')

export const getUuid = url => {
  try {
    const { pathname } = new URL(url)
    const uuid = pathname.slice(pathname.lastIndexOf('/') + 1)
    return parseInt(uuid, 10)
  } catch (error) {
    return null
  }
}

export const isValidProductUrl = (url, productUrl) => {
  try {
    const productUrlObject = new URL(productUrl)
    const { href, pathname } = new URL(url)
    if (!href.startsWith(productUrlObject.href)) return false
    if (href === productUrlObject.href) return true
    return pathname.includes('/answer') || pathname.includes('/topic')
  } catch (error) {
    return false
  }
}

export const isRequestValid = ({ options, product }) => {
  if (isValidProductUrl(options.url, product.baseUrl)) {
    const url = new URL(options.url)
    url.hash = ''
    url.search = ''
    options.url = url.toString()
    return options
  }
  return false
}

export const actionCard = async ({ options, result, product, models }) => {
  try {
    const { title } = result
    const { url } = options
    const uuid = getUuid(url)
    if (isNaN(uuid) || !url.includes('/answer/')) return

    const datas = {
      uuid,
      title,
      lang: 'fr',
      url: product.baseUrl + '/' + uuid
    }
    if (!(await models.Card.findOne({ where: { uuid } }))) {
      await models.Card.create({
        ...datas,
        ProductId: product.id
      })
    } else await models.Card.update({ title: datas.title }, { where: { uuid } })
  } catch (error) {
    console.log(error)
    return false
  }
}

const crawl = (models, product, params) =>
  HCCrawler.launch({
    ...params,
    maxDepth: 10,
    maxConcurrency: 5,
    retryCount: 0,
    preRequest: options => isRequestValid({ options, product }),
    evaluatePage: () => ({
      title: $('h1')
        .text()
        .trim()
    }),
    onSuccess: async ({ result, options }) => actionCard({ result, options, models, product }),
    onError(error) {
      console.log(error)
    }
  })

export async function startCrawling(models, params) {
  const products = await models.Product.findAll()
  for (const product of products) {
    const crawler = await crawl(models, product, params)
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

export async function crawloop(models, params, restartAfter = 86400000) {
  for (const product of products) {
    await models.Product.create({
      name: product.name,
      baseUrl: product.url
    })
  }
  const looping = async () => {
    const start_crawling_at = new Date()
    const { Op } = models.Sequelize
    await startCrawling(models, params)
    await models.Card.destroy({
      where: {
        updatedAt: {
          [Op.lt]: start_crawling_at
        }
      }
    })
    if (process.env.NODE_ENV !== 'test') setTimeout(() => looping(), restartAfter)
  }

  await looping()
}

export default crawloop
