import { Router } from 'express'
import { randomUUID, createHash } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import xrpl from 'xrpl'
import requireAuth from '../middleware/requireAuth.js'
import { requestReadOnlyRpc } from '../services/xrplService.js'

const router = Router()
router.get('/metadata/:sha256', async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.sha256)) return res.status(400).json({ message: 'Invalid metadata hash' })
  try { res.type('json').send(await readFile(join(metadataDir, `${req.params.sha256}.json`), 'utf8')) } catch { res.status(404).json({ message: 'Metadata not found' }) }
})
router.use(requireAuth)
const xamanEnabled = () => process.env.ENABLE_XAMAN === 'true' && Boolean(process.env.XAMAN_API_KEY && process.env.XAMAN_API_SECRET)
const pending = new Map()
const metadataDir = join(process.cwd(), 'data', 'nft-metadata')
const base = 'https://xumm.app/api/v1/platform'
const headers = () => ({ 'Content-Type': 'application/json', 'X-API-Key': process.env.XAMAN_API_KEY, 'X-API-Secret': process.env.XAMAN_API_SECRET })
const own = (req, id) => { const record = pending.get(id); return record && record.userId === String(req.user.id) ? record : null }
function purge() { for (const [id, record] of pending) if (Date.now() - record.created > 30 * 60_000) pending.delete(id) }
async function xaman(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: headers(), signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`Xaman API returned HTTP ${response.status}`)
  return response.json()
}
router.get('/config', (req, res) => res.json({ xamanEnabled: xamanEnabled(), network: 'Testnet' }))
router.post('/metadata', async (req, res) => {
  const { name, description, condition, photoUrl } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof description !== 'string' || description.length > 1200 || typeof condition !== 'string' || condition.length > 80 || (photoUrl && (typeof photoUrl !== 'string' || photoUrl.length > 500 || !/^https:\/\//.test(photoUrl)))) return res.status(400).json({ message: 'Invalid item fields' })
  const item = { schema: 'streamingturtles-hackathon-v1', name: name.trim(), description: description.trim(), condition: condition.trim(), image: photoUrl || null, verified: false, createdAt: new Date().toISOString(), id: randomUUID() }
  const serialized = JSON.stringify(item)
  const sha256 = createHash('sha256').update(serialized).digest('hex')
  // Self-contained JSON data URI, avoids a mutable or inaccessible metadata server.
  // XRPL NFToken URI is limited to 256 bytes, so store compact evidence anchor instead.
  const baseUrl = process.env.PUBLIC_BASE_URL
  if (!baseUrl || !/^https:\/\/[^/]+$/.test(baseUrl)) return res.status(503).json({ message: 'Set PUBLIC_BASE_URL to the HTTPS origin where the backend metadata route is publicly accessible before minting.' })
  const anchor = `${baseUrl}/api/hackathon/metadata/${sha256}`
  await mkdir(metadataDir, { recursive: true })
  await writeFile(join(metadataDir, `${sha256}.json`), serialized, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e })
  const hexUri = Buffer.from(anchor, 'utf8').toString('hex').toUpperCase()
  res.json({ metadata: item, sha256, uri: anchor, hexUri })
})
router.get('/verify/:hash', async (req, res) => {
  if (!/^[A-Fa-f0-9]{64}$/.test(req.params.hash)) return res.status(400).json({ message: 'Invalid transaction hash' })
  try {
    const result = (await requestReadOnlyRpc({ command: 'tx', transaction: req.params.hash, binary: false })).result
    const meta = result.meta || result.metaData
    const nodes = meta?.AffectedNodes || []
    const nftId = nodes.map(n => n.CreatedNode).filter(n => n?.LedgerEntryType === 'NFTokenPage').flatMap(n => n.NewFields?.NFTokens || []).map(n => n.NFToken?.NFTokenID).find(Boolean)
    res.json({ validated: result.validated === true, success: meta?.TransactionResult === 'tesSUCCESS', transactionType: result.TransactionType, account: result.Account, hash: result.hash || req.params.hash, nftId: nftId || null, result })
  } catch (e) { res.status(502).json({ message: 'Transaction not found or XRPL lookup failed', detail: String(e.message).slice(0,150) }) }
})
router.post('/xaman/request', async (req, res) => {
  if (!xamanEnabled()) return res.status(503).json({ message: 'Xaman is disabled until developer credentials are configured.' })
  const { mode, address, hexUri } = req.body || {}
  if (!['connect','mint'].includes(mode)) return res.status(400).json({ message: 'Invalid mode' })
  if (mode === 'mint' && (!xrpl.isValidClassicAddress(address) || !/^(?:[A-Fa-f0-9]{2}){1,256}$/.test(hexUri || ''))) return res.status(400).json({ message: 'Invalid mint parameters' })
  try {
    purge()
    const txjson = mode === 'connect' ? { TransactionType: 'SignIn' } : { TransactionType: 'NFTokenMint', Account: address, NFTokenTaxon: 0, Flags: 8, URI: hexUri }
    const data = await xaman('/payload', { method: 'POST', body: JSON.stringify({ txjson, options: { submit: true, expire: 5, force_network: 'TESTNET' }, custom_meta: { instruction: mode === 'connect' ? 'Connect Testnet wallet to StreamingTurtles' : 'Mint an XRPL Testnet NFT for StreamingTurtles' } }) })
    if (!data.uuid || !data.next?.always) throw new Error('Xaman did not return a signing link')
    pending.set(data.uuid, { userId: String(req.user.id), created: Date.now(), mode, address })
    res.json({ uuid: data.uuid, link: data.next.always, qr: data.refs?.qr_png || null })
  } catch (e) { res.status(502).json({ message: String(e.message).slice(0,160) }) }
})
router.get('/xaman/status/:uuid', async (req, res) => {
  if (!xamanEnabled()) return res.status(503).json({ message: 'Xaman disabled' })
  const record = own(req, req.params.uuid)
  if (!record) return res.status(404).json({ message: 'Unknown signing request' })
  try {
    const data = await xaman(`/payload/${encodeURIComponent(req.params.uuid)}`)
    const signed = data.meta?.signed === true
    const account = signed ? data.response?.account : null
    if (signed && record.mode === 'mint' && account !== record.address) return res.status(409).json({ message: 'Signing wallet differs from selected account' })
    res.json({ signed, resolved: data.meta?.resolved === true, expired: data.meta?.expired === true, cancelled: data.meta?.cancelled === true, account, txid: signed ? data.response?.txid : null })
  } catch (e) { res.status(502).json({ message: String(e.message).slice(0,160) }) }
})
export default router
