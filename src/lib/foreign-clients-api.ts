import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database"

type ForeignClientRow = Database["public"]["Tables"]["foreign_clients"]["Row"]

export type ForeignClient = {
  id: string
  name: string
  countryCode: string
  taxId: string | null
  address: string | null
  platform: string | null
}

export async function fetchForeignClients(): Promise<ForeignClient[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("foreign_clients")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return data.map(mapForeignClient)
}

export async function saveForeignClient(input: {
  name: string
  countryCode: string
  taxId?: string
  address?: string
  platform?: string
}) {
  if (!supabase) {
    throw new Error("Necesitas iniciar sesión para guardar clientes.")
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!userData.user) {
    throw new Error("Necesitas iniciar sesión para guardar clientes.")
  }

  const { error } = await supabase.from("foreign_clients").insert({
    address: input.address || null,
    country_code: input.countryCode,
    name: input.name,
    platform: input.platform || null,
    tax_id: input.taxId || null,
    user_id: userData.user.id,
  })

  if (error) {
    throw error
  }
}

function mapForeignClient(row: ForeignClientRow): ForeignClient {
  return {
    address: row.address,
    countryCode: row.country_code,
    id: row.id,
    name: row.name,
    platform: row.platform,
    taxId: row.tax_id,
  }
}
