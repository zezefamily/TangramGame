# 木纹素材与动画记录

木纹通过内置 `image_gen` 生成；未使用 API/CLI 图片生成模式。

- 生成原稿：`artifacts/assets/beech-source.png`
- 游戏使用的 JPEG：`public/assets/wood/beech.jpg`
- 生成后仅转码为 JPEG；漆面着色、边缘、厚度和投影由游戏渲染。
- Rive 动画源：`animation-src/wood-feedback/scene.rml`
- 本地运行素材：`public/assets/rive/wood-feedback.riv`

完整生成提示词：

> Use case: product-mockup. Asset type: seamless material texture for an interactive wooden tangram game, NOT a screenshot or UI. Generate one square, flat, orthographic, evenly lit, edge-to-edge close-up material swatch of pale natural beech wood, warm honey cream color approximately #e4bf89. Very fine delicate horizontal wood grain, subtle realistic pores, gentle natural variation, matte smooth sanded toy-quality finish. This will be tiled over a wooden toy frame and multiplied with bright paint colors on seven wooden tangram pieces. Uniform diffuse neutral lighting across the entire image, no directional shadows, no perspective, no frame, no seams, no joins, no planks, no objects, no text, no watermark. Restrained detailed texture; calm and child-friendly, resembles a real pale beech educational wooden toy.
