import type { AdminEnv } from '../_types.ts';
import { verifyAdminAccess, type AdminIdentity } from './access.ts';
import { json } from './response.ts';

export async function requireAdmin(request: Request, env: AdminEnv): Promise<AdminIdentity | Response> {
  try {
    return await verifyAdminAccess(request, env);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return json({ error: message === 'admin_auth_not_configured' ? message : 'admin_auth_required' }, message === 'admin_auth_not_configured' ? 503 : 401);
  }
}
