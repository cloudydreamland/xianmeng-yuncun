export interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  results?: T[];
  meta: { changes?: number; [key: string]: unknown };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface AdminEnv {
  DB?: D1Database;
  ADMIN_EMAIL?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_ISSUER?: string;
}

export interface PagesContext<Env> {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<unknown>): void;
}

export type PagesHandler<Env> = (context: PagesContext<Env>) => Response | Promise<Response>;
