// Local administrative recovery only. Do not expose as an HTTP endpoint.
import 'dotenv/config'
import argon2 from 'argon2'
import pool from '../src/db/pool.js'
import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
const email = process.argv[2]
if (!email || process.env.NODE_ENV === 'production') {
  console.error('Usage (development only): npm run reset-password -- user@example.com')
  process.exit(1)
}
const rl = createInterface({ input, output, terminal: true })
function secret(prompt) {
  return new Promise(resolve => {
    const original = rl._writeToOutput
    rl._writeToOutput = function (text) { if (text.includes(prompt)) original.call(this, text) }
    rl.question(prompt, answer => { rl._writeToOutput = original; resolve(answer) })
  })
}
try {
  const password = await secret('New password (12+ characters): ')
  output.write('\n')
  if (password.length < 12 || password.length > 256) throw new Error('Password must contain 12–256 characters')
  const result = await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) RETURNING id', [await argon2.hash(password), email])
  console.log(result.rowCount === 1 ? 'Password updated.' : 'Account not found.')
} catch (e) { console.error(e.message); process.exitCode = 1 }
finally { rl.close(); await pool.end() }
