# Arry 助手專案本地資料層

本資料夾只放 `trivial_matters_of_work` 專案自己的 assistant 資產，不是 Arry 助手全域核心層。

全域 Arry 助手資料層固定在：

```text
/Users/arrywu/Library/CloudStorage/GoogleDrive-icestone0128@gmail.com/我的雲端硬碟/codex_symlink/
  skills/      # Codex 全域 skills；/Users/arrywu/.codex/skills 指向這裡
  memory/      # Arry 助手跨專案記憶、個人偏好、踩坑
  workflows/   # 跨專案 workflow 草稿，成熟後升級成全域 skill
  knowledge/   # Arry 助手跨專案知識清單與工具清單
```

本專案預設只使用：

- `100_Todo/`：工作任務草稿、待辦與進行中資料。
- `200_Reference/`：工作任務參考素材、模板與範例。

只有本專案需要專案專屬 assistant skill 時，才在此建立 `skills/`；只有需要專案獨立記憶時，才在此建立 `memory/`。不要把本資料夾 symlink 到 `/Users/arrywu/.codex/skills`。
