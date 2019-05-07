import express from 'express'
const router = express.Router()

router.get('/products', async (req, res) => {
  const { count, rows } = await res.context.models.Product.findAndCountAll()
  return res.status(200).json({ result: rows, count })
})

export default router
