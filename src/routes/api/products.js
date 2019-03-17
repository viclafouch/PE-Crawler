import express from 'express'
import models from '../../models'
const router = express.Router()

router.get('/products', async (req, res) => {
  const { count, rows } = await models.Product.findAndCountAll()
  return res.status(200).json({ result: rows, count })
})

export default router
