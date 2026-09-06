import { buildTransactionLocalContext, type VerifiedPartnerSessionClaims } from "./sessionContext";

export interface UsedCarsDbClient {
  query<T = unknown>(statement: string, parameters?: readonly unknown[]): Promise<T>;
  release(error?: Error): void;
}

export interface UsedCarsDbPool { connect(): Promise<UsedCarsDbClient> }
export interface PartnerTransaction { query<T = unknown>(statement: string, parameters?: readonly unknown[]): Promise<T> }

const forbiddenTransactionSql = /^\s*(?:set|reset|begin|start\s+transaction|commit|rollback|savepoint|release\s+savepoint)\b/iu;

export async function withVerifiedPartnerTransaction<T>(input: {
  readonly pool: UsedCarsDbPool;
  readonly claims: VerifiedPartnerSessionClaims;
  readonly nowIso: string;
  readonly work: (transaction: PartnerTransaction) => Promise<T>;
}): Promise<T> {
  const settings = buildTransactionLocalContext(input.claims, input.nowIso);
  const client = await input.pool.connect();
  let began = false;
  let connectionError: Error | undefined;
  try {
    await client.query("begin");
    began = true;
    for (const setting of settings) await client.query(setting.statement, setting.parameters);
    const transaction: PartnerTransaction = Object.freeze({
      query: <R>(statement: string, parameters?: readonly unknown[]) => {
        if (forbiddenTransactionSql.test(statement)) throw new Error("TRANSACTION_CONTROL_FORBIDDEN_IN_WORK");
        return client.query<R>(statement, parameters);
      },
    });
    const result = await input.work(transaction);
    await client.query("commit");
    return result;
  } catch (error) {
    if (began) {
      try { await client.query("rollback"); } catch (rollbackError) {
        connectionError = rollbackError instanceof Error ? rollbackError : new Error("ROLLBACK_FAILED");
      }
    }
    throw error;
  } finally {
    client.release(connectionError);
  }
}
