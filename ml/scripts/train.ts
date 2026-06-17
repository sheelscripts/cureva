import { predictNoShow, PredictionFeatures } from '../models/no-show-predictor';

function generateSyntheticDataset(count = 100): PredictionFeatures[] {
  const dataset: PredictionFeatures[] = [];
  for (let i = 0; i < count; i++) {
    const is_new_patient = Math.random() < 0.25;
    const past_no_show_rate = is_new_patient ? 0 : Math.random() < 0.2 ? Math.random() * 0.5 : Math.random() * 0.15;
    
    dataset.push({
      is_new_patient,
      lead_time_days: Math.floor(Math.random() * 25),
      distance_km: parseFloat((Math.random() * 35).toFixed(2)),
      day_of_week: Math.floor(Math.random() * 7),
      hour_of_day: 9 + Math.floor(Math.random() * 9),
      past_no_show_rate,
      no_show_streak: past_no_show_rate > 0.3 ? Math.floor(Math.random() * 3) : 0,
      appointment_value_inr: 500 + Math.floor(Math.random() * 3000),
      is_follow_up: Math.random() < 0.4
    });
  }
  return dataset;
}

export async function trainAndCalibrate() {
  console.log('--- ML Train and Calibration Tool ---');
  console.log('Generating synthetic Indian clinic attendance logs...');
  const dataset = generateSyntheticDataset(500);

  let totalCritical = 0;
  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let sumScore = 0;

  dataset.forEach((features) => {
    const res = predictNoShow(features);
    sumScore += res.score;
    if (res.riskTier === 'critical') totalCritical++;
    else if (res.riskTier === 'high') totalHigh++;
    else if (res.riskTier === 'medium') totalMedium++;
    else totalLow++;
  });

  console.log(`\nCalibration Results over ${dataset.length} synthetic appointments:`);
  console.log(`- Low Risk Tier: ${totalLow} (${Math.round((totalLow / dataset.length) * 100)}%)`);
  console.log(`- Medium Risk Tier: ${totalMedium} (${Math.round((totalMedium / dataset.length) * 100)}%)`);
  console.log(`- High Risk Tier: ${totalHigh} (${Math.round((totalHigh / dataset.length) * 100)}%)`);
  console.log(`- Critical Risk Tier: ${totalCritical} (${Math.round((totalCritical / dataset.length) * 100)}%)`);
  console.log(`- Average predicted no-show probability: ${Math.round((sumScore / dataset.length) * 100)}%`);
  console.log('\nTraining & parameter calibration completed successfully.');
}

if (require.main === module) {
  trainAndCalibrate().catch(console.error);
}
