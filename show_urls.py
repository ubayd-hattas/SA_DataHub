from datetime import date

qlfs_base = "https://www.statssa.gov.za/publications/P0211/"
q, yr = 1, 2026
ordinals = {1:"1st", 2:"2nd", 3:"3rd", 4:"4th"}
months = {1:"March", 2:"June", 3:"September", 4:"December"}
ord_suffix = ordinals[q]
month = months[q]

pres_prefix = f"Presentation%20QLFS%20Q{q}%20{yr}"
data_prefix1 = f"Data%20tables%20QLFS%20Q{q}%20{yr}"
data_prefix2 = f"Tables%20QLFS%20Q{q}%20{yr}"
data_prefix3 = f"Statistical%20tables%20Q{q}%20{yr}"
data_prefix4 = f"QLFS%20Q{q}%20{yr}%20Statistical%20tables"
data_prefix5 = f"P0211{ord_suffix}Quarter{yr}"
data_prefix6 = f"P0211%20{ord_suffix}%20Quarter%20{yr}"

qlfs_cands = []
for prefix in [pres_prefix, data_prefix1, data_prefix2, data_prefix3, data_prefix4, data_prefix5, data_prefix6]:
    for ext in (".xlsx", ".xls", ".pdf"):
        qlfs_cands.append(f"{qlfs_base}{prefix}{ext}")

print("QLFS Q1 2026 candidates:")
for c in qlfs_cands:
    print(" ", c)

print()
cpi_base = "https://www.statssa.gov.za/publications/P0141/"
for m in [5, 6]:  # May, June 2026
    month_name = {5:"May", 6:"June"}[m]
    sp = f"Statistical%20release%20P0141%20{month_name}%202026"
    mp = f"CPI%20Media%20Release%20{month_name}%202026"
    dp = f"P0141{month_name}2026"
    print(f"CPI {month_name} 2026 candidates:")
    for prefix in [sp, mp, dp]:
        for ext in (".xlsx", ".xls", ".pdf"):
            print("  ", f"{cpi_base}{prefix}{ext}")

print()
pop_base = "https://www.statssa.gov.za/publications/P0302/"
for py in [2024, 2025]:
    print(f"POP {py} candidates:")
    for prefix in [f"Statistical%20release%20P0302%20{py}", f"MYPE%20Media%20Release%20{py}", f"P0302{py}"]:
        for ext in (".xlsx", ".xls", ".pdf"):
            print("  ", f"{pop_base}{prefix}{ext}")

print()
gdp_base = "https://www.statssa.gov.za/publications/P0441/"
print("GDP Q4 2025 candidates:")
gdp_ord = "4th"
for prefix in [f"P0441{gdp_ord}Quarter2025", f"P0441%20{gdp_ord}%20Quarter%202025"]:
    for ext in (".xlsx", ".xls", ".pdf"):
        print("  ", f"{gdp_base}{prefix}{ext}")
print("GDP Q1 2026 candidates:")
for prefix in [f"P04411stQuarter2026", f"P0441%201st%20Quarter%202026"]:
    for ext in (".xlsx", ".xls", ".pdf"):
        print("  ", f"{gdp_base}{prefix}{ext}")
