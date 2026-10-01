/* Supabase-implementasjon av dataporten (se ../../port.js). Bare enkle, leverandørnøytrale operasjoner:
   tabelloppslag med likhetsfiltre, innsetting, oppdatering og databasefunksjoner. Tilgang avgjøres av RLS. */
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

export const supabaseData = {
  async select(table, opts = {}) {
    let q = filter(getClient().from(table).select(opts.columns || '*'), opts);
    if (opts.order) q = q.order(opts.order, { ascending: !opts.desc });
    if (opts.limit) q = q.limit(opts.limit);
    return check(await q) || [];
  },
  async insert(table, row, columns) { return check(await getClient().from(table).insert(row).select(columns || '*').single()); },
  async update(table, match, patch) { return check(await filter(getClient().from(table).update(patch), { eq: match }).select()) || []; },
  async rpc(fn, args) { return check(await getClient().rpc(fn, args || {})); },
};
