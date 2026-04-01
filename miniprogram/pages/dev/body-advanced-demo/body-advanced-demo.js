Page({
  data: {
    height: 170,
    weight: 72,
    bodyFat: 18,
    chest: 98,
    waist: 80,
    hip: 94,
    arm: 32,
    thigh: 56,
    calf: 36,
    gender: "male",
    chibi: false,
  },
  onGender(e) {
    const g = e.currentTarget.dataset.g;
    if (g) this.setData({ gender: g });
  },
  onChibi(e) {
    this.setData({ chibi: e.detail.value });
  },
  onH(e) {
    this.setData({ height: e.detail.value });
  },
  onW(e) {
    this.setData({ weight: e.detail.value });
  },
  onBf(e) {
    this.setData({ bodyFat: e.detail.value });
  },
  onChest(e) {
    this.setData({ chest: e.detail.value });
  },
  onWaist(e) {
    this.setData({ waist: e.detail.value });
  },
  onHip(e) {
    this.setData({ hip: e.detail.value });
  },
  onArm(e) {
    this.setData({ arm: e.detail.value });
  },
  onThigh(e) {
    this.setData({ thigh: e.detail.value });
  },
  onCalf(e) {
    this.setData({ calf: e.detail.value });
  },
});
