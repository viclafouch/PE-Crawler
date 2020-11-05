import './shared/console'
import colors from 'colors'
import server, { port } from './server'
import { crawlCommunities } from './community'
import { crawlAnswers } from './help-center'
import { LANGUAGES, PRODUCTS } from './shared/constants'

async function recursion (fn) {
  const args = arguments
  const context = this
  await fn.apply(context, args)
  return recursion(fn)
}

server.listen(port, async () => {
  console.log(colors.debug('Server opened'))

  const products = await PRODUCTS
  const languages = await LANGUAGES

  recursion(() => crawlCommunities({ products, languages }))
  recursion(() => crawlAnswers({ products, languages }))
})
