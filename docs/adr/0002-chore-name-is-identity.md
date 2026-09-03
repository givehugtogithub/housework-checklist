# 家事項目的名稱本身就是唯一識別（identity），不引入獨立 ID

`store.js` 用家事名稱字串直接當 Map 的 key（`cellKey` = `[chore, day]`），新增、刪除、改名都建立在這個模型上——改名等同於把該 chore 的所有格子資料從舊名稱 key 遷移到新名稱 key。曾考慮改用獨立的 stable id 讓不同列可以同名，但這個原型只給 Sean/Vera 兩人用，同名列無法用打勾記錄互相區分，實際用途有限；維持「名稱即 key」能讓新增/改名共用同一套重複檢查邏輯，也不用把 `store.js`、`app.js`、測試裡所有以名稱傳遞的 chore 參數改成 id。因此新增與改名時，名稱與既有項目重複一律擋下。

## Consequences

- 日後若要支援同名家事列，需要把 chore 的識別從名稱改成獨立 id，這會動到 `store.js` 的 Map key 結構、`app.js` 裡所有 `dataset.chore` 的傳遞方式、以及既有測試，是一次跨檔案的重構。
