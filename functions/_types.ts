export interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  results?: T[];
  meta: { changes?: number; [key: string]: unknown };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface PagesContext<Env> {
  request: Request;
  env: Env;
  waitUntil(promise: Promise<unknown>): void;
}

export type PagesHandler<Env> = (context: PagesContext<Env>) => Response | Promise<Response>;
