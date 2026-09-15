function AuthenticatedHeader({
  user,
  onLogout
}) {
  return (
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
        onClick={onLogout}
      >
        Sign Out
      </button>
    </header>
  )
}

export default AuthenticatedHeader

