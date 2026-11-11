import { useState } from 'react'

function decodeUri(hex) {
  if (!hex) return 'No URI recorded'
  if (!/^(?:[a-fA-F0-9]{2})+$/.test(hex)) return 'Invalid hexadecimal URI'

  try {
    const bytes = Uint8Array.from(
      hex.match(/.{2}/g),
      byte => Number.parseInt(byte, 16)
    )
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return 'URI could not be decoded as UTF-8'
  }
}

export default function WalletAssetGallery({ address, onOpenRpc }) {
  const [items, setItems] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [marker, setMarker] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  async function loadPage(refresh = false) {
    if (busy) return
    setBusy(true)
    setError('')

    const append = loaded && !refresh
    const request = {
      command: 'account_nfts',
      account: address,
      limit: 20,
      ...(append
        ? { ledger_hash: snapshot.hash, marker }
        : { ledger_index: 'validated' })
    }

    try {
      const response = await fetch('/api/xrpl/rpc', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`)
      }

      const result = data.result
      if (
        result?.validated !== true ||
        result.account !== address ||
        !Array.isArray(result.account_nfts) ||
        !result.ledger_hash
      ) {
        throw new Error('Expected validated NFT data for this wallet.')
      }

      if (append && result.ledger_hash !== snapshot.hash) {
        throw new Error('Ledger snapshot changed. Refresh the gallery.')
      }

      setItems(previous => {
        const combined = append
          ? [...previous, ...result.account_nfts]
          : result.account_nfts

        return [...new Map(
          combined.map(item => [item.NFTokenID, item])
        ).values()]
      })
      setSnapshot({ hash: result.ledger_hash, index: result.ledger_index })
      setMarker(result.marker ?? null)
      setLoaded(true)
      if (!append) setSelected(null)
    } catch (e) {
      setError(`${e.message} Retry, or refresh to use the latest ledger.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel wallet-gallery">
      <h2>Wallet NFT Gallery · Testnet</h2>
      <p className="hash-text">{address}</p>
      <p className="token-muted">
        Read-only ledger ownership. Metadata and photographs will follow.
      </p>

      <button disabled={busy} onClick={() => loadPage(true)}>
        {busy ? 'Loading…' : loaded ? 'Refresh NFTs' : 'Load wallet NFTs'}
      </button>

      {error && <p role="alert">{error}</p>}

      <p role="status">
        {loaded
          ? `${items.length} NFT(s) loaded · Ledger ${snapshot.index}`
          : 'Load the NFTs held by this connected wallet.'}
      </p>

      {loaded && items.length === 0 && <p>This wallet holds no NFTs.</p>}

      <div className="nft-grid">
        {items.map(item => (
          <button
            key={item.NFTokenID}
            className="nft-card"
            aria-pressed={selected?.NFTokenID === item.NFTokenID}
            onClick={() => setSelected(item)}
          >
            <span className="nft-placeholder">Photo pending</span>
            <strong>NFT · {item.NFTokenID.slice(-12)}</strong>
            <span className="hash-text">Issuer: {item.Issuer}</span>
          </button>
        ))}
      </div>

      {loaded && marker !== null && (
        <button disabled={busy} onClick={() => loadPage()}>
          {busy ? 'Loading…' : 'Load more'}
        </button>
      )}

      {loaded && marker === null && items.length > 0 && (
        <p className="token-muted">All NFTs in this ledger snapshot loaded.</p>
      )}

      {selected && (
        <div className="nft-details">
          <h3>Selected NFT · Ledger record</h3>
          <p className="hash-text"><strong>ID:</strong> {selected.NFTokenID}</p>
          <p className="hash-text"><strong>Issuer:</strong> {selected.Issuer}</p>
          <p>Taxon: {selected.NFTokenTaxon} · Flags: {selected.Flags}</p>
          <p className="hash-text">
            <strong>Recorded URI:</strong> {decodeUri(selected.URI)}
          </p>
          <p className="token-muted">
            Selecting this NFT does not authorize metadata edits.
          </p>
          <button onClick={() => onOpenRpc({
            command: 'account_nfts',
            account: address,
            ledger_hash: snapshot.hash,
            limit: 20
          })}>
            Inspect wallet snapshot in RPC
          </button>
        </div>
      )}
    </section>
  )
}