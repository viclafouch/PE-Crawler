import './shared/console'
import colors from 'colors'
import server, { port } from './server'
import { crawlCommunities } from './community'
import { crawlAnswers } from './help-center'
import database from '../db/models'

async function recursion (fn) {
  const args = arguments
  const context = this
  await fn.apply(context, args)
  return recursion(fn)
}

server.listen(port, async () => {
  try {
    console.log(colors.debug('Server opened'))
    await database.connectToDatabase()
    console.log(colors.debug('Database connected'))

    await database.sequelize.sync()

    recursion(async () => {
      const products = await database.Product.findAll()
      const languages = await database.Language.findAll()
      await crawlCommunities({ products, languages })
    })
    recursion(async () => {
      const products = await database.Product.findAll()
      const languages = await database.Language.findAll()
      await crawlAnswers({ products, languages })
    })
  } catch (error) {
    console.error(error)
    server.close()
    process.exit(0)
  }
})
