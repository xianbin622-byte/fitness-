/**
 * body-gltf：threejs-miniprogram + 包内 GLB（演示/可替换为人物模型）
 * 注意：勿使用 require('threejs-miniprogram')，在组件内会被错误解析为相对路径；
 * 使用 miniprogram_npm 显式路径（npm install 时由 scripts/copy-threejs-npm.js 生成）。
 */
const { createScopedThreejs } = require("../../miniprogram_npm/threejs-miniprogram/index.js");
const { registerGLTFLoader } = require("../../libs/gltf-loader.js");

/** GLB 文件头魔数「glTF」（与 HTML 等误下载区分） */
function isBinaryGlbBuffer(ab) {
  if (!ab || ab.byteLength < 12) return false;
  const u8 = new Uint8Array(ab, 0, 4);
  return u8[0] === 0x67 && u8[1] === 0x6c && u8[2] === 0x54 && u8[3] === 0x46;
}

Component({
  properties: {
    /** 相对于小程序根目录（miniprogram/）的 glb 路径 */
    modelPath: {
      type: String,
      value: "assets/models/duck.glb",
    },
  },

  data: {
    errorMsg: "",
  },

  lifetimes: {
    attached() {
      this._alive = true;
      this._paused = false;
      this._touching = false;
      this._touchLastX = 0;
      wx.nextTick(() => this._init());
    },
    detached() {
      this._alive = false;
      this._paused = true;
    },
  },

  pageLifetimes: {
    show() {
      this._paused = false;
      if (this._renderer && this._scene && this._camera) this._loop();
    },
    hide() {
      this._paused = true;
    },
  },

  methods: {
    _init() {
      if (!this._alive) return;
      wx.createSelectorQuery()
        .in(this)
        .select("#bodyGltfCanvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!this._alive || !res[0] || !res[0].node) {
            this.setData({ errorMsg: "Canvas 未就绪" });
            return;
          }
          const canvas = res[0].node;
          this.canvas = canvas;
          let THREE;
          try {
            THREE = createScopedThreejs(canvas);
            registerGLTFLoader(THREE);
          } catch (e) {
            console.error(e);
            this.setData({
              errorMsg: "Three 初始化失败，请确认已构建 npm（threejs-miniprogram）",
            });
            return;
          }

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0xe8eef5);

          const hemi = new THREE.HemisphereLight(0xffffff, 0x5c6b7a, 1);
          hemi.position.set(0, 20, 0);
          scene.add(hemi);
          const dir = new THREE.DirectionalLight(0xffffff, 0.85);
          dir.position.set(5, 10, 7);
          scene.add(dir);

          const w = canvas.width || 300;
          const h = canvas.height || 320;
          const camera = new THREE.PerspectiveCamera(45, w / Math.max(h, 1), 0.1, 100);
          camera.position.set(0, 1.2, 4);
          camera.lookAt(0, 0.8, 0);

          const renderer = new THREE.WebGLRenderer({ antialias: true });
          const sys = wx.getSystemInfoSync();
          renderer.setPixelRatio(sys.pixelRatio || 1);
          renderer.setSize(w, h);
          if (renderer.gammaOutput !== undefined) {
            renderer.gammaOutput = true;
            renderer.gammaFactor = 2.2;
          }

          this._THREE = THREE;
          this._scene = scene;
          this._camera = camera;
          this._renderer = renderer;
          this._model = null;

          const modelPath = this.properties.modelPath;
          wx.getFileSystemManager().readFile({
            filePath: modelPath,
            success: (fileRes) => {
              if (!this._alive) return;
              const ab = fileRes.data;
              if (!isBinaryGlbBuffer(ab)) {
                console.error("body-gltf: 文件不是有效 GLB（可能误存成网页 HTML），请检查", modelPath);
                this.setData({
                  errorMsg:
                    "模型文件无效（不是 GLB 二进制）。若曾用浏览器另存，请换用仓库内 assets/models/duck.glb。",
                });
                return;
              }
              const basePath =
                modelPath.lastIndexOf("/") >= 0
                  ? modelPath.slice(0, modelPath.lastIndexOf("/") + 1)
                  : "";
              const loader = new THREE.GLTFLoader();
              loader.parse(
                ab,
                basePath,
                (gltf) => {
                  if (!this._alive) return;
                  const model = gltf.scene;
                  scene.add(model);
                  this._model = model;
                  model.updateMatrixWorld(true);

                  const box = new THREE.Box3().setFromObject(model);
                  const center = new THREE.Vector3();
                  const size = new THREE.Vector3();
                  box.getCenter(center);
                  box.getSize(size);
                  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
                  model.position.sub(center);
                  const dist = maxDim * 2.2;
                  camera.position.set(0, maxDim * 0.4, dist);
                  camera.lookAt(0, maxDim * 0.15, 0);

                  this._loop();
                },
                (err) => {
                  console.error("GLTF parse", err);
                  this.setData({ errorMsg: "模型解析失败" });
                }
              );
            },
            fail: (err) => {
              console.error("readFile", err);
              this.setData({
                errorMsg:
                  "无法读取 " +
                  modelPath +
                  "。请确认文件在包内且路径正确；若首次使用 three，请先「构建 npm」。",
              });
            },
          });
        });
    },

    _loop() {
      if (!this._alive || this._paused || !this._renderer || !this._scene || !this._camera) {
        return;
      }
      const canvas = this.canvas;
      if (canvas && canvas.requestAnimationFrame) {
        canvas.requestAnimationFrame(() => this._loop());
      } else {
        setTimeout(() => this._loop(), 16);
      }

      const model = this._model;
      if (model && !this._touching) {
        model.rotation.y += 0.004;
      }

      this._renderer.render(this._scene, this._camera);
    },

    onTouchStart(e) {
      if (!e.touches || !e.touches.length) return;
      this._touching = true;
      this._touchLastX = e.touches[0].clientX;
    },

    onTouchMove(e) {
      if (!this._touching || !this._model || !e.touches || !e.touches.length) return;
      const x = e.touches[0].clientX;
      const dx = x - this._touchLastX;
      this._touchLastX = x;
      this._model.rotation.y += dx * 0.012;
    },

    onTouchEnd() {
      this._touching = false;
    },
  },
});
