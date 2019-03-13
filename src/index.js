import path from 'path'
import crawler from './crawler'
import { createDatabase } from './orm'
import { products } from './constants'
import { Op } from 'sequelize'

const debug = true

const orm = createDatabase({
  storage: path.join(__dirname, '..', 'database_test.sqlite')
})

async function startCrawling() {
  const start_crawling = new Date()
  await crawler(orm)
  await orm.Card.destroy({
    where: {
      updatedAt: {
        [Op.lt]: start_crawling
      }
    }
  })
  setTimeout(() => startCrawling(), 1000 * 60 * 60 * 24)
}

async function init() {
  try {
    await orm.Card.sync({ force: debug })
    await orm.Product.sync({ force: debug })
    for (const product of products) {
      await orm.Product.create({
        name: product.name,
        baseUrl: product.url
      })
    }
    await startCrawling()
    return
  } catch (error) {
    console.error(error)
  }
}

orm.database
  .authenticate()
  .then(() => init())
  .catch(err => console.error('Unable to connect to the database:', err))
