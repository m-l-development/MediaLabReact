/* Dataport: tjenestene bruker bare dette grensesnittet. Standard er Supabase-adapteren; tester og andre leverandører
   kan sette en annen med useDataAdapter(). Grensesnitt: select(table, opts), insert(table, row), update(table, match,
   patch), rpc(fn, args). Feil kastes som ServiceError med nøytral kode (errors.js). */
import { supabaseData } from './adapters/supabase/data.js';

let impl = null;
export const data = () => impl || supabaseData;
export function useDataAdapter(a) { impl = a; }
