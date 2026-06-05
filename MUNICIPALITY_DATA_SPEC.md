# SA Data Hub — Census 2022 Municipality Dataset Specification
**Document type:** Research specification — no implementation, no code  
**Prepared for:** SA Data Hub V5 Planning  
**Research basis:** Census 2022 Municipal Fact Sheet · Provinces at a Glance · afrith/census-2022-muni-stats · Stats SA research report (June 2026)  
**Date:** June 2026  

---

## Table of Contents

1. [Recommended Indicators](#1-recommended-indicators)
2. [Theme Structure](#2-theme-structure)
3. [Geographic Structure](#3-geographic-structure)
4. [JSON Schema Proposal](#4-json-schema-proposal)
5. [Dataset Size Estimate](#5-dataset-size-estimate)
6. [Recommended V5 Municipality Scope](#6-recommended-v5-municipality-scope)

---

## 1. Recommended Indicators

This section catalogues every indicator identified across the three primary sources, grouped by theme, with full metadata per indicator. The **"First-class SA Data Hub stat?"** column indicates whether the indicator should be elevated to a named, searchable `Statistic` object in the data model (★ = yes, — = supporting/contextual data only).

Availability codes:  
**MFS** = Census 2022 Municipal Fact Sheet  
**PAG** = Provinces at a Glance  
**AFR** = afrith/census-2022-muni-stats (GitHub CSV extract)  
**DFL** = DataFirst Catalog 982 (10% microdata sample)  
**DFL-1131** = DataFirst Catalog 1131 (Special District Profiles, April 2026)

---

### 1.1 Population

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| P1 | Total population | Total persons enumerated in the municipality on Census night, 2 February 2022 | Count (persons) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| P2 | Total households | Total number of private households enumerated | Count (households) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| P3 | Average household size | Average number of persons per private household | Ratio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| P4 | Population change 2011–2022 | Absolute and percentage change in total population between Census 2011 (boundary-aligned) and Census 2022 | % change | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| P5 | Population density | Persons per square kilometre (derived from population and municipal area) | Persons/km² | — | PAG | AFR | ✅ | ✅ | ✅ | ★ |
| P6 | Urban population share | Percentage of population residing in urban areas (formal and informal urban) | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| P7 | Rural population share | Percentage of population residing in rural (traditional and farm) areas | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- P4 uses Stats SA's own boundary-aligned 2011 figures, which remap the 2011 data to current (2022) municipal boundaries. Do not construct this independently.  
- P5 requires linking census population counts to MDB municipal area shapefiles. Adrian Frith's GitHub repo provides this derived field for local municipalities.  
- Employment and income are **excluded** from Census 2022 by Stats SA and must not appear in this specification.

---

### 1.2 Age

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| A1 | Proportion aged 0–14 (youth) | Percentage of population in the 0–14 age group | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| A2 | Proportion aged 15–34 (youth-of-working-age) | Percentage of population aged 15–34 | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| A3 | Proportion aged 35–64 (working-age adult) | Percentage of population aged 35–64 | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| A4 | Proportion aged 65+ (elderly) | Percentage of population in the 65+ age group | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| A5 | Median age | The median age of the total population | Years | — | PAG | — | ✅ | ✅ | ✅ | ★ |
| A6 | Age dependency ratio | Ratio of persons aged 0–14 and 65+ to persons aged 15–64, expressed per 100 working-age adults | Ratio per 100 | — | PAG | — | ✅ | ✅ | ✅ | ★ |
| A7 | Youth dependency ratio | Ratio of persons aged 0–14 to persons aged 15–64, per 100 | Ratio per 100 | — | PAG | — | ✅ | ✅ | ✅ | — |
| A8 | Old-age dependency ratio | Ratio of persons aged 65+ to persons aged 15–64, per 100 | Ratio per 100 | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- The Municipal Fact Sheet provides headline dependency ratios and age-group proportions. Provinces at a Glance provides more granular age-group breakdowns.  
- Single-year age distributions are available in the SuperCROSS system and the DataFirst 10% sample; they are not required for the SA Data Hub indicator set.  
- Stats SA flagged anomalous dips in the 5–9 and 15–19 age groups in Census 2022. A data quality caveat should accompany these indicators.

---

### 1.3 Sex

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| S1 | Male population | Total male persons enumerated | Count | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| S2 | Female population | Total female persons enumerated | Count | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| S3 | Sex ratio | Number of males per 100 females | Ratio per 100 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| S4 | Female-headed households | Percentage of households headed by a female | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| S5 | Female share of total population | Female persons as a percentage of total population | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

**Source notes:**  
- Male and female raw counts (S1, S2) are context data useful for a municipal fact card but do not independently meet the threshold for a named SA Data Hub `Statistic`. The sex ratio (S3) and female household headship (S4) are the analytically significant derived indicators.

---

### 1.4 Race (Population Group)

Stats SA uses the term "population group" for the four categories established under the Statistics Act. These categories are retained in Census 2022 for continuity.

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| R1 | Black African share | Percentage of total population identifying as Black African | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| R2 | Coloured share | Percentage of total population identifying as Coloured | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| R3 | Indian/Asian share | Percentage of total population identifying as Indian or Asian | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| R4 | White share | Percentage of total population identifying as White | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| R5 | Other/unspecified | Percentage not classified in the four main groups or unspecified | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- Stats SA noted particular enumeration difficulties with White and Coloured residents in the Western Cape due to gated communities and refusals. Municipal-level figures for those groups in the Western Cape carry higher uncertainty than the national figures.  
- The four population group percentages are published per local municipality in the Municipal Fact Sheet. Absolute counts per group are in the 10% microdata sample.

---

### 1.5 Language

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| L1 | Most widely spoken home language | The language most frequently spoken at home in the municipality (label, not a proportion) | Categorical | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| L2 | isiZulu speakers (share) | Percentage of population whose home language is isiZulu | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L3 | isiXhosa speakers (share) | Percentage whose home language is isiXhosa | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L4 | Afrikaans speakers (share) | Percentage whose home language is Afrikaans | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L5 | Sepedi speakers (share) | Percentage whose home language is Sepedi | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L6 | English speakers (share) | Percentage whose home language is English | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L7 | Setswana speakers (share) | Percentage whose home language is Setswana | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L8 | Sesotho speakers (share) | Percentage whose home language is Sesotho | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L9 | Xitsonga speakers (share) | Percentage whose home language is Xitsonga | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L10 | siSwati speakers (share) | Percentage whose home language is siSwati | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L11 | Tshivenḓa speakers (share) | Percentage whose home language is Tshivenḓa | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L12 | isiNdebele speakers (share) | Percentage whose home language is isiNdebele | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L13 | South African Sign Language (share) | Percentage whose home language is SASL (added as 12th official language in 2022) | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |
| L14 | Other language (share) | Percentage whose home language is not one of the 12 official languages | % | ✅ | ✅ | AFR | ✅ | ✅ | ✅ | — |

**Source notes:**  
- All 12 official language proportions (L2–L13) are available per local municipality in the Provinces at a Glance publication and the afrith/census-2022-muni-stats CSV.  
- L1 (the dominant language label) is the recommended first-class indicator. The per-language proportions (L2–L14) are best stored as a structured sub-array within the municipality record rather than as 14 separate top-level statistics.

---

### 1.6 Education

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| E1 | No schooling (share) | Percentage of persons aged 20+ with no schooling | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| E2 | Matric completion rate | Percentage of persons aged 20+ who completed Grade 12 (matric) or higher | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| E3 | Higher education rate | Percentage of persons aged 20+ with a tertiary qualification | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| E4 | School attendance rate | Percentage of persons aged 7–15 currently attending an educational institution | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| E5 | ECD attendance rate | Percentage of children aged 0–4 attending an early childhood development (ECD) programme | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| E6 | Some primary (share) | Percentage of persons aged 20+ with incomplete primary schooling | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| E7 | Primary complete (share) | Percentage of persons aged 20+ who completed primary school but not secondary | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| E8 | Some secondary (share) | Percentage of persons aged 20+ with incomplete secondary schooling | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- E1–E5 are directly available from the Municipal Fact Sheet and the afrith CSV. These represent the most policy-relevant education indicators for local-level analysis.  
- E6–E8 (granular education progression) are available from Provinces at a Glance and SuperWEB2 but are best treated as context data within the municipality JSON record rather than standalone statistics.

---

### 1.7 Housing

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| H1 | Formal dwelling rate | Percentage of households living in formal dwellings (brick/concrete structure with running water and/or electricity connection) | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| H2 | Informal dwelling rate | Percentage of households in informal dwellings (shacks in informal settlements or in backyards) | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| H3 | Traditional dwelling rate | Percentage of households in traditional (mud/clay/thatch/wattle-and-daub) structures | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| H4 | Owned dwelling rate | Percentage of households occupying an owned (fully paid or being paid off) dwelling | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| H5 | Rented dwelling rate | Percentage of households living in rented accommodation | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| H6 | RDP/government subsidised dwelling | Percentage of households in an RDP or government-subsidised house | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| H7 | Number of rooms per dwelling | Average number of rooms per dwelling used for sleeping | Ratio | — | PAG | — | ✅ | ✅ | ✅ | — |
| H8 | Overcrowded households (share) | Percentage of households with more than 2.5 persons per sleeping room | % | — | PAG | — | ✅ | ✅ | ✅ | ★ |

**Source notes:**  
- H1 is the most widely cited housing quality indicator in South Africa and should be the primary housing statistic for each municipality record.  
- H6 (RDP/subsidised housing) is a policy-specific indicator highly relevant to South African public interest journalism and research.  
- H8 (overcrowding) is derivable from available data but is not always pre-calculated in the Municipal Fact Sheet; it is available from SuperWEB2.

---

### 1.8 Household Services (Sanitation and Refuse)

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| HS1 | Flush/chemical toilet access | Percentage of households with access to a flush toilet or chemical toilet connected to sewerage or septic tank | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| HS2 | Pit latrine (with ventilation) | Percentage of households using a ventilated improved pit (VIP) latrine | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| HS3 | No toilet facility | Percentage of households with no toilet facility of any kind | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| HS4 | Formal refuse removal | Percentage of households receiving refuse removal by local authority at least once a week | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| HS5 | No refuse removal or own dump | Percentage of households that have no refuse removal service and use their own dump | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |

**Source notes:**  
- "Household Services" in SA Data Hub current data (`housing.json`) captures electricity and piped water. This specification extends the concept to sanitation and refuse.  
- HS1 and HS3 together capture the sanitation access spectrum. HS4 and HS5 together capture service delivery failure.  
- Water interruptions lasting more than two days were collected in Census 2022 but formally excluded by Stats SA due to data quality issues. This indicator must not be included.

---

### 1.9 Water

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| W1 | Piped water inside dwelling | Percentage of households with piped water inside the dwelling | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| W2 | Piped water on site (outside dwelling) | Percentage of households with piped water on the property but outside the main dwelling | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| W3 | Piped water from community standpipe | Percentage of households collecting water from a communal tap or standpipe | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| W4 | Access to any piped water | Percentage of households with access to piped water from any source (W1 + W2 + W3 combined) | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| W5 | No piped water access | Percentage of households with no access to piped water, relying on borehole, spring, rain, river, or other unimproved source | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| W6 | Access to water within 200m | Percentage of households where the main water source is within 200 metres of the dwelling | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- W4 and W5 are the headline access measures and directly comparable to the water indicators already present in SA Data Hub's `housing.json`.  
- W1 is the gold-standard measure (water inside dwelling) and is appropriate as an additional first-class stat to distinguish basic access from full in-home connection.  
- **Explicitly excluded:** "Water interruptions lasting more than two days" — formally excluded by Stats SA from Census 2022 publications due to data quality.

---

### 1.10 Electricity

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| EL1 | Electricity for lighting | Percentage of households using electricity as the main energy source for lighting | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| EL2 | Electricity for cooking | Percentage of households using electricity as the main energy source for cooking | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| EL3 | Electricity for heating | Percentage of households using electricity as the main energy source for heating | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| EL4 | Solar/renewable energy use | Percentage of households using solar energy (for any purpose) | % | — | PAG | — | ✅ | ✅ | ✅ | ★ |
| EL5 | No electricity access | Percentage of households with no electricity connection at all | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| EL6 | Gas energy use | Percentage of households using gas as the main energy source for cooking | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| EL7 | Paraffin/candles for lighting | Percentage of households using paraffin or candles as the main lighting source | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- EL1 (electricity for lighting) is the standard access measure and directly comparable to the existing `housing-electricity` statistic in SA Data Hub.  
- EL4 (solar) is a new Census 2022 finding of public interest: load shedding-driven solar adoption has increased materially since 2011.  
- EL2 (cooking) captures energy poverty more accurately than lighting alone, since some households have a lighting connection but still cook with wood or paraffin.

---

### 1.11 Internet Access

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| I1 | Households with internet access | Percentage of households with access to the internet by any means (cellphone, laptop, computer, tablet, or other device) | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| I2 | Cellphone internet access | Percentage of households accessing the internet primarily via cellphone | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| I3 | Computer/tablet internet access | Percentage of households accessing the internet via a computer or tablet | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| I4 | No internet access | Percentage of households with no internet access of any kind | % | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ★ |
| I5 | Internet at work or school only | Percentage of households whose only internet access is at work or school (not at home) | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- I1 is directly comparable to `census-internet-access` already in SA Data Hub. The municipality-level version of this indicator extends national coverage.  
- I2 is the most important contextual indicator because it distinguishes mobile internet (data-dependent, intermittent) from fixed broadband. South Africa is predominantly mobile-first.  
- Census 2022 reported 64% national household internet access — the municipality-level breakdown reveals extreme urban/rural variation.

---

### 1.12 Disability

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| D1 | Disability prevalence | Percentage of persons with any disability (any difficulty with seeing, hearing, communicating, walking/climbing steps, self-care, or remembering/concentrating), as measured by the Washington Group Short Set | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| D2 | Severe disability prevalence | Percentage of persons with severe or extreme difficulty in any of the six Washington Group functioning domains | % | — | PAG | — | ✅ | ✅ | ✅ | ★ |
| D3 | Seeing difficulty | Percentage of persons with difficulty seeing, even with glasses | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| D4 | Hearing difficulty | Percentage of persons with difficulty hearing, even with a hearing aid | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| D5 | Walking/climbing difficulty | Percentage of persons with difficulty walking or climbing steps | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| D6 | Remembering/concentrating difficulty | Percentage of persons with difficulty remembering or concentrating | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| D7 | Communicating difficulty | Percentage of persons with difficulty communicating | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| D8 | Self-care difficulty | Percentage of persons with difficulty with self-care (washing, dressing) | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Methodology note (mandatory caveat):**  
Census 2022 (and Census 2011) measure disability using the Washington Group Short Set on Functioning. This approach is not comparable to the traditional disability question used in Census 1996 and 2001. **Disability data from 2011 and 2022 are mutually comparable; neither is comparable to 1996 or 2001.** This caveat must appear in the SA Data Hub `_meta.notes` field and on any disability data card.

---

### 1.13 Migration

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| MG1 | Born in this province | Percentage of residents born in the same province as their current residence | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| MG2 | Born in another South African province | Percentage of residents born in a different South African province | % | — | PAG | — | ✅ | ✅ | ✅ | — |
| MG3 | Born outside South Africa | Percentage of residents born outside South Africa | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| MG4 | Recently moved (within 5 years) | Percentage of residents who did not live at their current address five years ago | % | — | PAG | — | ✅ | ✅ | ✅ | ★ |
| MG5 | Recent inter-provincial movers | Among those who moved in the past 5 years, percentage who came from a different province | % | — | PAG | — | ✅ | ✅ | ✅ | — |

**Source notes:**  
- The full migration dataset was published as Stats SA Report 03-04-04 in 2025 and is separate from the main Census 2022 release.  
- MG3 (foreign-born share) is the most directly policy-relevant indicator and is available at local municipality level in the Municipal Fact Sheet.  
- MG4 is a measure of residential mobility and is relevant for understanding in-migration to growing metros and out-migration from declining rural municipalities.

---

### 1.14 Food Security

| # | Indicator Name | Definition | Unit | MFS | PAG | AFR | Muni | District | Province | First-class stat? |
|---|----------------|-----------|------|-----|-----|-----|------|----------|----------|-------------------|
| FS1 | Households experiencing hunger | Percentage of households where any member went without food in the past 12 months | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| FS2 | Child hunger | Percentage of households where any child went to bed hungry in the past 12 months | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | ★ |
| FS3 | Adult hunger | Percentage of households where an adult went to bed hungry in the past 12 months | % | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| FS4 | Food insecure households | Percentage of households reporting inadequate or uncertain access to food (broader definition than hunger alone) | % | — | PAG | — | ✅ | ✅ | ✅ | ★ |

**Source notes:**  
- Food security is **new in Census 2022** and has no comparable 2011 data. It should be clearly labelled as a single-point 2022 measure with no trend comparison available.  
- FS1 and FS2 are directly from the Municipal Fact Sheet. FS4 is derived from the broader food security module in the household questionnaire.  
- These indicators are among the highest public-interest indicators in the dataset, directly relevant to social grant policy, hunger reporting, and inequality research.

---

## 2. Theme Structure

### 2.1 Summary Table: Indicators by Theme

| Theme | Total Indicators | First-class Stats (★) | Supporting Data | Census 2022 Only | Cross-year (2011+2022) |
|-------|-----------------|----------------------|-----------------|-----------------|----------------------|
| Population | 7 | 5 | 2 | 2 | 5 |
| Age | 8 | 6 | 2 | 0 | 8 |
| Sex | 5 | 2 | 3 | 0 | 5 |
| Race | 5 | 4 | 1 | 0 | 5 |
| Language | 14 | 1 | 13 | 0 | 14 |
| Education | 8 | 5 | 3 | 1 (ECD) | 7 |
| Housing | 8 | 5 | 3 | 1 | 7 |
| Household Services | 5 | 4 | 1 | 0 | 5 |
| Water | 6 | 3 | 3 | 0 | 6 |
| Electricity | 7 | 4 | 3 | 1 (Solar) | 6 |
| Internet | 5 | 3 | 2 | 0 | 2 (2011+2022) |
| Disability | 8 | 2 | 6 | 0 | 2 (2011+2022) |
| Migration | 5 | 2 | 3 | 1 | 4 |
| Food Security | 4 | 3 | 1 | 4 | 0 |
| **TOTAL** | **95** | **49** | **46** | **10** | **76** |

### 2.2 Recommended First-class Statistics (49 indicators)

These 49 indicators (marked ★ throughout Section 1) should become named `Statistic` objects in the SA Data Hub municipality JSON schema. They have:
- High public interest or direct policy relevance
- Coverage for all 257 municipalities
- Clear definition and units from Stats SA official publications
- Direct derivation from the Municipal Fact Sheet, Provinces at a Glance, or the afrith CSV

The remaining 46 supporting indicators should be stored in structured sub-arrays within the municipality record and surfaced in the detail view, but not promoted as top-level searchable statistics.

---

## 3. Geographic Structure

### 3.1 Current South African Municipal Hierarchy

As of Census 2022 (aligned to 2021 local government election boundaries):

| Level | Count | Description |
|-------|-------|-------------|
| National | 1 | Republic of South Africa |
| Province | 9 | All provinces; stable since 1994 (minor 2018 Gauteng/North West adjustment) |
| Metropolitan Municipality (Metro) | 8 | Category A: Buffalo City, City of Cape Town, Ekurhuleni, Ethekwini, City of Johannesburg, Mangaung, City of Tshwane, Nelson Mandela Bay |
| District Municipality | 44 | Category C: cover the non-metro remainder of each province |
| Local Municipality | 205 | Category B: exist within district municipalities |
| **Total municipal entities** | **257** | 8 metros + 44 DMs + 205 LMs |

**Note:** Metropolitan municipalities function as both local and district entities (they have no parent district municipality). For SA Data Hub purposes, metros should appear in both the "metro" list and alongside district-level entities for provincial aggregations.

### 3.2 Municipality Codes

Every municipality has a Stats SA municipality code in the format:
- Metro: `CPT` (Cape Town), `ETH` (eThekwini), `JHB` (Johannesburg), `TSH` (Tshwane), `EKU` (Ekurhuleni), `BUF` (Buffalo City), `NMA` (Nelson Mandela Bay), `MAN` (Mangaung)
- District: `DC1`–`DC52` (not all numbers used)
- Local: Three-letter province prefix + 3-digit number, e.g. `WC011` (Matzikama, Western Cape)

The afrith/census-2022-muni-stats repository uses these Stats SA codes as the primary key in its CSV files. The SA Data Hub municipality JSON should adopt the same codes as `muniCode` for interoperability.

### 3.3 Province Groupings

| Province | Code | Metros | District Municipalities | Local Municipalities |
|----------|------|--------|------------------------|---------------------|
| Eastern Cape | EC | Buffalo City, Nelson Mandela Bay | 6 | 30 |
| Free State | FS | Mangaung | 4 | 19 |
| Gauteng | GP | City of Johannesburg, Ekurhuleni, City of Tshwane | 2 | 9 |
| KwaZulu-Natal | KZN | eThekwini | 10 | 44 |
| Limpopo | LP | — | 5 | 25 |
| Mpumalanga | MP | — | 3 | 17 |
| North West | NW | — | 4 | 19 |
| Northern Cape | NC | — | 5 | 26 |
| Western Cape | WC | City of Cape Town | 4 | 24 |

**Mpumalanga note:** Thaba Chweu (MP325) and City of Mbombela (MP322) figures were subject to a Stats SA erratum. Any municipality data ingestion must use the revised figures from the corrected Municipal Fact Sheet (August 2025 revision).

### 3.4 Boundary Alignment for Cross-Census Comparison

Stats SA has already aligned Census 2011 indicators to 2022 municipal boundaries within the Municipal Fact Sheet. This means:
- **SA Data Hub can present 2011-vs-2022 comparisons at municipal level using official Stats SA aligned figures directly, without independent boundary reconciliation.**
- For Census 2001, alignment to current boundaries does not exist in official publications. Province-level 2001 comparisons are safe; local municipality 2001 comparisons require a custom reconciliation not recommended for V5.
- Census 1996 comparisons at sub-provincial level are not feasible.

---

## 4. JSON Schema Proposal

### 4.1 Design Principles

The schema should:
1. Extend the existing SA Data Hub `Statistic` and `DataSource` types without breaking the current architecture
2. Introduce a new `Municipality` type parallel to the existing `Province` type
3. Store first-class indicators (★) as named fields for direct access
4. Store supporting indicators in typed sub-arrays to avoid a flat record with 95+ top-level fields
5. Use Stats SA municipality codes as primary keys for interoperability with the afrith dataset and DataFirst files
6. Carry data quality caveats at both the record and field level

### 4.2 Top-Level Schema: `municipalities.json`

```
{
  "_meta": {
    "source": "Statistics South Africa",
    "primary_publication": "Census 2022 Municipal Fact Sheet",
    "secondary_publications": [
      "Census 2022 Provinces at a Glance",
      "afrith/census-2022-muni-stats (GitHub)"
    ],
    "census_year": 2022,
    "boundary_reference": "2021 local government election boundaries",
    "boundary_note": "2011 figures are boundary-aligned to 2022 boundaries per Stats SA official publications",
    "quality_caveat": "Census 2022 Post-Enumeration Survey estimated ~30% undercount. Use with awareness of this limitation.",
    "excluded_themes": ["employment", "income", "fertility", "mortality", "water_interruptions"],
    "excluded_themes_reason": "Formally excluded by the Statistician-General (August 2024) due to reporting and coverage biases.",
    "last_verified": "YYYY-MM-DD",
    "source_url": "https://census.statssa.gov.za",
    "update_frequency": "Decennial (next census ~2032)",
    "erratum": "Thaba Chweu (MP325) and City of Mbombela (MP322) figures corrected in August 2025 revision"
  },
  "municipalities": [ <MunicipalityRecord>, ... ]
}
```

### 4.3 MunicipalityRecord Type

```
MunicipalityRecord {
  // Identity
  id: string                  // Stats SA municipality code e.g. "CPT", "WC011", "DC1"
  name: string                // Official municipal name e.g. "City of Cape Town"
  category: "A" | "B" | "C"  // Category A = metro, B = local, C = district
  province: string            // Province code e.g. "WC"
  provinceName: string        // e.g. "Western Cape"
  districtCode: string | null // Parent district code; null for metros
  districtName: string | null // Parent district name; null for metros
  isMerto: boolean

  // Population (first-class)
  population: number          // P1: Total population 2022
  population2011: number      // P1 aligned to 2022 boundaries
  populationChange: number    // P4: % change 2011-2022
  households: number          // P2: Total households
  avgHouseholdSize: number    // P3: Average household size
  populationDensity: number   // P5: Persons per km²

  // Age (first-class)
  pctAge0to14: number         // A1
  pctAge15to34: number        // A2
  pctAge65plus: number        // A4
  medianAge: number           // A5
  dependencyRatio: number     // A6

  // Sex (first-class)
  sexRatio: number            // S3: Males per 100 females
  pctFemaleHeadedHouseholds: number  // S4

  // Race (first-class)
  pctBlackAfrican: number     // R1
  pctColoured: number         // R2
  pctIndianAsian: number      // R3
  pctWhite: number            // R4

  // Language (first-class)
  dominantLanguage: string    // L1: Most spoken home language label
  languages: LanguageBreakdown[]  // L2-L14: array of {language, pct}

  // Education (first-class)
  pctNoSchooling: number      // E1
  pctMatricOrHigher: number   // E2
  pctHigherEducation: number  // E3
  pctSchoolAttendance: number // E4
  pctECDAttendance: number    // E5

  // Housing (first-class)
  pctFormalDwelling: number   // H1
  pctInformalDwelling: number // H2
  pctOwnedDwelling: number    // H4
  pctRDPDwelling: number      // H6
  pctOvercrowded: number      // H8

  // Household Services (first-class)
  pctFlushToilet: number      // HS1
  pctNoToilet: number         // HS3
  pctFormalRefuseRemoval: number  // HS4
  pctNoRefuseRemoval: number  // HS5

  // Water (first-class)
  pctPipedWaterInside: number    // W1
  pctAnyPipedWater: number       // W4
  pctNoPipedWater: number        // W5

  // Electricity (first-class)
  pctElectricityLighting: number // EL1
  pctElectricityCooking: number  // EL2
  pctSolarEnergy: number         // EL4
  pctNoElectricity: number       // EL5

  // Internet (first-class)
  pctInternetAccess: number      // I1
  pctCellphoneInternet: number   // I2
  pctNoInternet: number          // I4

  // Disability (first-class)
  pctAnyDisability: number       // D1
  pctSevereDisability: number    // D2

  // Migration (first-class)
  pctForeignBorn: number         // MG3
  pctRecentlyMoved: number       // MG4

  // Food Security (first-class — Census 2022 only, no 2011 comparison)
  pctHouseholdsHunger: number    // FS1
  pctChildHunger: number         // FS2
  pctFoodInsecure: number        // FS4

  // Supporting data (non-first-class, stored in sub-arrays)
  ageDetail: AgeDetailRecord
  housingDetail: HousingDetailRecord
  waterDetail: WaterDetailRecord
  electricityDetail: ElectricityDetailRecord
  disabilityDetail: DisabilityDetailRecord
  migrationDetail: MigrationDetailRecord

  // Sources and metadata
  sources: MunicipalitySource[]
  caveats: string[]
  lastUpdated: string            // ISO date of the source publication used
  boundaryYear: number           // 2022 (boundary reference year)
  erratumApplied: boolean        // true for MP325 and MP322
}
```

### 4.4 Supporting Sub-Types

```
LanguageBreakdown {
  language: string     // e.g. "isiZulu"
  isoCode: string      // BCP-47 language tag e.g. "zu"
  pct: number          // percentage share
}

AgeDetailRecord {
  pctAge35to64: number   // A3
  youthDependencyRatio: number  // A7
  oldAgeDependencyRatio: number // A8
}

HousingDetailRecord {
  pctTraditionalDwelling: number  // H3
  pctRented: number               // H5
  avgRoomsPerDwelling: number     // H7
}

WaterDetailRecord {
  pctPipedOnSite: number         // W2
  pctCommunalStandpipe: number   // W3
  pctWaterWithin200m: number     // W6
}

ElectricityDetailRecord {
  pctElectricityHeating: number  // EL3
  pctGasCooking: number          // EL6
  pctParaffinCandlesLighting: number  // EL7
}

DisabilityDetailRecord {
  pctSeeingDifficulty: number          // D3
  pctHearingDifficulty: number         // D4
  pctWalkingDifficulty: number         // D5
  pctRememberingDifficulty: number     // D6
  pctCommunicatingDifficulty: number   // D7
  pctSelfCareDifficulty: number        // D8
}

MigrationDetailRecord {
  pctBornThisProvince: number          // MG1
  pctBornOtherProvince: number         // MG2
  pctRecentInterProvincialMovers: number // MG5
}

MunicipalitySource {
  publication: string
  url: string
  date: string
  indicator_scope: string[]  // which indicators this source covers
}
```

### 4.5 Registry Entry for Municipality Dataset

The SA Data Hub `datasetRegistry` should have a new entry:

```
{
  id: "municipalities",
  label: "Municipalities",
  description: "Census 2022 demographic, housing, services, and socioeconomic indicators for all 257 South African municipalities",
  categoryId: "census",
  sourceName: "Statistics South Africa",
  sourceShortName: "Stats SA",
  sourceUrl: "https://census.statssa.gov.za",
  publicationName: "Census 2022 Municipal Fact Sheet",
  updateFrequency: "Decennial",
  automationLevel: "static",
  geographicLevel: "municipality",
  dataFormat: "JSON",
  seriesStart: "2022",
  notes: "Employment and income excluded by Stats SA due to data quality. Census 2022 estimated ~30% undercount (Post-Enumeration Survey). 2011 comparison figures use Stats SA boundary-aligned values."
}
```

---

## 5. Dataset Size Estimate

### 5.1 Record Count

| Entity Type | Count | Notes |
|-------------|-------|-------|
| Metropolitan municipalities | 8 | |
| District municipalities | 44 | |
| Local municipalities | 205 | |
| **Total municipality records** | **257** | |

### 5.2 Fields Per Record

| Field Category | First-class fields | Supporting sub-array fields | Total fields |
|----------------|-------------------|-----------------------------|-------------|
| Identity | 10 | — | 10 |
| Population | 6 | — | 6 |
| Age | 5 | 3 | 8 |
| Sex | 2 | 3 | 5 |
| Race | 4 | 1 | 5 |
| Language | 2 (+ array of 14) | — | 16 |
| Education | 5 | 3 | 8 |
| Housing | 5 | 3 | 8 |
| Household Services | 4 | 1 | 5 |
| Water | 3 | 3 | 6 |
| Electricity | 4 | 3 | 7 |
| Internet | 3 | 2 | 5 |
| Disability | 2 | 6 | 8 |
| Migration | 2 | 3 | 5 |
| Food Security | 3 | 1 | 4 |
| Metadata | 6 | — | 6 |
| **TOTAL** | **~70** | **~32 + 14 language entries** | **~116 per record** |

### 5.3 JSON File Size Estimate

| Component | Estimate | Basis |
|-----------|----------|-------|
| Average characters per municipality record | ~4,000–5,500 | 116 fields × avg ~35 chars per field including key names |
| Total for 257 records (uncompressed) | ~1.0–1.4 MB | 257 × 4,750 chars average |
| `_meta` block and wrapper | ~2–3 KB | |
| **Total `municipalities.json` (uncompressed)** | **~1.0–1.4 MB** | |
| **Compressed (gzip, typical 70–80% compression)** | **~200–420 KB** | |

**For comparison:** The current SA Data Hub has ~63 KB of JSON across all 12 dataset files. The municipality file would be approximately 15–22× larger than the entire current dataset. It remains well within browser memory limits and Next.js static file handling capacity.

### 5.4 District-Level Sub-File Option

If the full `municipalities.json` is considered too large for a single static import, the data can be split:

| File | Records | Estimated size (uncompressed) |
|------|---------|-------------------------------|
| `municipalities-metros.json` | 8 | ~45 KB |
| `municipalities-wc.json` | 24 LMs + 4 DMs + 1 metro | ~162 KB |
| `municipalities-gp.json` | 9 LMs + 2 DMs + 3 metros | ~77 KB |
| *(one file per province)* | 9 files | ~115–200 KB each |
| `municipalities-districts.json` | 52 district entities | ~286 KB |

**Recommendation:** A single `municipalities.json` at ~1.2 MB uncompressed is the simplest architecture. Next.js compresses static JSON at build time; the network transfer will be under 350 KB. Split by province only if page-level code splitting is required for performance.

---

## 6. Recommended V5 Municipality Scope

### 6.1 Phased Implementation Recommendation

The 95 identified indicators represent the full available Census 2022 municipality dataset. A phased approach is recommended to manage quality assurance and review effort.

#### Phase V5.1 — Core Demographic and Services Indicators (Launch Scope)
**Target: 30 first-class statistics per municipality**

Recommended to include:
- **Population:** P1, P2, P3, P4, P5
- **Age:** A1, A4, A5, A6
- **Sex:** S3, S4
- **Race:** R1, R2, R3, R4
- **Education:** E1, E2, E4
- **Housing:** H1, H2
- **Water:** W1, W4
- **Electricity:** EL1, EL5
- **Internet:** I1, I4
- **Food Security:** FS1, FS2

This core set covers the most-requested indicators for local government, journalism, and public interest research. It is directly derivable from the afrith/census-2022-muni-stats CSV (machine-readable, no PDF extraction required) and the Municipal Fact Sheet.

#### Phase V5.2 — Extended Services and Social Indicators
**Target: Additional 19 first-class statistics per municipality**

- **Age:** A2 (youth share)
- **Language:** L1 (dominant language)
- **Education:** E3, E5
- **Housing:** H4, H6, H8
- **Household Services:** HS1, HS3, HS4, HS5
- **Electricity:** EL2, EL4
- **Internet:** I2
- **Disability:** D1, D2
- **Migration:** MG3, MG4
- **Food Security:** FS4

These require sourcing from the Provinces at a Glance publication and SuperWEB2 in addition to the afrith CSV.

#### Phase V5.3 — Supporting Sub-Arrays and Historical Context
**Target: All 95 indicators, full sub-array detail, 2011 comparison series**

- All supporting detail sub-arrays (AgeDetail, HousingDetail, WaterDetail, etc.)
- Full language breakdown arrays (L2–L14 for all municipalities)
- 2011 boundary-aligned comparison values for applicable indicators
- Disability domain sub-arrays (D3–D8)

### 6.2 Geographic Scope for V5

| Geography | V5 Recommendation | Rationale |
|-----------|------------------|-----------|
| All 257 municipalities | ✅ Include all | Municipal Fact Sheet covers all; no data gap |
| District-level rollups | ✅ Include 52 district entities | Special District Layer Product available (DataFirst 1131) |
| Province-level aggregates | ✅ Extend existing `provinces.json` | Currently partial; fill with full Census 2022 indicators |
| Ward level | ❌ Defer to V6 | Data still being released; 4,468 wards × 95 indicators = very large; some wards suppressed |
| Main Place / Sub-Place | ❌ Defer | Requires SuperWEB2 integration |

### 6.3 Integration with Existing SA Data Hub Architecture

The following existing statistics contain Census 2022 data and should be updated or replaced once the municipality dataset is live:

| Existing stat | Location | Relationship to municipality dataset |
|---------------|----------|--------------------------------------|
| `census-households` | `census.json` | National aggregate of P2; municipality dataset extends this to all 257 municipalities |
| `census-internet-access` | `census.json` | National aggregate of I1; municipality dataset extends to all 257 municipalities |
| `housing-electricity` | `housing.json` | National aggregate of EL1; municipality dataset extends to all 257 municipalities |
| `housing-water` | `housing.json` | National aggregate of W4; municipality dataset extends to all 257 municipalities |
| `housing-formal` | `housing.json` | National aggregate of H1; municipality dataset extends to all 257 municipalities |
| `population-urban` | `population.json` | Related to P6; municipality dataset provides the municipality-level breakdown |
| `education-literacy` | `education.json` | Related to E2 (matric); municipality dataset provides the full municipal breakdown |

**Recommendation:** Do not remove or modify the existing national-level statistics. They serve the time-series comparisons across 2001–2011–2022 already built into SA Data Hub. The municipality dataset is additive, not a replacement.

### 6.4 Data Quality Annotations Required

The following mandatory caveats must appear in `_meta.notes`, the Download Center card, and any relevant data display:

1. **Undercount caveat:** "Census 2022 has an estimated ~30% undercount as measured by the Post-Enumeration Survey. Statistics South Africa considers the data fit for general use but notes limitations for precision planning. Academic researchers have raised concerns about specific metropolitan and provincial counts."

2. **Excluded themes:** "Employment, income, fertility, mortality, and water interruptions were excluded from the Census 2022 release by the Statistician-General due to data quality concerns. For employment data, use the Stats SA Quarterly Labour Force Survey."

3. **Boundary alignment:** "2011 comparison figures use Stats SA's official boundary-aligned values, which remap 2011 enumerations to 2022 municipal boundaries. Direct comparison is valid for indicators where Stats SA has published aligned figures."

4. **Disability comparability:** "Disability data is measured using the Washington Group Short Set on Functioning. Census 2022 and 2011 disability figures are mutually comparable, but neither is directly comparable to Census 1996 or 2001 which used a different question."

5. **Mpumalanga erratum:** "Thaba Chweu (MP325) and City of Mbombela (MP322) figures were corrected in the August 2025 revision of the Municipal Fact Sheet following an enumeration area allocation error."

6. **Food security baseline:** "Food security indicators are new in Census 2022 and have no 2011 comparison. They represent a single point-in-time measurement."

### 6.5 Recommended Primary Sources for Data Ingestion

In order of preference:

| Source | Use for | Access |
|--------|---------|--------|
| afrith/census-2022-muni-stats (GitHub CSV) | Phase V5.1 core indicators; machine-readable, pre-extracted | Free; no registration |
| Census 2022 Municipal Fact Sheet (PDF) | Authoritative verification of all municipal indicators | Free; census.statssa.gov.za |
| Census 2022 Provinces at a Glance (PDF) | Extended indicators not in afrith CSV | Free; census.statssa.gov.za |
| Stats SA SuperWEB2 | Custom cross-tabs; district-level aggregates; ward data (future) | Free with registration |
| DataFirst Catalog 1131 | District-level special profiles + spatial boundaries | Free with registration |
| DataFirst Catalog 982 (10% microdata) | Research-grade validation only; not for direct ingestion | Free with registration |

---

*This specification is research-only. No code has been written, no data has been downloaded, no SA Data Hub files have been modified, and no implementation has been planned or begun. All indicator definitions, availability codes, and size estimates are based on publicly available Stats SA publications and the Census Research Report prepared for SA Data Hub V5 Planning.*

*Sources: Stats SA Census 2022 Municipal Fact Sheet (revised August 2025) · Census 2022 Provinces at a Glance · afrith/census-2022-muni-stats (GitHub) · DataFirst Catalog 982 and 1131 · SA Data Hub V5 Census Research Report (June 2026)*
