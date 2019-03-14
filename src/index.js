import { Op } from 'sequelize'
import crawler from './crawler'
import { Card, Product, orm as database } from './orm'
import { products } from './constants'
import server from './server'

async function startCrawling() {
  const start_crawling = new Date()
  await crawler({ Card, Product })
  await Card.destroy({
    where: {
      updatedAt: {
        [Op.lt]: start_crawling
      }
    }
  })
  setTimeout(() => startCrawling(), 1000 * 60 * 60 * 24)
}

async function startApp() {
  console.log('Server is now listening')
  try {
    for (const product of products) {
      await Product.create({
        name: product.name,
        baseUrl: product.url
      })
    }
    // await startCrawling()
    return
  } catch (error) {
    console.error(error)
  }
}

database
  .authenticate() // Connection to Database
  .then(async () => await database.sync({ force: false })) // Sync database
  .then(async () => await server.listen(3000)) // Start server
  .then(() => startApp())
  .catch(err => console.error('Unable to start', err))
