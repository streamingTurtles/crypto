import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function NftViewer({
  item,
  items,
  account,
  snapshot,
  decodedUri,
  onSelect,
  onClose,
  onOpenRpc
}) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const swipeStart = useRef(null)
  const titleId = useId()

  const index = items.findIndex(
    candidate => candidate.NFTokenID === item.NFTokenID
  )

  const hasPrevious = index > 0
  const hasNext = index >= 0 && index < items.length - 1

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow

    dialog.showModal()
    document.body.style.overflow = 'hidden'
    closeButtonRef.current.focus()

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [])

  function showPrevious() {
    if (hasPrevious) onSelect(items[index - 1])
  }

  function showNext() {
    if (hasNext) onSelect(items[index + 1])
  }

    function cancelSwipe() {
    swipeStart.current = null
    }

    function handleTouchStart(event) {
    if (event.touches.length !== 1) {
        cancelSwipe()
        return
    }

    const touch = event.touches[0]

    swipeStart.current = {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        time: event.timeStamp,
        nftId: item.NFTokenID
    }
    }

    function handleTouchMove(event) {
    const start = swipeStart.current
    if (!start) return

    if (event.touches.length !== 1) {
        cancelSwipe()
        return
    }

    const touch = Array.from(event.touches).find(
        candidate => candidate.identifier === start.identifier
    )

    if (!touch) {
        cancelSwipe()
        return
    }

    const horizontal = Math.abs(touch.clientX - start.x)
    const vertical = Math.abs(touch.clientY - start.y)

    // Once the gesture becomes vertical, leave it to browser scrolling.
    if (vertical > 12 && vertical > horizontal) {
        cancelSwipe()
    }
    }

    function handleTouchEnd(event) {
    const start = swipeStart.current
    cancelSwipe()

    if (
        !start ||
        event.touches.length !== 0 ||
        start.nftId !== item.NFTokenID
    ) {
        return
    }

    const touch = Array.from(event.changedTouches).find(
        candidate => candidate.identifier === start.identifier
    )

    if (!touch) return

    const horizontal = touch.clientX - start.x
    const vertical = touch.clientY - start.y
    const duration = event.timeStamp - start.time

    if (
        duration > 800 ||
        Math.abs(horizontal) < 60 ||
        Math.abs(horizontal) < Math.abs(vertical) * 1.5
    ) {
        return
    }

    if (horizontal < 0) {
        showNext()
    } else {
        showPrevious()
    }
    }
    function handleKeyDown(event) {
    if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
    ) {
        return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showPrevious()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      showNext()
    }
  }
  return createPortal(
    <dialog
      ref={dialogRef}
      className="nft-viewer"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      onCancel={event => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="nft-viewer-header">
        <h2 id={titleId}>NFT · Ledger record</h2>
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          Close viewer
        </button>
      </header>

      <div className="nft-viewer-navigation" role="group" aria-label="NFT navigation">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={showPrevious}
        >
          Previous
        </button>

        <span role="status">
          NFT {index + 1} of {items.length} loaded
        </span>

        <button type="button" disabled={!hasNext} onClick={showNext}>
          Next
        </button>
      </div>

      <div className="nft-viewer-content">
        <div>
                <div
                className="nft-placeholder nft-viewer-placeholder"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={cancelSwipe}
                >
                Photo pending
                </div>
          <p className="token-muted">
            Photographs and metadata loading will follow.
          </p>
        </div>
        <p className="token-muted">
        On touchscreens, swipe left or right across the photo area to browse
        loaded NFTs.
        </p>

        <div className="nft-viewer-record">
          <p className="hash-text">
            <strong>ID:</strong> {item.NFTokenID}
          </p>
          <p className="hash-text">
            <strong>Issuer:</strong> {item.Issuer}
          </p>
          <p>
            Taxon: {item.NFTokenTaxon} · Flags: {item.Flags}
          </p>
          <p className="hash-text">
            <strong>Recorded URI:</strong> {decodedUri}
          </p>
          <p>Ledger snapshot: {snapshot.index}</p>
          <p className="token-muted">
            Viewing this NFT does not authorize metadata edits.
          </p>

          <button
            type="button"
            onClick={() => onOpenRpc({
              command: 'account_nfts',
              account,
              ledger_hash: snapshot.hash,
              limit: 20
            })}
          >
            Inspect wallet snapshot in RPC
          </button>
        </div>
      </div>

      <p className="token-muted">
        Previous/Next browse loaded NFTs only. Close the viewer to continue
        scrolling the gallery.
      </p>
    </dialog>,
    document.body
  )
}