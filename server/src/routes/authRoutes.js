import { Router } from 'express'
import passport from 'passport'
import rateLimit from 'express-rate-limit'

import {
  registerUser
} from '../services/authService.js'

import requireAuth from '../middleware/requireAuth.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
})

router.post(
  '/register',
  authLimiter,
  async (req, res) => {
    try {
      const {
        email,
        displayName,
        password
      } = req.body

      if (
        !email ||
        !displayName ||
        !password
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Email, display name, and password are required'
        })
      }

      if (password.length < 12) {
        return res.status(400).json({
          status: 'error',
          message:
            'Password must be at least 12 characters'
        })
      }

      const user =
        await registerUser({
          email,
          displayName,
          password
        })

      res.status(201).json({
        status: 'ok',
        user
      })
    } catch (error) {
      console.error(
        'Registration error:',
        error
      )

      res.status(
        error.status || 500
      ).json({
        status: 'error',
        message:
          error.status
            ? error.message
            : 'Unable to create account'
      })
    }
  }
)

router.post(
  '/login',
  authLimiter,
  passport.authenticate(
    'local',
    {
      failureMessage: true
    }
  ),
  (req, res) => {
    res.json({
      status: 'ok',
      user: req.user
    })
  }
)

router.get(
  '/me',
  requireAuth,
  (req, res) => {
    res.json({
      status: 'ok',
      user: req.user
    })
  }
)

router.post(
  '/logout',
  requireAuth,
  (req, res, next) => {
    req.logout((error) => {
      if (error) {
        return next(error)
      }

      req.session.destroy(
        (sessionError) => {
          if (sessionError) {
            return next(
              sessionError
            )
          }

          res.clearCookie(
            'crypto.sid'
          )

          res.json({
            status: 'ok'
          })
        }
      )
    })
  }
)

export default router
