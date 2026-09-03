// 依 docs/setup-supabase.md 建立好 Supabase 專案後，把下面兩個值換成你專案的
// Project URL 跟 anon public key（在 Supabase 專案的 Settings → API 頁面可以找到）。
// 這把 key 本來就設計成可以公開內嵌在前端——真正的存取控制交給資料庫的 RLS 規則
// （見 docs/adr/0001-supabase-sync-backend.md、docs/adr/0004-supabase-sync-fire-and-forget.md）。
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
