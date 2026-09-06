import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'crypto-xrpl-api'
  })
})

export default router