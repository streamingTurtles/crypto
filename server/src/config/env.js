import 'dotenv/config'

function requireEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',

  host: process.env.HOST || '127.0.0.1',

  port: Number(process.env.PORT || 3020),

  xrplTestnetUrl:
    process.env.XRPL_TESTNET_URL ||
    'wss://s.altnet.rippletest.net:51233',

  pgHost: requireEnv('PGHOST'),

  pgPort: Number(process.env.PGPORT || 5432),

  pgDatabase: requireEnv('PGDATABASE'),

  pgUser: requireEnv('PGUSER'),

  pgPassword: requireEnv('PGPASSWORD'),

  sessionSecret: requireEnv('SESSION_SECRET')
})

export const isProduction =
  env.nodeEnv === 'production'