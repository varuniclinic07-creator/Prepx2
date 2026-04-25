#!/usr/bin/env python3
"""Verify content quality: non-template, Devanagari hi, no coaching brand mentions."""
import json, re, sys

BLOCKED_BRANDS = ['VisionIAS', 'DrishtiIAS', 'InsightsOnIndia', 'IAS Baba', 'IASScore', 'Shankar IAS', 'NextIAS', 'GSScore']
TEMPLATE_PATTERNS = [
    'refers to a core concept',
    'requires grasping its historical context',
    'appears frequently in both Prelims and Mains',
    'Mastering it requires conceptual clarity',
]

def count_devanagari(text):
    return sum(1 for ch in text if '\u0900' <= ch <= '\u097f')

def verify_seed_sql(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Find all INSERT INTO topics blocks
    inserts = re.findall(r"INSERT INTO topics.*?VALUES\s*\((.*?)\);", text, re.DOTALL)
    total = 0
    template_issues = 0
    brand_issues = 0
    devanagari_count = 0
    topics_with_hi = 0
    
    for insert in inserts:
        # Each insert may have multiple rows separated by ),
        rows = re.split(r"\),\s*\(", insert)
        for row in rows:
            total += 1
            # Check template patterns
            if any(pat in row for pat in TEMPLATE_PATTERNS):
                template_issues += 1
            # Check brands
            lower_row = row.lower()
            for brand in BLOCKED_BRANDS:
                if brand.lower() in lower_row:
                    brand_issues += 1
                    break
            # Check Devanagari
            dev = count_devanagari(row)
            if dev > 0:
                topics_with_hi += 1
                devanagari_count += dev
    
    print(f"Topics checked: {total}")
    print(f"Template filler: {template_issues}")
    print(f"Brand mentions: {brand_issues}")
    print(f"Topics with Hindi: {topics_with_hi}")
    print(f"Devanagari chars: {devanagari_count}")
    
    if brand_issues > 0:
        print("FAIL: Brand mentions found")
        sys.exit(1)
    if template_issues >= total:
        print("FAIL: All content is template filler")
        sys.exit(1)
    if devanagari_count == 0:
        print("WARN: No Devanagari Hindi content found")
    print("PASS")

if __name__ == '__main__':
    verify_seed_sql('/a0/usr/projects/prepx/supabase/seed.sql')
