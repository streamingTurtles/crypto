import { env } from '../config/env.js'
import xrpl from 'xrpl'

const XRPL_TESTNET_URL =
  process.env.xrplTestnetUrl ||
  'wss://s.altnet.rippletest.net:51233'

async function withXrplClient(operation) {
  const client = new xrpl.Client(env.xrplTestnetUrl)

  try {
    await client.connect()

    return await operation(client)
  } finally {
    if (client.isConnected()) {
      await client.disconnect()
    }
  }
}

export async function getServerInfo() {
  return withXrplClient(async (client) => {
    const response = await client.request({
      command: 'server_info'
    })

    return {
      status: 'ok',
      network: 'XRPL Testnet',
      server: response.result.info
    }
  })
}

export async function getAccountInfo(address) {
  if (!xrpl.isValidClassicAddress(address)) {
    const error = new Error('XRPL account address is malformed')
    error.status = 400

    throw error
  }

  return withXrplClient(async (client) => {
    const response = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    })

    const accountData = response.result.account_data

    return {
      status: 'ok',
      account: accountData.Account,
      balanceDrops: accountData.Balance,
      balanceXrp: xrpl.dropsToXrp(accountData.Balance),
      sequence: accountData.Sequence,
      ownerCount: accountData.OwnerCount,
      flags: accountData.Flags,
      ledgerIndex: response.result.ledger_index
    }
  })
}