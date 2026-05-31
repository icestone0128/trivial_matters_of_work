# trivial_matters_of_work

## 專案定位

- 專案名稱：`trivial_matters_of_work`
- 專案用途：記錄和執行工作上的一些任務。
- 工作資料夾：`/Users/arrywu/Library/CloudStorage/GoogleDrive-icestone0128@gmail.com/我的雲端硬碟/trivial_matters_of_work`
- GitHub repo：`icestone0128/trivial_matters_of_work`，公開 repo。
- 預設分支：`main`
- GitHub Pages：已使用，來源為 `main` 分支 `/docs`。
- Firebase：已使用 Firebase Hosting 作為另一份靜態部署。
- 部署：GitHub Pages 與 Firebase Hosting。

## Obsidian 駕駛艙

- Obsidian vault：`/Users/arrywu/Library/CloudStorage/GoogleDrive-icestone0128@gmail.com/我的雲端硬碟/secondbrain`
- 專案駕駛艙：`專案庫/trivial_matters_of_work/專案工作流程.md`
- 專案進度、決策、下一步，優先寫在 Obsidian 駕駛艙。
- 專案 repo 只放必要的工作檔、任務資料與可重複使用的素材。

## Arry 助手雙層資料層

- 全域核心層：`/Users/arrywu/Library/CloudStorage/GoogleDrive-icestone0128@gmail.com/我的雲端硬碟/codex_symlink`
- 全域 skill：`/Users/arrywu/.codex/skills/arry-assistant/SKILL.md`
- 專案本地 assistant 層：`000_Agent/`（只放本專案專屬 skill 或 memories，不放全域核心資料）
- 專案本地任務層：`100_Todo/`
- 專案本地參考層：`200_Reference/`
- 跨專案偏好、固定規則、踩坑經驗才同步到全域核心層。
- 本專案自己的草稿、素材、進度與任務紀錄留在本專案或 Obsidian 駕駛艙。
- 若需要專案專屬 assistant skill，建立在 `000_Agent/skills/`；若需要專案獨立記憶，建立在 `000_Agent/memories/`。
- 不要把 `000_Agent/skills/` symlink 到 `/Users/arrywu/.codex/skills`。

## 工作流程

- 新專案初始化：使用 `project-init-sync`，只補缺口，不覆蓋既有檔案或 Git 歷史。
- 開工接續：使用 `startup-sync`，先讀本檔、Obsidian 駕駛艙與 Git 狀態。
- 收工同步：使用 `shutdown-sync`，整理變更、更新駕駛艙；只有使用者明確要求時才 commit 或 push。
- 開工時先讀本檔與 Obsidian 駕駛艙，確認目前狀態再動手。
- 收工時整理本次變更、剩餘事項與下一步，必要時更新 Obsidian 駕駛艙。
- 既有檔案只補缺口，不覆寫未確認的內容。
- Git 操作前先確認目前變更範圍，避免把無關檔案一起提交。

## 安全規則

- 不把 `.env`、API key、token、密碼、Admin 憑證寫進 repo。
- 不把不必要的個資或敏感資料寫進 repo。
- 不提交 `.codex/`、`.claude/`、本機快取或系統產生檔。
- 若任務涉及公司內部資料，先判斷是否適合進 repo；不確定時放在 Obsidian 駕駛艙或詢問使用者。
