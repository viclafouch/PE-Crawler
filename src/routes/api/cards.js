import express from 'express'
import { Card } from '../../orm'
import { Op } from 'sequelize'
const router = express.Router()

router.get('/cards', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10)
    page = !isNaN(page) ? page : 1
    const where = {}
    // TODO CHANGE TO iLike for PG
    if (req.query.search) where.title = { [Op.like]: `%${req.query.search}%` }
    if (req.query.productsId && Array.isArray(req.query.productsId)) {
      where.productId = {
        [Op.or]: req.query.productsId
      }
    }
    const limit = 10
    const { count } = await Card.findAndCountAll({ where })
    const pages = Math.ceil(count / limit)
    const offset = limit * (page - 1)
    const cards = await Card.findAll({
      attributes: ['title', 'url', 'uuid'],
      limit,
      offset,
      where,
      order: [['id', 'ASC']]
    })
    return res.status(200).json({ result: cards, count, pages })
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

// router.get('/card/:uid', function(req, res) {
//   var uid = req.params.uid
//
// })

export default router
