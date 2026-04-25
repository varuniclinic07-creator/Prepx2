---
sprint: 3
story: "Story 6: PDF Export with Watermarks"
epic: 14 (Advanced Features)
status: planned → awaiting approval
date: 2026-04-23
depends_on: sprint3-story-chapter-quizzes
---

# 📋 Story 6: PDF Export

## 🎯 Goal
Users can download a chapter as PDF with watermark for Free tier.

## 📦 Scope
- ✅ Generate PDF from topic content via puppeteer/jsPDF
- ✅ Add "PREPX WATERMARK - FREE TIER" overlay
- ✅ Premium users get unmarked PDF
- ❌ Mobile PDF layout (future)
- ❌ Batch PDF export

## 📏 Acceptance Criteria
- [ ] /topic/[id]/export/pdf endpoint returns PDF blob
- [ ] Free PDF has watermark text
- [ ] Premium PDF has no watermark (role check)
