import dotenv from 'dotenv'
import app from './app.js'

dotenv.config()

const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || 3020

app.listen(PORT, HOST, () => {
  console.log(`API running at http://${HOST}:${PORT}`)
})