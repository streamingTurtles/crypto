import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './components/LoginPage.jsx'
import XrplServerStatus from './components/XrplServerStatus.jsx'
import AccountLookup from './components/AccountLookup.jsx'

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`)
  return data
}
const templates = {
  server_info: { command: 'server_info' },
  fee: { command: 'fee' },
  ledger: { command: 'ledger', ledger_index: 'validated' },
  account_info: { command: 'account_info', account: '', ledger_index: 'validated' },
  account_tx: { command: 'account_tx', account: '', limit: 10 }
}
function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)
  const [serverInfo, setServerInfo] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [accountAddress, setAccountAddress] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [accountError, setAccountError] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [rpcInput, setRpcInput] = useState(JSON.stringify(templates.server_info, null, 2))
  const [rpcOutput, setRpcOutput] = useState('Run a read-only RPC request to see its response.')
  const [rpcBusy, setRpcBusy] = useState(false)

  useEffect(() => {
    async function init() {
      try { setHealth(await api('/api/health')) } catch { setHealth({ status: 'error' }) }
      try {
        const result = await api('/api/auth/me')
        setUser(result.user)
        try { setServerInfo(await api('/api/xrpl/server-info')) } catch (e) { setServerError(e.message) }
      } catch { setUser(null) }
      finally { setLoading(false) }
    }
    init()
  }, [])
  async function login(event) {
    event.preventDefault(); setError('')
    try {
      const result = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      setUser(result.user); setPassword('')
      try { setServerInfo(await api('/api/xrpl/server-info')) } catch (e) { setServerError(e.message) }
    } catch (e) { setError(e.message) }
  }
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); setUser(null); setPage('dashboard'); setAccountData(null); setServerInfo(null) }
    catch (e) { setError(e.message) }
  }
  async function lookupAccount(event) {
    event.preventDefault(); setAccountError(''); setAccountData(null)
    try { setAccountData(await api(`/api/xrpl/account/${encodeURIComponent(accountAddress.trim())}`)) }
    catch (e) { setAccountError(e.message) }
  }
  async function changePassword(event) {
    event.preventDefault(); setSettingsMessage('')
    if (newPassword !== confirmPassword) { setSettingsMessage('New passwords do not match'); return }
    try {
      await api('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      setSettingsMessage('Password changed successfully'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) { setSettingsMessage(e.message) }
  }
  async function runRpc(event) {
    event.preventDefault(); setRpcBusy(true)
    try {
      const request = JSON.parse(rpcInput)
      setRpcOutput(JSON.stringify(await api('/api/xrpl/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) }), null, 2))
    } catch (e) { setRpcOutput(`Error: ${e.message}`) }
    finally { setRpcBusy(false) }
  }
  if (loading) return <main className="shell"><section className="panel">Checking session…</section></main>
  if (!user) return <div className="shell login-shell"><LoginPage health={health} email={email} password={password} authError={error} onEmailChange={setEmail} onPasswordChange={setPassword} onLogin={login}/></div>
  return <div className="shell">
    <header className="topbar"><div className="brand"><img src="/st_logo_1.png" alt="Streaming Turtles logo"/><div><strong>STREAMING TURTLES</strong><small>CRYPTO</small></div></div><nav aria-label="Main navigation">{[['dashboard','Dashboard'],['wallet','Wallet'],['console','RPC Console'],['settings','Settings']].map(([id,label])=><button className={page===id?'active':''} key={id} onClick={()=>setPage(id)}>{label}</button>)}</nav><div className="identity"><span>{user.displayName}</span><button onClick={logout}>Sign out</button></div></header>
    {page==='dashboard' && <><section className="hero panel"><h1>Welcome back, {user.displayName}</h1><p>Tokenize the future. Own your tomorrow.</p><button onClick={()=>setPage('wallet')}>Wallet tools →</button></section><div className="dashboard-grid"><section className="panel"><h2>XRPL Testnet Status</h2><XrplServerStatus serverInfo={serverInfo} serverError={serverError}/></section><section className="panel"><h2>XRPL Account Lookup</h2><AccountLookup accountAddress={accountAddress} accountData={accountData} accountError={accountError} onAccountAddressChange={setAccountAddress} onLookupAccount={lookupAccount}/></section><section className="panel"><h2>Quick actions</h2><div className="actions"><button onClick={()=>setPage('wallet')}>Wallet</button><button onClick={()=>setPage('console')}>RPC Console</button><button onClick={()=>setPage('settings')}>Settings</button></div></section></div></>}
    {page==='settings' && <section className="panel form-panel"><h1>Account Settings</h1><p>{user.displayName} · {user.email}</p><h2>Change password</h2><form onSubmit={changePassword}><label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label><label>New password (12+ characters)<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label><label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label><button type="submit">Update password</button></form><p role="status">{settingsMessage}</p></section>}
    {page==='wallet' && <section className="panel"><h1>XRPL Wallet</h1><p>Wallet signing is not enabled yet. Your account lookup remains read-only. Do not enter wallet seeds or private keys anywhere in this app.</p><button onClick={()=>setPage('dashboard')}>Open account lookup</button><h2>Next wallet milestone</h2><p>Connect a Testnet wallet through an audited wallet adapter, verify its network and address, then add receive and signed send flows with transaction confirmation.</p></section>}
    {page==='console' && <section className="panel"><h1>XRPL RPC Console · Testnet</h1><p>Authenticated, read-only RPC. Commands are allowlisted by the server; this is not a shell.</p><div className="template-row">{Object.keys(templates).map(name=><button key={name} onClick={()=>setRpcInput(JSON.stringify(templates[name],null,2))}>{name}</button>)}</div><div className="console-grid"><form onSubmit={runRpc}><label htmlFor="rpc-json">Request JSON</label><textarea id="rpc-json" spellCheck="false" rows={14} value={rpcInput} onChange={e=>setRpcInput(e.target.value)}/><button disabled={rpcBusy} type="submit">{rpcBusy?'Running…':'Run RPC'}</button></form><div><label>Response</label><pre className="response" aria-live="polite">{rpcOutput}</pre></div></div></section>}
    <footer>Streaming Turtles Crypto · Development / XRPL Testnet</footer>
  </div>
}
export default App
