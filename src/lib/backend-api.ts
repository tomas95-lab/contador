import { supabase } from "@/lib/supabase"

const backendApiUrl =
  (import.meta.env.VITE_ARCA_API_URL as string | undefined) ??
  "http://localhost:3001"
const supabaseAuthStorageKey = getSupabaseAuthStorageKey()

type StoredSupabaseSession = {
  access_token?: unknown
  refresh_token?: unknown
}

export function backendApiPath(path: string) {
  return new URL(path, backendApiUrl)
}

export async function getBackendAuthHeaders() {
  const accessToken = await getSupabaseAccessToken()

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

async function getSupabaseAccessToken() {
  if (!supabase) {
    throw new Error("Necesitas Supabase configurado para consultar ARCA.")
  }

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  if (data.session?.access_token) {
    return data.session.access_token
  }

  const recoveredAccessToken = await recoverSupabaseAccessTokenFromStorage()

  if (recoveredAccessToken) {
    return recoveredAccessToken
  }

  throw new Error("Necesitás iniciar sesión para consultar ARCA.")
}

async function recoverSupabaseAccessTokenFromStorage() {
  if (!supabase || !supabaseAuthStorageKey || typeof window === "undefined") {
    return null
  }

  const rawSession = window.localStorage.getItem(supabaseAuthStorageKey)

  if (!rawSession) {
    return null
  }

  let storedSession: StoredSupabaseSession

  try {
    storedSession = JSON.parse(rawSession) as StoredSupabaseSession
  } catch {
    return null
  }

  if (
    typeof storedSession.access_token !== "string" ||
    typeof storedSession.refresh_token !== "string"
  ) {
    return null
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: storedSession.access_token,
    refresh_token: storedSession.refresh_token,
  })

  if (error) {
    throw error
  }

  return data.session?.access_token ?? null
}

function getSupabaseAuthStorageKey() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined

  if (!supabaseUrl) {
    return null
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0]

    return `sb-${projectRef}-auth-token`
  } catch {
    return null
  }
}
