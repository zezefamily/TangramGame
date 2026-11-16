# 木作反馈动画

`wood-feedback/scene.rml` 是本项目自制的 Rive 源文件，不含外部图片和用户脚本。包含四个 artboard：

- `Guide`：指向与轻点的小手，供 Phaser 的教学纹理使用。
- `Seal`：完成作品时的木色印章和星星。
- `Page`：翻到下一张题卡的纸张动画。
- `Bird`：第八张作品完成时的小鸟挥动翅膀。

已使用 Rive CLI 1.9.2 验证和渲染。应用直接加载 `public/assets/rive/wood-feedback.riv` 和本地 `rive.wasm`，Docker 构建和运行无需 Rive CLI、账户或外部服务。

重新制作时，在已安装 CLI 的开发机上运行：

```sh
rive wood-feedback --verify
rive inspect wood-feedback --summary
rive wood-feedback --serve=8179
```

在仓库根目录的另一个终端运行 `node scripts/capture-rive.mjs`，可保存本项目自己的本地预览构建，随后进行 Web runtime 实测。该预览传输适配当前 CLI 版本，CLI 更新后应重新校验。使用 Rive 官方发布导出工作流时，也可以将输出的同名 `.riv` 放入该路径。

Rive runtime 采用项目中锁定的 `@rive-app/canvas` 版本。更新 runtime 后，同时从依赖包更新 `public/assets/rive/rive.wasm` 并重新测试四段动画。
