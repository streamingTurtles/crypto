import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [serverInfo, setServerInfo] = useState(null)
  const [serverError, setServerError] = useState(null)

  const [accountAddress, setAccountAddress] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [accountError, setAccountError] = useState(null)

  async function readResponse(response) {
    const text = await response.text()

    if (!text) {
      return {}
    }

    try {
      return JSON.parse(text)
    } catch {
      return {
        message: text
      }
    }
  }

  async function loadHealth() {
    try {
      const response = await fetch('/api/health')

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          data.message || 'Health request failed'
        )
      }

      setHealth(data)
    } catch (error) {
      console.error('Health request error:', error)

      setHealth({
        status: 'error',
        service: 'API unavailable'
      })
    }
  }

  async function checkAuthentication() {
    try {
      setAuthLoading(true)
      setAuthError(null)

      const response = await fetch(
        '/api/auth/me',
        {
          credentials: 'include'
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        setUser(null)
        return
      }

      setUser(data.user)
    } catch (error) {
      console.error(
        'Authentication check error:',
        error
      )

      setUser(null)
      setAuthError(
        'Unable to check authentication status'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function login(event) {
    event.preventDefault()

    setAuthError(null)

    try {
      const response = await fetch(
        '/api/auth/login',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          credentials: 'include',

          body: JSON.stringify({
            email,
            password
          })
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Invalid email or password'
        )
      }

      setUser(data.user)
      setPassword('')
    } catch (error) {
      console.error('Login error:', error)

      setUser(null)
      setAuthError(error.message)
    }
  }

  async function logout() {
    try {
      const response = await fetch(
        '/api/auth/logout',
        {
          method: 'POST',
          credentials: 'include'
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          data.message || 'Logout failed'
        )
      }

      setUser(null)
      setServerInfo(null)
      setServerError(null)
      setAccountData(null)
      setAccountError(null)
      setPassword('')
    } catch (error) {
      console.error('Logout error:', error)
      setAuthError(error.message)
    }
  }

  async function loadServerInfo() {
    setServerInfo(null)
    setServerError(null)

    try {
      const response = await fetch(
        '/api/xrpl/server-info',
        {
          credentials: 'include'
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          data.message ||
            `XRPL request failed: ${response.status}`
        )
      }

      setServerInfo(data)
    } catch (error) {
      console.error(
        'XRPL server info error:',
        error
      )

      setServerError(error.message)
    }
  }

  async function lookupAccount(event) {
    event.preventDefault()

    setAccountData(null)
    setAccountError(null)

    try {
      const response = await fetch(
        `/api/xrpl/account/${accountAddress}`,
        {
          credentials: 'include'
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          data.message || 'Account lookup failed'
        )
      }

      setAccountData(data)
    } catch (error) {
      console.error(
        'Account lookup error:',
        error
      )

      setAccountError(error.message)
    }
  }

  useEffect(() => {
    loadHealth()
    checkAuthentication()
  }, [])

  useEffect(() => {
    if (user) {
      loadServerInfo()
    } else {
      setServerInfo(null)
      setServerError(null)
    }
  }, [user])

  if (authLoading) {
    return (
      <main>
        <h1>Streaming Turtles Crypto</h1>
        <p>Checking authentication...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main>
        <h1>Streaming Turtles Crypto</h1>

        <p>
          Tokenize the objects around you.
        </p>

        {health && (
          <p>
            API:{' '}
            <strong>
              {health.status}
            </strong>
          </p>
        )}

        <section>
          <h2>Sign In</h2>

          <form onSubmit={login}>
            <div>
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit">
              Sign In
            </button>
          </form>

          {authError && (
            <p>
              Error: {authError}
            </p>
          )}
        </section>
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Streaming Turtles Crypto</h1>

        <p>
          Signed in as{' '}
          <strong>
            {user.displayName}
          </strong>
          {' — '}
          {user.email}
        </p>

        <button
          type="button"
          onClick={logout}
        >
          Sign Out
        </button>
      </header>

      <section>
        <h2>Application Status</h2>

        {health ? (
          <p>
            API:{' '}
            <strong>
              {health.status}
            </strong>
            {' - '}
            {health.service}
          </p>
        ) : (
          <p>Checking API...</p>
        )}
      </section>

      <section>
        <h2>XRPL Testnet Status</h2>

        {serverError && (
          <p>
            XRPL Error: {serverError}
          </p>
        )}

        {!serverInfo &&
          !serverError && (
            <p>
              Loading XRPL server
              information...
            </p>
          )}

        {serverInfo && (
          <div>
            <p>
              Network:{' '}
              <strong>
                {serverInfo.network}
              </strong>
            </p>

            <p>
              Server State:{' '}
              <strong>
                {
                  serverInfo.server
                    ?.server_state
                }
              </strong>
            </p>

            <p>
              Server Version:{' '}
              <strong>
                {
                  serverInfo.server
                    ?.build_version
                }
              </strong>
            </p>

            <p>
              Validated Ledger:{' '}
              <strong>
                {
                  serverInfo.server
                    ?.validated_ledger?.seq
                }
              </strong>
            </p>

            <p>
              Ledger Age:{' '}
              <strong>
                {
                  serverInfo.server
                    ?.validated_ledger?.age
                }
              </strong>
            </p>
          </div>
        )}
      </section>

      <section>
        <h2>XRPL Account Lookup</h2>

        <form onSubmit={lookupAccount}>
          <label htmlFor="accountAddress">
            XRPL Testnet Address
          </label>

          <input
            id="accountAddress"
            type="text"
            value={accountAddress}
            onChange={(event) =>
              setAccountAddress(
                event.target.value
              )
            }
            placeholder="r..."
            required
          />

          <button type="submit">
            Look Up Account
          </button>
        </form>

        {accountError && (
          <p>
            Error: {accountError}
          </p>
        )}

        {accountData && (
          <div>
            <p>
              Account:{' '}
              <strong>
                {accountData.account}
              </strong>
            </p>

            <p>
              XRP Balance:{' '}
              <strong>
                {accountData.balanceXrp}
              </strong>
            </p>

            <p>
              Balance Drops:{' '}
              {accountData.balanceDrops}
            </p>

            <p>
              Sequence:{' '}
              {accountData.sequence}
            </p>

            <p>
              Owner Count:{' '}
              {accountData.ownerCount}
            </p>

            <p>
              Flags:{' '}
              {accountData.flags}
            </p>

            <p>
              Ledger Index:{' '}
              {accountData.ledgerIndex}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App