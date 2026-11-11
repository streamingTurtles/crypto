import { useEffect, useState } from 'react'
import { isInstalled, getAddress, getNetwork, submitTransaction } from '@gemwallet/api'
import WalletAssetGallery from './WalletAssetGallery.jsx'

async function request(url, options) {
  const res = await fetch(url, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}
const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
export default function TokenizationStudio({ onOpenRpc }) {
  const [provider, setProvider] = useState('')
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState('')
  const [xamanEnabled, setXamanEnabled] = useState(false)
  const [name, setName] = useState('Vintage baseball card')
  const [description, setDescription] = useState('Physical collectible — demonstration record')
  const [condition, setCondition] = useState('Owner-reported; not independently graded')
  const [photoUrl, setPhotoUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Connect a Testnet wallet to begin.')
  const [hash, setHash] = useState('')
  const [verified, setVerified] = useState(null)
  const [signLink, setSignLink] = useState('')
  const [qr, setQr] = useState('')
  useEffect(() => { request('/api/hackathon/config').then(d => setXamanEnabled(d.xamanEnabled)).catch(() => {}) }, [])
  async function connectGem() {
    setBusy(true); setMessage('Checking GemWallet…')
    try {
      const installed = await isInstalled()
      if (!installed.result?.isInstalled) throw new Error('Install the GemWallet browser extension first.')
      const n = await getNetwork()
      if (n.type !== 'response' || n.result?.network !== 'Testnet') throw new Error('Switch GemWallet to XRPL Testnet before connecting.')
      const a = await getAddress()
      if (a.type !== 'response' || !a.result?.address) throw new Error('Wallet connection was not approved.')
      setProvider('gem'); setAddress(a.result.address); setNetwork('Testnet'); setMessage('GemWallet connected. Ready to prepare NFT metadata.')
    } catch (e) { setMessage(e.message) }
    finally { setBusy(false) }
  }
  async function pollXaman(uuid, mode) {
    for (let i=0; i<60; i++) {
      await sleep(3000)
      const d = await request(`/api/hackathon/xaman/status/${encodeURIComponent(uuid)}`)
      if (d.expired || d.cancelled || (d.resolved && !d.signed)) throw new Error('Xaman request expired or was rejected.')
      if (d.signed) {
        setSignLink(''); setQr('')
        if (mode === 'connect') {
          if (!d.account) throw new Error('Xaman did not provide an account.')
          setAddress(d.account); setProvider('xaman'); setNetwork('Testnet'); setMessage('Xaman connected. Confirm the wallet uses Testnet before minting.')
        } else {
          if (!d.txid) throw new Error('Xaman signed but did not return a submitted transaction hash.')
          await verify(d.txid)
        }
        return
      }
    }
    throw new Error('Xaman approval timed out; please retry.')
  }
  async function xaman(mode, hexUri) {
    const d = await post('/api/hackathon/xaman/request', { mode, address, hexUri })
    setSignLink(d.link); setQr(d.qr || '')
    setMessage('Open the signing link in Xaman or scan the QR code. Waiting for approval…')
    await pollXaman(d.uuid, mode)
  }
  async function connectXaman() {
    if (!xamanEnabled) return
    setBusy(true)
    try { await xaman('connect') } catch(e) { setMessage(e.message) }
    finally { setBusy(false) }
  }
  async function verify(txHash) {
    setHash(txHash); setMessage('Checking validated transaction on XRPL Testnet…')
    for (let i=0; i<12; i++) {
      try {
        const d = await request(`/api/hackathon/verify/${txHash}`)
        if (d.validated) {
          setVerified(d)
          if (!d.success || d.transactionType !== 'NFTokenMint' || d.account !== address) throw new Error('Validated transaction did not match a successful mint from the connected wallet.')
          setMessage('Success: NFTokenMint validated on XRPL Testnet. Open RPC account_nfts to inspect your NFT.')
          return
        }
      } catch(e) { if (i === 11) throw e }
      await sleep(2500)
    }
    throw new Error('Transaction not yet validated. Use the transaction hash in RPC console to check again.')
  }
  async function tokenize(event) {
    event.preventDefault()
    if (!provider || network !== 'Testnet') { setMessage('Connect a Testnet wallet first.'); return }
    setBusy(true); setHash(''); setVerified(null)
    try {
      const meta = await post('/api/hackathon/metadata', { name, description, condition, photoUrl })
      if (provider === 'gem') {
        const n = await getNetwork(); const a = await getAddress()
        if (n.result?.network !== 'Testnet' || a.result?.address !== address) throw new Error('GemWallet network/account changed. Reconnect before minting.')
        setMessage('Approve NFTokenMint in GemWallet…')
        const response = await submitTransaction({ transaction: { TransactionType: 'NFTokenMint', Account: address, NFTokenTaxon: 0, Flags: 8, URI: meta.hexUri } })
        if (response.type !== 'response' || !response.result?.hash) throw new Error('GemWallet mint was rejected or not submitted.')
        await verify(response.result.hash)
      } else await xaman('mint', meta.hexUri)
    } catch(e) { setMessage(e.message) }
    finally { setBusy(false) }
  }
  return <div className="token-studio">
    <section className="panel"><h1>Tokenize a physical object</h1><p>Hackathon demo · XRPL Testnet · Real NFT minting with wallet approval</p><div className="token-steps"><span>1. Connect</span><span>2. Describe</span><span>3. Sign & mint</span><span>4. Verify</span></div>
      <h2>1 · Connect your wallet</h2><div className="wallet-buttons"><button disabled={busy} onClick={connectGem}>Connect GemWallet</button><button disabled={busy || !xamanEnabled} title={xamanEnabled?'Connect Xaman':'Coming soon — activate with Xaman developer credentials'} onClick={connectXaman}>Connect Xaman {!xamanEnabled && '🔒 Coming soon'}</button></div>
      <label>Public XRPL r-address<input value={address} onChange={e=>{setAddress(e.target.value);setProvider('');setNetwork('');setMessage('Address edited: reconnect your wallet to authorize minting.')}} placeholder="r..." autoComplete="off"/></label><p className="token-muted">{provider ? `Connected through ${provider === 'gem'?'GemWallet':'Xaman'} · ${network}` : 'Entering an address alone does not authorize NFT minting.'}</p>
      {signLink && <div className="sign-box"><a href={signLink} target="_blank" rel="noreferrer">Open Xaman approval request</a>{qr && <img alt="Xaman signing QR code" src={qr}/>}</div>}
    </section>



  {/* connecting the gallery component to the existing studion */}
  {provider && network === 'Testnet' && address && (
    <WalletAssetGallery
      key={`${provider}:${network}:${address}`}
      address={address}
      onOpenRpc={onOpenRpc}
    />
  )}





    <section className="panel"><h2>2 · Describe your physical item</h2><form className="token-form" onSubmit={tokenize}><label>Item name<input maxLength={100} required value={name} onChange={e=>setName(e.target.value)}/></label><label>Description<textarea rows={3} maxLength={1200} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Condition / grading disclosure<input maxLength={80} value={condition} onChange={e=>setCondition(e.target.value)}/></label><label>Public HTTPS photo URL (optional)<input type="url" placeholder="https://..." value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)}/></label><p className="token-muted">This is owner-supplied information, not independent authentication. NFT metadata must be publicly hosted before a public-facing mint.</p><button disabled={busy || !provider || network !== 'Testnet'} type="submit">{busy?'Processing…':'3 · Tokenize — request wallet signature'}</button></form></section>
    <section className="panel"><h2>4 · Ledger verification</h2><p role="status">{message}</p>{hash && <><p>Transaction hash: <code className="hash-text">{hash}</code></p><button onClick={()=>onOpenRpc({ command: 'tx', transaction: hash })}>Verify transaction in RPC</button> <button onClick={()=>onOpenRpc({ command: 'account_nfts', account: address, limit: 20 })}>View wallet NFTs in RPC</button></>}{verified && <p>Validated: {String(verified.validated)} · Engine result: {verified.result?.meta?.TransactionResult || 'see RPC'} · NFT ID: {verified.nftId || 'Find minted token using account_nfts'}</p>}</section>
  </div>
}
