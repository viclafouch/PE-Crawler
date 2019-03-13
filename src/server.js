import express from 'express'
import bodyParser from 'body-parser'
import { Card } from './orm'

const app = express()
app.use(bodyParser.json())

app.get('/api/cards', (req, res) => {
  Card.findAll().then(cards => res.json(cards))
})

export default app
