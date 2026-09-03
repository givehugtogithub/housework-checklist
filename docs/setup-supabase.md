# 設定 Supabase（讓打勾記錄可以跨裝置、跨重新整理保留）

這個步驟只有你能做（需要你自己申請帳號、複製金鑰），Claude 沒辦法代勞。做完之後，[src/supabase-config.js](../src/supabase-config.js) 填好兩個值，app 就會自動改用 Supabase 讀寫，不再需要重新部署。

## 1. 建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 註冊/登入。
2. 建立一個新專案（免費方案即可），記住你設定的資料庫密碼（之後用不太到，但先存好）。
3. 專案建立完成後，左側選單找到 **SQL Editor**。

## 2. 建立資料表與 RLS 政策

在 SQL Editor 貼上並執行以下整份 SQL（對應 [ADR-0003](adr/0003-supabase-chore-surrogate-id.md)、[ADR-0004](adr/0004-supabase-sync-fire-and-forget.md) 的設計）：

```sql
create table chores (
  id bigserial primary key,
  name text unique not null
);

create table cells (
  chore_id bigint not null references chores(id) on delete cascade,
  date date not null,
  color text check (color in ('blue', 'pink')),
  primary key (chore_id, date)
);

alter table chores enable row level security;
alter table cells  enable row level security;

create policy "anon full access" on chores for all to anon using (true) with check (true);
create policy "anon full access" on cells  for all to anon using (true) with check (true);
```

這兩張表刻意對 `anon` 角色完全開放讀寫，沒有登入、沒有逐列權限——因為這個 app 從頭到尾只給 Sean/Vera 兩人共用同一份資料，真正的保護是「這個網址/anon key 沒有外流」，不是資料庫層的權限控管。

## 3. 複製 Project URL 與 anon public key

1. 左側選單 **Settings → API**。
2. 複製 **Project URL**（長得像 `https://xxxxx.supabase.co`）。
3. 複製 **anon public** 這把 key（不是 `service_role`，那把不能用在前端）。
4. 打開 [src/supabase-config.js](../src/supabase-config.js)，把兩個值填進去：

```js
export const SUPABASE_URL = 'https://xxxxx.supabase.co';
export const SUPABASE_ANON_KEY = '這裡貼 anon public key';
```

## 4. 驗證

1. 重新整理頁面，打開瀏覽器 console：如果還看到「尚未設定 Supabase」的警告，代表上一步沒填對。
2. 沒有警告的話，點幾個格子、新增一個家事，然後**重新整理頁面**——格子跟家事清單應該都還在，代表資料真的寫進 Supabase 了。
3. 用另一台裝置（或無痕視窗）打開同一個網址，應該看到一樣的資料。

## 之後如果要重新檢查資料

Supabase 專案首頁的 **Table Editor** 可以直接看 `chores`、`cells` 這兩張表目前的內容，不需要再回來跑 SQL。
