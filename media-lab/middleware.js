/* VERCEL-SPESIFIKK inngang (Routing Middleware) for sperren foran sidene. All logikk ligger i server/lib/gate.js.
   Ved bytte av vert: koble gate.decide() inn i vertens tilsvarende mekanisme (se docs/architecture-and-portability.md). */
import { decide } from './server/lib/gate.js';

export const config = {
  matcher: ['/((?!assets/|images/|mockups/|api/|vendor/|fonts/|login\\.dc\\.html|version\\.json|manifest\\.webmanifest|favicon\\.ico|robots\\.txt).*)'],
};

export default async function middleware(request) {
  const d = await decide({ url: request.url, cookieHeader: request.headers.get('cookie'), env: process.env });
  if (d.action === 'next') return new Response(null, { headers: { 'x-middleware-next': '1' } });
  if (d.action === 'redirect') return new Response(null, { status: 307, headers: { location: d.location, 'cache-control': 'no-store' } });
  return new Response('ConnectHub er midlertidig utilgjengelig. Prøv igjen om litt.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '30' } });
}
