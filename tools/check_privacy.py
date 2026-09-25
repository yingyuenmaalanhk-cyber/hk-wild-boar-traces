#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Public privacy audit — run before every release.

Scans every file that would be committed/published for patterns that must not
appear in a public project: personal identifiers, e-mails, local machine
paths, school identifiers, hardcoded credentials, and leftover placeholders.

Usage (from the repository root):

    python tools/check_privacy.py

Exit code: 0 = clean (warnings allowed), 1 = blocking findings found.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Files/directories that are not published, or are third-party code outside
# the privacy scope of this project.
SKIP_DIRS = {".git", ".github", "__pycache__", "node_modules", "raw", "vendor"}
# Datasets contain dense coordinates that trip phone-number heuristics.
DATA_FILES = {"sightings.geojson", "statistics.json", "meta.json", "districts.json"}

# Built by concatenation so this file does not literally contain the strings
# it searches for (which would make the audit flag its own source).
SCHOOL_ID = "pol" + "yu"
# The official competition name is published intentionally (user request);
# any OTHER mention of the school identifier remains a blocking finding.
OFFICIAL_COMPETITION = (
    "Poly" + "U FCE Build a Smart City Competition " + "2026"
)
URL_PLACEHOLDER = "YOUR-GITHUB" + "-USERNAME"

SCHOOL_PATTERN = re.compile(SCHOOL_ID, re.IGNORECASE)

# (pattern, severity, human description)
RULES = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "FAIL", "e-mail address"),
    (re.compile(r"[CDE]:[\\/][Uu]sers[\\/][^\\/\s\"']+"), "FAIL", "Windows user profile path"),
    (re.compile(r"/home/[A-Za-z0-9._-]+"), "FAIL", "Linux home path"),
    (re.compile(r"/Users/[A-Za-z0-9._-]+"), "FAIL", "macOS user path"),
    (SCHOOL_PATTERN, "FAIL", "school/affiliation identifier"),
    (re.compile(r"password\s*[:=]\s*['\"][^'\"]{3,}", re.IGNORECASE), "FAIL", "hardcoded password"),
    (re.compile(r"(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}", re.IGNORECASE), "FAIL", "hardcoded API key / token"),
    (re.compile(r"\b\d{1,2}[A-Da-d]\(\d{1,3}\)\b"), "WARN", "student-class-number-like pattern (e.g. 5D(28))"),
    (re.compile(r"\b[4-9]\d{3}[\s-]\d{4}\b"), "WARN", "possible Hong Kong phone number"),
    (re.compile(URL_PLACEHOLDER), "WARN", "deployment placeholder still present (replace before/after publishing)"),
]

CODE_EXTS = {".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".xml", ".yml", ".yaml", ".py", ".sql", ".bat", ".sh"}
TEXT_EXTS = CODE_EXTS | {".svg", ".csv"}


def scan() -> int:
    findings: list[tuple[str, int, str, str, str]] = []
    scanned = 0
    for path in sorted(REPO_ROOT.rglob("*")):
        if not path.is_file():
            continue
        rel_parts = set(path.relative_to(REPO_ROOT).parts)
        if rel_parts & SKIP_DIRS:
            continue
        if path.name in DATA_FILES:
            # Datasets: only scan for the hard identity rules, not phone heuristics.
            rules = [r for r in RULES if r[1] == "FAIL"]
        elif path.suffix.lower() in TEXT_EXTS:
            rules = RULES
        else:
            continue  # binary assets (images, fonts) are not text-scanned
        scanned += 1
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            # Whitelist the official competition name before school-ID checks.
            cleaned = re.sub(OFFICIAL_COMPETITION, "", line, flags=re.IGNORECASE)
            for pattern, severity, label in rules:
                haystack = cleaned if pattern is SCHOOL_PATTERN else line
                match = pattern.search(haystack)
                if match:
                    findings.append(
                        (str(path.relative_to(REPO_ROOT)), lineno, severity, label, match.group(0)[:60])
                    )

    # Environment files must not exist at all.
    for name in (".env", ".env.local", ".env.production"):
        if (REPO_ROOT / name).exists():
            findings.append((name, 0, "FAIL", "environment file with potential secrets present", name))

    blocking = [f for f in findings if f[2] == "FAIL"]
    warnings = [f for f in findings if f[2] == "WARN"]

    print(f"Scanned {scanned} text files.")
    for file, lineno, severity, label, snippet in findings:
        where = f"{file}:{lineno}" if lineno else file
        print(f"  [{severity}] {where} — {label}: {snippet!r}")
    print(f"Result: {len(blocking)} blocking, {len(warnings)} warnings.")
    if warnings:
        print("Review each warning above; placeholders are expected until deployment.")
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(scan())
