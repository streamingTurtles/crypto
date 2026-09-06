import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...')
  const [xrplData, setXrplData] = useState(null)
  const [xrplError, setXrplError] = useState(null)

  const [accountAddress, setAccountAddress] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [accountError, setAccountError] = useState(null)

  useEffect(() => {
    async function loadSystemStatus() {
      try {
        const apiResponse = await fetch('/api/health')

        if (!apiResponse.ok) {
          throw new Error(`API request failed: ${apiResponse.status}`)
        }

        const apiData = await apiResponse.json()

        setApiStatus(`${apiData.status} - ${apiData.service}`)
      } catch (error) {
        console.error('API health error:', error)
        setApiStatus('error')
      }

      try {
        const xrplResponse = await fetch('/api/xrpl/server-info')

        if (!xrplResponse.ok) {
          throw new Error(
            `XRPL request failed: ${xrplResponse.status}`
          )
        }

        const data = await xrplResponse.json()

        console.log('XRPL server info:', data)

        setXrplData(data)
      } catch (error) {
        console.error('XRPL connection error:', error)
        setXrplError(error.message)
      }
    }

    loadSystemStatus()
  }, [])



  async function lookupAccount(event) {
  event.preventDefault()

  setAccountData(null)
  setAccountError(null)

  try {
    const response = await fetch(
      `/api/xrpl/account/${accountAddress}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Account lookup failed')
    }

    setAccountData(data)
  } catch (error) {
    console.error('Account lookup error:', error)
    setAccountError(error.message)
  }
 } 


  return (
    <main>
      <h1>Streaming Turtles Crypto</h1>

      <section>
        <h2>Application Status</h2>

        <p>
          API: <strong>{apiStatus}</strong>
        </p>
      </section>

      <section>
        <h2>XRPL Connection</h2>

        {xrplError && (
          <p>
            XRPL Error: <strong>{xrplError}</strong>
          </p>
        )}

        {!xrplData && !xrplError && (
          <p>Connecting to XRPL Testnet...</p>
        )}

        {xrplData && (
          <>
            <p>
              Status: <strong>{xrplData.status}</strong>
            </p>

            <p>
              Network: <strong>{xrplData.network}</strong>
            </p>

            <p>
              Server State:{' '}
              <strong>{xrplData.server.server_state}</strong>
            </p>

            <p>
              Server Version:{' '}
              <strong>{xrplData.server.build_version}</strong>
            </p>

            <p>
              Validated Ledger:{' '}
              <strong>{xrplData.server.validated_ledger?.seq}</strong>
            </p>

            <p>
              Ledger Age:{' '}
              <strong>{xrplData.server.validated_ledger?.age} seconds</strong>
            </p>
          </>
        )}
      </section>



    <section>
        <h2>XRPL Account Lookup</h2>

        <form onSubmit={lookupAccount}>
          <input
            type="text"
            value={accountAddress}
            onChange={(event) => setAccountAddress(event.target.value)}
            placeholder="Enter XRPL Testnet address"
          />

          <button type="submit">
            Lookup Account
          </button>
        </form>

        {accountError && (
          <p>
            Error: <strong>{accountError}</strong>
          </p>
        )}

        {accountData && (
          <div>
            <p>
              Account: <strong>{accountData.account}</strong>
            </p>

            <p>
              XRP Balance: <strong>{accountData.balanceXrp}</strong>
            </p>

            <p>
              Sequence: <strong>{accountData.sequence}</strong>
            </p>

            <p>
              Owner Count: <strong>{accountData.ownerCount}</strong>
            </p>

            <p>
              Flags: <strong>{accountData.flags}</strong>
            </p>

            <p>
              Ledger Index: <strong>{accountData.ledgerIndex}</strong>
            </p>
          </div>
        )}
  </section>



    </main>
)

}

export default App