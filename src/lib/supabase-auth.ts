import { supabase } from "@/lib/supabase"

export async function signInWithEmail(email: string, password: string) {
  assertSupabase()

  const { error } = await supabase!.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
) {
  assertSupabase()

  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    throw error
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error(
      "Ya existe una cuenta con ese email. Iniciá sesión en su lugar.",
    )
  }

  return data
}

export async function signOut() {
  assertSupabase()

  const { error } = await supabase!.auth.signOut()

  if (error) {
    throw error
  }
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }
}
