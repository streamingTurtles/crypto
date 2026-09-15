import { useEffect, useState } from 'react'
import './App.css'

import AuthLoading from './components/AuthLoading.jsx'
import LoginPage from './components/LoginPage.jsx'
import AuthenticatedHeader from './components/AuthenticatedHeader.jsx'
import ApplicationStatus from './components/ApplicationStatus.jsx'
import XrplServerStatus from './components/XrplServerStatus.jsx'
import AccountLookup from './components/AccountLookup.jsx'

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
  return <AuthLoading />
}

if (!user) {
  return (
    <LoginPage
      health={health}
      email={email}
      password={password}
      authError={authError}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onLogin={login}
    />
  )
}

return (
  <main>
    <AuthenticatedHeader
      user={user}
      onLogout={logout}
    />

    <ApplicationStatus health={health} />

    <XrplServerStatus
      serverInfo={serverInfo}
      serverError={serverError}
    />

    <AccountLookup
      accountAddress={accountAddress}
      accountData={accountData}
      accountError={accountError}
      onAccountAddressChange={setAccountAddress}
      onLookupAccount={lookupAccount}
    />
  </main>
)
}

export default App