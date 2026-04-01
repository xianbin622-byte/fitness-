/**
 * body-advanced：细分部位 + 胶囊/球体 WebGL，围度与体脂驱动缩放
 * 独立组件，不修改既有业务与其它组件。
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
  rotateX(out, rad) {
    const c = Math.cos(rad),
      s = Math.sin(rad);
    M4.identity(out);
    out[5] = c;
    out[6] = s;
    out[9] = -s;
    out[10] = c;
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
  rotateZ(out, rad) {
    const c = Math.cos(rad),
      s = Math.sin(rad);
    M4.identity(out);
    out[0] = c;
    out[1] = s;
    out[4] = -s;
    out[5] = c;
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

function buildCylinderOpen(rTop, rBottom, height, radialSegments) {
  const positions = [];
  const normals = [];
  const indices = [];
  const half = height / 2;
  for (let i = 0; i <= radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2;
    const c = Math.cos(u);
    const s = Math.sin(u);
    positions.push(c * rTop, half, s * rTop);
    normals.push(c, 0, s);
    positions.push(c * rBottom, -half, s * rBottom);
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
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

function translateGeo(geo, tx, ty, tz) {
  const p = new Float32Array(geo.positions.length);
  for (let i = 0; i < geo.positions.length; i += 3) {
    p[i] = geo.positions[i] + tx;
    p[i + 1] = geo.positions[i + 1] + ty;
    p[i + 2] = geo.positions[i + 2] + tz;
  }
  return { positions: p, normals: geo.normals, indices: geo.indices };
}

function mergeGeometries(parts) {
  const pos = [];
  const nor = [];
  const idx = [];
  let off = 0;
  for (let g = 0; g < parts.length; g++) {
    const geo = parts[g];
    const n = geo.positions.length / 3;
    for (let i = 0; i < geo.positions.length; i++) pos.push(geo.positions[i]);
    for (let i = 0; i < geo.normals.length; i++) nor.push(geo.normals[i]);
    for (let i = 0; i < geo.indices.length; i++) idx.push(geo.indices[i] + off);
    off += n;
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint16Array(idx) };
}

/** 沿 Y 的胶囊：两端球 + 中间开放圆柱，圆滑衔接 */
function buildCapsuleY(radius, midLen, radialSeg) {
  const sph = buildSphere(radius, 12, 18);
  const cyl = buildCylinderOpen(radius, radius, midLen, radialSeg);
  const bot = translateGeo(sph, 0, -midLen / 2 - radius * 0.02, 0);
  const top = translateGeo(sph, 0, midLen / 2 + radius * 0.02, 0);
  return mergeGeometries([bot, cyl, top]);
}

const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uMVP;
uniform mat3 uN;
varying vec3 vN;
void main() {
  vN = uN * aNor;
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const FS = `
precision mediump float;
varying vec3 vN;
uniform vec3 uColor;
uniform vec3 uLight;
void main() {
  vec3 n = normalize(vN);
  float nd = max(dot(n, normalize(uLight)), 0.0);
  float wrap = nd * 0.72 + 0.28;
  vec3 amb = uColor * 0.42;
  vec3 dif = uColor * 0.58 * wrap;
  gl_FragColor = vec4(amb + dif, 1.0);
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

function colorByBodyFat(bf) {
  if (bf < 12) return [0.28, 0.52, 0.95];
  if (bf < 18) return [0.22, 0.78, 0.48];
  if (bf < 25) return [0.98, 0.58, 0.22];
  return [0.95, 0.32, 0.28];
}

/** 女 / female / f 视为女性；其余为男性（含「男」） */
function isFemaleGender(g) {
  const s = String(g == null ? "" : g).trim().toLowerCase();
  return s === "female" || s === "女" || s === "f";
}

/** 女性形体展示用固定胸围（cm），不采用录入的胸围字段（仅男用胸围驱动胸部比例） */
const FEMALE_VISUAL_CHEST_CM = 88;

/** 在体脂色上叠加轻微性别倾向：男略冷、女略暖 */
function genderTint(base, gender) {
  const isF = isFemaleGender(gender);
  if (isF) return [Math.min(1, base[0] * 1.04 + 0.03), Math.min(1, base[1] * 0.98 + 0.02), Math.min(1, base[2] * 1.02)];
  return [Math.min(1, base[0] * 0.96 + 0.02), Math.min(1, base[1] * 1.02), Math.min(1, base[2] * 1.06)];
}

function computeTargets(p) {
  const height = Number(p.height) || 170;
  const bodyFat = Number(p.bodyFat) || 18;
  const fat = bodyFat / 100;
  const isFemale = isFemaleGender(p.gender);
  const chestCm = isFemale ? FEMALE_VISUAL_CHEST_CM : (Number(p.chest) > 0 ? Number(p.chest) : 95);
  const chestRatio = chestCm / 100;
  const waistRatio = (Number(p.waist) || 80) / 80;
  const hipRatio = (Number(p.hip) || 95) / 95;
  const armRatio = (Number(p.arm) || 32) / 35;
  const thighRatio = (Number(p.thigh) || 55) / 55;
  const calfRatio = (Number(p.calf) || 35) / 35;
  const chibi = !!p.chibi;

  let heightFactor = height / 170;
  if (chibi) heightFactor *= 0.9;

  const weightKg = Number(p.weight);
  const heightM = height / 100;
  let bmiFactor = 1;
  if (weightKg > 0 && heightM > 0) {
    const bmi = weightKg / (heightM * heightM);
    bmiFactor = 1 + Math.max(-0.08, Math.min(0.12, (bmi - 22) * 0.015));
  }

  const abdomen = {
    x: (waistRatio + fat * 0.6) * bmiFactor,
    y: 1 + fat * 0.5,
    z: (waistRatio + fat * 0.8) * bmiFactor,
  };
  let chest = {
    x: chestRatio + fat * 0.2,
    y: chestRatio * 0.92 + fat * 0.14,
    z: chestRatio * 0.88 + fat * 0.12,
  };
  let waist = {
    x: waistRatio * 0.94 * Math.sqrt(bmiFactor),
    y: 1,
    z: waistRatio * 0.94 * Math.sqrt(bmiFactor),
  };
  let hip = { x: hipRatio, y: hipRatio * 0.96, z: hipRatio * 1.06 };
  let shoulder = { x: chestRatio * 1.22, y: 0.88, z: chestRatio * 1.05 };
  const neck = {
    x: chestRatio * 0.52 + waistRatio * 0.48,
    y: 1,
    z: chestRatio * 0.52 + waistRatio * 0.48,
  };
  const upperArm = { x: armRatio, y: armRatio, z: armRatio };
  const lowerArm = { x: armRatio * 0.85, y: armRatio * 0.9, z: armRatio * 0.85 };
  const thigh = { x: thighRatio, y: thighRatio, z: thighRatio };
  const calf = { x: calfRatio, y: calfRatio, z: calfRatio };

  const headMul = chibi ? 1.1 : 1;
  let head = {
    x: (1 + fat * 0.08) * headMul,
    y: (1 + fat * 0.05) * headMul * (chibi ? 1.05 : 1.02),
    z: (1 + fat * 0.08) * headMul,
  };
  if (isFemale) {
    head.x *= 0.94;
    head.z *= 0.96;
    head.y *= 1.03;
    chest.x *= 1.05;
    chest.y *= 1.06;
    chest.z *= 1.08;
    waist.x *= 0.9;
    waist.z *= 0.9;
    shoulder.x *= 0.92;
    shoulder.z *= 0.96;
    shoulder.y *= 1.04;
    hip.x *= 1.08;
    hip.z *= 1.12;
    hip.y *= 1.03;
    abdomen.x *= 0.98;
  } else {
    head.x *= 1.04;
    head.z *= 1.02;
    chest.z *= 0.96;
    shoulder.x *= 1.1;
    shoulder.z *= 1.06;
    shoulder.y *= 0.96;
    hip.x *= 0.94;
    hip.z *= 0.96;
  }

  return {
    heightFactor,
    head,
    neck,
    shoulder,
    chest,
    abdomen,
    waist,
    hip,
    upperArm,
    lowerArm,
    thigh,
    calf,
  };
}

/**
 * 骨架布局：真人比例微调 + Q 版（大头短身）+ 男女肩宽/臀宽差异
 * 返回与 _meshes 顺序一致的 pos/rot/base
 */
function getRigLayout(gender, chibi) {
  const isF = isFemaleGender(gender);
  const H = chibi ? 0.82 : 1;
  const yLift = chibi ? 0.12 : 0;
  const y = (v) => v * H + yLift;

  const armX = isF ? 0.37 : 0.43;
  const legX = isF ? 0.17 : 0.165;
  const chestZ = isF ? 0.05 : 0.02;
  const abdZ = isF ? 0.07 : 0.06;
  const uArmRx = chibi ? 0.38 : 0.44;
  const lArmRx = chibi ? 0.22 : 0.2;
  const thighRx = chibi ? 0.1 : 0.09;
  const rzArm = isF ? 0.1 : 0.13;
  const rzLeg = isF ? 0.05 : 0.045;

  const shBase = isF ? [1.32, 0.78, 1.06] : [1.52, 0.7, 1.14];
  const headBase = isF ? [0.98, 1.06, 0.96] : [1.06, 1.02, 1.02];
  if (chibi) {
    headBase[0] *= 1.18;
    headBase[1] *= 1.22;
    headBase[2] *= 1.15;
    shBase[0] *= 1.08;
    shBase[1] *= 1.12;
  }

  return [
    { pos: [0, y(1.52), 0], rot: [0, 0, 0], base: headBase },
    { pos: [0, y(1.34), 0], rot: [0, 0, 0], base: [1, 1.15, 1] },
    { pos: [0, y(1.14), 0], rot: [0, 0, 0], base: shBase },
    { pos: [0, y(0.96), chestZ], rot: [isF ? 0.04 : 0, 0, 0], base: [1, 1, 1] },
    { pos: [0, y(0.64), abdZ], rot: [0, 0, 0], base: [1, 1, 1] },
    { pos: [0, y(0.4), 0], rot: [0, 0, 0], base: [1, 1, 1] },
    { pos: [0, y(0.1), isF ? 0.02 : 0], rot: [isF ? 0.06 : 0.04, 0, 0], base: [1, 1, 1] },
    { pos: [-armX, y(0.88), 0.04], rot: [uArmRx, 0, -rzArm], base: [1, chibi ? 1.05 : 1.12, 1] },
    { pos: [armX, y(0.88), 0.04], rot: [uArmRx, 0, rzArm], base: [1, chibi ? 1.05 : 1.12, 1] },
    { pos: [-armX - 0.1, y(0.54), 0.06], rot: [lArmRx, 0, -rzArm * 0.85], base: [1, chibi ? 1.02 : 1.08, 1] },
    { pos: [armX + 0.1, y(0.54), 0.06], rot: [lArmRx, 0, rzArm * 0.85], base: [1, chibi ? 1.02 : 1.08, 1] },
    { pos: [-legX, y(-0.28), 0.02], rot: [thighRx, 0, -rzLeg], base: [1, chibi ? 1.08 : 1.18, 1] },
    { pos: [legX, y(-0.28), 0.02], rot: [thighRx, 0, rzLeg], base: [1, chibi ? 1.08 : 1.18, 1] },
    { pos: [-legX, y(-0.74), 0.02], rot: [-0.07, 0, -rzLeg * 0.5], base: [1, chibi ? 1.05 : 1.12, 1] },
    { pos: [legX, y(-0.74), 0.02], rot: [-0.07, 0, rzLeg * 0.5], base: [1, chibi ? 1.05 : 1.12, 1] },
    { pos: [0, y(-1.02), 0], rot: [1.57, 0, 0], base: [isF ? 1.12 : 1.18, 0.14, isF ? 0.78 : 0.72] },
  ];
}

const tmpA = M4.create();
const tmpB = M4.create();
const tmpC = M4.create();
const tmpD = M4.create();
const tmpT = M4.create();
const tmpS = M4.create();
const tmpRx = M4.create();
const tmpRy = M4.create();
const tmpRz = M4.create();
const tmpG = M4.create();
const tmpMVP = M4.create();
const tmpMV = M4.create();
const tmpBodyY = M4.create();
const tmpRoot = M4.create();
const tmpRootS = M4.create();
const tmpWorld = M4.create();
const tmpProj = M4.create();
const tmpView = M4.create();
const tmpVP = M4.create();

function meshTRS(g, tx, ty, tz, rx, ry, rz, sx, sy, sz, out) {
  M4.translate(tmpT, tx, ty, tz);
  M4.rotateX(tmpRx, rx);
  M4.rotateY(tmpRy, ry);
  M4.rotateZ(tmpRz, rz);
  M4.scale(tmpS, sx, sy, sz);
  M4.multiply(tmpRx, tmpRy, tmpA);
  M4.multiply(tmpA, tmpRz, tmpB);
  M4.multiply(tmpT, tmpB, tmpC);
  M4.multiply(tmpC, tmpS, tmpD);
  M4.multiply(g, tmpD, out);
  return out;
}

Component({
  properties: {
    height: { type: Number, value: 170 },
    weight: { type: Number, value: 70 },
    bodyFat: { type: Number, value: 18 },
    /** 胸围 cm；女性形体展示忽略此值，改用内部固定 88cm */
    chest: { type: Number, value: 98 },
    waist: { type: Number, value: 80 },
    hip: { type: Number, value: 94 },
    arm: { type: Number, value: 32 },
    thigh: { type: Number, value: 56 },
    calf: { type: Number, value: 36 },
    /** male / female，或「男」「女」 */
    gender: { type: String, value: "male" },
    /** true：Q 版大头短身 */
    chibi: { type: Boolean, value: false },
  },

  data: {},

  lifetimes: {
    attached() {
      this._alive = true;
      this._rotY = 0;
      this._velY = 0;
      this._lastTouchX = 0;
      this._touching = false;
      this._paused = false;
      this._rafId = 0;
      this._lastFrame = 0;
      this._frameGap = 1000 / 30;
      this._cur = null;
      this._targets = null;
      this._syncTargets();
      this._cur = JSON.parse(JSON.stringify(this._targets));
      wx.nextTick(() => this._init());
    },
    detached() {
      this._alive = false;
      this._paused = true;
      if (this._rafId) {
        if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this._rafId);
        else clearTimeout(this._rafId);
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
        if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this._rafId);
        else clearTimeout(this._rafId);
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
    chest() {
      this._syncTargets();
    },
    waist() {
      this._syncTargets();
    },
    hip() {
      this._syncTargets();
    },
    arm() {
      this._syncTargets();
    },
    thigh() {
      this._syncTargets();
    },
    calf() {
      this._syncTargets();
    },
    gender() {
      this._syncTargets();
      this._applyRig();
    },
    chibi() {
      this._syncTargets();
      this._applyRig();
    },
  },

  methods: {
    _clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    },

    _syncTargets() {
      this._targets = computeTargets(this.properties);
      if (!this._cur) this._cur = JSON.parse(JSON.stringify(this._targets));
    },

    _applyRig() {
      if (!this._meshes || !this._meshes.length) return;
      const layout = getRigLayout(this.properties.gender, this.properties.chibi);
      for (let i = 0; i < layout.length && i < this._meshes.length; i++) {
        const L = layout[i];
        this._meshes[i].pos = L.pos.slice();
        this._meshes[i].rot = L.rot.slice();
        this._meshes[i].base = L.base.slice();
      }
    },

    _lerpTargets() {
      const k = 0.12;
      const t = this._targets;
      const c = this._cur;
      if (!t || !c) return;
      const lerp3 = (a, b) => {
        a.x += (b.x - a.x) * k;
        a.y += (b.y - a.y) * k;
        a.z += (b.z - a.z) * k;
      };
      lerp3(c.head, t.head);
      lerp3(c.neck, t.neck);
      lerp3(c.shoulder, t.shoulder);
      lerp3(c.chest, t.chest);
      lerp3(c.abdomen, t.abdomen);
      lerp3(c.waist, t.waist);
      lerp3(c.hip, t.hip);
      lerp3(c.upperArm, t.upperArm);
      lerp3(c.lowerArm, t.lowerArm);
      lerp3(c.thigh, t.thigh);
      lerp3(c.calf, t.calf);
      c.heightFactor += (t.heightFactor - c.heightFactor) * k;
    },

    _init() {
      const q = wx.createSelectorQuery().in(this);
      q.select("#bodyAdvancedCanvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const w = res[0].width || 300;
          const h = res[0].height || 320;
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
          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.BACK);
          gl.clearColor(0.91, 0.93, 0.96, 1);

          const r = (rad, lat, lon) => buildSphere(rad, lat, lon);
          const cap = (rad, len) => buildCapsuleY(rad, len, 18);

          const layout = getRigLayout(this.properties.gender, this.properties.chibi);
          const roles = [
            "head",
            "neck",
            "shoulder",
            "chest",
            "abdomen",
            "waist",
            "hip",
            "upperArm",
            "upperArm",
            "lowerArm",
            "lowerArm",
            "thigh",
            "thigh",
            "calf",
            "calf",
            "shadow",
          ];
          const geos = [
            r(0.095, 16, 20),
            cap(0.042, 0.11),
            r(0.1, 14, 18),
            r(0.17, 16, 20),
            r(0.155, 16, 20),
            r(0.105, 14, 18),
            r(0.185, 16, 20),
            cap(0.052, 0.24),
            cap(0.052, 0.24),
            cap(0.045, 0.2),
            cap(0.045, 0.2),
            cap(0.072, 0.34),
            cap(0.072, 0.34),
            cap(0.052, 0.29),
            cap(0.052, 0.29),
            r(0.45, 8, 14),
          ];

          this._meshes = [];
          for (let i = 0; i < roles.length; i++) {
            const L = layout[i];
            this._meshes.push({
              geo: geos[i],
              role: roles[i],
              pos: L.pos.slice(),
              rot: L.rot.slice(),
              base: L.base.slice(),
            });
          }

          this._buffers = this._meshes.map((m) => this._uploadGeo(gl, m.geo));
          M4.perspective(tmpProj, (46 * Math.PI) / 180, this._aspect, 0.06, 60);
          M4.translate(tmpView, 0, -0.02, -3.55);
          M4.multiply(tmpProj, tmpView, tmpVP);
          this._vp = new Float32Array(tmpVP);
          this._view = new Float32Array(tmpView);
          this._syncTargets();
          if (!this._cur) this._cur = JSON.parse(JSON.stringify(this._targets));
          this._applyRig();
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

    _scaleFor(mesh) {
      const c = this._cur;
      const k = mesh.role;
      const b = mesh.base || [1, 1, 1];
      let s = { x: b[0], y: b[1], z: b[2] };
      if (k === "head") {
        s = { x: b[0] * c.head.x, y: b[1] * c.head.y, z: b[2] * c.head.z };
      } else if (k === "neck") {
        s = { x: b[0] * c.neck.x, y: b[1] * c.neck.y, z: b[2] * c.neck.z };
      } else if (k === "shoulder") {
        s = { x: b[0] * c.shoulder.x, y: b[1] * c.shoulder.y, z: b[2] * c.shoulder.z };
      } else if (k === "chest") {
        s = { x: b[0] * c.chest.x, y: b[1] * c.chest.y, z: b[2] * c.chest.z };
      } else if (k === "abdomen") {
        s = { x: b[0] * c.abdomen.x, y: b[1] * c.abdomen.y, z: b[2] * c.abdomen.z };
      } else if (k === "waist") {
        s = { x: b[0] * c.waist.x, y: b[1] * c.waist.y, z: b[2] * c.waist.z };
      } else if (k === "hip") {
        s = { x: b[0] * c.hip.x, y: b[1] * c.hip.y, z: b[2] * c.hip.z };
      } else if (k === "upperArm") {
        s = { x: b[0] * c.upperArm.x, y: b[1] * c.upperArm.y, z: b[2] * c.upperArm.z };
      } else if (k === "lowerArm") {
        s = { x: b[0] * c.lowerArm.x, y: b[1] * c.lowerArm.y, z: b[2] * c.lowerArm.z };
      } else if (k === "thigh") {
        s = { x: b[0] * c.thigh.x, y: b[1] * c.thigh.y, z: b[2] * c.thigh.z };
      } else if (k === "calf") {
        s = { x: b[0] * c.calf.x, y: b[1] * c.calf.y, z: b[2] * c.calf.z };
      } else if (k === "shadow") {
        s = { x: b[0], y: b[1], z: b[2] };
      }
      return [s.x, s.y, s.z];
    },

    _loop() {
      if (!this._alive || this._paused || !this._gl || !this._cur) return;
      const now = Date.now();

      this._velY *= 0.91;
      this._rotY += this._velY;
      if (!this._touching) {
        this._rotY += 0.0022;
      }
      this._lerpTargets();

      if (now - this._lastFrame < this._frameGap) {
        this._rafId =
          typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame(() => this._loop())
            : setTimeout(() => this._loop(), 16);
        return;
      }
      this._lastFrame = now;

      const gl = this._gl;
      const bf = Number(this.properties.bodyFat) || 18;
      const baseCol = genderTint(colorByBodyFat(bf), this.properties.gender);

      gl.viewport(0, 0, this._canvas.width, this._canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this._program);

      const aPos = this._loc.aPos;
      const aNor = this._loc.aNor;
      const uMVP = this._loc.uMVP;
      const uN = this._loc.uN;
      const uColor = this._loc.uColor;
      const uLight = this._loc.uLight;
      gl.uniform3fv(uLight, new Float32Array([0.38, 0.82, 0.55]));

      M4.rotateY(tmpBodyY, this._rotY);
      M4.scale(tmpRootS, 1, this._cur.heightFactor, 1);
      M4.multiply(tmpBodyY, tmpRootS, tmpRoot);

      for (let i = 0; i < this._meshes.length; i++) {
        const mesh = this._meshes[i];
        const sc = this._scaleFor(mesh);
        const pr = mesh.pos;
        const rt = mesh.rot;
        meshTRS(tmpRoot, pr[0], pr[1], pr[2], rt[0], rt[1], rt[2], sc[0], sc[1], sc[2], tmpWorld);
        M4.multiply(this._vp, tmpWorld, tmpMVP);

        M4.multiply(this._view, tmpWorld, tmpMV);
        const m3 = mat3FromMat4(tmpMV);
        const inv = invert3x3(m3);
        const normalMat = transpose3(inv);

        let col = baseCol;
        if (mesh.role === "shadow") {
          col = [0.18, 0.2, 0.24];
        } else {
          const variation = 0.92 + (i % 5) * 0.02;
          col = [baseCol[0] * variation, baseCol[1] * variation, baseCol[2] * variation];
        }

        gl.uniformMatrix4fv(uMVP, false, tmpMVP);
        gl.uniformMatrix3fv(uN, false, normalMat);
        gl.uniform3fv(uColor, new Float32Array(col));

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

      this._rafId =
        typeof requestAnimationFrame !== "undefined"
          ? requestAnimationFrame(() => this._loop())
          : setTimeout(() => this._loop(), 16);
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
      this._velY += dx * 0.014;
      this._velY = this._clamp(this._velY, -0.42, 0.42);
    },
    onTouchEnd() {
      this._touching = false;
    },
  },
});
