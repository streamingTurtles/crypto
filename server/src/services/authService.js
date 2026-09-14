import argon2 from 'argon2'

import {
  createUser,
  findUserByEmail
} from '../repositories/userRepository.js'

export async function registerUser({
  email,
  displayName,
  password
}) {
  const normalizedEmail =
    email.trim().toLowerCase()

  const existingUser =
    await findUserByEmail(normalizedEmail)

  if (existingUser) {
    const error = new Error(
      'An account with this email already exists'
    )

    error.status = 409

    throw error
  }

  const passwordHash =
    await argon2.hash(password)

  return createUser({
    email: normalizedEmail,
    displayName: displayName.trim(),
    passwordHash
  })
}

export async function verifyUserCredentials(
  email,
  password
) {
  const user =
    await findUserByEmail(email)

  if (!user) {
    return null
  }

  const passwordMatches =
    await argon2.verify(
      user.password_hash,
      password
    )

  if (!passwordMatches) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at
  }
}
