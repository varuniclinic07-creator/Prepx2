---
type: scope-expansion
from: sprint3-plan.md + prev-options
date: 2026-04-23
requested_by: User
impact: CRITICAL — adds 3 new agent types + watermark + timestamp + Mains layer + essay mode
---

# Expanding Scope: Options 1-4 + 3 Guide Agents + Real-Time Coaching

## User Request Summary

1. **Option 1**: Hermes Core (brain orchestrator) — state machine + agent_tasks table
2. **Option 2** (implied): Mains MVP layer — supplementary, not replacement
3. **Option 3** (implied): Prelims polish + Hermes — fixes QuizComponent `forEach(async)` bug
4. **Option 4**: Watermark + Timestamp — all content timestamped, brand watermarked, Free vs Premium
5. **NEW — 3 Guide Agents**:
   - **Prelims Guide Agent**: Real-time guidance during MCQs. Detects wrong patterns. Auto-popup: "You're overthinking — eliminate 2 options first."
   - **Mains Guide Agent**: Real-time guidance during answer writing. Detects weak structure. Auto-popup: "Add a report citation here — try 2nd ARC."
   - **Interview Guide Agent**: Real-time guidance during mock interviews. Detects nervous patterns. Auto-popup: "Pause. Breathe. Structure your answer with Situation-Action-Result."
6. **Continuous Research**: All 3 agents research daily to find new techniques, PYQ patterns, government updates
7. **Smart Study Direction**: Agents tell users what TO do and what NOT to do. Prevent over-studying irrelevant topics.
8. **Essay Reading Mode**: Not explicitly requested but implied in "essay reading is left"

## 3-Reply Format (Locked by User)

### 1. ✅ DONE (Already Executed)
- 165 topics + 165 quizzes generated across 19 subjects
- Database constraint removed (any subject accepted)
- Subject Teacher base class + all 19 subjects registered
- Hermes stub created
- Sprint 0-2 foundation complete
- Multi-provider AI Router operational

### 2. ⏳ PENDING (New Scope, Not Yet Executed)

| # | Feature | Complexity | File |
|---|---------|-----------|------|
| A | **Hermes Core** — functional state machine, agent tasks table | HIGH | `lib/hermes.ts`, schema.sql |
| B | **QuizComponent Bug Fix** — change `forEach(async)` to `for...of` | LOW | `components/QuizComponent.tsx` |
| C | **Test Hardening** — fix bug + 24 tests + Playwright | MEDIUM | `__tests__/` |
| D | **Watermark Engine** — overlay on Free/Premium content | MEDIUM | `lib/watermark.ts`, admin panel |
| E | **Timestamping** — created_at, updated_at, version on all topics | LOW | schema.sql + UI |
| F | **Prelims Guide Agent** — real-time MCQ coaching, pattern detection | HIGH | `lib/agents/prelims-guide.ts` |
| G | **Mains Guide Agent** — real-time essay coaching, structure feedback | HIGH | `lib/agents/mains-guide.ts` + `components/AnswerComposer.tsx` |
| H | **Interview Guide Agent** — real-time interview coaching | MEDIUM | `lib/agents/interview-guide.ts` |
| I | **Answer Composer** — essay writing UI with timer + outline | HIGH | `components/AnswerComposer.tsx` |
| J | **Mains Evaluator** — 4-dimension scoring Structure/Content/Analysis/Presentation | HIGH | `lib/mains-evaluator.ts` |
| K | **Progression Engine** — 5-level curve L1→L5 per subtopic | MEDIUM | `lib/progression-engine.ts` |
| L | **RAG Fact Injector** — committee reports into answer feedback | MEDIUM | `lib/rag-answer-injector.ts` |
| M | **DailyPlan Expansion** — add task types: WRITE, IMPROVE, MOCK, REVISION | LOW | `components/DailyPlan.tsx` |
| N | **Admin Guide Agent Dashboard** — see all 3 agents active/idle | LOW | `app/admin/guides/page.tsx` |

### 3. 🚀 ADVANCED OPTION

**The "Three Guardian Angels" Architecture**

Instead of building 3 separate agents, build ONE Hermes with 3 personas:

```
Hermes Orchestrator
    ├── StudyAgent (Prelims mode)  → handles MCQ + concept reinforcement
    ├── WriteAgent (Mains mode)    → handles essay writing + evaluation
    └── SpeakAgent (Interview mode) → handles mock interview + personality feedback
```

Each persona has:
- **Real-time trigger**: Supabase Realtime subscription on user_activity table
- **Pattern detection**: Analyzes user keystrokes, time-per-question, hesitation patterns
- **Intervention logic**: Threshold-based (e.g., >30s stuck on MCQ → trigger hint)
- **Daily research cron**: Each agent queries AI Router for "latest UPSC PYQ patterns"

**Smart Study Direction (Anti-Lengthy-Study)**:
- Agent tracks total study time per topic
- Detects diminishing returns (>2h on same topic → "Switch topic. Return tomorrow.")
- Uses Ebbinghaus forgetting curve data → schedules revision at optimal intervals
- Compares user's weak areas vs exam weightage → prioritizes high-weight topics

---

## 🧭 Approve This Expanded Scope?

**Reply with exactly:**
- `BUILD ALL` → Execute A–N (full scope, 6–8 weeks)
- `BUILD CRITICAL` → Execute A–E + B only (Hermes + Watermark + Bugfix + Tests)
- `BUILD GUIDES` → Execute F–H + B (3 Guide Agents + Bugfix)
- `BUILD MAINS` → Execute B + G + I + J + K (Mains layer only)
- `PHASED` → A→B→C first (2 weeks), then choose next batch
- `EDIT` → tell me what to drop or add

**Zero code until you approve explicitly.**