# Supabase 家事項目表用替代鍵，不沿用「名稱即識別」

家事項目（chores）在 Supabase 裡用 `id bigserial` 當主鍵、`name text unique` 存名稱，格子（cells）表用 `chore_id` 外鍵參照，而不是直接把 `name` 當主鍵。這跟 ADR-0002「家事項目的名稱本身就是唯一識別」看似矛盾，但 ADR-0002 講的是前端 `store.js` 的 Map key 設計，這裡是資料庫層另一個獨立的鍵值選擇——兩者由 adapter（`src/supabase-adapter.js`）互相轉換，彼此不需要一致。選替代鍵的理由：如果 `name` 是主鍵，改名（`renameChore`）就需要把外鍵值 cascade 更新到該家事的每一列格子資料；用替代鍵的話，改名只動 `chores` 表裡的一個欄位，`cells` 表完全不用碰。

## Consequences

- 查詢/除錯資料庫時，`cells` 表看到的是數字 id 不是家事名稱，需要 join `chores` 表才看得懂，多一點認知負擔。
- adapter 需要維護 name → id 的對應（從 `loadChores()` 建立），前端本身完全不知道這個 id 存在。
