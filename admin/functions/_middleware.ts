import type { AdminEnv, PagesHandler } from './_types.ts';
import { config } from './_lib/auth.ts';
import { requireAdmin } from './_lib/guard.ts';
import { json } from './_lib/response.ts';

export const onRequest: PagesHandler<AdminEnv> = async (context) => {
  try {
    config(context.request, context.env);
    const path = new URL(context.request.url).pathname;
    const publicPath = path === '/login/' || path === '/login' || path === '/robots.txt' || path.startsWith('/_astro/') || path.startsWith('/api/auth/');
    let response: Response;
    if (!publicPath) {
      const identity = await requireAdmin(context.request, context.env);
      if (identity instanceof Response) {
        response = path.startsWith('/api/') ? identity : new Response(null, { status: 303, headers: { location: '/login/' } });
      } else response = await context.next!();
    } else response = await context.next!();
    const secured = new Response(response.body, response);
    secured.headers.set('Cache-Control', 'private, no-store');
    secured.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'no-referrer');
    secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), publickey-credentials-get=(self), publickey-credentials-create=(self)');
    // Nonces permit Astro's trusted hydration bootstrap without unsafe-inline.
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
    secured.headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' https://xianmeng-yuncun.pages.dev data:; font-src 'self'; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'`);
    if (secured.headers.get('content-type')?.includes('text/html')) {
      // Only static Astro output passes through this path; private records are JSON.
      const html = await secured.text();
      return new Response(html.replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`), secured);
    }
    return secured;
  } catch {
    // Never passThroughOnException: a configuration/database failure must lock.
    return json({ error: 'admin_unavailable' }, 503);
  }
};
