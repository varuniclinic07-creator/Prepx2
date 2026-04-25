---
type: scope-change-request
from: sprint3-story-polity-completion.md
status: pending-approval
date: 2026-04-23
requested_by: User
impact: HIGH — changes Sprint 3 from 8 stories to ~20 stories
---

# 📋 BMAD Scope Change: Sprint 3 Expanded to All UPSC Subjects

## Current Sprint 3 Scope (Original)
- 10 Polity topics (GS2 Paper 1)
- Mnemonics, mindmaps, quizzes, PDF, self-improvement
- Estimated: 2.5–3 weeks

## Requested Scope Change
- **ALL subjects across all 4 GS Papers + CSAT**
- **Complete end-to-end coverage per subject**

## Subjects Required (Complete List)

| GS Paper | Subject | Syllabus Prefix | Estimated Topics |
|----------|---------|-----------------|------------------|
| **GS1** | Indian History (Ancient, Medieval, Modern) | GS1-HIS | ~12 |
| **GS1** | World History | GS1-WLD | ~8 |
| **GS1** | Indian Geography | GS1-GEO | ~10 |
| **GS1** | Physical Geography | GS1-PHY | ~8 |
| **GS1** | Society & Social Issues | GS1-SOC | ~8 |
| **GS2** | Polity | GS2-POL | 10 (exists) |
| **GS2** | Governance | GS2-GOV | ~8 |
| **GS2** | International Relations | GS2-IR | ~8 |
| **GS2** | Social Justice (Constitutional bodies) | GS2-SJ | ~6 |
| **GS3** | Indian Economy | GS3-ECO | ~12 |
| **GS3** | Agriculture | GS3-AGR | ~8 |
| **GS3** | Science & Technology | GS3-SCI | ~8 |
| **GS3** | Environment & Ecology | GS3-ENV | ~8 |
| **GS3** | Disaster Management | GS3-DM | ~6 |
| **GS3** | Internal Security | GS3-IS | ~6 |
| **GS4** | Ethics, Integrity & Aptitude | GS4-ETH | ~10 |
| **CSAT** | Comprehension | CSAT-COM | ~6 |
| **CSAT** | Logical Reasoning | CSAT-LR | ~6 |
| **CSAT** | Quantitative Aptitude | CSAT-QA | ~6 |
| **CSAT** | Decision Making | CSAT-DM | ~4 |

**Total: ~19 subjects, ~140 topics**

## Impact on Sprint 3

| Dimension | Original | Expanded |
|-----------|----------|----------|
| Stories | 8 | ~20+ |
| Topics to generate | 10 (Polity) | ~140 (all subjects) |
| Quizzes to generate | 10 | ~140 |
| Estimated effort | 2.5–3 weeks | 8–12 weeks |
| AI tokens consumed | ~50K | ~700K+ |
| DB schema changes | Minor | Major (remove polity constraint) |

## Risks
- AI Router rate limits (1,400 tokens/min Groq cap)
- Cost: ~₹10,000+ in API calls for 140 topics
- Quality: AI hallucination increases with unfamiliar subjects
- Time: 8-12 weeks for 140 topics at current pace
- Hermes still must be built first regardless

## Recommendation
**Option A: PHASED** (Recommended)
- Sprint 3A: Hermes + Subject Framework + 5 core subjects (Polity, Economy, History, Geography, Ethics)
- Sprint 3B: 5 more subjects (GS2/3 cross-cutters)
- Sprint 4: Remaining subjects + CSAT

**Option B: FULL** (User request)
- Sprint 3 = ALL 19 subjects
- Accept 8-12 week timeline
- Batch-generate via admin panel

**Option C: FRAMEWORK ONLY**
- Sprint 3 = Hermes + Subject Framework + 1 topic per subject (19 seeds)
- Sprint 4+ = Fill remaining topics per subject

## 🧭 Approve Scope Change?
Reply with:
- `APPROVE A` → Phased (5 subjects in Sprint 3)
- `APPROVE B` → Full (all 19 in Sprint 3, 8-12 weeks)
- `APPROVE C` → Framework + 1 seed per subject
- `REJECT` → Keep original Sprint 3 (Polity only)
- `EDIT` → modify subject list
