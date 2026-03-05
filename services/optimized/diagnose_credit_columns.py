#!/usr/bin/env python3
"""
Diagnostic script to check ALL credit-related columns from database
for the current batch to understand why subjects get specific hours.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
import psycopg2.extras

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

BATCH_ID = "abbdd58e-f543-4e82-acbf-e813df03e23c"


def _query(sql, params=None):
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def main():
    print(f"\n{'='*100}")
    print(f"CREDIT COLUMN DIAGNOSTIC FOR BATCH: {BATCH_ID}")
    print(f"{'='*100}\n")

    rows = _query(
        """
        SELECT
            bs.subject_id, bs.assigned_faculty_id, bs.required_hours_per_week,
            row_to_json(s) AS subjects
        FROM batch_subjects bs
        JOIN subjects s ON s.id = bs.subject_id
        WHERE bs.batch_id = %s
        """,
        (BATCH_ID,),
    )
    batch_subjects = []
    for r in rows:
        subj = r.get("subjects")
        if isinstance(subj, str):
            subj = json.loads(subj)
        r["subjects"] = subj
        batch_subjects.append(r)

    
    if not batch_subjects:
        print(f"❌ No subjects found for batch {BATCH_ID}")
        return
    
    print(f"Found {len(batch_subjects)} subjects\n")
    print(f"{'─'*100}\n")
    
    for idx, bs in enumerate(batch_subjects, 1):
        sub = bs.get("subjects", {})
        if not sub:
            continue
            
        name = sub.get("name", "Unknown")
        code = sub.get("code", "N/A")
        
        # Credit calculation columns
        lecture_hrs = sub.get("lecture_hours", 0)
        tutorial_hrs = sub.get("tutorial_hours", 0)
        practical_hrs = sub.get("practical_hours", 0)
        credit_val = sub.get("credit_value", 0)
        credits_pw = sub.get("credits_per_week", 0)
        weekly_hrs = sub.get("weekly_hours", 0)
        
        # Lab detection columns
        requires_lab = sub.get("requires_lab", False)
        subject_type = sub.get("subject_type", "THEORY")
        lab_hrs = sub.get("lab_hours", 0)
        
        # Batch-specific
        required_hrs_pw = bs.get("required_hours_per_week")
        
        # Apply the exact logic from transformer.py
        db_is_lab = bool(
            requires_lab
            or (subject_type and str(subject_type).upper() in ("LAB", "PRACTICAL"))
            or (lab_hrs and lab_hrs > 0)
        )
        
        # Credit resolution priority
        raw_credits = credit_val or credits_pw or 0
        credits = int(float(raw_credits))
        
        # Hours calculation (matches transformer.py lines 202-224)
        if credits > 0:
            if db_is_lab:
                calculated_hours = credits * 2  # Lab: 1 credit = 2 hours
                hour_rule = "Lab (1cr=2hr)"
            else:
                calculated_hours = credits * 1  # Theory: 1 credit = 1 hour
                hour_rule = "Theory (1cr=1hr)"
        else:
            calculated_hours = int(
                required_hrs_pw
                or weekly_hrs
                or 3
            )
            hour_rule = "Fallback"
        
        print(f"[{idx}] {name} ({code})")
        print(f"    NEP Fields:")
        print(f"      lecture_hours     : {lecture_hrs}")
        print(f"      tutorial_hours    : {tutorial_hrs}")
        print(f"      practical_hours   : {practical_hrs}")
        print(f"      credit_value      : {credit_val} (computed: {lecture_hrs} + {tutorial_hrs} + {practical_hrs}/2)")
        print(f"    ")
        print(f"    Other Credit Fields:")
        print(f"      credits_per_week  : {credits_pw}")
        print(f"      weekly_hours      : {weekly_hrs}")
        print(f"    ")
        print(f"    Lab Detection:")
        print(f"      requires_lab      : {requires_lab}")
        print(f"      subject_type      : {subject_type}")
        print(f"      lab_hours         : {lab_hrs}")
        print(f"      → is_lab          : {db_is_lab}")
        print(f"    ")
        print(f"    Batch Override:")
        print(f"      required_hrs/week : {required_hrs_pw}")
        print(f"    ")
        print(f"    ✅ CALCULATED:")
        print(f"      Credits used      : {credits} (from credit_value={credit_val} or credits_per_week={credits_pw})")
        print(f"      Hours/week        : {calculated_hours} ({hour_rule})")
        print(f"      Expected classes  : {calculated_hours}")
        print(f"\n{'─'*100}\n")

if __name__ == "__main__":
    main()
