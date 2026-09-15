function XrplServerStatus({
  serverInfo,
  serverError
}) {
  return (
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
  )
}

export default XrplServerStatus
