import type { AdminEnv, PagesHandler } from '../_types.ts';
import { requireAdmin } from '../_lib/guard.ts';
import { json } from '../_lib/response.ts';

export const onRequestGet: PagesHandler<AdminEnv> = async ({ request, env }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  const [name, domain] = identity.email.split('@');
  const maskedEmail = domain ? `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}` : '管理员';
  return json({ authenticated: true, email: maskedEmail });
};
