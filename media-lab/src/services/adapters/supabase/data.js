/* Supabase-implementasjon av dataporten (se ../../port.js). Bare enkle, leverandørnøytrale operasjoner:
   tabelloppslag med likhetsfiltre, innsetting, oppdatering og databasefunksjoner. Tilgang avgjøres av RLS.
   makeSupabaseData(klient) brukes også av kontrakttestene mot et ekte utviklingsprosjekt. */
import { getClient } from './client.js';
import { ServiceError, fromSqlState } from '../../errors.js';

const check = ({ data, error }) => {
  if (error) throw new ServiceError(fromSqlState(error.code), error.message);
  return data;
};
const filter = (q, { eq = {}, isNull = [], notNull = [], inList = {} } = {}) => {
  for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
  for (const k of isNull) q = q.is(k, null);
  for (const k of notNull) q = q.not(k, 'is', null);
  for (const [k, v] of Object.entries(inList)) q = q.in(k, v);
  return q;
};

export function makeSupabaseData(client) {
  const c = typeof client === 'function' ? client : () => client;
  return {
    async select(table, opts = {}) {
      let q = filter(c().from(table).select(opts.columns || '*'), opts);
      if (opts.order) q = q.order(opts.order, { ascending: !opts.desc });
      if (opts.limit) q = q.limit(opts.limit);
      return check(await q) || [];
    },
    async insert(table, row, columns) { return check(await c().from(table).insert(row).select(columns || '*').single()); },
    async update(table, match, patch) { return check(await filter(c().from(table).update(patch), { eq: match }).select()) || []; },
    async rpc(fn, args) { return check(await c().rpc(fn, args || {})); },
  };
}

export const supabaseData = makeSupabaseData(getClient);
