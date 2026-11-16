function LoginPage({
  health,
  email,
  password,
  authError,
  onEmailChange,
  onPasswordChange,
  onLogin
}) {
  return (
    <main>
      <img src="/st_logo_1.png" alt="Streaming Turtles" style={{width:70,height:95,objectFit:"contain"}} /><h1>Streaming Turtles Crypto</h1>

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

        <form onSubmit={onLogin}>
          <div>
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                onEmailChange(event.target.value)
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
                onPasswordChange(
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

export default LoginPage
