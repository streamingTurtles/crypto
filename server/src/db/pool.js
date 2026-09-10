import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

const pool = new Pool({
  host: env.pgHost,
  port: env.pgPort,
  database: env.pgDatabase,
  user: env.pgUser,
  password: env.pgPassword,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

pool.on('error', (error) => {
  console.error(
    'Unexpected PostgreSQL pool error:',
    error
  )
})

export async function checkDatabaseConnection() {
  const result = await pool.query(
    'SELECT NOW() AS current_time'
  )

  return result.rows[0]
}

export default pool
