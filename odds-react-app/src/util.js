import { UNIVERSAL_VIG, YARDAGE_CV } from "./constants";

export function calculateMeanAllGames(actMap, name, median) {
  var skewness = require("compute-skewness");

  let actTemp = actMap.get(name);
  let medianProj = median.ev;
  if (typeof actTemp == "undefined") {
    return null;
  }
  let tempSkewness = skewness(
    actTemp.act.filter((item) => item != null && item !== 0)
  );

  let alpha = 4 / (tempSkewness * tempSkewness);

  let beta = medianProj / (alpha - 1 / 3 + 0.02 / alpha);

  if (!(alpha * beta)) {
    return null;
  }
  return alpha * beta;
}
export function calculateMeanRecentGames(actMap, name, median) {
  var skewness = require("compute-skewness");
  let actTemp = actMap.get(name);
  let medianProj = median.ev;
  if (typeof actTemp == "undefined") {
    return null;
  }
  let recentActs = actTemp.act.filter((item, ii) => {
    return item !== null && item != 0 && ii > actTemp.act.length - 6;
  });

  if (recentActs.length < 3) {
    return null;
  }
  // console.log(recentActs);
  let tempSkewness = skewness(
    recentActs.length > 4 ? recentActs.slice(recentActs.length - 4) : recentActs
  );

  let alpha = 4 / (tempSkewness * tempSkewness);
  let beta = medianProj / (alpha - 1 / 3 + 0.02 / alpha);
  if (!(alpha * beta)) {
    return null;
  }
  return alpha * beta;
}

export function calculateMeanAndStdDev(data) {
  // Extract the values in the 1st index of each list
  const values = data.map((item) => item[1].ev);

  // Calculate mean
  const meanValue = values.reduce((acc, val) => acc + val, 0) / values.length;

  // Calculate standard deviation
  const squaredDifferences = values.map((val) => Math.pow(val - meanValue, 2));
  const variance =
    squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length;
  const stddevValue = Math.sqrt(variance);

  return { meanValue, stddevValue };
}

export function americanToDecimal(americanOdds) {
  let decimalOdds;

  if (americanOdds > 0) {
    // For positive American odds
    decimalOdds = americanOdds / 100 + 1;
  } else {
    // For negative American odds
    decimalOdds = 100 / Math.abs(americanOdds) + 1;
  }

  return decimalOdds.toFixed(2); // Return the decimal odds rounded to two decimal places
}

// Inverse of the standard normal CDF (Acklam's rational approximation,
// relative error ~1e-9). Returns the z-score whose cumulative probability is p.
export function normInv(p) {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q;
  let r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/**
 * Median yardage implied by a book's line and the American odds on the over.
 *
 * At even money the posted line IS the market's median (50% over / 50%
 * under), which is why the projections read it as `line / 10`. When a book
 * shades one side (e.g. Over 39.5 at +285, Under -300) the line is no longer
 * the median but some higher quantile -- here the ~76th percentile -- and
 * `line / 10` badly overstates the projection. Recover the median by mapping
 * that quantile back to the 50th.
 *
 * Yardage is modeled as lognormal: non-negative and right-skewed, like real
 * single-game totals, with the median as an explicit parameter (its mean sits
 * above the median, so a symmetric model would land slightly high). Every
 * lognormal quantile is `median * exp(s * z)`, and the line is the
 * q = 1 - pOver quantile, so:
 *
 *   median = line / exp(s * z),   z = normInv(1 - pOver)
 *
 * `s` is the log-space spread derived from the coefficient of variation via
 * the standard lognormal identity cv^2 = exp(s^2) - 1. Because exp() is always
 * positive the mapping never degenerates, unlike a normal model's 1 + z*cv.
 *
 * pOver is de-vigged the standard way, (1/decimal) / overround, so a
 * symmetric -114/-114 line yields pOver ~= 0.5, z = 0, and the line comes
 * back unchanged. Falls back to the raw line when odds are missing/unusable.
 */
export function impliedYards(line, americanOdds, cv = YARDAGE_CV) {
  const l = Number(line);
  if (!Number.isFinite(l) || l <= 0) return l;
  const odds = Number(americanOdds);
  if (!Number.isFinite(odds) || odds === 0) return l;
  const dec = Number(americanToDecimal(odds));
  if (!Number.isFinite(dec) || dec <= 1) return l;
  // Clamp so z stays finite for extreme prices.
  const pOver = Math.min(0.95, Math.max(0.05, 1 / dec / UNIVERSAL_VIG));
  const z = normInv(1 - pOver);
  const s = Math.sqrt(Math.log(1 + cv * cv));
  return l / Math.exp(s * z);
}

export function calculatePercentile(mean, stddev, value) {
  // Calculate z-score
  const zScore = (value - mean) / stddev;

  // Use the error function (erf) to calculate the cumulative distribution function (CDF)
  const erf = (z) => {
    const t = 1.0 / (1.0 + 0.5 * Math.abs(z));
    const erf =
      t *
      Math.exp(
        -z * z -
          1.26551223 +
          t *
            (1.00002368 +
              t *
                (0.37409196 +
                  t *
                    (0.09678418 +
                      t *
                        (-0.18628806 +
                          t *
                            (0.27886807 +
                              t *
                                (-1.13520398 +
                                  t *
                                    (1.48851587 +
                                      t * (-0.82215223 + t * 0.17087277))))))))
      );
    return z >= 0 ? 1 - erf : erf - 1;
  };

  // Calculate percentile
  const percentile = (1 + erf(zScore / Math.sqrt(2))) / 2;

  return percentile;
}

export function HSVtoRGB(h, s, v) {
  var r, g, b, i, f, p, q, t;
  if (arguments.length === 1) {
    (s = h.s), (v = h.v), (h = h.h);
  }
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function getQueryStringValue(key) {
  // Get the query string from the current URL
  const queryString = window.location.search;

  // Create a new URLSearchParams object from the query string
  const searchParams = new URLSearchParams(queryString);

  // Use the get method to retrieve the value for the specified key
  const value = searchParams.get(key);

  return value;
}

export function rainbow(p) {
  var rgb = HSVtoRGB((p / 100.0) * 0.85, 1.0, 1.0);
  return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
}

export async function isFetchable(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    // A local dev server serves index.html (200) for missing paths; real data
    // files are never HTML, so treat an HTML response as "not present" to keep
    // the file-index loop from running forever. No-op against GitHub (404s).
    const contentType = response.headers.get("content-type") || "";
    return !contentType.includes("text/html");
  } catch (error) {
    return false;
  }
}

export function calculateLatestChange(inputMap) {
  const result = new Map();

  for (const [key, numbers] of inputMap) {
    if (numbers.length <= 1) {
      // If there are 0 or 1 elements, set the value to 0
      result.set(key, 0);
    } else {
      // Calculate the difference between the last and second last elements
      const lastElement = numbers[numbers.length - 1];
      const secondLastElement = numbers[numbers.length - 2];
      const difference = lastElement - secondLastElement;

      result.set(key, difference);
    }
  }

  return result;
}

export function getLastElementMap(inputMap) {
  // Create a new Map to store the result
  let resultMap = new Map();

  // Iterate over the entries in the inputMap
  inputMap.forEach((valueList, key) => {
    // Check if the valueList is not empty
    if (valueList.length > 0) {
      // Get the last element of the valueList
      let lastElement = valueList[valueList.length - 1];

      // Set the key-value pair in the resultMap
      resultMap.set(key, lastElement);
    } else {
      // If the valueList is empty, set the key with undefined in the resultMap
      resultMap.set(key, undefined);
    }
  });

  return resultMap;
}
