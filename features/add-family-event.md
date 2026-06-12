# Add family event

Flow: .maestro/add-family-event.yaml
Platforms: ios, android, web

Adds a one-time family event, edits its title, then deletes it.
Uses `familyos://calendar?modal=add` to open the add modal directly.

## Acceptance criteria
- New event "QA Event" appears in the calendar day list.         (visual)
- After editing, title updates to "QA Event Edited".            (visual)
- After deleting, event is no longer visible.                    (text → hierarchy)
