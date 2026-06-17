// Features used in the no-show predictor model
export interface PredictionFeatures {
  is_new_patient: boolean;
  lead_time_days: number;
  distance_km: number;
  day_of_week: number; // 0 = Mon, 6 = Sun
  hour_of_day: number; // 9-18
  past_no_show_rate: number;
  no_show_streak: number;
  appointment_value_inr: number;
  is_follow_up: boolean;
}

/**
 * Math scoring model simulating XGBoost output risk weights
 */
export function predictNoShow(features: PredictionFeatures): {
  score: number;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
} {
  const factors: string[] = [];
  let logodds = -2.2; // Base log-odds (represents approx 10% base risk)

  // 1. Is New Patient
  if (features.is_new_patient) {
    logodds += 0.8;
    factors.push('New patient profile (no attendance history)');
  }

  // 2. Booking Lead Time
  if (features.lead_time_days > 14) {
    logodds += 0.6;
    factors.push(`High booking lead time (${features.lead_time_days} days)`);
  } else if (features.lead_time_days > 7) {
    logodds += 0.3;
  }

  // 3. Distance from clinic
  if (features.distance_km > 25) {
    logodds += 0.9;
    factors.push(`Extreme travel distance (${features.distance_km.toFixed(1)} km)`);
  } else if (features.distance_km > 12) {
    logodds += 0.4;
    factors.push(`Moderate travel distance (${features.distance_km.toFixed(1)} km)`);
  }

  // 4. Past attendance patterns
  if (features.past_no_show_rate > 0.40) {
    logodds += 1.2;
    factors.push(`Critical historical no-show rate (${Math.round(features.past_no_show_rate * 100)}%)`);
  } else if (features.past_no_show_rate > 0.15) {
    logodds += 0.5;
    factors.push(`Elevated historical no-show rate (${Math.round(features.past_no_show_rate * 100)}%)`);
  }

  // 5. Miss streak (consecutive no-shows)
  if (features.no_show_streak > 0) {
    logodds += 0.4 * features.no_show_streak;
    factors.push(`Active consecutive miss streak (${features.no_show_streak} appointments)`);
  }

  // 6. Time and Day effects (Monday mornings have higher no-shows)
  if (features.day_of_week === 0 && features.hour_of_day < 12) {
    logodds += 0.3;
    factors.push('Monday morning slot complexity');
  }

  // 7. Follow-up discount
  if (features.is_follow_up) {
    logodds -= 0.3;
  }

  // 8. Value penalty (high value slots are slightly more likely to attend, but loss is higher)
  if (features.appointment_value_inr > 2000) {
    logodds -= 0.2;
  }

  // Convert log-odds to probability (sigmoid function)
  const probability = 1 / (1 + Math.exp(-logodds));
  const score = parseFloat(probability.toFixed(3));

  // Determine risk tier
  let riskTier: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score > 0.70) riskTier = 'critical';
  else if (score > 0.45) riskTier = 'high';
  else if (score > 0.20) riskTier = 'medium';

  return {
    score,
    riskTier,
    factors
  };
}
