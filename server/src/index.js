import app from './app.js'
import { env } from './config/env.js'
import {
  checkDatabaseConnection
} from './db/pool.js'

async function startServer() {
  try {
    const databaseStatus =
      await checkDatabaseConnection()

    console.log(
      'PostgreSQL connected:',
      databaseStatus.current_time
    )

    app.listen(env.port, env.host, () => {
      console.log(
        `API running at http://${env.host}:${env.port}`
      )
    })
  } catch (error) {
    console.error(
      'Unable to start application:',
      error
    )

    process.exit(1)
  }
}

startServer()