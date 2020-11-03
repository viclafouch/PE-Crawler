import express from 'express'

const app = express()

app.use('/threads', express.static('threads'))
app.use('/answers', express.static('answers'))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

export default app
