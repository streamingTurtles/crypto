
import { Router } from 'express'
import xrpl from 'xrpl'
import {
  getServerInfo,
  getAccountInfo,
  requestReadOnlyRpc
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

// Read-only, allowlisted RPC requests. Never proxy arbitrary commands or URLs.
const rpcAllowlist = new Set(['server_info', 'fee', 'ledger', 'account_info', 'account_tx', 'account_lines', 'account_objects', 'book_offers', 'amm_info', 'tx'])
router.post('/rpc', async (req, res) => {
  const { command, ...params } = req.body || {}
  if (!rpcAllowlist.has(command) || Object.keys(params).length > 12) {
    return res.status(400).json({ status: 'error', message: 'RPC command or parameters not permitted' })
  }
  if (['account_info', 'account_tx', 'account_lines', 'account_objects'].includes(command) &&
      !xrpl.isValidClassicAddress(params.account)) {
    return res.status(400).json({ status: 'error', message: 'Valid classic account address required' })
  }
  if (command === 'account_tx') params.limit = Math.min(Math.max(Number(params.limit) || 10, 1), 20)
  if (command === 'book_offers') params.limit = Math.min(Math.max(Number(params.limit) || 10, 1), 20)
  if (command === 'account_objects') params.limit = Math.min(Math.max(Number(params.limit) || 10, 1), 20)
  if (command === 'account_lines') params.limit = Math.min(Math.max(Number(params.limit) || 10, 1), 20)
  try {
    const data = await requestReadOnlyRpc({ command, ...params })
    res.json({ status: 'ok', result: data.result })
  } catch (error) {
    res.status(502).json({ status: 'error', message: 'XRPL RPC request failed', detail: String(error.message).slice(0, 200) })
  }
})

export default router