/**
 * 综合身体分数 0–100：结合 BMI、体脂、骨骼肌等粗算，用于趋势展示
 */
function computeBodyScore({ heightCm, weightKg, bodyFat, skeletalMuscle }) {
  if (!weightKg || !heightCm) return null;
  const hm = heightCm / 100;
  const bmi = weightKg / (hm * hm);
  let s = 70;
  if (bmi >= 18.5 && bmi <= 24) s += 10;
  else if (bmi < 18.5) s -= 5;
  else s -= Math.min(18, (bmi - 24) * 2);
  if (bodyFat != null && !isNaN(bodyFat)) {
    s -= Math.max(0, (bodyFat - 18) * 0.5);
  }
  if (skeletalMuscle != null && !isNaN(skeletalMuscle)) {
    s += Math.min(12, (skeletalMuscle - 28) * 0.2);
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

module.exports = { computeBodyScore };
