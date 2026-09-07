# 格子從三態改為四態，新增「共同標記」，不拆 schema

`nextCellColor` 原本是三態（空 / Sean / Vera），點擊規則是「相同色清空、不同色直接覆蓋」——這代表 Sean 和 Vera 沒辦法同時標記同一格，後點的人會蓋掉先點的人。現在改成四態，新增 `both`：每個顏色的點擊只切換「自己那一半」的有無（空/自己 → 該色或清空；對方 → 共同標記；共同標記 → 拆回對方單獨的顏色），跟對方是否已標記、誰先點無關。`getTally()` 不特別 if/else 判斷 `both`，而是讓每個格子值先展開成它貢獻的顏色列表（`both` 展開成 `['blue', 'pink']`，單色展開成自己，空展開成空陣列）再累加，維持「一個迴圈算完所有格子」的形狀。

沒有拆 schema：`cells` 表維持單一 `color` 欄位、整格覆蓋寫入（見 [ADR-0004](0004-supabase-sync-fire-and-forget.md)），`both` 只是這個欄位的第三種合法字串值，不是拆成兩個布林欄位（`sean_marked`/`vera_marked`）之類的正規化設計。拆 schema 能更精確地表達「兩個獨立的人分別標記」，但這個 app 從頭到尾只有兩個使用者、顏色集合固定不變，正規化換來的彈性目前用不上，反而要動 Supabase 表結構、`supabase-adapter.js` 的讀寫合約、和既有的 fake-adapter 測試模式；維持單欄位字串，新值只是多一種，`pushCell` 完全不用改。

「不拆 schema」不代表資料庫端完全不用動：`cells.color` 原本有一條 `check (color in ('blue', 'pink'))` 的限制式（見 [docs/setup-supabase.md](../setup-supabase.md)），只允許兩種值。這條限制式也是 schema 的一部分，只是不涉及拆表/拆欄位，所以第一版實作時漏了改——結果是 `both` 寫入時被 Postgres 拒絕，而 `pushCell` 是 fire-and-forget（失敗只 `console.error`，見 ADR-0004），畫面上看起來標記成功，重新整理後才會發現又變回單色。既有專案要手動跑 migration 把限制式改成 `check (color in ('blue', 'pink', 'both'))`，步驟見 setup-supabase.md 的「既有專案升級」一節。

視覺呈現用兩個 `::before`/`::after` 偽元素各自 `clip-path: polygon(...)` 切出左上、右下兩個三角形，而不是用 `linear-gradient(to bottom right, ...)` 硬切兩色。原本試過 gradient 版本：畫面上（40×36px 的格子，接近但不是正方形）目視沒問題，但推導過才發現這個技巧只有在格子是正方形時，兩個色塊的分界線才會精確落在另一條對角線的兩個角上——長寬比不同時，`to bottom right` 的漸層方向其實跟著主對角線走，中點處垂直切出的分界線只有正方形才會剛好垂直於另一條對角線，長方形會讓分界線偏離角落幾個像素，格子越扁、偏移越明顯。`clip-path` 的多邊形座標是 x/y 各自獨立算百分比，跟格子長寬比無關，兩個三角形的頂點永遠精確落在四個角上，才真的符合「固定 Sean 左上、Vera 右下」的三角形要求。兩個三角形各自把跟分隔線相鄰的角往內收 2px，露出底色（`--cell-divider`）當作分隔線。

## Consequences

- 之後若要支援兩人以上共用（例如加入第三個顏色），這次的四態設計整個不適用：`otherColor()` 硬編碼只有兩種顏色互斥，`both` 這個值名稱也預設只有兩人，要重新設計成「已標記顏色集合」的通用模型。
- `both` 的視覺樣式（兩個 clip-path 三角形）綁定在 `--sean`/`--vera` 兩個 CSS 變數；日後改動任一人的顏色變數會自動反映到共同標記格，但如果要讓分隔線寬度可設定或做成動畫效果，目前寫死在 `clip-path` 座標裡的 `2px` 不好抽出來變成變數。
- `.cell--both` 用兩個滿版的偽元素蓋住整個格子，會蓋掉 `.cell:hover` 原本的 inset box-shadow（滑鼠移過去的提示框線）；已經另外用 `.cell--both:hover::after` 把提示框線搬到最上層的偽元素上補回來，日後如果 hover 樣式再改，要記得這個格子的 hover 是走不同規則。
