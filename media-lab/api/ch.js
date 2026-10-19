/* VERCEL-SPESIFIKK inngang for ConnectHub-API-et. All logikk ligger i server/handlers/ch.js (Web-standard).
   Ved bytte av vert: kall handle(request, process.env) fra vertens tilsvarende funksjon. */
import { handle } from '../server/handlers/ch.js';

export const config = { maxDuration: 60 };   // upload.finish henter og kontrollerer filer på opptil 30 MB
export async function POST(request) { return handle(request, process.env); }
export async function GET(request) { return handle(request, process.env); }
