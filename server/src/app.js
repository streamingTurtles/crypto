import express from 'express'
import cors from 'cors'

import healthRoutes from './routes/healthRoutes.js'
import xrplRoutes from './routes/xrplRoutes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/xrpl', xrplRoutes)

export default app