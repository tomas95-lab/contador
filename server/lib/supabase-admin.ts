import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin
  }

  const supabaseUrl = requiredEnv(
    "SUPABASE_URL",
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  )
  const serviceRoleKey = requiredEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseAdmin
}

export function requiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required.`)
  }

  return value
}
