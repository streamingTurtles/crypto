function AccountLookup({
  accountAddress,
  accountData,
  accountError,
  onAccountAddressChange,
  onLookupAccount
}) {
  return (
    <section>
      <h2>XRPL Account Lookup</h2>

      <form onSubmit={onLookupAccount}>
        <label htmlFor="accountAddress">
          XRPL Testnet Address
        </label>

        <input
          id="accountAddress"
          type="text"
          value={accountAddress}
          onChange={(event) =>
            onAccountAddressChange(
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
  )
}

export default AccountLookup
