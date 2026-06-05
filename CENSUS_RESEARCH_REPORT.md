# Stats SA Census Ecosystem — Research Report
**Prepared for:** SA Data Hub — V5 Planning  
**Research date:** June 2026  
**Scope:** Stats SA census ecosystem covering Census 1996, 2001, 2011, and 2022  
**Purpose:** Inform census expansion strategy; no code, no implementation

---

## 1. Census Coverage Overview

South Africa has conducted four post-apartheid population and housing censuses, all administered by Statistics South Africa (Stats SA). Each census enumerates every person present in South Africa on census night — a de facto count, not a de jure one.

| Census | Census Night | Population Counted | Release Date | Cost |
|--------|-------------|-------------------|--------------|------|
| Census 1996 | 9–10 October 1996 | 40,583,573 | 1998 | — |
| Census 2001 | 9–10 October 2001 | 44,819,778 | 2003–2004 | — |
| Census 2011 | 9–10 October 2011 | 51,770,560 | 2012 | — |
| Census 2022 | 2 February 2022 | 62,027,503 | October 2023 | R2.3 billion |

Each census was the primary source of small-area demographic data in its decade. Between Census 2001 and 2011, Stats SA conducted the Community Survey 2007 as an intercensal bridging dataset. A Community Survey 2016 was also conducted between Census 2011 and 2022.

All four censuses are publicly available in some form, though the access mechanism, geographic resolution, and data quality differ materially by census year.

---

## 2. Census 1996

### 2.1 Overview

Census 1996 was the first post-apartheid national census, conducted on 9–10 October 1996. It was a paper-based enumeration using fieldworkers. The undercount was estimated at 10.7%, which was considered high by international standards. Results were released in 1998.

### 2.2 Themes Available

| Theme | Available? | Notes |
|-------|-----------|-------|
| Population (size, growth) | ✅ Yes | Province, local authority |
| Age | ✅ Yes | Single-year age groups |
| Sex | ✅ Yes | By province and local authority |
| Race (Population Group) | ✅ Yes | Black African, White, Coloured, Asian/Indian |
| Language | ✅ Yes | First language spoken at home |
| Education | ✅ Yes | Attendance and highest level completed |
| Employment | ✅ Yes | Employment activities, unemployment |
| Income | ✅ Yes | Individual and household income bands |
| Housing / Dwelling Type | ✅ Yes | Formal, informal, traditional |
| Household Services | ✅ Yes | Water, electricity, sanitation, refuse |
| Access to Water | ✅ Yes | Piped water on site, community standpipe, river |
| Access to Electricity | ✅ Yes | For lighting, cooking, heating |
| Migration | ✅ Yes | Province of birth, previous province |
| Disability | ✅ Yes | Coded as `disablec` variable in microdata |
| Internet Access | ❌ No | Not measured in 1996 |
| Religion | ✅ Yes | Religious affiliation |
| Household Ownership | ✅ Yes | Tenure status |

### 2.3 Geographic Levels Available

| Level | Available? | Notes |
|-------|-----------|-------|
| National | ✅ Yes | Full coverage |
| Province | ✅ Yes | All 9 provinces |
| District Municipality | ⚠️ Partial | 1996 used District Councils (pre-MDB restructuring). Transitional Local Councils (TLCs), Transitional Rural Councils, Metropolitan Sub-Structures, and other transitional structures existed. Not comparable to post-2000 district municipality boundaries. |
| Local Municipality | ⚠️ Partial | 1996 used Local Authority boundaries (TLCs, RLCs, MLCs, LACs). Not directly comparable to current local municipalities. Minimum 2,000 households for confidentiality. |
| Main Place | ✅ Yes | Available via SuperWEB2 Community Profiles |
| Sub-Place | ✅ Yes | Lowest level in 10% sample; EA numbers excluded for confidentiality |
| Ward | ❌ No | Ward boundaries not part of 1996 geography |

### 2.4 Public Datasets Available

- **10% Microdata sample** — Available via DataFirst (University of Cape Town) and the World Bank Microdata Library. Person and Household files. Free to access with registration.
- **Community Profiles** — Available via Stats SA SuperWEB2 (requires free registration). Includes Census 1996, 2001, and 2011 community profiles in one system.
- **Published statistical releases** — Full national and provincial PDF reports available on statssa.gov.za.

### 2.5 Key Data Limitations

- Undercount of approximately 10.7% — one of the highest recorded for South Africa.
- Pre-MDB boundary system — district and local geographies are not compatible with post-2000 structures. Cross-census comparison at sub-provincial level requires boundary reconciliation.
- Rural and farm area enumeration was incomplete in several provinces.
- Some digital versions have variable label inconsistencies corrected in later re-releases.

---

## 3. Census 2001

### 3.1 Overview

Conducted on 9–10 October 2001 and released from 2003–2004. Also paper-based fieldworker enumeration. The 2001 census was the second post-apartheid census and coincided with the first full implementation of the new wall-to-wall municipal system established by the Municipal Demarcation Board (MDB) in 2000. This makes 2001 the first census conducted using modern district and local municipality geography.

### 3.2 Themes Available

| Theme | Available? | Notes |
|-------|-----------|-------|
| Population (size, growth) | ✅ Yes | Full breakdown |
| Age | ✅ Yes | Single-year and 5-year age groups |
| Sex | ✅ Yes | |
| Race (Population Group) | ✅ Yes | Same four groups as 1996 |
| Language | ✅ Yes | Home language |
| Education | ✅ Yes | School attendance, highest level |
| Employment | ✅ Yes | Employment status, sector, occupation |
| Income | ✅ Yes | Individual income bands |
| Housing / Dwelling Type | ✅ Yes | |
| Household Services | ✅ Yes | Energy, water, sanitation, refuse |
| Access to Water | ✅ Yes | Piped water on site, standpipe, other |
| Access to Electricity | ✅ Yes | Cooking, heating, lighting |
| Migration | ✅ Yes | Province of birth, previous residence |
| Disability | ✅ Yes | Included in questionnaire |
| Internet Access | ❌ No | Not measured in 2001 |
| Religion | ✅ Yes | |
| Household Assets | ✅ Yes | Radio, TV, telephone, etc. |
| Agricultural Activities | ✅ Yes | Household agricultural activities |

### 3.3 Geographic Levels Available

| Level | Available? | Notes |
|-------|-----------|-------|
| National | ✅ Yes | |
| Province | ✅ Yes | All 9 provinces |
| District Municipality | ✅ Yes | First census under the post-MDB district structure. 262 local municipalities in 2001 geographical frame. |
| Local Municipality | ✅ Yes | 262 local municipalities. Municipalities with ≤200 households suppressed for confidentiality in 10% sample. |
| Main Place | ✅ Yes | Via SuperWEB2 and published municipal reports |
| Sub-Place | ✅ Yes | Lowest level in 10% sample |
| Ward | ❌ No | Not publicly released at ward level |

### 3.4 Public Datasets Available

- **10% Microdata sample** — DataFirst (catalog ID: 96). Person and Household files. Version 1.1 includes geography variables merged into person and household files.
- **Community Profiles** — Via Stats SA SuperWEB2 (same system as 1996 and 2011).
- **Key Municipal Data publication** — PDF publication covering all district and local municipalities.
- **Primary Tables** — National and provincial comparison tables (Census '96 and 2001 compared) on statssa.gov.za.

### 3.5 Key Data Limitations

- Census 2001 geography used the newly established MDB boundaries. However, some small municipalities (≤200 households) are suppressed in the 10% microdata sample.
- Geographic type variable (urban/rural classification) from 1996 was used as a derived variable, not a native 2001 classification, in the first release.
- Labour market comparisons with 1996 were flagged as problematic due to different question wording and methodology.

---

## 4. Census 2011

### 4.1 Overview

Conducted on 9–10 October 2011 and released in 2012. The third post-apartheid census. Still primarily paper-based with some digital data capture. Census 2011 is broadly considered the most reliable of the four censuses in terms of undercount and coverage, and it is the baseline against which Census 2022 is most often compared. Municipal boundary changes between 2001 and 2011 reduced the local municipality count from 262 to 234 (25 District Management Areas absorbed into surrounding municipalities, and 3 further restructurings).

### 4.2 Themes Available

| Theme | Available? | Notes |
|-------|-----------|-------|
| Population (size, growth) | ✅ Yes | |
| Age | ✅ Yes | 5-year age groups; single-year in microdata |
| Sex | ✅ Yes | |
| Race (Population Group) | ✅ Yes | |
| Language | ✅ Yes | Language most often spoken at home |
| Education | ✅ Yes | School attendance, highest level completed, early childhood |
| Employment | ✅ Yes | Full labour market module |
| Income | ✅ Yes | Individual income bands (monthly) |
| Housing / Dwelling Type | ✅ Yes | Formal, informal, traditional, other |
| Household Services | ✅ Yes | Energy, sanitation, refuse, telephone, internet |
| Access to Water | ✅ Yes | Full water source breakdown |
| Access to Electricity | ✅ Yes | Electricity for lighting, cooking, heating |
| Internet Access | ✅ Yes | First census to include internet access question |
| Migration | ✅ Yes | Province of birth, previous municipality |
| Disability | ⚠️ Changed | The traditional disability question was replaced with "general health and functioning" questions aligned to the Washington Group Short Set. Disability is derivable but not directly comparable to 1996/2001. |
| Religion | ✅ Yes | |
| Household Assets | ✅ Yes | Radio, TV, refrigerator, computer, cellphone, landline |
| Agricultural Activities | ✅ Yes | Separate agricultural household file in Version 2 |
| Property Value | ⚠️ Removed in v1.1 | H5 (estimated property value) and H6 (age of property) excluded from v1.1 released on statssa.gov.za. Available in the original CD version. |

### 4.3 Geographic Levels Available

| Level | Available? | Notes |
|-------|-----------|-------|
| National | ✅ Yes | |
| Province | ✅ Yes | All 9 provinces |
| District Municipality | ✅ Yes | Available in published reports and SuperWEB2 |
| Local Municipality | ✅ Yes | 234 local municipalities in 2011 frame |
| Main Place | ✅ Yes | Via SuperWEB2 and municipal PDF reports |
| Sub-Place | ✅ Yes | In microdata; EA excluded for confidentiality |
| Ward | ✅ Yes | Ward-level data available via SuperWEB2 (confirmed by OpenUp tutorial) |

### 4.4 Public Datasets Available

- **10% Microdata sample** — DataFirst (catalog ID: 485). Version 2 includes agricultural households file. Free with registration.
- **Community Profiles** — Via Stats SA SuperWEB2. Census 1996, 2001, and 2011 all accessible in one interface. Requires free registration.
- **Municipal Reports** — PDF municipal profiles published per province (e.g. Gauteng Municipal Report) covering all local municipalities.
- **Published Statistical Release** — P030142011 (Revised) on statssa.gov.za.
- **Thematic reports** — Agriculture, gender, disability, etc. published as separate PDF reports.

### 4.5 Key Data Limitations

- Disability question methodology changed from 1996/2001 — direct comparison is not valid.
- Property value and occupation/industry variables removed from v1.1 (available only in original v1 CD).
- Labour market comparison concerns noted explicitly by Stats SA — "comparisons of labour market indicators in the post-apartheid population censuses over time have been a cause for concern."
- Undercount was lower than previous censuses but still significant in farm and remote rural areas.

---

## 5. Census 2022

### 5.1 Overview

Conducted on 2 February 2022 (delayed from October 2021 due to COVID-19) and released on 10 October 2023. The first fully digital census, using three collection modes: CAPI (fieldworker with tablet), CAWI (web self-completion), and CATI (telephonic). Census 2022 recorded 62 million people. Despite being the most technologically advanced census, it attracted significant criticism from demographers — particularly UCT's Tom Moultrie and Rob Dorrington — regarding coverage anomalies and undercount.

A Post-Enumeration Survey (PES) estimated the undercount at approximately 30%, which the UN Population Division described as the highest ever recorded for a national census.

### 5.2 Themes Available

| Theme | Available? | Notes |
|-------|-----------|-------|
| Population (size, composition) | ✅ Yes | Released Phase 1, October 2023 |
| Age | ✅ Yes | 5-year groups; anomalous dips in 5–9 and 15–19 noted |
| Sex | ✅ Yes | |
| Race (Population Group) | ✅ Yes | Same four groups; some enumeration difficulties in Western Cape |
| Language | ✅ Yes | Language most spoken at home; SA Sign Language added as 12th official language |
| Education | ✅ Yes | School attendance, ECD participation, highest level |
| Employment / Labour | ❌ **EXCLUDED** | Formally excluded due to "reporting and coverage biases." Not released and not planned for release. Use QLFS instead. |
| Income | ❌ **EXCLUDED** | Formally excluded due to high rate of unspecified responses and reporting bias. Not released. |
| Housing / Dwelling Type | ✅ Yes | Formal, informal, traditional. Formal dwelling rate improved to 88.5%. |
| Household Services | ✅ Yes | Refuse removal, sanitation, energy |
| Access to Water | ✅ Yes | Over 80% of households have piped water |
| Access to Electricity | ✅ Yes | Electricity for lighting, cooking, heating |
| Internet Access | ✅ Yes | Included; 64% of households had internet access nationally in 2022 |
| Migration | ✅ Yes | Published as Report 03-04-04 (2025). Province of birth, previous place of residence. |
| Disability | ✅ Yes | General health and functioning module; reported as "disability" in thematic outputs |
| Fertility | ❌ **EXCLUDED** | Excluded due to reporting and coverage biases |
| Mortality | ❌ **EXCLUDED** | Excluded pending confrontation with vital registration data |
| Food Security | ✅ Yes | New in 2022; included in household questionnaire |
| Religion | ✅ Yes | |
| Water Interruptions | ❌ **EXCLUDED** | "Water interruptions lasting more than two days" excluded due to data quality |
| Agriculture | ✅ Yes | Agricultural households; separate reporting planned |

### 5.3 Geographic Levels Available

| Level | Available? | Notes |
|-------|-----------|-------|
| National | ✅ Yes | Phase 1 released October 2023 |
| Province | ✅ Yes | All 9 provinces. Provinces at a Glance report released. |
| District Municipality | ✅ Yes | 44 district municipalities + 8 metropolitan municipalities = 52 district-level entities. Special District Layer Product released 2025 via SuperWeb Data Portal. |
| Local Municipality | ✅ Yes | Municipal Profiles published for all local municipalities. Municipal Fact Sheet published. Note: erratum issued for Thaba Chweu and City of Mbombela (Mpumalanga). |
| Main Place | ✅ Yes | Available in SuperCROSS/SuperWEB2 system |
| Sub-Place | ✅ Yes | Available in SuperCROSS |
| Ward | ✅ Yes | Stats SA confirmed ward-level data will be released. Some low-count wards suppressed under Statistics Act Section 17 confidentiality provisions. |
| Small Area Layer (SAL) | ⚠️ Request only | Available only on request directly from Stats SA. Not publicly downloadable. |
| Enumeration Area | ❌ No | Never released to protect respondent confidentiality |

### 5.4 Public Datasets Available

- **10% Microdata sample** — DataFirst (catalog ID: 982). Released September 2024. Person and Household files. Lowest geography is local municipality. Free with registration.
- **Municipal Profiles** — Updated and revised as of August 2025 following a comprehensive assessment. Available via census.statssa.gov.za and in SuperCROSS.
- **Special District Layer Product** — Released 2025 via Stats SA SuperWeb Data Portal. Covers police districts (1,167), education districts (86), magisterial districts (53), and health districts (52).
- **Census 2022 Statistical Release** (PDF, 3.59 MB) — Full national report at census.statssa.gov.za.
- **Provinces at a Glance** (PDF, 3.92 MB) — Provincial and municipal indicators. GitHub repository `afrith/census-2022-muni-stats` contains extracted tabular data from this publication.
- **Municipal Fact Sheet** — Key indicators per local municipality comparing 2011 and 2022 data. Revised to correct Mpumalanga erratum.
- **Migration Report** — Report 03-04-04 (2025) published on statssa.gov.za.
- **Administrative & Service Provision District Profiles** — DataFirst catalog ID: 1131. Spatial boundary files + census data linked by DataFirst, released April 2026.
- **SuperWEB2 / SuperCROSS** — Interactive data portal at Stats SA. Census 2022 community profiles being added progressively.

---

## 6. Available Themes — Cross-Census Comparison

The table below summarises theme availability across all four censuses. A theme is marked as available only when data has been formally published and is publicly accessible.

| Theme | 1996 | 2001 | 2011 | 2022 |
|-------|------|------|------|------|
| Population (total, size) | ✅ | ✅ | ✅ | ✅ |
| Age | ✅ | ✅ | ✅ | ✅ |
| Sex | ✅ | ✅ | ✅ | ✅ |
| Race / Population Group | ✅ | ✅ | ✅ | ✅ |
| Language | ✅ | ✅ | ✅ | ✅ |
| Education | ✅ | ✅ | ✅ | ✅ |
| Employment | ✅ | ✅ | ✅ | ❌ Excluded |
| Income | ✅ | ✅ | ✅ | ❌ Excluded |
| Housing / Dwelling Type | ✅ | ✅ | ✅ | ✅ |
| Household Services | ✅ | ✅ | ✅ | ✅ |
| Access to Water | ✅ | ✅ | ✅ | ✅ |
| Access to Electricity | ✅ | ✅ | ✅ | ✅ |
| Internet Access | ❌ | ❌ | ✅ | ✅ |
| Migration | ✅ | ✅ | ✅ | ✅ |
| Disability | ✅ | ✅ | ⚠️ Changed | ✅ |
| Religion | ✅ | ✅ | ✅ | ✅ |
| Household Assets | ✅ | ✅ | ✅ | ✅ |
| Food Security | ❌ | ❌ | ❌ | ✅ New |
| Agricultural Activities | ✅ | ✅ | ✅ | ✅ |
| Fertility / Mortality | ✅ | ✅ | ✅ | ❌ Excluded |

**Notes on excluded themes in Census 2022:**

- **Employment and Income:** Both formally excluded by the Statistician-General in August 2024, after data quality evaluation identified reporting and coverage biases. This is the most significant data gap in Census 2022. Stats SA has directed users to the Quarterly Labour Force Survey (QLFS) for employment data and the Income and Expenditure Survey for income data.
- **Fertility and Mortality:** Excluded pending confrontation with vital registration data from the Department of Home Affairs.
- **Water Interruptions:** A new question added in 2022 that was subsequently excluded due to quality issues.

**Note on Disability (2011):** The 2011 census replaced the traditional disability question with the Washington Group Short Set on functioning. Disability is derivable from this module but is not directly comparable to 1996 or 2001 responses. Census 2022 continued the Washington Group approach, so 2011 and 2022 disability data are comparable to each other.

---

## 7. Geographic Levels — Cross-Census Comparison

| Geographic Level | 1996 | 2001 | 2011 | 2022 |
|-----------------|------|------|------|------|
| National | ✅ | ✅ | ✅ | ✅ |
| Province | ✅ (9) | ✅ (9) | ✅ (9) | ✅ (9) |
| District Municipality | ⚠️ Pre-MDB | ✅ (262 local munis) | ✅ (234 local munis) | ✅ (52 district entities) |
| Local Municipality | ⚠️ Pre-MDB | ✅ | ✅ | ✅ |
| Main Place | ✅ | ✅ | ✅ | ✅ |
| Sub-Place | ✅ (10% sample) | ✅ (10% sample) | ✅ (10% sample) | ✅ (10% sample) |
| Ward | ❌ | ❌ | ✅ (SuperWEB2) | ✅ (confirmed) |
| Small Area Layer | ❌ | ❌ | ✅ (request only) | ✅ (request only) |
| Enumeration Area | ❌ | ❌ | ❌ | ❌ |

The provincial boundaries of South Africa's nine provinces have remained stable since 1994. However, one boundary adjustment affecting Gauteng and North West (and their respective municipalities) was implemented in 2018, which is reflected in the Census 2022 aligned comparisons.

---

## 8. Municipality Boundary Changes Between Census Years

### 8.1 1996 to 2001 — Major Restructuring

The most significant boundary change in South Africa's post-apartheid history occurred between the 1996 and 2001 censuses. The Municipal Demarcation Board (MDB), established in 1999, restructured all municipal boundaries before the December 2000 local government elections, reducing the total number of municipalities from approximately 1,260 (transitional period) to 284 under the new wall-to-wall system. This restructuring created three tiers: metropolitan municipalities (Category A), local municipalities (Category B), and district municipalities (Category C).

**This makes Census 1996 and Census 2001 data fundamentally incomparable at sub-provincial level without using spatial boundary reconciliation tools.**

- Local authority boundaries in 1996 used at least eight different naming conventions (TLCs, TRCs, LACs, MSSs, MLCs, RLCs, DCs, TDCs).
- No direct mapping between 1996 local authority codes and 2001 municipality codes exists in standard Stats SA releases.
- Only province-level (and national-level) data is reliably comparable between 1996 and 2001.

### 8.2 2001 to 2011 — Moderate Restructuring

Between 2001 and 2011, the MDB made targeted changes. The Census 2011 statistical release documents these changes explicitly:

- 25 District Management Areas (DMAs) were absorbed into surrounding municipalities.
- 3 further restructurings reduced the total local municipality count from 262 (2001) to 234 (2011).
- The published Census 2011 municipal reports include a "Municipal Boundary Changes Since 2001" map.

**Impact:** Comparison between 2001 and 2011 at local municipality level is possible for most municipalities, but requires care for the approximately 28 affected boundaries. Stats SA published primary tables that explicitly show how 2001 data was realigned to 2011 boundaries for comparison purposes.

### 8.3 2011 to 2022 — Smaller Changes Plus Provincial Adjustment

Between 2011 and 2022, the MDB made further boundary adjustments following the August 2016 local government elections, which are the current (2021-election) boundaries. Key changes:

- Several local municipalities were merged or renamed between 2011 and 2016.
- A provincial boundary adjustment in 2018 transferred portions of territory between Gauteng and North West (and the Free State and North West border area). This affected local municipality boundaries within those provinces.
- The Census 2022 Municipal Fact Sheet explicitly states that "Census 2011 indicators were generated based on aligned census data to current municipal boundaries (2021)" — meaning Stats SA has already recalibrated 2011 figures to 2022 boundaries for comparison purposes in official publications.
- The Census 2022 Provinces at a Glance report contains maps showing "Municipality boundary changes" per province between 2011 and 2022.
- An erratum was issued for two Mpumalanga municipalities (Thaba Chweu and City of Mbombela) due to EA allocation errors.

**Current municipality count as of Census 2022:** 8 metropolitan municipalities + 44 district municipalities + 205 local municipalities = 257 municipalities total.

### 8.4 Summary of Municipality Count by Census Year

| Census Year | Approx. Local Municipality Count | Note |
|-------------|----------------------------------|------|
| 1996 | ~800 transitional structures | Pre-MDB; incomparable |
| 2001 | 262 | First MDB wall-to-wall system |
| 2011 | 234 | 28 fewer than 2001 |
| 2022 | 257 total (8 metros + 44 DMs + 205 LMs) | Post-2016 demarcation |

---

## 9. Recommended Data Sources

The following sources are the primary access points for Stats SA census data, listed from most authoritative to most processed.

### 9.1 Stats SA Primary Sources

| Source | URL | What It Contains |
|--------|-----|-----------------|
| Stats SA Census Portal | census.statssa.gov.za | All Census 2022 products: Statistical Release (PDF), Provinces at a Glance (PDF), Municipal Fact Sheet, media releases, thematic reports |
| Stats SA SuperWEB2 | superweb.statssa.gov.za | Interactive cross-tabulation of Census 1996, 2001, 2011 (Community Profiles); Census 2022 Special District Layer (2025). Free registration required. Download in CSV, Excel. |
| Stats SA Main Website | statssa.gov.za | All historical census publications (PDF), code lists, questionnaires, metadata |
| Stats SA Census 2022 Municipal Profiles | Via SuperWEB2 and census.statssa.gov.za | Updated August 2025 to include new SuperCROSS variables |

### 9.2 DataFirst (University of Cape Town)

DataFirst is the most reliable secondary distributor of Stats SA census microdata. All datasets require registration but are free.

| Dataset | DataFirst URL | Contents |
|---------|--------------|----------|
| Census 1996 10% Sample | datafirst.uct.ac.za (catalog/specific) | Person + Household files; sub-place geography |
| Census 2001 10% Sample | datafirst.uct.ac.za/catalog/96 | Person + Household files; geography merged in v1.1 |
| Census 2011 10% Sample | datafirst.uct.ac.za/catalog/485 | Person + Household + Agricultural files (v2) |
| Census 2022 10% Sample | datafirst.uct.ac.za/catalog/982 | Person + Household files; lowest geography = local municipality |
| Census 2022 Special District Profiles | datafirst.uct.ac.za/catalog/1131 | DataFirst-processed spatial data; Excel + shapefiles; released April 2026 |

### 9.3 World Bank Microdata Library

The World Bank Microdata Library hosts the Census 1996 10% sample for international researchers who may not have DataFirst accounts.

### 9.4 GitHub (afrith/census-2022-muni-stats)

Adrian Frith extracted and cleaned provincial and municipal statistics from the Census 2022 Provinces at a Glance publication. This is a community-maintained, openly licensed CSV dataset that is easier to ingest than PDF publications. It covers key indicators (population, age, sex, population group, households, dwelling type, services) for all local municipalities. This is a high-quality, machine-readable starting point for the SA Data Hub's municipality layer.

### 9.5 OpenUp (openup.org.za)

OpenUp has published tutorials on using Stats SA's SuperWEB2 to download ward-level data for Census 2011, which also applies to Census 2022 once ward data is fully released.

---

## 10. Dataset Sizes

Precise file sizes for raw microdata downloads are not publicly listed in Stats SA or DataFirst documentation. The following are representative estimates based on known characteristics.

| Dataset | Record Count (Approx.) | Format | Estimated File Size |
|---------|----------------------|--------|---------------------|
| Census 1996 10% Sample | ~4 million persons | Stata/SPSS/CSV | ~300–500 MB (compressed) |
| Census 2001 10% Sample | ~4.5 million persons | Stata/SPSS/CSV | ~400–600 MB (compressed) |
| Census 2011 10% Sample | ~5.2 million persons | Stata/SPSS/CSV | ~500–800 MB (compressed) |
| Census 2022 10% Sample | ~6.2 million persons | Stata/SPSS/CSV | ~700 MB–1.2 GB (compressed) |
| Census 2022 Municipal Profiles (Excel) | 257 municipalities × ~50 variables | Excel (.xlsx) | ~5–20 MB per theme |
| Census 2022 Special District Layer | ~1,400 district units | Excel + shapefiles | ~50–200 MB (spatial files) |
| Census 2022 Provinces at a Glance (PDF) | 9 provinces | PDF | 3.92 MB |
| Census 2022 Statistical Release (PDF) | National | PDF | 3.59 MB |

**For the SA Data Hub's aggregated JSON approach**, the relevant data is not the raw microdata but the published aggregate indicators (already calculated by Stats SA). These aggregate tables — extracted from PDF publications or downloaded from SuperWEB2 — are small. A fully populated census dataset for SA Data Hub at provincial level would be on the order of tens to hundreds of kilobytes of JSON per census year.

---

## 11. Data Quality Limitations

### 11.1 Census 1996

- **Undercount:** Estimated 10.7% — the highest of the four censuses.
- **Boundary incompatibility:** Pre-MDB local authority system is not comparable to any later census at sub-provincial level.
- **Rural enumeration:** Farm areas and remote rural areas significantly under-represented.
- **Variable inconsistencies:** Some variable labels were corrected only in the 2011 re-release of the data.

### 11.2 Census 2001

- **Small geography suppression:** Municipalities with fewer than 200 households are suppressed in the microdata for confidentiality.
- **Labour market comparability:** Stats SA explicitly warned that labour market comparisons with 1996 should be approached with caution.
- **Urban/rural classification:** Used 1996 definition for urban/rural classification, creating classification inconsistency.

### 11.3 Census 2011

- **Disability module change:** The shift to the Washington Group Short Set means disability data from 2011 is not comparable to 1996 or 2001.
- **Variable removals in v1.1:** Property value (H5), property age (H6), industry (p29), occupation (p30), and child survival variables (p35–p37) removed from the public v1.1 release.
- **Farm area undercount:** Elevated undercount in Northern Cape and North West farm areas.

### 11.4 Census 2022

- **High undercount:** Estimated ~30% undercount by the PES — the highest ever recorded for a Stats SA census. UCT demographers described this as "not fit for purpose" in the strongest terms, though Stats SA maintained the data is "fit for purpose" for most applications.
- **Formally excluded themes:** Employment, income, fertility, mortality, and water interruptions are formally excluded due to data quality concerns. These represent significant gaps for social and economic analysis.
- **Western Cape enumeration difficulties:** Stats SA reported particular difficulty in counting White and Coloured residents in the Western Cape due to gated communities, security estates, and refusals.
- **Metropolitan population anomalies:** Demographers noted anomalies in metropolitan area population counts inconsistent with other data sources.
- **Erratum:** Thaba Chweu and City of Mbombela (Mpumalanga) figures corrected after EA allocation error discovered in the lower-level data assessment.
- **Phased release complexity:** Data released in multiple phases (Phase 1 October 2023, Phase 2 from 2024 onwards). Not all themes available simultaneously.
- **COVID-19 impact:** The census was conducted in February 2022 during the tail end of the Omicron wave, with potential effects on enumeration completeness.

### 11.5 Cross-Census Limitations

- **Boundary changes:** No direct municipality-level comparison is possible across all four censuses without boundary reconciliation. Stats SA provides aligned 2011-to-2022 comparisons in official publications, but 2001-to-2011 requires consulting specific reconciliation files, and 1996-to-2001 has no reliable sub-provincial comparison path.
- **Question wording changes:** Employment, income, and disability question wording changed between census years. Time-series analysis at the indicator level requires careful methodological annotation.
- **Unemployment definition:** The QLFS and the census use different definitions and methodologies for unemployment. Census-derived unemployment figures are not comparable to QLFS figures and should not be mixed in time-series.

---

## 12. Recommended Data Sources for SA Data Hub

Based on the research above, the following source strategy is recommended for census data integration.

### Primary Sources (Structured, Machine-Readable)

1. **Census 2022 Municipal Fact Sheet** — The official Stats SA document comparing 2011 and 2022 key indicators per local municipality. Already aligned to 2022 boundaries. PDF requires extraction, but the `afrith/census-2022-muni-stats` GitHub repository has done this for provincial and municipal figures.

2. **DataFirst Census 2022 10% Sample** — For research-grade analysis and cross-tabulation. Too large for direct integration into SA Data Hub JSON structure, but can be queried to produce the aggregate tables needed.

3. **Stats SA SuperWEB2** — For downloading custom cross-tabulations by geography and variable. Covers Census 1996, 2001, 2011 in one interface. Census 2022 being added progressively. Free with registration.

4. **Stats SA Published Statistical Releases** (PDFs) — authoritative source for national and provincial figures. All four census years available on statssa.gov.za.

5. **Census 2022 Provinces at a Glance** — District and local municipality indicators for 2022, with 2011 comparisons built in.

### Secondary Sources (Processed, For Verification)

6. **afrith/census-2022-muni-stats (GitHub)** — CSV extract of key indicators for all municipalities from Census 2022. Useful for validation and rapid prototyping.

7. **DataFirst Census 2022 Special District Profiles** — For service-delivery district geography.

8. **OpenUp tutorials** — For replicating the SuperWEB2 download workflow for ward-level or municipal-level data.

---

## 13. Recommended Download Strategy

### For National and Provincial Data (All Four Census Years)

Download from Stats SA published statistical releases (PDF) or the Stats SA public data explorer. Extract aggregate headline figures. For SA Data Hub's JSON structure, the relevant numbers are the published headline rates and counts — not raw microdata.

**Recommended workflow:**
1. Source national/provincial figures from the official statistical release PDFs (all four census years available on statssa.gov.za).
2. For 2022, also use the Provinces at a Glance PDF and the Municipal Fact Sheet.
3. For 2011, also use Census 2011 Municipal Reports (per province) for provincial-level breakdown.

### For District and Local Municipality Data (Census 2022 Primarily)

1. Use the **Census 2022 Municipal Fact Sheet** (already aligned to current boundaries) for the core indicator set.
2. Use the **afrith/census-2022-muni-stats** GitHub CSV data for rapid machine-readable access to the same figures.
3. For additional variables, use **Stats SA SuperWEB2** with the Census 2022 Municipal Profiles (updated August 2025).

### For Historical Municipality Data (Census 2001 and 2011)

This is significantly more complex than 2022 due to boundary changes. The safest approach is:
1. Use Stats SA's own aligned comparisons where available (e.g., the Municipal Fact Sheet already aligns 2011 to 2022 boundaries).
2. For 2001, limit comparisons to provincial level unless boundary reconciliation files are explicitly sourced.
3. Avoid presenting 1996 sub-provincial data as directly comparable to any later census.

### For Microdata (Advanced Research Use)

Register at DataFirst (datafirst.uct.ac.za) and download the appropriate 10% sample. All four census years are available. Files are in Stata/SPSS/CSV format and require statistical software or Python/R for processing.

---

## 14. Recommended Scope for V5

Based on the research, the following scope is recommended for the SA Data Hub V5 census expansion. This recommendation balances data availability, quality, comparability, and implementation feasibility.

### 14.1 Census Years to Include

**Priority 1 — Census 2022 (most complete, authoritative for current state)**
Include all released themes. Clearly label excluded themes (employment, income) with an explanation and redirect to QLFS.

**Priority 2 — Census 2011 (best quality, boundary-aligned in official publications)**
Include for historical comparison. Focus on themes where direct 2011–2022 comparison is reliable. Stats SA has already aligned 2011 figures to 2022 boundaries in official publications, which simplifies cross-year presentation.

**Priority 3 — Census 2001 (useful for long-run trends, province-level only)**
Include at province level only to avoid boundary incompatibility issues at sub-provincial level.

**Defer — Census 1996 (boundary incompatibility is severe)**
Census 1996 is most useful for national-level context (total population trends). Sub-provincial data requires significant reconciliation work. Recommend deferring until a boundary reconciliation layer is built.

### 14.2 Geographic Levels to Target

| Level | Recommendation | Rationale |
|-------|---------------|-----------|
| National | Include all four census years | Directly comparable; no boundary issues |
| Province | Include all four census years | Stable boundaries since 1994 (minor 2018 adjustment) |
| District Municipality | Include 2011 and 2022 only | 2001 boundaries different; 2022 has current official profiles |
| Local Municipality | Include 2022 only (Phase 1) | 2011 can be added later; boundary alignment complexity |
| Main Place / Sub-Place | Defer | Requires SuperWEB2 integration; too granular for V5 |
| Ward | Defer | Data still being released for 2022; complex |

### 14.3 Themes to Prioritise for V5

The following themes offer the best combination of data availability, comparability, and public interest:

**Highest priority (all four census years, national + provincial):**
- Population (total, by province, by sex)
- Age structure (dependency ratio, youth %, elderly %)
- Race / Population Group (proportions)
- Language (home language)
- Education (school attendance, matric completion rate)
- Household access to electricity
- Household access to piped water
- Formal dwelling rate (housing quality)
- Internet access (2011 and 2022 only)

**Medium priority (Census 2022, national + provincial + district):**
- Disability (health and functioning)
- Migration (net provincial migration)
- Household size
- Refuse removal access
- Sanitation access

**Lower priority / defer:**
- Employment and income — use QLFS and IES datasets instead; do not mix with census
- Fertility and mortality — excluded from 2022; historical data from 1996–2011 only
- Food security — 2022 only; limited comparison value

### 14.4 What to Explicitly Exclude or Annotate

The following items should be clearly marked in the SA Data Hub with data quality annotations:

- **Census 2022 employment and income themes:** Must be marked as "excluded by Stats SA due to data quality issues." Provide QLFS redirect.
- **Census 1996 sub-provincial comparisons:** If included, must carry a clear note that boundaries are not comparable to later censuses.
- **Disability comparisons between 1996/2001 and 2011/2022:** Must note that methodology changed.
- **Census 2022 overall quality:** A persistent caveat noting the ~30% undercount estimate and academic criticism is appropriate for any Census 2022 data card.

---

## 15. Risks and Limitations

### 15.1 Data Availability Risks

**Census 2022 phased release not complete:** As of mid-2026, Stats SA is still releasing Census 2022 products. The ward-level data, additional thematic reports, and full SuperCROSS variable set for Municipal Profiles are being released progressively. Data available today may be superseded by revised versions.

**SuperWEB2 reliability:** Stats SA's SuperWEB2 system has historically had uptime and registration issues. Data downloaded from SuperWEB2 may need to be stored and versioned locally rather than queried live.

**Census 2022 erratum precedent:** The Thaba Chweu/Mbombela correction shows that even published municipal figures can be revised. Any municipality-level data ingested should be version-tracked.

### 15.2 Data Quality Risks

**High Census 2022 undercount:** The estimated ~30% undercount is the most significant risk. Some provincial and metropolitan figures may be unreliable as baselines for planning or journalism. The SA Data Hub should surface this caveat prominently.

**Excluded themes cannot be substituted with Census data:** For employment, income, and mortality, users should be directed to QLFS, IES, and Vital Statistics respectively. Using Census 2022 household-level proxies as substitutes would be methodologically incorrect.

**Cross-census time series at municipality level:** Constructing a time series of any indicator from 1996 to 2022 at local municipality level is technically possible but methodologically complex. Boundary changes mean that a time series chart for, say, unemployment in a specific municipality would be misleading without boundary reconciliation notes.

### 15.3 Legal and Licensing Risks

Stats SA data is produced under the Statistics Act (Act 6 of 1999). The Act permits users to process and apply Stats SA data provided:
- Stats SA is acknowledged as the original source.
- It is specified that the analysis is the result of the user's independent processing.
- Basic data or reprocessed versions may not be sold without prior permission.

SA Data Hub's current approach (aggregating, annotating, and presenting Stats SA data for public access, not for sale) appears consistent with these terms. The Census 2022 Municipal Fact Sheet explicitly states these conditions. No explicit Creative Commons licence has been applied by Stats SA to census data.

### 15.4 Technical Integration Risks

**PDF-to-data extraction:** The most authoritative sources for older census data are PDF publications. Extracting structured data from Stats SA PDFs requires careful validation. Tools like Tabula (used by Adrian Frith for the GitHub repository) can help but require manual quality checks.

**SuperWEB2 format variability:** Data exported from SuperWEB2 is in Excel or CSV format but with variable table structures per dataset and geographic level. Integration into SA Data Hub JSON schemas will require per-dataset transformation scripts.

**Boundary file management:** Municipality boundary shapefiles change with each demarcation. The SA Data Hub would need to manage multiple boundary vintages (2001, 2011, 2016/2022) if cross-census geographic displays are planned.

**Scale of municipality data:** 257 municipalities × 15 themes × 2 census years = approximately 7,700 data points at local municipality level. This is manageable as a JSON dataset but represents a significant increase from the current SA Data Hub's ~347 data points across all datasets.

---

## 16. Appendix — Key URLs

| Resource | URL |
|----------|-----|
| Stats SA Census Portal (2022) | https://census.statssa.gov.za |
| Stats SA Main Website | https://www.statssa.gov.za |
| Stats SA SuperWEB2 | https://superweb.statssa.gov.za |
| DataFirst Data Portal | https://www.datafirst.uct.ac.za/dataportal |
| DataFirst Census 2001 | https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/96 |
| DataFirst Census 2011 | https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/485 |
| DataFirst Census 2022 | https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/982 |
| DataFirst Special Districts | https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/1131 |
| World Bank Microdata (1996) | https://microdata.worldbank.org/index.php/catalog/915 |
| Census 2022 Statistical Release | https://census.statssa.gov.za/assets/documents/2022/P03014_Census_2022_Statistical_Release.pdf |
| Census 2022 Provinces at a Glance | https://census.statssa.gov.za/assets/documents/2022/Provinces_at_a_Glance.pdf |
| Census 2022 Municipal Fact Sheet | https://census.statssa.gov.za/assets/documents/2022/Census_2022_Municipal_factsheet-Web.pdf |
| Census 2011 Statistical Release | https://www.statssa.gov.za/publications/P03014/P030142011.pdf |
| Municipal Demarcation Board | https://www.demarcation.org.za |
| afrith/census-2022-muni-stats | https://github.com/afrith/census-2022-muni-stats |
| OpenUp SuperWEB2 Tutorial | https://openup.org.za/blog/how-to-quickly-download-ward-level-data-using-statssas-superweb2 |
| Migration Report (2025) | https://www.statssa.gov.za/publications/03-04-04/03-04-042022.pdf |

---

*This report is based on publicly available information as of June 2026. No code was written, no data was downloaded, and no modifications were made to the SA Data Hub project. All findings are research-only and intended to inform planning decisions.*
