import express from 'express'
import threads from './threads'
import answers from './answers'
import products from './products'
import languages from './languages'

const router = express.Router()

router.use('/threads', threads)
router.use('/answers', answers)
router.use('/products', products)
router.use('/languages', languages)

export default router
