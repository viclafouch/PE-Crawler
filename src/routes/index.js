import express from 'express'
import threads from './threads'

const router = express.Router()

router.use('/threads', threads)

export default router
