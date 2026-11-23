# Drip Private Beta — Render deployment

This repository is a static HTML/CSS/JS game. `index.html`, `audio.js`, `ranked.js`, and `config.js` must remain in the repository root. The `config.js` file contains a **public publishable** Supabase key, never a service-role key.

## Render settings

- Workspace: My Workspace
- Service type: Static Site (free tier if available)
- Build command: `echo "Drip static site ready"`
- Publish directory: `.`
- Branch: `main`
- Automatic deploys: Off during beta

The optional `render.yaml` blueprint includes compatible static-site settings. For manual static-site creation, use the same values as above.

## Before real-player testing

1. Enable Supabase anonymous sign-in in the Drip project if not enabled.
2. Visit the live link; tap the speaker and check music; play a practice round.
3. Test ranked with two browser profiles or devices; confirm the same puzzles and distinct scores.
4. Verify resuming a run after refresh and one official completion per account/day.

**Not password protected**. `robots.txt` discourages indexing but cannot guarantee privacy. Anonymous accounts can be reset and recreated. The current 20 server-ranked puzzles will repeat; expand before public launch.
