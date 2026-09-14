import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'

import passport from './auth/passport.js'
import pool from './db/pool.js'

import {
  env,
  isProduction
} from './config/env.js'

import healthRoutes from './routes/healthRoutes.js'
import xrplRoutes from './routes/xrplRoutes.js'
import authRoutes from './routes/authRoutes.js'

const app = express()

const PgSession = connectPgSimple(session)

app.use(helmet())

app.use(cors())

app.use(express.json())

if (isProduction) {
  app.set('trust proxy', 1)
}

app.use(
  session({
    name: 'crypto.sid',

    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    }),

    secret: env.sessionSecret,

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge:
        1000 *
        60 *
        60 *
        24 *
        7
    }
  })
)

app.use(passport.initialize())

app.use(passport.session())

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/xrpl', xrplRoutes)

export default app