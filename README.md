# trivial_matters_of_work

這個專案用來記錄和執行工作上的一些任務。

## 目錄

- `100_Todo/`：任務草稿、進行中事項與封存。
- `200_Reference/`：參考資料、模板、腳本、過去成果與本地靜態網站來源。
- `000_Agent/`：Arry 助手專案本地層，只放本專案專屬 skill 或 memories。
- `AGENTS.md`：Codex 專案規則與工作方式。

標準本地資料層：

- `100_Todo/drafts/`、`100_Todo/projects/`、`100_Todo/archive/`
- `200_Reference/writing-samples/`、`200_Reference/templates/`、`200_Reference/past-work/`
- `200_Reference/docs/`：GitHub Pages / Live Word Cloud 的本地靜態網站工作來源。
- `200_Reference/scripts/`：專案驗證、同步與輔助腳本；不要在根目錄建立 `scripts/`。

根目錄保持極簡，不放 `docs/`、`assets/`、`scripts/`、本機 cache 或 runtime。

## 專案設定

- GitHub repo：`icestone0128/trivial_matters_of_work`
- Repo 類型：公開
- GitHub Pages：由獨立 `gh-pages` 分支發布；main 分支的本地網站工作來源放在 `200_Reference/docs/`，根目錄不保留 `docs/`。
- Firebase：使用 Firebase Hosting
- Netlify：BOS Report Analysis Web 前端使用 Netlify；專案根目錄不連結 Netlify site。
- 部署：
  - GitHub Pages：`https://icestone0128.github.io/trivial_matters_of_work/`
  - Firebase Hosting：`https://design-tool-63582.web.app/`
  - Live Word Cloud Firebase Hosting：`https://live-wordcloud-89273.web.app/`
  - BOS Report Analysis Web：`https://bos-report-analysis-web.netlify.app/`

## 驗證

基本結構與設定檢查：

```bash
bash 200_Reference/scripts/verify_project.sh
```

## Obsidian 駕駛艙

專案進度與決策記錄在：

`/Users/arrywu/Library/CloudStorage/GoogleDrive-icestone0128@gmail.com/我的雲端硬碟/secondbrain/專案庫/trivial_matters_of_work/專案工作流程.md`
