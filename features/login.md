# Login

Flow: .maestro/login.yaml
Platforms: ios, android, web

Signs in to the seeded test account with plain user/password. Credentials are
injected from the environment (QA_EMAIL, QA_PASSWORD) — not stored in the repo.
The account is reset to baseline before the run.

## Acceptance criteria
- Submitting valid test credentials lands on the home/roster screen.   (visual)
- The signed-in user's name appears in the header.                     (text → hierarchy)
- No error banner is shown.                                            (visual)
