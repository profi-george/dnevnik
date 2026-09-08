---
target: "проект целиком: логика/названия/действия/экраны (Дневник, Снять сегодня, Проекты, Записать, Разобрать через ИИ)"
total_score: 28
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 2
timestamp: 2026-09-08T11-33-04Z
slug: src-app-app-diary-page-tsx
---
Method: dual-agent (A: general-purpose IA/logic review · B: general-purpose detector+browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Live overdue badge, colored status chips, "N сек" spinner during Gemini parse — excellent feedback everywhere |
| 2 | Match System / Real World | 3 | Real Direct-specific jargon used correctly, but "задача" on the header button breaks the вправка/действие model used everywhere else |
| 3 | User Control and Freedom | 3 | Esc/Отмена everywhere, but `cellSavedUndo` copy exists and is never wired up — no real undo after inline save |
| 4 | Consistency and Standards | 2 | Most-used button names the entity a word used nowhere else; overdue vs on-time checkpoints use different verbs ("Снять с опозданием" vs "Сохранить результат") for the same save action; two headings on one screen name the same thing differently |
| 5 | Error Prevention | 3 | Required fields, detailed delete confirmations with counts, future-date warning |
| 6 | Recognition Rather Than Recall | 4 | Datalist autocomplete on "где именно", recent-project pills, inline tooltips |
| 7 | Flexibility and Efficiency | 3 | Excel-style inline edit is genuinely fast; but the declared-default AI path is missing controls (skip checkpoints, custom date) that the fallback manual form has |
| 8 | Aesthetic and Minimalist Design (content density only, visual excluded) | 3 | Table density is justified by the workflow; today-list is well-pared |
| 9 | Error Recovery | 3 | Error copy is specific and humane where wired up, but ~1/3 of the error/retry strings in microcopy.ts (`networkSave`, `retrySave`, `reportNotFound`) are never called from any component |
| 10 | Help and Documentation | n/a | Internal single-user daily tool; inline tooltips substitute for docs — genuinely not applicable |
| **Total** | | **28/36** | **Good (78%)** |

## Design Specificity Verdict

**LLM assessment**: The product is clearly authored for this specific user — the abbreviation legend fed to Gemini (СФ/ПК/НБ/ЦД etc.), the day/week/month checkpoint model, and the "снятие результата может стать новым действием" loop are all shaped around one real directolog's actual workflow, not a generic CRUD app. This is not category-interchangeable software.

**Deterministic scan**: The bundled Impeccable detector (`detect.mjs --json` over `src/app` and `src/components`) returned **0 findings, exit 0** — clean. That's expected: it's a visual/craft detector, and the visual layer was reworked in a separate pass just before this run. It does NOT catch IA/naming/logic issues, which is exactly the layer this critique was scoped to.

**Browser evidence** confirms A's code-level findings live: Assessment B independently captured the raw accessible-name inventory of all 5 screens and, without seeing Assessment A's report, surfaced the same button-naming split from a different angle — "Снять с опозданием" (overdue cards) vs "Сохранить результат" (on-time cards) are two different verbs for the identical save action on `/today`, differing only by checkpoint state. It also flagged that every editable cell in a diary row shares the identical accessible name "Клик — редактировать" regardless of which field it edits (date, place, description, justification) — raw fact, not itself a confirmed defect, but consistent with the Consistency-and-Standards gap A scored a 2 on.

No live-server injection/overlay was performed (out of scope for this logic-focused run); no browser tool exists to open in this response, so there is no [Human]-tab overlay to point to this time.

## Overall Impression

The workflow itself — log a change, get automatic day/week/month checkpoints, optionally spin a checkpoint result into a new logged change — is well thought through and matches how a directolog actually works. The single biggest opportunity is closing the gap between what the copy/IA *claims* (AI-first, one consistent vocabulary, working error recovery) and what's actually wired up: a stray "задача" on the most-clicked button, and roughly a third of the app's single source of copy truth (`microcopy.ts`) describing an onboarding wizard, emails, pushes, undo and retry flows that don't exist anywhere in the codebase.

## What's Working

1. **AI-first logging is genuinely implemented as designed** — the header CTA does open the Gemini parse flow, with a review/edit step before saving multiple rows at once. Confirmed live and in code.
2. **Excel-style inline editing** (click → edit, Enter saves, Esc reverts, instant "Сохранено") is a real efficiency win for a tool opened many times a day.
3. **The checkpoint loop closes on itself** — a checkpoint result can itself become a new logged action via "Разобрать через ИИ", matching the real cycle (edit → observe → sometimes edit again) without leaving the result form.

## Priority Issues

**[P1] "Добавить задачу" is the one place the product says "задача" instead of "действие"/"правка"**
- Why it matters: this is the single most-clicked control in the app (header, every screen), and it names the thing it creates with a word that appears nowhere else in the UI or data model — a returning user (or a second person shown the tool) has to silently reconcile "задача" with "действие" every time.
- Fix: rename to match the established vocabulary, e.g. "Записать действие" (its pre-merge label) or "Добавить действие".
- Suggested command: `/impeccable clarify`

**[P1] ~1/3 of microcopy.ts — the declared single source of UI-copy truth — describes functionality that doesn't exist**
- Why it matters: `COPY.onboarding` (a full 3-step wizard), `COPY.email`, `COPY.push`, plus loose strings `cellSavedUndo`, `networkSave`, `retrySave`, `reportNotFound`, `openDiary`, `backToDiary`, `createProjectFirst` are defined but never rendered or called by any component (confirmed by grep for onboarding components and for `resend|nodemailer|sendEmail|cron` — none exist). A file explicitly commented as the single source of copy truth is misleading about what's actually shipped — real risk for you or anyone else picking this project back up later.
- Fix: either delete the dead strings, or move them to a clearly-labeled `ROADMAP`/`TODO` section so future-you doesn't mistake them for live copy.
- Suggested command: `/impeccable harden`

**[P2] The declared-default AI path is functionally poorer than its "fallback"**
- Why it matters: `AddActionForm` lets you skip the 3 auto-checkpoints and add a custom 4th date, and create a project inline. `BulkAddForm`/`createActionRows` (src/app/actions.ts) always forces exactly day+week+month with no way to opt out or add a custom date, and has no inline project creation. If the AI path is meant to be the everyday default, it currently has *less* control than the "manual, use when you don't have AI" path — the opposite of what a default usually implies.
- Fix: either bring the AI review step up to parity (no-checkpoints toggle, custom date, inline "+ new project"), or make it explicit in the UI that the AI path is for standard edits only and unusual cases should use the manual form.
- Suggested command: `/impeccable harden`

**[P2] Both empty states bypass the AI-first priority**
- Why it matters: `diaryNoActions` (src/app/(app)/diary/page.tsx:71) and `todayNothing` (src/app/(app)/today/page.tsx:30) both CTA to `/diary/add` (manual form), not `/diary/bulk` — exactly at the first-touch moment, the one place besides the header button that's supposed to reinforce "AI is the default" instead sends the user to the fallback.
- Fix: point both empty-state CTAs at `/diary/bulk` to match the header button's behavior.
- Suggested command: `/impeccable clarify`

**[P3] Small naming mismatches that cost a beat of re-reading**
- Two headings on one un-scrolled screen name the same thing differently: "Добавить действие" (page title, diary/add/page.tsx:25) vs "Записать правку" (form card title, AddActionForm.tsx:58).
- The same "date of the action" field is labeled differently in the two add forms: "Когда сделали правку" (AddActionForm) vs "Дата действия" (BulkAddForm).
- On `/today`, the save button reads "Снять с опозданием" for overdue checkpoints and "Сохранить результат" for on-time ones — same action, state-dependent verb (independently confirmed by both assessments).
- Fix: pick one label per concept and reuse it in both forms/screens.
- Suggested command: `/impeccable clarify`

## Persona Red Flags

**Alex (Power User, uses this many times a day)**: the AI path's missing "skip checkpoints"/"custom date" forces a choice every single time between "accept 3 checkpoints I don't want" or "switch to the slower manual form" — at high daily frequency this is a real accumulating tax on exactly the workflow the tool is supposed to speed up.

**Riley (Stress Tester — "I haven't opened this in a week, what's overdue")**: the copy promises proactive reminders ("Письмо приходит только когда есть что снимать") but no email/push mechanism exists anywhere in the code — the only actual signal is the badge count, which requires opening the app to notice. In a real "fell behind" scenario there is no external nudge at all, contrary to what the copy tells the user to expect.

**Sam (accessibility-dependent, screen reader)**: every editable cell in a diary row shares the identical accessible name "Клик — редактировать" regardless of which field it edits (date/place/description/justification) — a screen-reader user tabbing through a row hears the same announcement four-plus times with no way to distinguish which cell they're on without also reading surrounding context.

## Minor Observations

- `tooltips.inlineEdit` documents Enter/Esc but not Shift+Enter for a line break in multi-line fields, even though the behavior exists in code (InlineField.tsx).
- Deleting a single checkpoint doesn't say how many checkpoints remain on that action, unlike deleting the whole action which does show the related-record count.
- "Добавить проверку" is only revealed on row hover (`opacity-0 group-hover:opacity-100`) — fine for the desktop-mouse daily user this tool is built for, worth noting if a touch device ever enters the picture.
- `/diary/add` isn't linked from the global header at all — the only path to it is the "Одна правка вручную" link on `/diary/bulk`.

## Questions to Consider

- If a third of the copy source describes an onboarding wizard and email/push reminders that don't exist, is that a forgotten prototype or an actual near-term plan? The answer changes whether it's dead code or a checklist.
- Is the AI path meant to be "for standard edits, use manual for anything unusual," or should it eventually do everything the manual form can? Right now nothing in the UI tells the user which one is true.
- Would renaming "Добавить задачу" back to "Добавить действие" break anything you've already gotten used to, or was "задача" itself a slip that's worth fixing now while it's still one string?
