
import { Router } from 'express'
import {
  getServerInfo,
  getAccountInfo
} from '../services/xrplService.js'


import requireAuth from '../middleware/requireAuth.js'


const router = Router()

// every route defined after this line requires authentication
router.use(requireAuth) // Apply authentication middleware to all XRPL routes

router.get('/server-info', async (req, res) => {
  try {
    const data = await getServerInfo()

    res.json(data)
  } catch (error) {
    console.error('XRPL server info error:', error)

    res.status(500).json({
      status: 'error',
      message: 'Unable to retrieve XRPL server information'
    })
  }
})

router.get('/account/:address', async (req, res) => {
  try {
    const data = await getAccountInfo(req.params.address)

    res.json(data)
  } catch (error) {
    console.error('XRPL account info error:', error)

    res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Unable to retrieve XRPL account'
    })
  }
})

export default router