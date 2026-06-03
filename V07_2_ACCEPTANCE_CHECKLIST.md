# JobPilot v0.7.2 Acceptance Checklist

Goal:

- Validate the v0.7 product loop after removing the old Inbox route.
- Keep page structure stable.
- Fix logic breaks only; no broad UI redesign and no backend work yet.

Must Pass:

1. Navigation
   - Main nav does not expose Material Inbox.
   - Every nav item opens the expected module.

2. Opportunity
   - Add/upload JD opens source step first.
   - Parse/review step requires company, title, JD/source text.
   - Creating a record writes directly to Opportunity.
   - Created opportunity has source assets, JD summary/text, status, resume version, timeline, and next action.
   - Mark applied updates status, pipeline, timeline, resume linkage, and follow-up task.

3. Interview Review
   - Add/upload interview source opens source step first.
   - Review step can link an existing opportunity.
   - Creating a review writes directly to InterviewSession.
   - Linked interview advances the related opportunity to interviewing.
   - Interview detail shows source file(s), QA list, selected QA detail, editable review fields.

4. Resume Versions
   - Upload resume opens source step first.
   - Creating a record writes directly to ResumeVersion.
   - New resume can be selected by future opportunity records.
   - Resume detail remains editable and deletable.

5. Answer Library
   - Answer can be created manually.
   - Answer can be generated from interview QA.
   - Answer can be edited, deleted, and added to practice.

6. Weekly Plan
   - Weekly focus can generate concrete tasks.
   - Weekly tasks appear in Today Todo.
   - Completing or changing task state should not desync Today Todo.

7. Today Todo
   - Count equals the derived action list shown on the page.
   - Each todo jumps to the correct module/detail.
   - No todo is generated from an unconfirmed draft or removed Inbox item.

Out Of Scope For v0.7.2:

- Real AI parsing.
- Real audio transcription.
- SQLite/API persistence.
- Auth, cloud sync, or file storage.
- Large visual redesign.
