import { debug, retryRequest } from '../utils/utils'
import fetch from 'node-fetch'
import cheerio from 'cheerio'

class Crawler {
  constructor(options) {
    this._options = Object.assign(
      {},
      {
        maxRequest: -1,
        skipStrictDuplicates: true,
        sameOrigin: true,
        maxDepth: 3,
        parallel: 50
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

  /**
   * Get all links from the page except the actual location
   * @param {!Page} page
   * @return {!Promise<Array<string>>}
   */
  collectAnchors($, actualHref) {
    const { origin, protocol } = new URL(actualHref)
    return $('a')
      .map((i, e) => {
        const href = $(e).attr('href') || ''
        if (href.startsWith('//')) return protocol + href
        else if (href.startsWith('/')) return origin + href
        else return href
      })
      .filter((i, href) => {
        try {
          return !!new URL(href)
        } catch (error) {
          return false
        }
      })
      .get()
  }

  /**
   * Check if link can be crawled (Same origin ? Already collected ? preRequest !false ?)
   * @param {!string} link
   * @return {!Promise<Boolean>}
   */
  async skipRequest(link) {
    const allowOrigin = this.checkSameOrigin(link)
    if (!allowOrigin) return true
    if (this._options.skipStrictDuplicates && this.linkAlreadyCollected(link)) return true
    const shouldRequest = await this.shouldRequest(link)
    if (!shouldRequest) return true
    return false
  }

  /**
   * If preRequest is provided by the user, get new link or false
   * @param {!string} link
   * @return {!Promise<String || Boolean>}
   */
  async shouldRequest(link) {
    if (this._actions.preRequest && this._actions.preRequest instanceof Function) {
      try {
        const preRequest = await this._actions.preRequest(link)
        if (typeof preRequest === 'string' || preRequest === false) {
          return preRequest
        }
        throw new Error('preRequest function must return a string or false')
      } catch (error) {
        console.error('Please try/catch your preRequest function')
        console.log(error.message)
      }
    }
    return link
  }

  /**
   * Check if link has the same origin as the host link
   * @param {!String} url
   * @return {!Boolean}
   */
  checkSameOrigin(url) {
    if (this._options.sameOrigin) return new URL(url).origin === this.hostdomain
    return true
  }

  /**
   * If evaluatePage is provided by the user, await for it
   * @param {!Page} page
   * @return {!Promise<any>}
   */
  async evaluate($) {
    let result = null
    if (this._actions.evaluatePage && this._actions.evaluatePage instanceof Function) {
      result = await this._actions.evaluatePage($)
    }
    return result
  }

  /**
   * Init the app. Begin with the first link, and start the pulling
   * @return {!Promise<pending>}
   */
  async init() {
    try {
      const link = new URL(this._options.url)
      this.hostdomain = link.origin
    } catch (error) {
      throw new Error('URL provided is not valid')
    }

    if (!this.hostdomain) return
    const sanitizedUrl = await this.shouldRequest(this._options.url)
    if (!sanitizedUrl) return
    const { linksCollected } = await this.scrapePage(sanitizedUrl)
    this.linksCrawled.set(sanitizedUrl, 0)
    this._requestedCount++
    await this.addToQueue(linksCollected, 1)
    await this.followLinks()
  }

  /**
   * Start pulling links if there are any
   * @return {!Promise<pending>}
   */
  followLinks() {
    if (this.linksToCrawl.size > 0) return this.pull()
  }

  /**
   * Add links collected to queue
   * @param {!Array<string>} urlCollected
   * @param {!Number} depth
   * @return {!Promise<pending>}
   */
  async addToQueue(urlCollected, depth = 0) {
    for (const url of urlCollected) {
      if (depth <= this._options.maxDepth && !(await this.skipRequest(url))) {
        this.linksToCrawl.set(await this.shouldRequest(url), depth)
      }
    }
  }

  async pull() {
    try {
      const promises = []
      let canRequested = true
      for (let index = 0; index < this._options.parallel; index++) {
        canRequested = this.checkMaxRequest()
        if (!canRequested || this.linksToCrawl.size === 0) break

        const currentLink = this.linksToCrawl.keys().next().value
        const currentDepth = this.linksToCrawl.get(currentLink)

        this._requestedCount++
        this.linksToCrawl.delete(currentLink)
        this.linksCrawled.set(currentLink)

        promises.push(
          new Promise(resolve =>
            this.scrapePage(currentLink).then(async ({ result, linksCollected }) => {
              await this.scrapeSucceed({ urlScraped: currentLink, result })
              return resolve({
                location: currentLink,
                linksCollected,
                currentDepth
              })
            })
          )
        )
      }

      const response = await Promise.all(promises)
      for (const res of response) {
        await this.addToQueue(res.linksCollected, res.currentDepth + 1)
      }

      debug(`${response.length} link(s) just scraped`)
      debug(`${this.linksCrawled.size} total links crawled`)
      debug(`${this.linksToCrawl.size} total links to crawl`)
      await new Promise(resolve => setTimeout(resolve, 300))
      if (canRequested) return this.followLinks()
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Get if a link will be crawled or has already been crawled.
   * @param {!String} url
   * @return {!Boolean}
   */
  linkAlreadyCollected(url) {
    return this.linksCrawled.has(url) || this.linksToCrawl.has(url)
  }

  /**
   * Know if we have exceeded the number of request max provided in the options.
   * @return {!Boolean}
   */
  checkMaxRequest() {
    if (this._options.maxRequest === -1) return true
    return this._requestedCount <= this._options.maxRequest
  }

  /**
   * If onSuccess action's has been provided, await for it.
   * @param {!Object<{urlScraped: string, result}>}
   * @return {!Promise<pending>}
   */
  async scrapeSucceed({ urlScraped, result }) {
    if (this._actions.onSuccess && this._actions.onSuccess instanceof Function) {
      try {
        await this._actions.onSuccess({ result, url: urlScraped })
      } catch (error) {
        console.error('Please try/catch your onSuccess function')
      }
    }
  }

  /**
   * Scrap a page, evaluate and get new links to visit.
   * @param {!String} url
   * @return {Promise<{linksCollected: array, result, url: string}>}
   */
  async scrapePage(url) {
    const retriedFetch = retryRequest(fetch, 2)
    try {
      const textBuffer = await retriedFetch(url)
      const textResponse = await textBuffer.text()
      const $ = cheerio.load(textResponse)
      const [result, linksCollected] = await Promise.all([this.evaluate($), this.collectAnchors($, url)])
      return { linksCollected, result, url }
    } catch (error) {
      console.error('I am 💩')
    }
  }

  /**
   * Starting the crawl.
   * @param {!0bject} options
   * @return {Promise<{startCrawlingAt: date, finishCrawlingAt: date, linksVisited: array}>}
   */
  static async launch(options) {
    const startCrawlingAt = new Date()
    const crawler = new Crawler(options)
    await crawler.init()
    const finishCrawlingAt = new Date()
    return { startCrawlingAt, finishCrawlingAt, linksVisited: crawler.linksCrawled.size }
  }
}

export default Crawler
