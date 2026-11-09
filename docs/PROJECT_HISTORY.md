# Time-Thread: complete project history

A full record of what this project is, how it was built, what went wrong, what was decided and why. It's written for my knowledge base and for interview preparation. The README has run instructions and the learning log; this file adds the story and the reasoning.

Live demo: https://time-thread.vercel.app
Code: https://github.com/VedPawar1410/Time-Thread

## The idea

In a long podcast or conversation, topics branch, get interrupted, and come back later. A transcript or a two-hour video hides that structure. The original goal, from `project_plan.md`, was to turn long-form content into a visual timeline where each node is a topic, branches are side discussions, and clicking a node jumps to that moment.

## What it does today

- Paste a YouTube link and get a timeline of main topics, subtopics and tangents, each with a summary and timestamp.
- The video plays alongside the graph. Clicking a node seeks the video, and playback highlights the current topic.
- Threads light up as the video plays, and the view can follow the active topic.
- Maps save automatically, can be renamed and deleted, and a repeat link reopens the saved map at no cost.
- Handles non-English captions, Shorts and live URLs, and transcripts up to 300,000 characters (about 4 hours).
- The public site is a read-only showcase of saved timelines.

## Who did what

**January 2026:** I built the first version using Cursor, in four commits on 2026-01-11. It had the Next.js frontend, FastAPI backend, Gemini integration, React Flow timeline, Supabase storage and deployment config.

**November 2026:** I came back to it with Claude Code as a pair. Claude audited the code, proposed plans, wrote the fixes and tested them. I set the goals and limits, chose between approaches, tested the app by hand, reported real problems, reviewed each step, and committed and pushed everything myself. Specific calls I made:

- Scoped it to YouTube only, instead of the PDF and audio the old README promised.
- Chose the local-first approach, then ruled out reading whole videos with Gemini because of token cost.
- Ruled out paid proxies, and ruled out pasted transcripts because that defeats a one-link tool.
- Set the hard rule that the project stays free to run.
- Asked for map renaming after using the app, and caught the sidebar's clipped delete button.
- Chose "The Loom" from three design directions.

## Architecture

```
Browser (Next.js, React Flow, Zustand) on Vercel
   |  REST
   v
FastAPI backend on Render
   |-- saved map lookup by video ID (Supabase Postgres)
   |-- youtube-transcript-api: timestamped captions
   |-- Gemini via LangChain: topics and relationships as JSON
   '-- save the result; only the backend holds the database key
```

Stack: Next.js 15, React 18, TypeScript, Tailwind, Shadcn UI, React Flow, Zustand, react-player, Python 3.11, FastAPI, Pydantic, LangChain, Gemini, Supabase Postgres, pytest, Vercel, Render.

## Timeline

| Date | Commit | What happened |
|---|---|---|
| 2026-01-11 | `da05332` to `d928e0f` | First build: structure, AI processing, maps API, video player, deployment config |
| 2026-11-09 | `2dade20` | Backend installs and boots; model became a setting |
| 2026-11-09 | `ff9126d` | Video player repaired for react-player v3 |
| 2026-11-09 | `987b306` | Next.js upgraded to remove a critical vulnerability |
| 2026-11-09 | `4f128f2` | Clear errors for each YouTube failure |
| 2026-11-09 | `e9f4178` | All database access moved behind the backend |
| 2026-11-09 | `14ddacc` | About 1,300 lines of dead code removed; tests added |
| 2026-11-09 | `9bb1eab`, `1e9a97b` | README and learning log |
| 2026-11-09 | `bfb1bd8`, `c898515` | Map renaming, dependency pin, sidebar overflow fix |
| 2026-11-09 | `49af4cc`, `a35fc1c`, `efa5ccf`, `e97c253` | The Loom redesign |
| 2026-11-09 | `383ef1c` | Saved-video reuse, real titles, longer transcripts, two AI bugs |
| 2026-11-09 | `87955ad` | Public safeguards and deployment config |
| 2026-11-09 | Final commit | Live site became a showcase; this document |

## What was broken in the first version

| Problem | Root cause | Evidence |
|---|---|---|
| Backend couldn't install | `pydantic==2.6.1` conflicted with `langchain==0.3.13` | `pip` failed with `ResolutionImpossible` |
| Backend crashed on Render | A comma-separated `CORS_ORIGINS` was parsed as JSON | `SettingsError` at import |
| Video never loaded | v2 API used with react-player v3; a hand-written type file hid it | `<video>` with empty `src`, build still passed |
| AI model unavailable | `gemini-1.5-flash` had been retired | Not offered by Google's model list |
| Saved maps open to anyone | Browser wrote directly; `GRANT ALL` to anon and a `USING (true)` policy | Migration and code |
| Secret exposed | Google key hardcoded in commit `5bd6dd8` of a public repo | Git history |
| Critical vulnerability | `next@15.0.0` | `npm audit`: 8 issues, 1 critical |
| Fake successes | PDF and audio stubs returned placeholder text as success | Real API responses |

## Hard problems and how they were solved

**A build that passed while the app was broken.** TypeScript approved the video player because a hand-written `.d.ts` file declared an API that no longer existed. Deleting it meant the compiler checks the library's real types.

**Finding why Gemini hung.** The server hung with no error. A plain `curl` isolated each layer: the key worked, one listed model hung for 100 seconds, another replied in 1.7 seconds, and the library's default gRPC transport also hung. The fix was a tested model, REST transport, and running the synchronous call in a worker thread.

**YouTube blocking.** Requests were blocked from a home IP after a few quick calls, and from Render on the first real request. Each failure type now maps to a clear status, repeat videos skip YouTube entirely, and the live site is honest about being a showcase.

**A limit wrongly declared safe.** `max_output_tokens` was kept at 8,192 after a 19-node test, then pushing the transcript limit higher cut the JSON off mid-reply. The same test exposed an intermittent crash when Gemini returned a list of parts. Testing at the extremes found both.

**Making threads light up smoothly.** Playback time updates several times a second, but a thread only changes state when a new topic starts, so threads update on topic change only.

**Keeping a public demo safe on free tiers.** Saving moved to the server, so visitors can't write arbitrary data. Public mode blocks changes, and AI requests have a daily cap.

## Decisions and alternatives

| Decision | Alternatives considered | Why |
|---|---|---|
| Keep transcript-based processing | Gemini watches the video; residential proxy; paste a transcript | Video costs far more tokens, proxies cost money, pasting breaks the one-link idea |
| Live site as a showcase | Offer a link box that always fails | Honest, and it still demonstrates the full experience |
| Backend holds all database access | Browser with row-level policies | Removing access is simpler and safer |
| In-memory daily cap | Database counter or a paid limiter | A restart only happens when the server is idle; no added infrastructure |
| "The Loom" design | Broadcast control room; editorial manuscript | It makes the product's name literal |

## Results

All numbers came from runs on 2026-11-09.

| Measure | First version | Now |
|---|---|---|
| Clean backend install | Failed | Passes |
| Real video to saved graph | Impossible | Works: 19-minute talk produced 10 to 11 nodes |
| Backend tests | 0 | 48 |
| Runtime npm vulnerabilities | 8 (1 critical) | 2 (0 critical) |
| `/dashboard` first load | 252 kB | 203 kB |
| Repeat video | Full reprocessing | About 1 second, no AI or YouTube call |
| Longest transcript | 100,000 characters | 300,000, tested on synthetic text |

## Honest limits

- The live site can't process new videos, because YouTube blocks its server.
- Graph quality has never been formally evaluated, and the level of detail varies between runs.
- The 300,000-character limit was tested on generated text, not a real 4-hour video.
- There are no user accounts and no frontend tests. A full Docker build hasn't been run.
- A direct attempt to read the database with the public key was never run; access was confirmed from the database's permissions instead.

## Resume material

Accurate bullets, to adapt for each role:

- Built a full-stack app (Next.js, FastAPI, Supabase, Gemini) that turns YouTube conversations into an interactive, video-synced topic timeline; deployed on Vercel and Render on free tiers.
- Rebuilt a non-functional prototype into a working, deployed product with AI-assisted development, directing scope and architecture decisions and verifying each change end to end.
- Reduced repeat-processing cost to zero by reusing saved results, bringing repeat requests down to about one second.
- Secured the data layer by moving all database access behind the API, removing public access and adding read-only and daily-limit safeguards.
- Grew backend test coverage from 0 to 48 tests by faking external services, and removed about 1,300 lines of dead code.
- Diagnosed production issues across layers, including an LLM client hang, dependency conflicts, a truncated-output bug and cloud IP blocking.

Be ready to say clearly that the rebuild was AI-assisted, and what I decided and verified myself.

## Interview talking points

1. Why a passing build didn't mean a working app.
2. How I isolated a hanging LLM call layer by layer.
3. How I chose between three ways around YouTube's blocking under a zero-cost constraint.
4. Why the browser has no database access at all.
5. How a limit that looked fine at small sizes failed at large ones.

## What's next

See the README's Future improvements. The most valuable next steps are a real evaluation set for graph quality, and consistent graph detail for long videos.
