import { useCallback, useEffect, useRef, useState } from 'react'
import { getAddress, getNetwork } from '@gemwallet/api'

function emptyWallet() {
  return { provider: '', address: '', network: '' }
}

export default function useWalletSession() {
  const [wallet, setWallet] = useState(emptyWallet)
  const [walletNotice, setWalletNotice] = useState('')
  const [verification, setVerification] = useState('disconnected')
  const [galleryColumns, setGalleryColumns] = useState(1)

  const walletRef = useRef(wallet)
  const revision = useRef(0)
  const activeCheck = useRef(null)
    const walletInteractions = useRef(new Set())
    const beginWalletInteraction = useCallback(() => {
    const token = Symbol('wallet interaction')
    walletInteractions.current.add(token)

    return () => {
        walletInteractions.current.delete(token)
    }
    }, [])
  const captureWalletSession = useCallback(() => {
  const expectedRevision = revision.current
  const expectedWallet = walletRef.current

  return () => (
    revision.current === expectedRevision &&
    walletRef.current === expectedWallet
  )
}, [])

  const updateWallet = useCallback((nextWallet, expectedWallet) => {
    if (
      expectedWallet !== undefined &&
      walletRef.current !== expectedWallet
    ) {
      return
    }
    revision.current += 1
    activeCheck.current = null
    walletRef.current = nextWallet

    setWallet(nextWallet)
    setGalleryColumns(1)
    setWalletNotice('')
    setVerification(nextWallet.provider ? 'verified' : 'disconnected')
  }, [])

  const invalidateWallet = useCallback(message => {
    const nextWallet = emptyWallet()

    revision.current += 1
    activeCheck.current = null
    walletRef.current = nextWallet

    setWallet(nextWallet)
    setGalleryColumns(1)
    setVerification('disconnected')
    setWalletNotice(message)
  }, [])
  const changeWallet = useCallback(() => { invalidateWallet(
        'Select the account you want in the GemWallet extension, ' +  'then press "Connect GemWallet" below. ' +  'Connecting uses the account currently selected in GemWallet.'
    )
  }, [invalidateWallet])
    useEffect(() => {
    if (wallet.provider !== 'gem') return

    function handleWalletMessage(event) {
      if (
        event.source !== window ||
        event.origin !== window.location.origin
      ) {
        return
      }

      const data = event.data

      if (
        !data ||
        typeof data !== 'object' ||
        data.source !== 'GEM_WALLET_MSG_REQUEST'
      ) {
        return
      }

      const reasons = {
        walletChanged: 'GemWallet account changed.',
        networkChanged: 'GemWallet network changed.',
        logout: 'GemWallet was locked or logged out.'
      }

      if (!Object.prototype.hasOwnProperty.call(reasons, data.type)) {
        return
      }

      invalidateWallet(
        `${reasons[data.type]} Open Wallet and reconnect on Testnet to continue.`
      )
    }

            function requireVerificationAfterLeaving() {
                if (walletRef.current.provider !== 'gem') return

                // App-initiated wallet popups are expected to take focus.
                if (activeCheck.current || walletInteractions.current.size > 0) {
                    return
                }
                    setVerification('needs-verification')
                    setWalletNotice(
                        'Wallet connection needs verification before minting. ' +
                        'The gallery shows previously retrieved ledger information.'
                    )
            }

            function handleVisibilityChange() {
                if (document.visibilityState === 'hidden') {
                    requireVerificationAfterLeaving()
                }
            }
    window.addEventListener('blur', requireVerificationAfterLeaving)
    window.addEventListener('message', handleWalletMessage)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
        window.removeEventListener('blur', requireVerificationAfterLeaving)
        window.removeEventListener('message', handleWalletMessage)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [wallet, invalidateWallet])

  useEffect(() => {
    return () => {
      revision.current += 1
      activeCheck.current = null
    }
  }, [])

  async function verifyWallet() {
    const expectedWallet = walletRef.current

    if (expectedWallet.provider !== 'gem' || activeCheck.current) return

    const check = {
      revision: revision.current,
      wallet: expectedWallet
    }

    activeCheck.current = check
    setVerification('checking')
    setWalletNotice('Checking the selected GemWallet account and network…')

    let timeoutId

    function isCurrent() {
      return (
        activeCheck.current === check &&
        revision.current === check.revision &&
        walletRef.current === check.wallet
      )
    }

    try {
      const query = async () => {
        const addressResponse = await getAddress()

        if (!isCurrent()) return null

        const networkResponse = await getNetwork()

        return { addressResponse, networkResponse }
      }

      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Wallet verification timed out.'))
        }, 15000)
      })

      const result = await Promise.race([query(), timeout])

      if (!isCurrent() || !result) return

      const { addressResponse, networkResponse } = result

      if (
        addressResponse.type !== 'response' ||
        networkResponse.type !== 'response' ||
        !addressResponse.result?.address ||
        !networkResponse.result?.network
      ) {
        throw new Error('GemWallet did not confirm the account and network.')
      }

      if (
        addressResponse.result.address !== expectedWallet.address ||
        networkResponse.result.network !== expectedWallet.network ||
        networkResponse.result.chain !== 'XRPL'
      ) {
        invalidateWallet(
          'GemWallet account or network no longer matches. ' +
          'Open Wallet and reconnect on Testnet.'
        )
        return
      }

      setVerification('verified')
      setWalletNotice('GemWallet account and network verified.')
    } catch (error) {
      if (!isCurrent()) return

      // Invalidate this check so a late SDK result cannot be used.
      revision.current += 1

      setVerification('needs-verification')
      setWalletNotice(
        `${error.message} Close any outstanding GemWallet popup, ` +
        'then retry verification or disconnect.'
      )
    } finally {
      clearTimeout(timeoutId)

      if (activeCheck.current === check) {
        activeCheck.current = null
      }
    }
  }

    return {
    wallet,
    walletNotice,
    verification,
    updateWallet,
    verifyWallet,
    captureWalletSession,
    beginWalletInteraction,
    galleryColumns,
    setGalleryColumns,
    changeWallet
    }
}
