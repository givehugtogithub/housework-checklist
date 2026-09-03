# 使用 Supabase 做即時同步後端，部署到 GitHub Pages

Sean 和 Vera 需要在各自的裝置上即時看到對方的打勾紀錄，純前端 (localStorage) 無法跨裝置同步。考慮過發布成 Claude Artifact（內建即時共用資料庫，設定最快，但 Vera 端可能需要 Claude 帳號才能寫入，門檻不確定）與 Firebase（同類型 BaaS）。最終選 **Supabase**：Postgres + 內建 Realtime 訂閱，結構化資料（家事 x 日期 x 人）用關聯式資料表很自然，免費額度足夠兩人使用，且任何一般瀏覽器都能開啟、不綁定 Claude 帳號。網頁本身部署到 **GitHub Pages**，因為此 repo 已掛有 GitHub remote (`givehugtogithub/housework-checklist`)，不需要再申請新的部署帳號。

## Consequences

- 需要使用者自行申請免費 Supabase 帳號與專案（Claude 無法代為註冊帳號）。
- Supabase 的 anon public key 會內嵌在前端程式碼中，需靠 Row Level Security 規則限制讀寫範圍，而非隱藏 key 本身。
