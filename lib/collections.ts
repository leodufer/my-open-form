import { SupabaseClient } from '@supabase/supabase-js'
import { Collection, Database } from './database.types'

export const DEFAULT_COLLECTION_NAME = 'General'

/**
 * Fetches all collections for a user, ensuring the default "General"
 * collection exists and is ordered first.
 */
export async function getUserCollections(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ collections: Collection[]; defaultCollection: Collection }> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  let collections = (data || []) as Collection[]
  let defaultCollection = collections.find(
    (c) => c.name.toLowerCase() === DEFAULT_COLLECTION_NAME.toLowerCase()
  )

  if (!defaultCollection) {
    const { data: created } = await supabase
      .from('collections')
      .insert({ user_id: userId, name: DEFAULT_COLLECTION_NAME } as never)
      .select()
      .single()

    if (created) {
      defaultCollection = created as Collection
      collections = [defaultCollection, ...collections]
    }
  }

  const ordered = defaultCollection
    ? [defaultCollection, ...collections.filter((c) => c.id !== defaultCollection!.id)]
    : collections

  return {
    collections: ordered,
    defaultCollection: defaultCollection!,
  }
}

