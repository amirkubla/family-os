# Add family member

Flow: .maestro/add-family-member.yaml
Platforms: ios, android, web

Assumes the seeded baseline (so the post-add count is known). Run after login.

## Acceptance criteria
- After saving, the new member appears in the roster.            (visual)
- The member shows their assigned color swatch.                  (visual)
- The roster count increments by one from the baseline.          (text → hierarchy)
