import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import xrpl from 'xrpl';


dotenv.config();


const app = express();



const XRPL_TESTNET_URL =
  process.env.XRPL_TESTNET_URL ||
  'wss://s.altnet.rippletest.net:51233';



const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3020;



app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'crypto-xrpl-api'
  });
});






app.get('/api/xrpl/server-info', async (req, res) => {
  const client = new xrpl.Client(XRPL_TESTNET_URL);

  try {
    await client.connect();

    const response = await client.request({
      command: 'server_info'
    });

    res.json({
      status: 'ok',
      network: 'XRPL Testnet',
      server: response.result.info
    });
  } catch (error) {
    console.error('XRPL server_info error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Unable to retrieve XRPL server information'
    });
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
});



app.get('/api/xrpl/account/:address', async (req, res) => {
  const { address } = req.params

  const client = new xrpl.Client(XRPL_TESTNET_URL)

  try {
    await client.connect()

    const response = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    })

    const accountData = response.result.account_data

    res.json({
      status: 'ok',
      account: accountData.Account,
      balanceDrops: accountData.Balance,
      balanceXrp: xrpl.dropsToXrp(accountData.Balance),
      sequence: accountData.Sequence,
      ownerCount: accountData.OwnerCount,
      flags: accountData.Flags,
      ledgerIndex: response.result.ledger_index
    })
  } catch (error) {
    console.error('XRPL account_info error:', error)

    res.status(500).json({
      status: 'error',
      message: error.message
    })
  } finally {
    if (client.isConnected()) {
      await client.disconnect()
    }
  }
})






app.listen(PORT, HOST, () => {
  console.log(`API running at http://${HOST}:${PORT}`);
});
