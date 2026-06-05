#!/usr/bin/env node
/**
 * scripts/transform_municipalities.js
 *
 * SA Data Hub V5 — Municipality Transformation Pipeline
 *
 * Reads three CSV files per geographic level (muni, district, province):
 *   - raw_data/person-indicators-{level}.csv
 *   - raw_data/housing-info-{level}.csv
 *   - raw_data/age-distribution-{level}.csv
 *
 * Joins on muni_code (muni), dc_code (district), prov_code (province).
 * Derives percentage fields from absolute counts.
 * Outputs src/data/datasets/municipalities.json
 *
 * Run: node scripts/transform_municipalities.js
 */

const fs = require('fs')
const path = require('path')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i]?.trim() ?? '' })
    return obj
  })
}

function num(val) {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

function pct(numerator, denominator, decimals = 1) {
  if (!denominator || denominator === 0) return 0
  return parseFloat(((numerator / denominator) * 100).toFixed(decimals))
}

function round(val, decimals = 1) {
  return parseFloat(num(val).toFixed(decimals))
}

// ─── Province name map ────────────────────────────────────────────────────────

const PROVINCE_NAMES = {
  EC: 'Eastern Cape',
  FS: 'Free State',
  GP: 'Gauteng',
  KZN: 'KwaZulu-Natal',
  LP: 'Limpopo',
  MP: 'Mpumalanga',
  NC: 'Northern Cape',
  NW: 'North West',
  WC: 'Western Cape',
}

// Metro codes (Category A — dc_code == muni_code)
const METRO_CODES = new Set(['BUF', 'NMA', 'MAN', 'EKU', 'JHB', 'TSH', 'ETH', 'CPT'])

// Mpumalanga erratum municipalities
const ERRATUM_CODES = new Set(['MP325', 'MP322'])

// ─── District code → name map (built from district CSVs) ─────────────────────

function buildDistrictMap(districtPI) {
  const map = {}
  districtPI.forEach(row => {
    map[row.dc_code] = row.name
  })
  return map
}

// ─── Transform one municipality row ──────────────────────────────────────────

function transformMuniRecord(pi, hi, ai, districtMap) {
  const muniCode = pi.muni_code
  const isMeta = METRO_CODES.has(muniCode)
  const districtCode = isMeta ? null : pi.dc_code
  const districtName = districtCode ? (districtMap[districtCode] ?? null) : null

  // Determine category
  let category
  const miif = pi.miif_category?.toUpperCase() ?? ''
  if (isMeta || miif === 'METRO') {
    category = 'A'
  } else if (miif.startsWith('B')) {
    category = 'B'
  } else {
    category = 'C'
  }

  // Population 2022 and 2011
  const pop2022 = num(pi.total_pop_2022)
  const pop2011 = num(pi.total_pop_2011)
  const male2022 = num(pi.male_pop_2022)
  const female2022 = num(pi.female_pop_2022)
  const male2011 = num(pi.male_pop_2011)
  const female2011 = num(pi.female_pop_2011)
  const areaKm2 = round(num(pi.area_km2), 2)

  // Households
  const hh2022 = num(hi.households_2022)
  const hh2011 = num(hi.households_2011)
  const avgHH2022 = round(num(hi.avg_household_size_2022))
  const avgHH2011 = round(num(hi.avg_household_size_2011))

  // Dwelling counts 2022
  const formalDw2022 = num(hi.formal_dwelling_2022)
  const tradDw2022 = num(hi.traditional_dwelling_2022)
  const informalDw2022 = num(hi.informal_dwelling_2022)
  const otherDw2022 = num(hi.other_dwelling_2022)
  const totalDw2022 = formalDw2022 + tradDw2022 + informalDw2022 + otherDw2022

  // Dwelling counts 2011
  const formalDw2011 = num(hi.formal_dwelling_2011)
  const tradDw2011 = num(hi.traditional_dwelling_2011)
  const informalDw2011 = num(hi.informal_dwelling_2011)
  const otherDw2011 = num(hi.other_dwelling_2011)
  const totalDw2011 = formalDw2011 + tradDw2011 + informalDw2011 + otherDw2011

  // Water 2022
  const waterScheme2022 = num(hi.water_scheme_2022)
  const otherWater2022 = num(hi.other_water_2022)
  const totalWater2022 = waterScheme2022 + otherWater2022

  const waterScheme2011 = num(hi.water_scheme_2011)
  const otherWater2011 = num(hi.other_water_2011)
  const totalWater2011 = waterScheme2011 + otherWater2011

  // Toilet 2022
  const flushToilet2022 = num(hi.flush_toilet_2022)
  const otherToilet2022 = num(hi.other_toilet_2022)
  const noToilet2022 = num(hi.no_toilet_2022)
  const totalToilet2022 = flushToilet2022 + otherToilet2022 + noToilet2022

  const flushToilet2011 = num(hi.flush_toilet_2011)
  const otherToilet2011 = num(hi.other_toilet_2011)
  const noToilet2011 = num(hi.no_toilet_2011)
  const totalToilet2011 = flushToilet2011 + otherToilet2011 + noToilet2011

  // Cooking energy 2022
  const elecCooking2022 = num(hi.electricity_cooking_2022)
  const gasCooking2022 = num(hi.gas_cooking_2022)
  const otherCooking2022 = num(hi.other_cooking_2022)
  const totalCooking2022 = elecCooking2022 + gasCooking2022 + otherCooking2022

  const elecCooking2011 = num(hi.electricity_cooking_2011)
  const gasCooking2011 = num(hi.gas_cooking_2011)
  const otherCooking2011 = num(hi.other_cooking_2011)
  const totalCooking2011 = elecCooking2011 + gasCooking2011 + otherCooking2011

  // Age 2022
  const age0to4_2022 = num(ai.age_0_to_4_2022)
  const age5to14_2022 = num(ai.age_5_to_14_2022)
  const age15to34_2022 = num(ai.age_15_to_34_2022)
  const age35to59_2022 = num(ai.age_35_to_59_2022)
  const age60plus_2022 = num(ai.age_60_plus_2022)

  // Age 2011
  const age0to4_2011 = num(ai.age_0_to_4_2011)
  const age5to14_2011 = num(ai.age_5_to_14_2011)
  const age15to34_2011 = num(ai.age_15_to_34_2011)
  const age35to59_2011 = num(ai.age_35_to_59_2011)
  const age60plus_2011 = num(ai.age_60_plus_2011)

  const record = {
    // Identity
    id: muniCode,
    name: pi.name,
    category,
    province: pi.prov_code,
    provinceName: PROVINCE_NAMES[pi.prov_code] ?? pi.prov_code,
    districtCode,
    isMeta,
    miifCategory: pi.miif_category ?? '',
    governmentTransfersPct: round(num(pi.government_transfers_subsidies_percent)),

    // Population
    population2022: pop2022,
    population2011: pop2011,
    populationGrowthRate: round(num(pi.growth_rate_2011_to_2022)),
    areaKm2,
    populationDensity2022: areaKm2 > 0 ? round(pop2022 / areaKm2, 1) : 0,

    // Households
    households2022: hh2022,
    households2011: hh2011,
    avgHouseholdSize2022: avgHH2022,
    avgHouseholdSize2011: avgHH2011,

    // Sex ratios
    sexRatio2022: round(num(pi.sex_ratio_2022)),
    sexRatio2011: round(num(pi.sex_ratio_2011)),

    // Age percentages 2022
    pctAge0to4_2022: pct(age0to4_2022, pop2022),
    pctAge5to14_2022: pct(age5to14_2022, pop2022),
    pctAge0to14_2022: pct(age0to4_2022 + age5to14_2022, pop2022),
    pctAge15to34_2022: pct(age15to34_2022, pop2022),
    pctAge60plus_2022: pct(age60plus_2022, pop2022),

    // Age percentages 2011
    pctAge0to4_2011: pct(age0to4_2011, pop2011),
    pctAge5to14_2011: pct(age5to14_2011, pop2011),
    pctAge0to14_2011: pct(age0to4_2011 + age5to14_2011, pop2011),
    pctAge15to34_2011: pct(age15to34_2011, pop2011),
    pctAge60plus_2011: pct(age60plus_2011, pop2011),

    // Dwelling percentages
    pctFormalDwelling2022: pct(formalDw2022, totalDw2022),
    pctInformalDwelling2022: pct(informalDw2022, totalDw2022),
    pctTraditionalDwelling2022: pct(tradDw2022, totalDw2022),
    pctFormalDwelling2011: pct(formalDw2011, totalDw2011),
    pctInformalDwelling2011: pct(informalDw2011, totalDw2011),
    pctTraditionalDwelling2011: pct(tradDw2011, totalDw2011),

    // Water access percentages
    pctWaterScheme2022: pct(waterScheme2022, totalWater2022),
    pctNoWater2022: pct(otherWater2022, totalWater2022),
    pctWaterScheme2011: pct(waterScheme2011, totalWater2011),
    pctNoWater2011: pct(otherWater2011, totalWater2011),

    // Toilet access percentages
    pctFlushToilet2022: pct(flushToilet2022, totalToilet2022),
    pctNoToilet2022: pct(noToilet2022, totalToilet2022),
    pctFlushToilet2011: pct(flushToilet2011, totalToilet2011),
    pctNoToilet2011: pct(noToilet2011, totalToilet2011),

    // Cooking energy percentages
    pctElectricityCooking2022: pct(elecCooking2022, totalCooking2022),
    pctGasCooking2022: pct(gasCooking2022, totalCooking2022),
    pctElectricityCooking2011: pct(elecCooking2011, totalCooking2011),
    pctGasCooking2011: pct(gasCooking2011, totalCooking2011),

    // Supporting detail sub-records
    populationDetail: {
      malePop2022: male2022,
      femalePop2022: female2022,
      malePop2011: male2011,
      femalePop2011: female2011,
      schoolAttendance2022: num(pi.school_attendance_ages_5_to_24_2022),
      schoolAttendance2011: num(pi.school_attendance_ages_5_to_24_2011),
    },

    ageDetail: {
      pctAge35to59_2022: pct(age35to59_2022, pop2022),
      pctAge35to59_2011: pct(age35to59_2011, pop2011),
    },

    housingDetail: {
      formalDwellings2022: formalDw2022,
      traditionalDwellings2022: tradDw2022,
      informalDwellings2022: informalDw2022,
      otherDwellings2022: otherDw2022,
      formalDwellings2011: formalDw2011,
      traditionalDwellings2011: tradDw2011,
      informalDwellings2011: informalDw2011,
      otherDwellings2011: otherDw2011,
    },

    serviceDetail: {
      waterScheme2022,
      otherWater2022,
      waterScheme2011,
      otherWater2011,
      flushToilet2022,
      otherToilet2022,
      noToilet2022,
      flushToilet2011,
      otherToilet2011,
      noToilet2011,
      electricityCooking2022: elecCooking2022,
      gasCooking2022,
      otherCooking2022,
      electricityCooking2011: elecCooking2011,
      gasCooking2011,
      otherCooking2011,
    },

    // Metadata
    lastUpdated: '2026-06-04',
    boundaryYear: 2022,
    erratumApplied: ERRATUM_CODES.has(muniCode),
  }

  return record
}

// ─── Transform district record ────────────────────────────────────────────────

function transformDistrictRecord(pi, hi, ai) {
  const dcCode = pi.dc_code
  const isMeta = METRO_CODES.has(dcCode)

  let category
  const miif = pi.miif_category?.toUpperCase() ?? ''
  if (isMeta || miif === 'METRO') {
    category = 'A'
  } else {
    category = 'C'
  }

  const pop2022 = num(pi.total_pop_2022)
  const pop2011 = num(pi.total_pop_2011)
  const areaKm2 = round(num(pi.area_km2), 2)

  const hh2022 = num(hi.households_2022)
  const hh2011 = num(hi.households_2011)

  const formalDw2022 = num(hi.formal_dwelling_2022)
  const tradDw2022 = num(hi.traditional_dwelling_2022)
  const informalDw2022 = num(hi.informal_dwelling_2022)
  const otherDw2022 = num(hi.other_dwelling_2022)
  const totalDw2022 = formalDw2022 + tradDw2022 + informalDw2022 + otherDw2022

  const formalDw2011 = num(hi.formal_dwelling_2011)
  const tradDw2011 = num(hi.traditional_dwelling_2011)
  const informalDw2011 = num(hi.informal_dwelling_2011)
  const otherDw2011 = num(hi.other_dwelling_2011)
  const totalDw2011 = formalDw2011 + tradDw2011 + informalDw2011 + otherDw2011

  const waterScheme2022 = num(hi.water_scheme_2022)
  const otherWater2022 = num(hi.other_water_2022)
  const totalWater2022 = waterScheme2022 + otherWater2022
  const waterScheme2011 = num(hi.water_scheme_2011)
  const otherWater2011 = num(hi.other_water_2011)
  const totalWater2011 = waterScheme2011 + otherWater2011

  const flushToilet2022 = num(hi.flush_toilet_2022)
  const otherToilet2022 = num(hi.other_toilet_2022)
  const noToilet2022 = num(hi.no_toilet_2022)
  const totalToilet2022 = flushToilet2022 + otherToilet2022 + noToilet2022
  const flushToilet2011 = num(hi.flush_toilet_2011)
  const otherToilet2011 = num(hi.other_toilet_2011)
  const noToilet2011 = num(hi.no_toilet_2011)
  const totalToilet2011 = flushToilet2011 + otherToilet2011 + noToilet2011

  const elecCooking2022 = num(hi.electricity_cooking_2022)
  const gasCooking2022 = num(hi.gas_cooking_2022)
  const otherCooking2022 = num(hi.other_cooking_2022)
  const totalCooking2022 = elecCooking2022 + gasCooking2022 + otherCooking2022
  const elecCooking2011 = num(hi.electricity_cooking_2011)
  const gasCooking2011 = num(hi.gas_cooking_2011)
  const otherCooking2011 = num(hi.other_cooking_2011)
  const totalCooking2011 = elecCooking2011 + gasCooking2011 + otherCooking2011

  const age0to4_2022 = num(ai.age_0_to_4_2022)
  const age5to14_2022 = num(ai.age_5_to_14_2022)
  const age15to34_2022 = num(ai.age_15_to_34_2022)
  const age35to59_2022 = num(ai.age_35_to_59_2022)
  const age60plus_2022 = num(ai.age_60_plus_2022)
  const age0to4_2011 = num(ai.age_0_to_4_2011)
  const age5to14_2011 = num(ai.age_5_to_14_2011)
  const age15to34_2011 = num(ai.age_15_to_34_2011)
  const age35to59_2011 = num(ai.age_35_to_59_2011)
  const age60plus_2011 = num(ai.age_60_plus_2011)

  return {
    id: dcCode,
    name: pi.name,
    category,
    province: pi.prov_code,
    provinceName: PROVINCE_NAMES[pi.prov_code] ?? pi.prov_code,
    districtCode: null,
    isMeta,
    miifCategory: pi.miif_category ?? '',
    governmentTransfersPct: round(num(pi.government_transfers_subsidies_percent)),

    population2022: pop2022,
    population2011: pop2011,
    populationGrowthRate: round(num(pi.growth_rate_2011_to_2022)),
    areaKm2,
    populationDensity2022: areaKm2 > 0 ? round(pop2022 / areaKm2, 1) : 0,

    households2022: hh2022,
    households2011: hh2011,
    avgHouseholdSize2022: round(num(hi.avg_household_size_2022)),
    avgHouseholdSize2011: round(num(hi.avg_household_size_2011)),

    sexRatio2022: round(num(pi.sex_ratio_2022)),
    sexRatio2011: round(num(pi.sex_ratio_2011)),

    pctAge0to4_2022: pct(age0to4_2022, pop2022),
    pctAge5to14_2022: pct(age5to14_2022, pop2022),
    pctAge0to14_2022: pct(age0to4_2022 + age5to14_2022, pop2022),
    pctAge15to34_2022: pct(age15to34_2022, pop2022),
    pctAge60plus_2022: pct(age60plus_2022, pop2022),
    pctAge0to4_2011: pct(age0to4_2011, pop2011),
    pctAge5to14_2011: pct(age5to14_2011, pop2011),
    pctAge0to14_2011: pct(age0to4_2011 + age5to14_2011, pop2011),
    pctAge15to34_2011: pct(age15to34_2011, pop2011),
    pctAge60plus_2011: pct(age60plus_2011, pop2011),

    pctFormalDwelling2022: pct(formalDw2022, totalDw2022),
    pctInformalDwelling2022: pct(informalDw2022, totalDw2022),
    pctTraditionalDwelling2022: pct(tradDw2022, totalDw2022),
    pctFormalDwelling2011: pct(formalDw2011, totalDw2011),
    pctInformalDwelling2011: pct(informalDw2011, totalDw2011),
    pctTraditionalDwelling2011: pct(tradDw2011, totalDw2011),

    pctWaterScheme2022: pct(waterScheme2022, totalWater2022),
    pctNoWater2022: pct(otherWater2022, totalWater2022),
    pctWaterScheme2011: pct(waterScheme2011, totalWater2011),
    pctNoWater2011: pct(otherWater2011, totalWater2011),

    pctFlushToilet2022: pct(flushToilet2022, totalToilet2022),
    pctNoToilet2022: pct(noToilet2022, totalToilet2022),
    pctFlushToilet2011: pct(flushToilet2011, totalToilet2011),
    pctNoToilet2011: pct(noToilet2011, totalToilet2011),

    pctElectricityCooking2022: pct(elecCooking2022, totalCooking2022),
    pctGasCooking2022: pct(gasCooking2022, totalCooking2022),
    pctElectricityCooking2011: pct(elecCooking2011, totalCooking2011),
    pctGasCooking2011: pct(gasCooking2011, totalCooking2011),

    populationDetail: {
      malePop2022: num(pi.male_pop_2022),
      femalePop2022: num(pi.female_pop_2022),
      malePop2011: num(pi.male_pop_2011),
      femalePop2011: num(pi.female_pop_2011),
      schoolAttendance2022: num(pi.school_attendance_ages_5_to_24_2022),
      schoolAttendance2011: num(pi.school_attendance_ages_5_to_24_2011),
    },
    ageDetail: {
      pctAge35to59_2022: pct(age35to59_2022, pop2022),
      pctAge35to59_2011: pct(age35to59_2011, pop2011),
    },
    housingDetail: {
      formalDwellings2022: formalDw2022,
      traditionalDwellings2022: tradDw2022,
      informalDwellings2022: informalDw2022,
      otherDwellings2022: otherDw2022,
      formalDwellings2011: formalDw2011,
      traditionalDwellings2011: tradDw2011,
      informalDwellings2011: informalDw2011,
      otherDwellings2011: otherDw2011,
    },
    serviceDetail: {
      waterScheme2022, otherWater2022, waterScheme2011, otherWater2011,
      flushToilet2022, otherToilet2022, noToilet2022,
      flushToilet2011, otherToilet2011, noToilet2011,
      electricityCooking2022: elecCooking2022, gasCooking2022, otherCooking2022,
      electricityCooking2011: elecCooking2011, gasCooking2011, otherCooking2011,
    },

    lastUpdated: '2026-06-04',
    boundaryYear: 2022,
    erratumApplied: ERRATUM_CODES.has(dcCode),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const rawDir = path.join(__dirname, '..', 'raw_data')
  const outPath = path.join(__dirname, '..', 'src', 'data', 'datasets', 'municipalities.json')

  console.log('Reading CSV files...')

  // Muni-level (213 rows each)
  const muniPI = parseCSV(path.join(rawDir, 'person-indicators-muni.csv'))
  const muniHI = parseCSV(path.join(rawDir, 'housing-info-muni.csv'))
  const muniAI = parseCSV(path.join(rawDir, 'age-distribution-muni.csv'))

  // District-level (52 rows each — includes metros)
  const distPI = parseCSV(path.join(rawDir, 'person-indicators-district.csv'))
  const distHI = parseCSV(path.join(rawDir, 'housing-info-district.csv'))
  const distAI = parseCSV(path.join(rawDir, 'age-distribution-district.csv'))

  console.log(`  muni: ${muniPI.length} rows`)
  console.log(`  district: ${distPI.length} rows`)

  // Build lookup maps
  const muniHIMap = {}
  muniHI.forEach(r => { muniHIMap[r.muni_code] = r })

  const muniAIMap = {}
  muniAI.forEach(r => { muniAIMap[r.muni_code] = r })

  const distHIMap = {}
  distHI.forEach(r => { distHIMap[r.dc_code] = r })

  const distAIMap = {}
  distAI.forEach(r => { distAIMap[r.dc_code] = r })

  // Build district name map
  const districtMap = buildDistrictMap(distPI)

  // ── Transform local municipalities (213 records) ───────────────────────────
  console.log('Transforming local municipality records...')
  const muniRecords = []
  const muniCodesSeen = new Set()

  for (const pi of muniPI) {
    const code = pi.muni_code
    if (muniCodesSeen.has(code)) {
      console.warn(`  DUPLICATE muni_code: ${code} — skipping`)
      continue
    }
    muniCodesSeen.add(code)

    const hi = muniHIMap[code]
    const ai = muniAIMap[code]

    if (!hi || !ai) {
      console.warn(`  Missing housing or age data for ${code} (${pi.name}) — skipping`)
      continue
    }

    muniRecords.push(transformMuniRecord(pi, hi, ai, districtMap))
  }

  // ── Transform district municipalities (52 records incl. metros at dist level) ─
  console.log('Transforming district/metro records...')
  const distRecords = []
  const distCodesSeen = new Set()

  // The muni CSV already contains metros (where dc_code == muni_code).
  // The district CSV is a separate pass for district entities only.
  // We include district records that are NOT already in the muni set as metros.
  for (const pi of distPI) {
    const code = pi.dc_code
    if (distCodesSeen.has(code)) {
      console.warn(`  DUPLICATE dc_code: ${code} — skipping`)
      continue
    }
    distCodesSeen.add(code)

    // Skip if this district record is a metro already captured in muni CSV
    // (metros appear in both CSVs; we keep the muni version as canonical)
    if (METRO_CODES.has(code) && muniCodesSeen.has(code)) {
      // Already in muniRecords — don't add district duplicate
      continue
    }

    const hi = distHIMap[code]
    const ai = distAIMap[code]

    if (!hi || !ai) {
      console.warn(`  Missing housing or age data for district ${code} (${pi.name}) — skipping`)
      continue
    }

    distRecords.push(transformDistrictRecord(pi, hi, ai))
  }

  // ── Combine all records ───────────────────────────────────────────────────
  const allRecords = [...muniRecords, ...distRecords]

  // ── Validate unique IDs ───────────────────────────────────────────────────
  console.log('\nValidation:')
  const allIds = allRecords.map(r => r.id)
  const uniqueIds = new Set(allIds)
  console.log(`  Total records: ${allRecords.length}`)
  console.log(`  Unique IDs: ${uniqueIds.size}`)
  if (uniqueIds.size !== allRecords.length) {
    const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i)
    console.error(`  DUPLICATE IDs found: ${dupes.join(', ')}`)
    process.exit(1)
  } else {
    console.log('  ✓ All municipality codes are unique')
  }

  // ── Count by geographic level ─────────────────────────────────────────────
  const metros = allRecords.filter(r => r.isMeta)
  const districts = allRecords.filter(r => !r.isMeta && r.category === 'C')
  const locals = allRecords.filter(r => r.category === 'B')
  console.log(`  Metros (Category A): ${metros.length}`)
  console.log(`  Districts (Category C, non-metro): ${districts.length}`)
  console.log(`  Local municipalities (Category B): ${locals.length}`)

  // ── Build output ──────────────────────────────────────────────────────────
  const output = {
    _meta: {
      source: 'Statistics South Africa',
      primary_publication: 'Census 2022 Municipal Fact Sheet (revised August 2025)',
      secondary_publications: [
        'Census 2022 Provinces at a Glance',
        'afrith/census-2022-muni-stats (GitHub CSV extract)',
      ],
      census_year: 2022,
      boundary_reference: '2021 local government election boundaries',
      boundary_note: '2011 figures are boundary-aligned to 2022 boundaries per Stats SA official publications. Direct 2011–2022 comparison is valid.',
      quality_caveat: 'Census 2022 Post-Enumeration Survey estimated ~30% undercount. Statistics South Africa considers the data fit for general use. Academic researchers have raised concerns about specific metropolitan and provincial counts.',
      excluded_themes: ['employment', 'income', 'fertility', 'mortality', 'water_interruptions'],
      excluded_themes_reason: 'Formally excluded by the Statistician-General (August 2024) due to reporting and coverage biases.',
      last_verified: '2026-06-04',
      source_url: 'https://census.statssa.gov.za',
      update_frequency: 'Decennial (next census ~2032)',
      erratum: 'Thaba Chweu (MP325) and City of Mbombela (MP322) figures corrected in August 2025 revision of the Municipal Fact Sheet.',
      notes: 'Employment and income excluded by Stats SA due to data quality. Census 2022 estimated ~30% undercount (Post-Enumeration Survey). 2011 comparison figures use Stats SA boundary-aligned values. Disability data uses Washington Group Short Set — comparable across 2011 and 2022 only.',
      geographic_levels: ['metro', 'district', 'local'],
      geographic_level_counts: {
        metros: metros.length,
        districts: districts.length,
        local_municipalities: locals.length,
        total: allRecords.length,
      },
      total_records: allRecords.length,
    },
    municipalities: allRecords,
  }

  // ── Write output ──────────────────────────────────────────────────────────
  const json = JSON.stringify(output, null, 2)
  fs.writeFileSync(outPath, json, 'utf8')

  const sizeKB = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1)
  console.log(`\n✓ Output written to: ${outPath}`)
  console.log(`  File size: ${sizeKB} KB`)
  console.log(`  Total municipality records: ${allRecords.length}`)
}

main()
