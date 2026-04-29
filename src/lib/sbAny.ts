import { supabase } from "@/integrations/supabase/client";

// Escape hatch for tables not yet present in the generated `Database` type
// (e.g. data_sources, data_points, financing_instruments, etc.). Until the
// types file is regenerated from the live schema, use sbAny instead of
// `supabase` for these tables. Functionally identical at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sbAny = supabase as any;
