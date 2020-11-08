import express from 'express'
import asyncHandler from 'express-async-handler'
import database from '../../db/models'

const router = express.Router()

router.get('/', asyncHandler(async (req, res) => {
  const products = await database.Product.findAll()
  return res.status(200).json({ products: products })
}))

export default router
