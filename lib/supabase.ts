<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yajeiyecxkwmwqkfkxvp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_pz5KKsdQXXlG7kV239OoJw_YsNuF3w7'

=======
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yajeiyecxkwmwqkfkxvp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_pz5KKsdQXXlG7kV239OoJw_YsNuF3w7'

>>>>>>> edd03a9 (Proje modalları ve duzeltmeler eklendi)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)