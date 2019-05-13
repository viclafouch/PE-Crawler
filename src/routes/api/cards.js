import express from 'express'
import { Op } from 'sequelize'
import { limit, languages } from '../../config'
import models from '../../models'
const router = express.Router()

/**
 * Get Cards (
 * @params = {
    page: Number
    search: String
    lang: String
    productsId: Array <Number>
 })
  * @return = {
    result: Array <Card>
    count: Number
    pages: Number
  }
 */
router.post('/cards', async (req, res) => {
  let page = parseInt(req.body.page, 10)
  page = !isNaN(page) ? page : 1
  const where = {}
  // TODO CHANGE TO iLike for PG
  if (req.body.search) {
    const op = process.env.NODE_ENV === 'production' ? Op.iLike : Op.like
    where.title = { [op]: `%${req.body.search}%` }
  }
  if (req.body.lang && languages.includes(req.body.lang)) where.lang = req.body.lang
  if (req.body.productsId) {
    where.ProductId = {
      [Op.in]: Array.isArray(req.body.productsId) ? req.body.productsId : [req.body.productsId]
    }
  }
  const { count } = await models.Card.findAndCountAll({ where })
  const pages = Math.ceil(count / limit)
  const offset = limit * (page - 1)
  const cards = await models.Card.findAll({
    attributes: ['title', 'url', 'uuid', 'description', 'lang'],
    limit,
    offset,
    where,
    order: [['id', 'ASC']],
    include: [
      {
        model: models.Product,
        required: true,
        as: 'Product',
        attributes: ['name', 'id']
      }
    ]
  })
  return res.status(200).json({ result: cards, count, pages })
})

export default router
