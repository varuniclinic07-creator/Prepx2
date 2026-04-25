---
sprint: 3
story: "Story 2: Mnemonics for All Polity Chapters"
epic: 16 (Content Writing Specialist Agent)
status: planned → awaiting approval
date: 2026-04-23
depends_on: sprint3-story-polity-completion
---

# 📋 Story 2: Mnemonics for All Chapters

## 🎯 Goal
Generate 1 memorable mnemonic per Polity chapter to help aspirants recall long lists and complex concepts.

## 📦 Scope
- ✅ Generate 1 mnemonic text per topic (10 total)
- ✅ Store mnemonics in topics.content JSONB
- ✅ Admin trigger via /admin/content
- ❌ Animated videos for mnemonics
- ❌ Voice narration

## 📏 Acceptance Criteria
- [ ] 10/10 Polity topics have a mnemonic string in content.mnemonic
- [ ] Mnemonics use UPSC-relevant mnemonics (not generic)
- [ ] Admin can verify via Content Agent panel

## ✅ Definition of Done
- [ ] content-agent.ts supports mnemonic generation mode
- [ ] All topics seeded with mnemonics
- [ ] No empty mnemonic fields
- [ ] Artifact updated with proof
