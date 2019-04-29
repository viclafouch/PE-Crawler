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
        maxDepth: 3,
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

  /**
   * Get all links from the page except the actual location
   * @param {!Page} page
   * @return {!Promise<Array<string>>}
   */
  collectAnchors(page) {
    return page.evaluate(() => {
      const allElements = []

      const nodes = document.querySelectorAll('*')
      nodes.forEach(element => allElements.push(element))

      const links = allElements
        .filter(el => el.tagName === 'A' && el.href) // Only <a />
        // eslint-disable-next-line no-undef
        .filter(el => el.href !== location.href) // Don't need the actual href
        .map(a => a.href)

      return [...new Set(links)]
    })
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
        if (typeof preRequest === 'string' || !!preRequest === preRequest) {
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
  async evaluate(page) {
    let result = null
    if (this._actions.evaluatePage && this._actions.evaluatePage instanceof Function) {
      result = await page.evaluate(this._actions.evaluatePage)
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
    const { linksCollected } = await this.scrapePage(this._options.url)
    this.linksCrawled.set(this._options.url, 0)
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
      if (this._options.parallel < 1 || this._options.parallel > 7) {
        throw new Error('parallel option must be between 1 and 7')
      }
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
    const page = await this._browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const [result, linksCollected] = await Promise.all([this.evaluate(page), this.collectAnchors(page)])
    await page.close()
    return { linksCollected, result, url }
  }

  /**
   * Starting the crawl.
   * @param {!0bject} options
   * @return {Promise<{startCrawlingAt: date, finishCrawlingAt: date, linksVisited: array}>}
   */
  static async launch(options) {
    const startCrawlingAt = new Date()
    const browser = await puppeteer.launch()
    const crawler = new Crawler(browser, options)
    await crawler.init()
    const finishCrawlingAt = new Date()
    await crawler._browser.close()
    return { startCrawlingAt, finishCrawlingAt, linksVisited: crawler.linksCrawled.size }
  }
}

export default Crawler
