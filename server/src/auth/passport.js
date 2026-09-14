import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'

import {
  findUserById
} from '../repositories/userRepository.js'

import {
  verifyUserCredentials
} from '../services/authService.js'

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },

    async (
      email,
      password,
      done
    ) => {
      try {
        const user =
          await verifyUserCredentials(
            email,
            password
          )

        if (!user) {
          return done(
            null,
            false,
            {
              message:
                'Invalid email or password'
            }
          )
        }

        return done(null, user)
      } catch (error) {
        return done(error)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(
  async (id, done) => {
    try {
      const user =
        await findUserById(id)

      if (!user) {
        return done(null, false)
      }

      done(null, {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at
      })
    } catch (error) {
      done(error)
    }
  }
)

export default passport
