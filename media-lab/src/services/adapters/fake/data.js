/* Falsk dataadapter i minnet (for tester og som mal for nye leverandører). Samme grensesnitt og samme nøytrale
   feilkoder som den ekte adapteren. Tilgangsregler simuleres med en valgfri funksjon allow(op, table, row). */
import { ServiceError } from '../../errors.js';

export function makeFakeData({ tables = {}, rpcs = {}, allow = () => true, hiddenColumns = [] } = {}) {
  const T = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.map(r => ({ ...r }))]));
  const match = (r, { eq = {}, isNull = [], notNull = [], inList = {} } = {}) =>
    Object.entries(eq).every(([k, v]) => r[k] === v) && isNull.every(k => r[k] == null) && notNull.every(k => r[k] != null) && Object.entries(inList).every(([k, v]) => v.includes(r[k]));
  const pick = (r, cols) => !cols || cols === '*' ? { ...r } : Object.fromEntries(cols.split(',').map(s => s.trim()).filter(Boolean).map(k => [k, r[k] === undefined ? null : r[k]]));
  const need = t => { if (!T[t]) throw new ServiceError('not_found', 'ukjent tabell ' + t); return T[t]; };
  return {
    _tables: T,
    async select(table, opts = {}) {
      if (opts.columns && opts.columns.split(",").some(c => hiddenColumns.includes(table + "." + c.trim()))) throw new ServiceError("forbidden");
      let rows = need(table).filter(r => match(r, opts) && allow('select', table, r));
      if (opts.order) rows = rows.sort((a, b) => (a[opts.order] > b[opts.order] ? 1 : a[opts.order] < b[opts.order] ? -1 : 0) * (opts.desc ? -1 : 1));
      if (opts.limit) rows = rows.slice(0, opts.limit);
      return rows.map(r => pick(r, opts.columns));
    },
    async insert(table, row, columns) {
      if (!allow('insert', table, row)) throw new ServiceError('forbidden');
      const r = { id: row.id || 'id-' + (need(table).length + 1), ...row }; T[table].push(r); return pick(r, columns);
    },
    async update(table, matchObj, patch) {
      const rows = need(table).filter(r => match(r, { eq: matchObj }) && allow('update', table, r));
      rows.forEach(r => Object.assign(r, patch)); return rows.map(r => ({ ...r }));
    },
    async rpc(fn, args) {
      if (!rpcs[fn]) throw new ServiceError('not_found', 'ukjent funksjon ' + fn);
      return rpcs[fn](args || {}, T);
    },
  };
}
