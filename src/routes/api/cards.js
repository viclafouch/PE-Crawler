import express from 'express'
import { Op } from 'sequelize'
import models from '../../models'
import { limit } from '../../constants'
const router = express.Router()

router.post('/cards', async (req, res) => {
  let page = parseInt(req.body.page, 10)
  page = !isNaN(page) ? page : 1
  const where = {}
  // TODO CHANGE TO iLike for PG
  if (req.body.search) where.title = { [Op.like]: `%${req.body.search}%` }

  if (req.body.productsId) {
    where.ProductId = {
      [Op.in]: Array.isArray(req.body.productsId) ? req.body.productsId : [req.body.productsId]
    }
  }
  const { count } = await models.Card.findAndCountAll({ where })
  const pages = Math.ceil(count / limit)
  const offset = limit * (page - 1)
  const cards = await models.Card.findAll({
    attributes: ['title', 'url', 'uuid'],
    limit,
    offset,
    where,
    order: [['id', 'ASC']]
  })
  return res.status(200).json({ result: cards, count, pages })
})

export default router
