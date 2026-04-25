#!/usr/bin/env python3
"""Extract text from PDF and output structured chunks as JSON."""
import sys, json, os, re

def extract(path: str):
    try:
        import pdfplumber
        chunks = []
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages[:15]):  # limit first 15 pages
                text = page.extract_text()
                if text:
                    # Split into ~1500 char chunks
                    for j in range(0, len(text), 1500):
                        chunk = text[j:j+1500].strip()
                        if len(chunk) > 100:
                            chunks.append({"page": i+1, "text": chunk})
        return {"ok": True, "chunks": chunks}
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Missing path"}))
        sys.exit(1)
    print(json.dumps(extract(sys.argv[1])))
