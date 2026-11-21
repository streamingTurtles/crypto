import { useEffect, useRef, useState } from 'react'
import { isInstalled, getAddress, getNetwork, submitTransaction } from '@gemwallet/api'
import WalletAssetGallery from './WalletAssetGallery.jsx'

async function request(url, options) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`)
  }
  return data
}

const post = (url, body) => request(url, {
  method: 'POST',
  body: JSON.stringify(body)
})
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default function TokenizationStudio({
  wallet,
  onWalletChange,
  onOpenRpc,
  walletVerified,
  captureWalletSession,
  beginWalletInteraction,
  galleryColumns,
  setGalleryColumns
  }) {
  const { provider, address, network } = wallet
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const [xamanEnabled, setXamanEnabled] = useState(false)
  const [name, setName] = useState('Vintage baseball card')
  const [description, setDescription] = useState('Physical collectible — demonstration record')
  const [condition, setCondition] = useState('Owner-reported; not independently graded')
  const [photoUrl, setPhotoUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(
    provider
      ? 'Wallet connection retained. Gallery ownership is checked on Testnet.'
      : 'Connect a Testnet wallet to begin.'
  )
  const [hash, setHash] = useState('')
  const [verified, setVerified] = useState(null)
  const [signLink, setSignLink] = useState('')
  const [qr, setQr] = useState('')

  useEffect(() => {
    request('/api/hackathon/config')
      .then(data => setXamanEnabled(data.xamanEnabled))
      .catch(() => {})
  }, [])


  async function connectGem() {
    const endWalletInteraction = beginWalletInteraction()
    const sessionIsCurrent = captureWalletSession()
    const canContinue = () => (
        mounted.current &&
        sessionIsCurrent()
      )

    setBusy(true)
    setMessage('Checking GemWallet…')

    try {
      const installed = await isInstalled()
      if (!canContinue()) return
      if (!installed.result?.isInstalled) {
        throw new Error('Install the GemWallet browser extension first.')
      }
      const n = await getNetwork()
      if (!canContinue()) return
      if (n.type !== 'response' || n.result?.network !== 'Testnet') {
        throw new Error('Switch GemWallet to XRPL Testnet before connecting.')
      }
      const a = await getAddress()
      if (!canContinue()) return
      if (a.type !== 'response' || !a.result?.address) {
        throw new Error('Wallet connection was not approved.')
      }
      onWalletChange({
        provider: 'gem',
        address: a.result.address,
        network: 'Testnet'
      })
      setMessage('GemWallet connected. Ready to prepare NFT metadata.')
    } catch (error) {
      if (canContinue()) setMessage(error.message)
    } finally {
      endWalletInteraction()
      if (mounted.current) setBusy(false)
    }
  }


  async function pollXaman(uuid, mode) {
    for (let i = 0; i < 60; i++) {
      await sleep(3000)
      const d = await request(`/api/hackathon/xaman/status/${encodeURIComponent(uuid)}`)
      if (d.expired || d.cancelled || (d.resolved && !d.signed)) {
        throw new Error('Xaman request expired or was rejected.')
      }
      if (d.signed) {
        setSignLink('')
        setQr('')
        if (mode === 'connect') {
          if (!d.account) {
            throw new Error('Xaman did not provide an account.')
          }

          if (!mounted.current) return
          onWalletChange({
            provider: 'xaman',
            address: d.account,
            network: 'Testnet'
          })
          setMessage('Xaman connected. Confirm the wallet uses Testnet before minting.')
        } else {
          if (!d.txid) {
            throw new Error('Xaman signed but did not return a submitted transaction hash.')
          }
          await verify(d.txid)
        }
        return
      }
    }
    throw new Error('Xaman approval timed out; please retry.')
  }

  async function xaman(mode, hexUri) {
    const d = await post('/api/hackathon/xaman/request', { mode, address, hexUri })
    setSignLink(d.link)
    setQr(d.qr || '')
    setMessage('Open the signing link in Xaman or scan the QR code. Waiting for approval…')
    await pollXaman(d.uuid, mode)
  }

  async function connectXaman() {
    if (!xamanEnabled) return
    setBusy(true)
    try {
      await xaman('connect')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function verify(txHash) {
    setHash(txHash)
    setMessage('Checking validated transaction on XRPL Testnet…')
    for (let i = 0; i < 12; i++) {
      try {
        const d = await request(`/api/hackathon/verify/${txHash}`)
        if (d.validated) {
          setVerified(d)
          if (!d.success || d.transactionType !== 'NFTokenMint' || d.account !== address) {
            throw new Error('Validated transaction did not match a successful mint from the connected wallet.')
          }
          setMessage('Success: NFTokenMint validated on XRPL Testnet. Open RPC account_nfts to inspect your NFT.')
          return
        }
      } catch (e) {
        if (i === 11) throw e
      }
      await sleep(2500)
    }
    throw new Error('Transaction not yet validated. Use the transaction hash in RPC console to check again.')
  }

  function checkTokenizationReady() {
    let notice = ''

    if (provider !== 'gem' || !address) {
      notice =
        'Press "Connect GemWallet" before you can tokenize an asset.'
    } else if (network !== 'Testnet') {
      notice =
        'Select Testnet in GemWallet, then press "Connect GemWallet" ' +
        'before you can tokenize an asset.'
    } else if (!walletVerified) {
      notice =
        'Press "Verify wallet connection" before you can tokenize an asset. ' +
        'If the account has changed, reconnect using "Connect GemWallet".'
    }
    if (!notice) return true
    setMessage(notice)
    window.alert(notice)
    return false
  }
    async function tokenize(event) {
      event.preventDefault()
      if (busy || !checkTokenizationReady()) return
      const endWalletInteraction = beginWalletInteraction()
      const sessionIsCurrent = captureWalletSession()
      const canContinue = () => mounted.current && sessionIsCurrent()
      setBusy(true)
      setHash('')
      setVerified(null)
      try {
            const meta = await post(
            '/api/hackathon/metadata',
            { name, description, condition, photoUrl }
          )

        if (!canContinue()) return

        if (provider === 'gem') {
          const n = await getNetwork()
          if (!canContinue()) return

          const a = await getAddress()
          if (!canContinue()) return

          if (
            n.type !== 'response' ||
            a.type !== 'response' ||
            n.result?.network !== 'Testnet' ||
            a.result?.address !== address
          ) {
            throw new Error(
              'GemWallet network/account changed. Reconnect before minting.'
            )
          }

          setMessage('Approve NFTokenMint in GemWallet…')

          const response = await submitTransaction({
            transaction: {
              TransactionType: 'NFTokenMint',
              Account: address,
              NFTokenTaxon: 0,
              Flags: 8,
              URI: meta.hexUri
            }
          })

          if (response.type !== 'response' || !response.result?.hash) {
            if (!canContinue()) return
            throw new Error('GemWallet mint was rejected or not submitted.')
          }

          // A returned hash must not be treated as an undone transaction.
          if (!canContinue()) {
            console.info(
              'A prior wallet operation returned a transaction hash. ' +
              'Disconnect does not cancel a submitted transaction.',
              {
                account: address,
                network,
                hash: response.result.hash
              }
            )
            return
          }

          await verify(response.result.hash)
        } else {
          await xaman('mint', meta.hexUri)
        }
      } catch (error) {
        if (canContinue()) setMessage(error.message)
      } finally {
        endWalletInteraction()
        if (mounted.current) setBusy(false)
      }
  }
  return (
    <div className="token-studio">
      <section className="panel">
        <h1>Tokenize a physical object</h1>
        <p>Hackathon demo · XRPL Testnet · Real NFT minting with wallet approval</p>
        <div className="token-steps">
          <span>1. Connect</span>
          <span>2. Describe</span>
          <span>3. Sign &amp; mint</span>
          <span>4. Verify</span>
        </div>

        <h2>1 · Connect your wallet</h2>
        <div className="wallet-buttons">
                  <button
                    disabled={busy || provider === 'gem'}
                    onClick={connectGem}
                  >
                    {provider === 'gem'
                      ? 'GemWallet connection retained'
                      : 'Connect GemWallet'}
                  </button>
          <button
            disabled={busy || !xamanEnabled}
            title={xamanEnabled
              ? 'Connect Xaman'
              : 'Coming soon — activate with Xaman developer credentials'}
            onClick={connectXaman}
          >
            Connect Xaman {!xamanEnabled && '🔒 Coming soon'}
          </button>
        </div>
                {busy && !provider && (
                <button
                  type="button"
                  onClick={() => {
                    onWalletChange({ provider: '', address: '', network: '' })
                    setMessage(
                      'Connection attempt canceled. Close any outstanding GemWallet popup.'
                    )
                  }}
                >
                  Cancel connection attempt
                </button>
                )}
        <label>
          Public XRPL r-address
          <input
            value={address}
            onChange={event => {
              onWalletChange({
                provider: '',
                address: event.target.value,
                network: ''
              })
              setMessage('Address edited: reconnect your wallet to authorize minting.')
            }}
            placeholder="r..."
            autoComplete="off"
          />
        </label>
        <p className="token-muted">
          {provider
            ? `Connected through ${provider === 'gem' ? 'GemWallet' : 'Xaman'} · ${network}`
            : 'Entering an address alone does not authorize NFT minting.'}
        </p>


        {signLink && (
          <div className="sign-box">
            <a href={signLink} target="_blank" rel="noreferrer">
              Open Xaman approval request
            </a>
            {qr && <img alt="Xaman signing QR code" src={qr} />}
          </div>
        )}
      </section>

      {provider && network === 'Testnet' && address && (
        <WalletAssetGallery
          galleryColumns={galleryColumns}
          setGalleryColumns={setGalleryColumns}
          key={`${provider}:${network}:${address}`}
          address={address}
          onOpenRpc={onOpenRpc}
        />
      )}

      <section className="panel">
        <h2>2 · Describe your physical item</h2>
        <form className="token-form" onSubmit={tokenize}>
          <label>
            Item name
            <input
              maxLength={100}
              required
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              maxLength={1200}
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </label>
          <label>
            Condition / grading disclosure
            <input
              maxLength={80}
              value={condition}
              onChange={event => setCondition(event.target.value)}
            />
          </label>
          <label>
            Public HTTPS photo URL (optional)
            <input
              type="url"
              placeholder="https://..."
              value={photoUrl}
              onChange={event => setPhotoUrl(event.target.value)}
            />
          </label>
          <p className="token-muted">
            This is owner-supplied information, not independent authentication.
            NFT metadata must be publicly hosted before a public-facing mint.
          </p>
            <button
              type="submit"
              disabled={busy}
              onClick={event => {
                if (!checkTokenizationReady()) {
                  event.preventDefault()
                }
              }}
            >
            {busy ? 'Processing…' : '3 · Tokenize — request wallet signature'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>4 · Ledger verification</h2>
        <p role="status">{message}</p>
        {hash && (
          <>
            <p>
              Transaction hash: <code className="hash-text">{hash}</code>
            </p>
            <button onClick={() => onOpenRpc({ command: 'tx', transaction: hash })}>
              Verify transaction in RPC
            </button>{' '}
            <button onClick={() => onOpenRpc({
              command: 'account_nfts',
              account: address,
              limit: 20
            })}>
              View wallet NFTs in RPC
            </button>
          </>
        )}
        {verified && (
          <p>
            Validated: {String(verified.validated)} · Engine result:{' '}
            {verified.result?.meta?.TransactionResult || 'see RPC'} · NFT ID:{' '}
            {verified.nftId || 'Find minted token using account_nfts'}
          </p>
        )}
      </section>
    </div>
  )
}
