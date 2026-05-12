# Competitive Analysis - AutoGrader AI POC

Updated: 2026-05-07

## Product baseline

AutoGrader AI POC currently focuses on Vietnamese teacher workflows:

- Login and local admin/teacher flow.
- Question bank with text/docx/pdf import.
- Auto-detection of multiple-choice and essay questions.
- Exam creation from question bank.
- Per-question point configuration with 0.25 minimum increment.
- Rubric/detailed answer support for essay, math, and literature.
- LaTeX rendering through KaTeX.
- Upload paper image for Gemini OCR and AI grading.
- Result review, per-question regrade, overall feedback, and CSV export.
- Python Flask backend with persistent JSON storage.

## Competitor notes

### Gradescope

Strengths:

- Strong paper-based, online, bubble sheet, and programming assignment workflows.
- Per-question rubrics, reusable rubric items, extra credit, penalties, and keyboard shortcuts.
- AI-assisted answer grouping for fixed-template PDF assignments.
- Handles regrade workflows and grading consistency at scale.

Gap for AutoGrader AI:

- Need stronger batch grading workflow and answer grouping.
- Need regrade request workflow.
- Need rubric item groups instead of only free-text rubric.
- Need analytics per question and per rubric criterion.

### Turnitin Feedback Studio

Strengths:

- Similarity report, plagiarism detection, AI writing indicator, authorship/integrity signals.
- Rich writing feedback, QuickMarks, pinned comments, rubrics, media comments.
- LMS/API/LTI integrations.
- Writing-process transparency through Turnitin Clarity.

Gap for AutoGrader AI:

- No plagiarism/similarity checking yet.
- No AI-use/authorship transparency.
- No LMS integration.
- No reusable comment library.

### Crowdmark

Strengths:

- Online collaborative grading for teams.
- Image/PDF annotation, stamps, comments, Markdown and LaTeX support.
- Positive/negative point comments and detailed per-part feedback.
- Student performance analytics and API access.

Gap for AutoGrader AI:

- No image annotation layer yet.
- No team grading/reviewer assignment.
- No comment bank with point impact.
- No page/question mapping for scanned submissions.

### ZipGrade

Strengths:

- Very fast mobile/PDF grading for answer sheets.
- Offline mobile scanning.
- Item analysis, CSV export, standards/competency tags.
- Low-cost simple workflow for classroom multiple-choice tests.

Gap for AutoGrader AI:

- No offline/mobile scan mode.
- No standard answer-sheet template generation.
- No item analysis/discriminant factor.
- No competency/standard tagging.

### Akindi

Strengths:

- Word/PDF assessment import.
- Bubble sheet generation, scrambling, versioning, prefilled student identity.
- Automated sorting/rotation and review/fix exceptions.
- LMS grade export and assessment analytics.

Gap for AutoGrader AI:

- Need exam versioning and scrambling.
- Need template-based printed answer sheets.
- Need review/fix exception queue for uncertain OCR.
- Need LMS export.

## Differentiation opportunity

Feature proposal: Rubric Evidence Map.

For every AI-graded essay/math answer, the system should produce a transparent evidence map:

- Break the rubric into atomic criteria with point values.
- Link each awarded/deducted point to a specific student-answer excerpt or image region.
- Show status per criterion: achieved, partially achieved, missing, unreadable.
- Let teacher approve/edit each criterion score in 0.25 increments.
- Save teacher edits to improve future rubric suggestions.

Why this is useful:

- It addresses the biggest trust gap in AI grading: "Why did the AI give this score?"
- It is stronger for Vietnamese essay/math workflows than pure answer grouping or generic comments.
- It complements existing KaTeX and rubric work already implemented.
- It can become the core differentiator before LMS/plagiarism features.

## Recommended roadmap priority

1. Rubric Evidence Map for one submission and one question.
2. Batch grading queue with manual review states.
3. Question analytics: average score, low-performing rubric criteria, common wrong answers.
4. Exam versioning and answer-sheet templates.
5. Similarity/plagiarism check for essay submissions.
6. LMS/CSV import-export hardening.

## Implementation queue

### T0 - Rubric item groups

Status: in progress.

Goal:

- Replace long free-text essay rubric as the primary scoring structure.
- Keep old answerKey text for compatibility and optional notes.
- Store rubricGroups per exam question.
- Let teachers create rubric groups and item-level criteria with 0.25 point increments.
- Send structured rubric groups to AI grading prompts.

Schema:

```json
{
  "rubricGroups": {
    "1": [
      {
        "id": "q1-g1",
        "title": "Lập luận chính",
        "items": [
          {
            "id": "q1-i1",
            "description": "Nêu đúng luận điểm trung tâm",
            "points": 0.5
          }
        ]
      }
    ]
  }
}
```

### T1 - Batch grading queue

Status: next.

Goal:

- Upload multiple answer images/PDF pages in one batch.
- Create a grading job with states: queued, processing, completed, needs_manual_review, failed.
- Persist each job and per-file result in JSON DB.
- Show progress, retry failed items, and open manual review from the queue.

## Sources reviewed

- Gradescope AI-assisted grading and answer groups: https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups
- Gradescope rubrics: https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics
- Gradescope assignment types: https://guides.gradescope.com/hc/en-us/articles/22244660005901-Assignment-Types
- Turnitin Feedback Studio: https://www.turnitin.com/products/feedback-studio
- Crowdmark grading tools: https://www.crowdmark.com/help/grading-tools/
- Crowdmark overview: https://www.crowdmark.com/
- ZipGrade features: https://www.zipgrade.com/
- ZipGrade getting started: https://support.zipgrade.com/hc/en-us/articles/202512589-How-do-I-get-started-with-ZipGrade
- Akindi assessment creation: https://help.akindi.com/en/articles/927749-getting-started-create-assessment
- Akindi features: https://akindi.com/features
