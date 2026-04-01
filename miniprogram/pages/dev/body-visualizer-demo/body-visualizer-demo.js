Page({
  data: {
    height: 170,
    weight: 65,
    bodyFat: 18,
    waist: 75,
    hip: 95,
    thigh: 55,
  },
  onHeight(e) {
    this.setData({ height: e.detail.value });
  },
  onWeight(e) {
    this.setData({ weight: e.detail.value });
  },
  onBodyFat(e) {
    this.setData({ bodyFat: e.detail.value });
  },
  onWaist(e) {
    this.setData({ waist: e.detail.value });
  },
  onHip(e) {
    this.setData({ hip: e.detail.value });
  },
  onThigh(e) {
    this.setData({ thigh: e.detail.value });
  },
});
