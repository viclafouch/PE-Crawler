import puppeteer from 'puppeteer'
import { debug } from '../utils/utils'

class Crawler {
  constructor(browser, options) {
    this._browser = browser
    this._options = Object.assign(
      {},
      {
        maxRequest: -1,
        skipStrictDuplicates: true,
        sameOrigin: true,
        parallel: 5
      },
      options
    )

    this._requestedCount = 0
    this.hostdomain = ''
    this.linksToCrawl = new Map()
    this.linksCrawled = new Map()
    this._actions = {
      preRequest: this._options.preRequest || null,
      onSuccess: this._options.onSuccess || null,
      evaluatePage: this._options.evaluatePage || null
    }
  }

  collectAnchors(page) {
    return page.evaluate(
      args => {
        const allElements = []

        const nodes = document.querySelectorAll('*')
        nodes.forEach(element => allElements.push(element))

        const links = allElements
          .filter(el => el.tagName === 'A' && el.href) // Only <a />
          // eslint-disable-next-line no-undef
          .filter(el => el.href !== location.href) // Don't need the actual href
          .filter(el => {
            if (args.sameOrigin) return new URL(el).origin === args.hostname
            return true
          })
          .map(a => a.href)

        return [...new Set(links)]
      },
      { hostname: this.hostdomain, sameOrigin: this._options.sameOrigin }
    )
  }

  async scrape(page) {
    let result = null
    if (this._actions.evaluatePage && this._actions.evaluatePage instanceof Function) {
      result = await page.evaluate(this._actions.evaluatePage)
    }
    return result
  }

  async init() {
    try {
      const link = new URL(this._options.url)
      this.hostdomain = link.origin
    } catch (error) {
      throw new Error('URL provided is not valid')
    }

    if (!this.hostdomain) return
    const links = await this.crawl(this._options.url)
    this._requestedCount++
    this.waitForQueue(links)
    await this.pull()
  }

  waitForQueue(urlCollected) {
    for (const url of urlCollected) {
      if (!this.linksToCrawl.has(url) && !this.linksCrawled.has(url)) this.linksToCrawl.set(url)
    }
  }

  async pull() {
    try {
      if (this._options.parallel < 1 || this._options.parallel > 7) {
        throw new Error('parallel option must be between 1 and 7')
      }
      const promises = []
      for (let index = 0; index < this._options.parallel; index++) {
        if (this.linksToCrawl.size > 0 && this.checkMaxRequest()) {
          const link = this.linksToCrawl.keys().next().value
          let customLink = link

          if (this._actions.preRequest && this._actions.preRequest instanceof Function) {
            customLink = this._actions.preRequest(link)
            if (!customLink) {
              this.linksToCrawl.delete(link)
              continue
            }
          }

          if (this.checkAlreadyCrawl(customLink)) {
            this.linksToCrawl.delete(link)
            continue
          }

          this._requestedCount++
          this.linksToCrawl.delete(link)
          this.linksCrawled.set(link)

          promises.push(
            new Promise(async resolve => {
              const linksCollected = await this.crawl(customLink)
              resolve({ location: link, linksCollected })
            })
          )
        }
      }

      let response = await Promise.all(promises)
      const allLinksCollected = [...new Set(response.map(e => e.linksCollected).flat())]
      const linksJustCrawled = response.map(e => e.location)
      debug(`${linksJustCrawled.length} link(s) just scraped`)
      debug(`${this.linksCrawled.size} total links crawled`)
      debug(`${this.linksToCrawl.size} total links to crawl`)
      this.waitForQueue(allLinksCollected)
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (this.linksToCrawl.size > 0) await this.pull()
    } catch (error) {
      console.error(error)
    }
  }

  checkAlreadyCrawl(url) {
    return this.linksCrawled.has(url)
  }

  checkMaxRequest() {
    if (this._options.maxRequest === -1) return true
    return this._requestedCount <= this._options.maxRequest
  }

  async crawl(url) {
    const page = await this._browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const [result, links] = await Promise.all([this.scrape(page), this.collectAnchors(page)])
    if (this._actions.onSuccess && this._actions.onSuccess instanceof Function) {
      try {
        await this._actions.onSuccess({ result, url })
      } catch (error) {
        console.error('Please try/catch your onSuccess function')
      }
    }
    return links
  }

  static async launch(options) {
    const browser = await puppeteer.launch()
    const crawler = new Crawler(browser, options)
    await crawler.init()
  }
}

export default Crawler

// /**
//  * Finds all anchors on the page
//  * Note: Intended to be run in the context of the page.
//  * @return {!Array<string>} List of anchor hrefs.
//  */

// /**
//  * Start crawling using options provided
//  * Note: Can be long, take a coffee depending on your options.
//  * @param {object} options All of the option for the crawler.
//  * @param {string} options.url Required. The url to start the crawler.
//  * @param {function} options.preRequest Optional. When false, abort. Or, continue with the result.
//  * @param {function} options.evaluatePage Optional. Get specific content of what you want on the page.
//  * @param {boolean} options.skipStrictDuplicates Optional. When true, skip duplicate url already crawled.
//  * @param {number} options.maxRequest Default -1. Specific a maximum number of page crawled.
//  * @param {function} options.onSuccess Optional. After getting the evaluatePage result, do something.
//  * @param {boolean} options.sameOrigin Default true. Only crawl on the same origin as the option.url
//  */
// export default async options => {
//   options.maxRequest = !isNaN(options.maxRequest) ? options.maxRequest : -1
//   options.skipStrictDuplicates = typeof options.skipStrictDuplicates === 'boolean' ? options.skipStrictDuplicates : true
//   options.sameOrigin = typeof options.sameOrigin === 'boolean' ? options.sameOrigin : true

//   const crawledPages = new Map()

//   const crawl = async (browser, url) => {
//     const { preRequest, evaluatePage, skipStrictDuplicates, onSuccess, maxRequest, sameOrigin } = options
//     if (preRequest && preRequest instanceof Function) {
//       url = preRequest(url)
//       if (!url) return
//     }

//     if (!!skipStrictDuplicates && crawledPages.has(url)) return
//     else if (maxRequest !== -1 && crawledPages.size === maxRequest) return
//     else crawledPages.set(url)

//     const newPage = await browser.newPage()

//     try {
//       await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
//       let result
//       if (evaluatePage && evaluatePage instanceof Function) {
//         result = (await newPage.evaluate(evaluatePage)) || {}
//         if (typeof result !== 'object') throw new Error('evaluatePage must return an object')
//       } else {
//         result = {}
//       }

//       if (onSuccess && onSuccess instanceof Function) await onSuccess({ result, url })

//       debug(`${result.title} - added !`)

//       const anchors = (await newPage.evaluate(collectAnchors)).filter(l => {
//         if (sameOrigin) return new URL(l).origin === new URL(url).origin
//         return true
//       })

//       await newPage.close()
//       for (const anchor of anchors) await crawl(browser, anchor)
//     } catch (error) {
//       console.error(error)
//       await newPage.close()
//     }
//   }

//   const browser = await puppeteer.launch()
//   await crawl(browser, options.url)
//   await browser.close()
// }
