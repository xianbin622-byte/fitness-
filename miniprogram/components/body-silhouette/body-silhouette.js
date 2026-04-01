/**
 * 伪 3D / 体型轮廓：根据围度映射宽度（简单线性映射，可替换为真实 3D）
 * 升级接口：properties 保持不变，内部可换为 canvas/WebGL
 */
Component({
  properties: {
    gender: { type: String, value: "男" },
    waist: { type: Number, value: 80 },
    hip: { type: Number, value: 95 },
    chest: { type: Number, value: 98 },
    bodyFat: { type: Number, value: 18 },
    /**
     * 3D 参数（MVP）：由业务侧把身体指标映射到 0~1
     * fatLevel：体脂水平（越高腰腹轮廓越“胖”）
     * muscleLevel：肌肉水平（越高肩胸与躯干更“厚”）
     *
     * 兼容旧版：若未传入，将从 bodyFat 进行近似估算。
     */
    fatLevel: { type: Number, value: 0.4 },
    muscleLevel: { type: Number, value: 0.5 },
  },
  data: {
    torsoW: 200,
    hipW: 220,
    torsoScaleX: 1,
    torsoScaleY: 1,
    hipScaleX: 1,
    hipScaleY: 1,
    legScale: 1,
    headScale: 1,
  },
  observers: {
    "chest, waist, hip, bodyFat, fatLevel, muscleLevel": function () {
      this.mapSize();
    },
  },
  lifetimes: {
    attached() {
      this.mapSize();
    },
  },
  methods: {
    mapSize() {
      const c = Number(this.properties.chest) || 98;
      const w = Number(this.properties.waist) || 80;
      const h = Number(this.properties.hip) || 95;
      const bf = Number(this.properties.bodyFat) || 18;

      // Normalize fatLevel/muscleLevel to [0..1]
      const fatLevel = Number.isFinite(this.properties.fatLevel) ? this.properties.fatLevel : Math.min(1, Math.max(0, (bf - 10) / 25));
      const muscleLevel = Number.isFinite(this.properties.muscleLevel) ? this.properties.muscleLevel : 0.5;

      const torsoW = Math.min(280, Math.max(160, 140 + (c - 90) * 2 - bf * 0.3));
      const hipW = Math.min(300, Math.max(150, 130 + (h - 90) * 2));

      // Apply scale/transform to simulate 3D changes (MVP)
      const torsoScaleX = 0.92 + muscleLevel * 0.25;
      const torsoScaleY = 0.94 + muscleLevel * 0.12 + fatLevel * 0.04;
      const hipScaleX = 0.9 + fatLevel * 0.28;
      const hipScaleY = 0.92 + fatLevel * 0.16;
      const legScale = 0.95 + muscleLevel * 0.18;
      const headScale = 0.97 + (1 - fatLevel) * 0.05;

      this.setData({
        torsoW: Math.round(torsoW),
        hipW: Math.round(hipW),
        torsoScaleX,
        torsoScaleY,
        hipScaleX,
        hipScaleY,
        legScale,
        headScale,
      });
    },
  },
});
