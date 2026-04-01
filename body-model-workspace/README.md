# 人模 GLB 工作区（独立于 DCC，对接主仓库小程序）

本目录**不放小程序代码**，用于：

1. **浏览器快速验模**：打开 `preview/index.html`（需本地 HTTP 服务），可选本地 `.glb` 文件查看是否正常。
2. **约定产出物**：最终人模请导出为 **`body.glb`**（或男女各一），复制到主仓库：

   ```
   fitness-coach-app/miniprogram/assets/models/body.glb
   ```

3. **详细需求与骨骼映射**：见主仓库 `docs/prompt_new_project_3d_body.md`、`docs/bone_mapping_draft.md`。

## 浏览器预览（验模）

```bash
cd body-model-workspace/preview
python3 -m http.server 8080
```

浏览器打开 `http://127.0.0.1:8080/`，用「选择 glb 文件」加载你的模型。

## 小程序里看

主仓库已注册页面 **`pages/dev/body-avatar-demo/body-avatar-demo`**（开发演示）。默认仍用包内 `duck.glb`；你把 `body.glb` 放进 `miniprogram/assets/models/` 后，编辑该页 `body-avatar-demo.js` 里 `defaultModel` 为 `assets/models/body.glb` 即可。

**说明**：人模网格、绑定须由 Blender 等完成，本文件夹无法自动生成网格，仅提供 **接入位置 + 预览工具**。
