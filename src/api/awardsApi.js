import { supabase } from '../lib/supabaseClient'

export async function getUserAwards(userId) {
  const { data, error } = await supabase
    .from('awards')
    .select('*')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false })
  if (error) throw error
  return data || []
}
