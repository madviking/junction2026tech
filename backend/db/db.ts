import { SQLDatabase } from 'encore.dev/storage/sqldb'

// The one shared database. Other services use SQLDatabase.named('silta').
export const db = new SQLDatabase('silta', { migrations: './migrations' })
