import express from 'express'
import { Product } from '../../orm'
const router = express.Router()

router.get('/products', (req, res) => {
  Product.findAll().then(products => res.json(products))
})

export default router
