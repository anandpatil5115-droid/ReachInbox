declare module 'connect-pg-simple' {
  import { Store } from 'express-session';
  import { Pool } from 'pg';

  interface PgSessionOptions {
    pool: Pool;
    tableName?: string;
    createTableIfMissing?: boolean;
    schemaName?: string;
    ttl?: number;
    pruneSessionInterval?: number;
    errorLog?: (error: any) => void;
  }

  function connectPgSimple(session: any): {
    new (options: PgSessionOptions): Store;
  };

  export default connectPgSimple;
}
