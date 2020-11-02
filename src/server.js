import express from 'express'

const app = express()

app.use(express.static('threads'))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

export default app
