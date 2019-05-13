import express from 'express'
import models from '../../models'
import { Op } from 'sequelize'
import { languages, maxThreads } from '../../config'

const router = express.Router()

router.post('/threads', async (req, res) => {
  const lang = req.body.lang && languages.includes(req.body.lang) ? req.body.lang : 'en'
  const limit = req.body.limit || maxThreads[0]
  const where = { lang }
  const products = await models.Product.findAll({
    where: {
      id: {
        [Op.in]: Array.isArray(req.body.productsId) ? req.body.productsId : [req.body.productsId]
      }
    }
  })

  const result = []

  for (const product of products) {
    where.ProductId = product.id
    const threads = await models.Thread.findAll({
      where,
      limit,
      attributes: ['title', 'publicUrl', 'consoleUrl', 'uuid', 'description', 'lang'],
      order: [['id', 'ASC']]
    })
    result.push({
      product,
      threads,
      lang
    })
  }

  return res.status(200).json({ result })
})

export default router
