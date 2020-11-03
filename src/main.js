import './shared/console'
import colors from 'colors'
import server from './server'
import { crawlCommunities } from './community'
import { crawlAnswers } from './help-center'
import { LANGUAGES, PRODUCTS } from './shared/constants'

async function recursion (fn) {
  const args = arguments
  const context = this
  await fn.apply(context, args)
  return recursion(fn)
}

server.listen(3000, async () => {
  console.log(colors.debug('Server opened'))

  const products = await PRODUCTS
  const languages = await LANGUAGES

  recursion(() => crawlCommunities({ products, languages }))
  recursion(() => crawlAnswers({ products, languages }))
})
