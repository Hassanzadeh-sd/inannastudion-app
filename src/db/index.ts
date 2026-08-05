import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Single shared connection; migrations run once before first use. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('inanna.db');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}
