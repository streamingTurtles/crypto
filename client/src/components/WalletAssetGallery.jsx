import { useCallback, useEffect, useRef, useState } from 'react'
// 18B.2 - removed below, and replaced with above - to address - request lifecycle controls
// import { useState } from 'react'


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

export default function WalletAssetGallery({
   address,
   onOpenRpc,
   galleryColumns,
   setGalleryColumns
  })
  {
  const [items, setItems] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [marker, setMarker] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const activeRequest = useRef(null)
  const loadMoreTarget = useRef(null)

    useEffect(() => {
    return () => {
        const controller = activeRequest.current
        activeRequest.current = null
        controller?.abort()
    }
    }, [])



    const loadPage = useCallback (async (refresh = false) => {
    if (activeRequest.current) return
    const append = loaded && !refresh
    if (append && (!snapshot?.hash || marker === null)) return
    const controller = new AbortController()
    activeRequest.current = controller
    setBusy(true)
    setError('')

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
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      const data = await response.json()

      if (
      controller.signal.aborted ||
      activeRequest.current !== controller
      ) return

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

        if (
        append &&
        result.marker != null &&
        JSON.stringify(result.marker) === JSON.stringify(marker)
        ) {
        throw new Error('Pagination did not advance. Refresh the gallery.')
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
        if (
        controller.signal.aborted ||
        activeRequest.current !== controller
        ) return

        setError(`${e.message} Retry, or refresh to use the latest ledger.`)
        } finally {
            if (activeRequest.current === controller) {
            activeRequest.current = null
            setBusy(false)
            }
        }
  }, [address, loaded, marker, snapshot])
        useEffect(() => {
        if (loaded) return
        const timer = setTimeout(() => {
        void loadPage(true)
        }, 0)
        return () => clearTimeout(timer)
        }, [loaded, loadPage])
        useEffect(() => {
        const target = loadMoreTarget.current

        if (!target || !loaded || marker === null || busy || error) return

        const observer = new IntersectionObserver(
            entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                void loadPage()
            }
            },
            {
            root: null,
            rootMargin: '0px 0px 200px 0px',
            threshold: 0
            }
        )
        observer.observe(target)

        return () => observer.disconnect()
        }, [loaded, marker, busy, error, loadPage])

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
          : busy
           ? 'Loading NFTs held by this connected wallet…'
           : 'NFTs have not loaded. Use Load wallet NFTs to retry.'}
      </p>

      {loaded && !busy && !error && marker === null && items.length === 0 && (
        <div className="nft-empty-state" role="status">
            <h3>No NFTs found on XRPL Testnet</h3>
            <p>
            This connected account holds no NFTs in the validated ledger snapshot
            checked.
            </p>
            <p className="token-muted">
            Describe an item below to mint your first NFT, or use Refresh NFTs
            to check again.
            </p>
        </div>
        )}



        <div className="gallery-view-controls" role="group" aria-label="Gallery layout">
        <button
            type="button"
            disabled={galleryColumns === 1}
            onClick={() => setGalleryColumns(value => Math.max(1, value - 1))}
        >
        Larger tiles
        </button>

        <button
            type="button"
            disabled={galleryColumns === 6}
            onClick={() => setGalleryColumns(value => Math.min(6, value + 1))}
        >
        Smaller tiles
        </button>

        <button
            type="button"
            aria-pressed={galleryColumns === 1}
            onClick={() => setGalleryColumns(1)}
        >
        Single column
        </button>
        </div>
        <div
        className={`nft-grid${galleryColumns > 1 ? ' nft-grid-compact' : ''}`}
        style={{
            '--gallery-columns': galleryColumns,
            '--gallery-mobile-columns': Math.min(galleryColumns, 4)
        }}
        >
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



        <div
        ref={loadMoreTarget}
        aria-hidden="true"
        style={{ height: 1 }}
        />



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