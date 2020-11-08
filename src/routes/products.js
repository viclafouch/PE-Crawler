import express from 'express'
import database from '../../db/models'

const router = express.Router()

router.get('/', async (req, res) => {
  const products = await database.Product.findAll()
  return res.status(200).json({ products: products })
})

export default router
