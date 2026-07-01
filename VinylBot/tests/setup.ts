import { vi } from 'vitest';

process.env.SUPABASE_URL ??= 'https://test.supabase.local';
process.env.SUPABASE_KEY ??= 'test-key';

type QueryResult = {
  data: unknown;
  error: unknown;
};

const makeQueryBuilder = (result: QueryResult = { data: [], error: null }) => {
  const chainableMethods = [
    'select',
    'eq',
    'ilike',
    'contains',
    'order',
    'limit',
    'range',
    'in',
    'is',
    'neq',
    'or',
    'not',
  ] as const;

  const builder: Record<string, any> = {
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    single: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject),
    finally: (onFinally: () => void) => Promise.resolve(result).finally(onFinally),
  };

  for (const method of chainableMethods) {
    builder[method] = vi.fn(() => builder);
  }

  return builder;
};

const mockedClient = {
  from: vi.fn(() => makeQueryBuilder()),
  rpc: vi.fn(async () => ({ data: [], error: null })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockedClient),
}));
