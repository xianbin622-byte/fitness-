/**
 * body-visualizer：类 Body Visualizer 的 3D 体型展示（球体/圆柱组合 + WebGL）
 * 独立组件，与 body-silhouette / body-3d 并存，不修改既有逻辑。
 */

const M4 = {
  create() {
    const o = new Float32Array(16);
    o[0] = o[5] = o[10] = o[15] = 1;
    return o;
  },
  multiply(a, b, out) {
    const a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    const a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    const a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    const a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
    let b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = out[2] = out[3] = out[4] = 0;
    out[5] = f;
    out[6] = out[7] = out[8] = out[9] = 0;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[12] = out[13] = 0;
    out[14] = (2 * far * near) / (near - far);
    out[15] = 0;
    return out;
  },
  lookAt(out, eye, center, up) {
    let ex = eye[0],
      ey = eye[1],
      ez = eye[2];
    let cx = center[0],
      cy = center[1],
      cz = center[2];
    let ux = up[0],
      uy = up[1],
      uz = up[2];
    if (Math.abs(ex - cx) < 1e-6 && Math.abs(ey - cy) < 1e-6 && Math.abs(ez - cz) < 1e-6) return M4.identity(out);
    let z0 = ex - cx,
      z1 = ey - cy,
      z2 = ez - cz;
    let len = 1 / Math.hypot(z0, z1, z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    let x0 = uy * z2 - uz * z1,
      x1 = uz * z0 - ux * z2,
      x2 = ux * z1 - uy * z0;
    len = Math.hypot(x0, x1, x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    let y0 = z1 * x2 - z2 * x1,
      y1 = z2 * x0 - z0 * x2,
      y2 = z0 * x1 - z1 * x0;
    len = Math.hypot(y0, y1, y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * ex + x1 * ey + x2 * ez);
    out[13] = -(y0 * ex + y1 * ey + y2 * ez);
    out[14] = -(z0 * ex + z1 * ey + z2 * ez);
    out[15] = 1;
    return out;
  },
  identity(out) {
    for (let i = 0; i < 16; i++) out[i] = 0;
    out[0] = out[5] = out[10] = out[15] = 1;
    return out;
  },
  translate(out, x, y, z) {
    M4.identity(out);
    out[12] = x;
    out[13] = y;
    out[14] = z;
    return out;
  },
  scale(out, x, y, z) {
    M4.identity(out);
    out[0] = x;
    out[5] = y;
    out[10] = z;
    return out;
  },
  rotateY(out, rad) {
    const c = Math.cos(rad),
      s = Math.sin(rad);
    M4.identity(out);
    out[0] = c;
    out[2] = s;
    out[8] = -s;
    out[10] = c;
    return out;
  },
  copy(a, out) {
    out.set(a);
    return out;
  },
};

function buildSphere(radius, latBands, lonBands) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);
      const x = cosP * sinT;
      const y = cosT;
      const z = sinP * sinT;
      positions.push(radius * x, radius * y, radius * z);
      normals.push(x, y, z);
    }
  }
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

function buildCylinder(radiusTop, radiusBottom, height, radialSegments) {
  const positions = [];
  const normals = [];
  const indices = [];
  const half = height / 2;
  for (let i = 0; i <= radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2;
    const c = Math.cos(u);
    const s = Math.sin(u);
    positions.push(c * radiusTop, half, s * radiusTop);
    normals.push(c, 0, s);
    positions.push(c * radiusBottom, -half, s * radiusBottom);
    normals.push(c, 0, s);
  }
  for (let i = 0; i < radialSegments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }
  const addCircle = (y, radius, flip) => {
    const base = positions.length / 3;
    positions.push(0, y, 0);
    normals.push(0, flip ? -1 : 1, 0);
    for (let i = 0; i <= radialSegments; i++) {
      const u = (i / radialSegments) * Math.PI * 2;
      const c = Math.cos(u);
      const s = Math.sin(u);
      positions.push(c * radius, y, s * radius);
      normals.push(0, flip ? -1 : 1, 0);
    }
    for (let i = 0; i < radialSegments; i++) {
      if (flip) indices.push(base, base + 1 + i, base + 2 + i);
      else indices.push(base, base + 2 + i, base + 1 + i);
    }
  };
  addCircle(half, radiusTop, false);
  addCircle(-half, radiusBottom, true);
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uMVP;
uniform mat3 uN;
varying vec3 vN;
varying vec3 vPos;
void main() {
  vN = uN * aNor;
  vec4 p = uMVP * vec4(aPos, 1.0);
  vPos = p.xyz;
  gl_Position = p;
}
`;

const FS = `
precision mediump float;
varying vec3 vN;
uniform vec3 uColor;
uniform vec3 uLight;
void main() {
  vec3 n = normalize(vN);
  float d = max(dot(n, normalize(uLight)), 0.0);
  vec3 c = uColor * (0.38 + 0.62 * d);
  gl_FragColor = vec4(c, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

function createProgram(gl) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  return p;
}

function mat3FromMat4(m) {
  const out = new Float32Array(9);
  out[0] = m[0];
  out[1] = m[1];
  out[2] = m[2];
  out[3] = m[4];
  out[4] = m[5];
  out[5] = m[6];
  out[6] = m[8];
  out[7] = m[9];
  out[8] = m[10];
  return out;
}

function invert3x3(m) {
  const a = m[0],
    b = m[1],
    c = m[2];
  const d = m[3],
    e = m[4],
    f = m[5];
  const g = m[6],
    h = m[7],
    i = m[8];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-8) return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const inv = 1 / det;
  const out = new Float32Array(9);
  out[0] = (e * i - f * h) * inv;
  out[1] = (c * h - b * i) * inv;
  out[2] = (b * f - c * e) * inv;
  out[3] = (f * g - d * i) * inv;
  out[4] = (a * i - c * g) * inv;
  out[5] = (c * d - a * f) * inv;
  out[6] = (d * h - e * g) * inv;
  out[7] = (b * g - a * h) * inv;
  out[8] = (a * e - b * d) * inv;
  return out;
}

function transpose3(m) {
  return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
}

const tmpA = M4.create();
const tmpB = M4.create();
const tmpC = M4.create();
const tmpD = M4.create();
const tmpE = M4.create();
const tmpF = M4.create();
const tmpG = M4.create();
const tmpH = M4.create();
const tmpI = M4.create();
const tmpJ = M4.create();
const tmpK = M4.create();
const tmpL = M4.create();
const tmpM = M4.create();
const tmpN = M4.create();
const tmpO = M4.create();
const tmpP = M4.create();
const tmpQ = M4.create();
const tmpR = M4.create();
const tmpS = M4.create();
const tmpT = M4.create();
const tmpU = M4.create();
const tmpV = M4.create();
const tmpW = M4.create();
const tmpX = M4.create();
const tmpMV = M4.create();

function meshWorld(groupMat, localT, localS, out) {
  M4.multiply(groupMat, localT, tmpA);
  M4.multiply(tmpA, localS, out);
  return out;
}

Component({
  properties: {
    height: { type: Number, value: 170 },
    weight: { type: Number, value: 65 },
    bodyFat: { type: Number, value: 18 },
    waist: { type: Number, value: 75 },
    hip: { type: Number, value: 95 },
    thigh: { type: Number, value: 55 },
  },

  data: {},

  lifetimes: {
    attached() {
      this._alive = true;
      this._rotY = 0;
      this._velY = 0;
      this._lastTouchX = 0;
      this._touching = false;
      this._proj = M4.create();
      this._view = M4.create();
      this._vp = M4.create();
      this._m = M4.create();
      this._mvp = M4.create();
      this._group = M4.create();
      this._localT = M4.create();
      this._localS = M4.create();
      this._world = M4.create();
      this._targets = {
        waist: { x: 1, y: 1, z: 1 },
        hip: { x: 1, y: 1, z: 1 },
        thigh: { x: 1, y: 1, z: 1 },
        base: 1,
        stretchY: 1,
      };
      this._cur = JSON.parse(JSON.stringify(this._targets));
      this._frameGap = 1000 / 30;
      this._lastFrame = 0;
      this._rafId = 0;
      this._paused = false;
      this._syncTargets();
      wx.nextTick(() => this._init());
    },
    detached() {
      this._alive = false;
      this._paused = true;
      if (this._rafId) {
        this.cancelAnimationFramePoly(this._rafId);
        this._rafId = 0;
      }
    },
  },

  pageLifetimes: {
    show() {
      this._paused = false;
      if (this._gl) this._loop();
    },
    hide() {
      this._paused = true;
      if (this._rafId) {
        this.cancelAnimationFramePoly(this._rafId);
        this._rafId = 0;
      }
    },
  },

  observers: {
    height() {
      this._syncTargets();
    },
    weight() {
      this._syncTargets();
    },
    bodyFat() {
      this._syncTargets();
    },
    waist() {
      this._syncTargets();
    },
    hip() {
      this._syncTargets();
    },
    thigh() {
      this._syncTargets();
    },
  },

  methods: {
    cancelAnimationFramePoly(id) {
      if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(id);
    },
    requestAnimationFramePoly(cb) {
      if (typeof requestAnimationFrame !== "undefined") return requestAnimationFrame(cb);
      return setTimeout(cb, 16);
    },

    _clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    },

    _syncTargets() {
      const height = Number(this.properties.height) || 170;
      const weight = Number(this.properties.weight) || 65;
      const bodyFat = Number(this.properties.bodyFat) || 18;
      const waistCm = Number(this.properties.waist) || 75;
      const hip = Number(this.properties.hip) || 95;
      const thigh = Number(this.properties.thigh) || 55;

      const fatFactor = bodyFat / 100;
      const waistScaleBase = 1 + fatFactor * 0.8;
      const waistScale = waistScaleBase * this._clamp(1 + (waistCm - 75) / 200, 0.92, 1.12);
      const hipScale = 1 + hip / 100;
      const thighScale = 1 + thigh / 100;
      const scaleBase = this._clamp(weight / height, 0.35, 1.25);
      const stretchY = this._clamp(height / 170, 0.85, 1.2);

      this._targets = {
        waist: { x: waistScale, y: 1, z: waistScale },
        hip: { x: hipScale, y: hipScale * 0.95, z: hipScale * 0.92 },
        thigh: { x: thighScale, y: 1, z: thighScale },
        base: scaleBase,
        stretchY,
      };
    },

    _init() {
      const q = wx.createSelectorQuery().in(this);
      q.select("#bodyVisualizerCanvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const w = res[0].width || 300;
          const h = res[0].height || 280;
          const dpr = wx.getSystemInfoSync().pixelRatio || 1;
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
          if (!gl) return;
          this._gl = gl;
          this._canvas = canvas;
          this._aspect = w / h;
          this._program = createProgram(gl);
          this._loc = {
            aPos: gl.getAttribLocation(this._program, "aPos"),
            aNor: gl.getAttribLocation(this._program, "aNor"),
            uMVP: gl.getUniformLocation(this._program, "uMVP"),
            uN: gl.getUniformLocation(this._program, "uN"),
            uColor: gl.getUniformLocation(this._program, "uColor"),
            uLight: gl.getUniformLocation(this._program, "uLight"),
          };
          gl.enable(gl.DEPTH_TEST);
          gl.clearColor(0.94, 0.96, 0.99, 1);

          this._geo = {
            head: buildSphere(0.22, 12, 16),
            torso: buildCylinder(0.28, 0.3, 0.52, 20),
            waist: buildCylinder(0.22, 0.24, 0.2, 18),
            hip: buildSphere(0.26, 10, 14),
            leg: buildCylinder(0.11, 0.1, 0.62, 14),
          };

          this._meshes = [
            { geo: this._geo.head, color: [0.45, 0.62, 0.95], pos: [0, 1.06, 0], scale: [1, 1, 1], role: "head" },
            { geo: this._geo.torso, color: [0.38, 0.55, 0.9], pos: [0, 0.46, 0], scale: [1, 1, 1], role: "torso" },
            { geo: this._geo.waist, color: [0.42, 0.58, 0.92], pos: [0, 0.07, 0], scale: [1, 1, 1], role: "waist" },
            { geo: this._geo.hip, color: [0.5, 0.45, 0.88], pos: [0, -0.14, 0], scale: [1, 1, 1], role: "hip" },
            { geo: this._geo.leg, color: [0.4, 0.52, 0.88], pos: [-0.13, -0.78, 0], scale: [1, 1, 1], role: "legL" },
            { geo: this._geo.leg, color: [0.4, 0.52, 0.88], pos: [0.13, -0.78, 0], scale: [1, 1, 1], role: "legR" },
          ];

          this._buffers = this._meshes.map((m) => this._uploadGeo(gl, m.geo));

          M4.perspective(this._proj, (48 * Math.PI) / 180, this._aspect, 0.08, 50);
          M4.translate(this._view, 0, -0.08, -3.35);
          M4.multiply(this._proj, this._view, this._vp);

          this._loop();
        });
    },

    _uploadGeo(gl, geo) {
      const pb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
      const nb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nb);
      gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
      return { pb, nb, ib, count: geo.indices.length };
    },

    _lerpVec(cur, tgt, k) {
      cur.x += (tgt.x - cur.x) * k;
      cur.y += (tgt.y - cur.y) * k;
      cur.z += (tgt.z - cur.z) * k;
    },

    _lerp1(a, b, k) {
      return a + (b - a) * k;
    },

    _tickAnim() {
      const k = 0.14;
      this._lerpVec(this._cur.waist, this._targets.waist, k);
      this._lerpVec(this._cur.hip, this._targets.hip, k);
      this._lerpVec(this._cur.thigh, this._targets.thigh, k);
      this._cur.base = this._lerp1(this._cur.base, this._targets.base, k);
      this._cur.stretchY = this._lerp1(this._cur.stretchY, this._targets.stretchY, k);
    },

    _applyMeshScale(mesh) {
      const s = mesh.role === "waist" ? this._cur.waist : mesh.role === "hip" ? this._cur.hip : mesh.role === "legL" || mesh.role === "legR" ? this._cur.thigh : { x: 1, y: 1, z: 1 };
      mesh.scale[0] = s.x;
      mesh.scale[1] = s.y;
      mesh.scale[2] = s.z;
    },

    _loop() {
      if (!this._alive || this._paused || !this._gl) return;
      const now = Date.now();
      this._velY *= 0.92;
      this._rotY += this._velY;
      this._tickAnim();
      if (now - this._lastFrame < this._frameGap) {
        this._rafId = this.requestAnimationFramePoly(() => this._loop());
        return;
      }
      this._lastFrame = now;

      const gl = this._gl;
      const pr = this._program;
      gl.viewport(0, 0, this._canvas.width, this._canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(pr);

      const aPos = this._loc.aPos;
      const aNor = this._loc.aNor;
      const uMVP = this._loc.uMVP;
      const uN = this._loc.uN;
      const uColor = this._loc.uColor;
      const uLight = this._loc.uLight;
      gl.uniform3fv(uLight, new Float32Array([0.45, 0.85, 0.55]));

      M4.rotateY(tmpR, this._rotY);
      M4.scale(tmpS, this._cur.base, this._cur.stretchY, this._cur.base);
      M4.multiply(tmpR, tmpS, this._group);

      for (let i = 0; i < this._meshes.length; i++) {
        const mesh = this._meshes[i];
        this._applyMeshScale(mesh);
        M4.translate(tmpT, mesh.pos[0], mesh.pos[1], mesh.pos[2]);
        M4.scale(tmpU, mesh.scale[0], mesh.scale[1], mesh.scale[2]);
        meshWorld(this._group, tmpT, tmpU, this._world);
        M4.multiply(this._vp, this._world, this._mvp);

        M4.multiply(this._view, this._world, tmpMV);
        const m3 = mat3FromMat4(tmpMV);
        const inv = invert3x3(m3);
        const normalMat = transpose3(inv);

        gl.uniformMatrix4fv(uMVP, false, this._mvp);
        gl.uniformMatrix3fv(uN, false, normalMat);
        gl.uniform3fv(uColor, new Float32Array(mesh.color));

        const buf = this._buffers[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.pb);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.nb);
        gl.enableVertexAttribArray(aNor);
        gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.ib);
        gl.drawElements(gl.TRIANGLES, buf.count, gl.UNSIGNED_SHORT, 0);
      }

      this._rafId = this.requestAnimationFramePoly(() => this._loop());
    },

    onTouchStart(e) {
      if (!e.touches || !e.touches.length) return;
      this._touching = true;
      this._lastTouchX = e.touches[0].clientX;
    },
    onTouchMove(e) {
      if (!this._touching || !e.touches || !e.touches.length) return;
      const x = e.touches[0].clientX;
      const dx = x - this._lastTouchX;
      this._lastTouchX = x;
      this._velY += dx * 0.012;
      this._velY = this._clamp(this._velY, -0.35, 0.35);
    },
    onTouchEnd() {
      this._touching = false;
    },
  },
});
