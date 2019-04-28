import puppeteer from 'puppeteer'
import { debug } from '../utils/utils'

/**
 * Finds all anchors on the page
 * Note: Intended to be run in the context of the page.
 * @return {!Array<string>} List of anchor hrefs.
 */
const collectAnchors = () => {
  const allElements = []

  const nodes = document.querySelectorAll('*')
  nodes.forEach(element => allElements.push(element))

  return allElements
    .filter(el => el.tagName === 'A' && el.href) // Only <a />
    .filter(el => el.href !== location.href) // Don't need the actual href
    .map(a => a.href)
}

/**
 * Start crawling using options provided
 * Note: Can be long, take a coffee depending on your options.
 * @param {object} options All of the option for the crawler.
 * @param {string} options.url Required. The url to start the crawler.
 * @param {function} options.preRequest Optional. When false, abort. Or, continue with the result.
 * @param {function} options.evaluatePage Optional. Get specific content of what you want on the page.
 * @param {boolean} options.skipStrictDuplicates Optional. When true, skip duplicate url already crawled.
 * @param {number} options.maxRequest Default -1. Specific a maximum number of page crawled.
 * @param {function} options.onSuccess Optional. After getting the evaluatePage result, do something.
 * @param {boolean} options.sameOrigin Default true. Only crawl on the same origin as the option.url
 */
export default async options => {
  options.maxRequest = !isNaN(options.maxRequest) ? options.maxRequest : -1
  options.skipStrictDuplicates = typeof options.skipStrictDuplicates === 'boolean' ? options.skipStrictDuplicates : true
  options.sameOrigin = typeof options.sameOrigin === 'boolean' ? options.sameOrigin : true

  const crawledPages = new Map()

  const crawl = async (browser, url) => {
    const { preRequest, evaluatePage, skipStrictDuplicates, onSuccess, maxRequest, sameOrigin } = options
    if (preRequest && preRequest instanceof Function) {
      url = preRequest(url)
      if (!url) return
    }

    if (!!skipStrictDuplicates && crawledPages.has(url)) return
    else if (maxRequest !== -1 && crawledPages.size === maxRequest) return
    else crawledPages.set(url)

    const newPage = await browser.newPage()

    try {
      await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      let result
      if (evaluatePage && evaluatePage instanceof Function) {
        result = (await newPage.evaluate(evaluatePage)) || {}
        if (typeof result !== 'object') throw new Error('evaluatePage must return an object')
      } else {
        result = {}
      }

      if (onSuccess && onSuccess instanceof Function) await onSuccess({ result, url })

      debug(`${result.title} - added !`)

      const anchors = (await newPage.evaluate(collectAnchors)).filter(l => {
        if (sameOrigin) return new URL(l).origin === new URL(url).origin
        return true
      })

      await newPage.close()
      for (const anchor of anchors) await crawl(browser, anchor)
    } catch (error) {
      console.error(error)
      await newPage.close()
    }
  }

  const browser = await puppeteer.launch()
  await crawl(browser, options.url)
  await browser.close()
}
