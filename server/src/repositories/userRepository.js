import pool from '../db/pool.js'

export async function findUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        display_name,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  )

  return result.rows[0] || null
}

export async function findUserById(id) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        display_name,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  )

  return result.rows[0] || null
}

export async function createUser({
  email,
  displayName,
  passwordHash
}) {
  const result = await pool.query(
    `
      INSERT INTO users (
        email,
        display_name,
        password_hash
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        email,
        display_name,
        created_at,
        updated_at
    `,
    [
      email.toLowerCase(),
      displayName,
      passwordHash
    ]
  )

  return result.rows[0]
}

export async function findUserWithPasswordById(id) {
  const result = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [id])
  return result.rows[0] || null
}
export async function updatePasswordHash(id, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, id])
}
