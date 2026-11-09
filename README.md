# Time-Thread

Paste a YouTube URL and get an interactive timeline of the conversation: main topics, subtopics and tangents as a branching graph, synced to the video.

**Live demo:** https://time-thread.vercel.app shows saved timelines. New videos are processed locally; see [Deployment](#deployment) for why.

| Measure | Before the rebuild | After |
|---|---|---|
| Clean backend install | Fails (`ResolutionImpossible`) | Passes |
| Real video to saved graph | Impossible | Works in the browser (5-node graph saved) |
| Video playback and click-to-seek | Broken | Works |
| Backend tests | 0 | 48 passing |
| Runtime npm vulnerabilities | 8 (1 critical) | 2 (0 critical) |
| `/dashboard` first load | 252 kB | 203 kB |

Every number in this README came from a run on 2026-11-09. Anything not verified is marked as such.

## How it works

```
 YouTube URL
     |
     v
 Next.js dashboard ------------------------------+
     |  POST /api/v1/process-transcript          |  GET / POST / DELETE
     v                                           v  /api/v1/maps
 FastAPI backend                             FastAPI backend
     |                                           |
     +--> youtube-transcript-api                 +--> Supabase Postgres
     |      timestamped transcript                    (only the backend's
     +--> Gemini (via LangChain)                       secret key has access)
            nodes + edges as JSON
     |
     v
 React Flow timeline  <--- Zustand store --->  YouTube player
 Y axis = time                                 click node = seek
 X axis = main / subtopic / tangent            playback = highlight node
```

**Why these choices**

- **The browser never touches the database.** It calls the backend, which holds the secret key. The table has Row Level Security on and no policies, so the public key can't read or change anything.
- **The Gemini model is a setting (`GEMINI_MODEL`).** Google retires model names often, so changing one shouldn't need a code change.
- **Gemini is called over REST in a worker thread.** The default gRPC transport hung in testing, and async REST crashes in the pinned LangChain version.
- **Map endpoints are plain `def`.** The Supabase client is synchronous, so FastAPI runs them in a thread pool and the server stays responsive.
- **Time drives the highlight.** The active node is derived from the current playback time, so the video and graph can't disagree.
- **Threads update when the topic changes, not on every tick.** Playback time arrives several times a second, but a thread only changes state when a new topic starts, so long videos stay smooth.
- **The URL decides what's on screen.** A saved map, the sample and a blank start each have their own address, so links are shareable and New Graph can reset cleanly.

## Data

There is no training dataset. Transcripts come from YouTube captions at request time, and saved maps live in one Supabase table, `maps`. See `supabase/migrations/` for the schema.

## Results

**Before and after**

| Check | Before | After |
|---|---|---|
| Backend startup with the `render.yaml` environment | Crashes (`SettingsError`) | Boots |
| YouTube blocks the request | Bare 500 | 503 with a clear message |
| Deleted, private or age-restricted video | 500 | 404 with a clear message |
| Shorts and `/live/` URLs | Rejected | Work |
| Video with no English captions | Reported as no transcript | Uses the language available |
| Transcript over 100,000 characters | Silently cut off | Handled up to 300,000 (about 4 hours), then a visible warning |
| Same video processed twice | Spent YouTube requests and Gemini quota again | Reopens the saved map in about 1 s, at no cost |
| Public access to saved maps | Anyone could read, change or delete | No public-role access |
| Failed save | Silent | Warning shown |
| Runtime Python packages | 17 | 11 |
| Dead sidebar links | 3 | 0 |

**Timing**

| Run | Result |
|---|---|
| Real YouTube video, 2,577-character transcript | 6 nodes in 27 s |
| Real 19-minute talk, in the browser | 11 nodes, about 50 s |
| 8-line sample transcript, 3 runs | 5 nodes each, 8.8 to 10.4 s |
| 107,589-character synthetic transcript | 19 nodes, 18 edges, 24 s |
| 300,000-character synthetic transcript (4.1 hours), 2 runs | 10 and 41 nodes, graph reaches the end both times, 29 to 55 s |

**Model check on 2026-11-09** (one-word prompt, REST)

| Model | Result |
|---|---|
| `gemini-3.5-flash` | 1.7 s (the default) |
| `gemini-flash-latest` | 64 s |
| `gemini-3.8-flash` | No reply within 100 s |
| `gemini-2.5-flash` | 404, closed to new users |
| `gemini-1.5-flash` | Not offered by the API any more |

Graph quality has not been measured. There is no evaluation set yet.

## Project structure

```
.
├── README.md
├── project_plan.md                     Original product idea
├── .cursorrules                        Coding rules used in the first build
├── docker-compose.yml                  Runs both services (not build-tested)
├── supabase/migrations/
│   ├── 001_create_maps_table.sql       maps table and updated_at trigger
│   └── 002_restrict_maps_access.sql    Removes all public access
├── backend/
│   ├── .env.example                    Backend settings template
│   ├── Dockerfile                      Backend image
│   ├── Procfile                        Start command for Procfile hosts
│   ├── render.yaml                     Render blueprint
│   ├── pytest.ini                      Test settings
│   ├── requirements.txt                Runtime dependencies, pinned
│   ├── requirements-dev.txt            Runtime plus pytest
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     FastAPI app, CORS, /health
│   │   ├── config.py                   Settings from the environment
│   │   ├── api/__init__.py
│   │   ├── api/v1/__init__.py
│   │   ├── api/v1/router.py            Combines the routes
│   │   ├── api/v1/endpoints/__init__.py
│   │   ├── api/v1/endpoints/process.py /process-transcript and /analyze
│   │   ├── api/v1/endpoints/maps.py    Saved maps CRUD
│   │   ├── models/__init__.py
│   │   ├── models/graph.py             Graph request and response models
│   │   ├── services/__init__.py
│   │   ├── services/transcription.py   YouTube transcript fetching
│   │   └── services/processor.py       Gemini prompt and parsing
│   └── tests/
│       ├── test_config.py              CORS parsing
│       ├── test_transcription.py       YouTube URL formats
│       ├── test_processor.py           Parsing Gemini replies
│       ├── test_process_api.py         YouTube failures, truncation warning
│       └── test_maps_api.py            Saved maps with a fake database
└── frontend/
    ├── .env.example                    Frontend settings template
    ├── .eslintrc.json                  Lint rules
    ├── Dockerfile                      Production image
    ├── Dockerfile.dev                  Development image
    ├── components.json                 Shadcn UI settings
    ├── next-env.d.ts                   Next.js types
    ├── next.config.ts                  Next.js settings
    ├── package.json                    Scripts and dependencies
    ├── package-lock.json               Locked versions
    ├── postcss.config.mjs              PostCSS settings
    ├── tailwind.config.ts              Tailwind settings
    ├── tsconfig.json                   TypeScript settings
    ├── vercel.json                     Vercel config (placeholders remain)
    └── src/
        ├── app/layout.tsx              Root layout
        ├── app/globals.css             Global styles
        ├── app/page.tsx                Landing page
        ├── app/dashboard/page.tsx      Main screen
        ├── components/graph/timeline-canvas.tsx   Graph layout and sync
        ├── components/graph/nodes/topic-node.tsx  Node card
        ├── components/graph/loom-states.tsx       Empty and waiting screens
        ├── components/layout/sidebar.tsx          Navigation, saved maps
        ├── components/video/video-player.tsx      YouTube player
        ├── components/ui/button.tsx
        ├── components/ui/input.tsx
        ├── components/ui/scroll-area.tsx
        ├── components/ui/separator.tsx
        ├── components/ui/tooltip.tsx
        ├── hooks/useVideoSync.ts       Video and graph sync
        ├── lib/api.ts                  Backend client
        ├── lib/utils.ts                Class name helper
        ├── stores/timeline-store.ts    Shared playback state
        └── types/graph.ts              Graph types
```

## Run locally

Tested with Python 3.11.9 and Node 24.12.

**1. Database:** create a Supabase project, then run both files in `supabase/migrations/`, in order, in its SQL Editor.

**2. Backend**

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `GOOGLE_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then:

```bash
python -m uvicorn app.main:app --port 8000
```

If you already have a `backend/venv` from an older version, delete it and create a new one, because pip won't upgrade packages it thinks are already fine.

**3. Frontend**, in a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000/dashboard.

**Test**

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

The tests replace YouTube, Gemini and Supabase with fakes, so they need no keys and cost no quota. There are no frontend tests.

## Deployment

Live at https://time-thread.vercel.app (frontend, Vercel) and https://time-thread-api.onrender.com (backend, Render), both on free tiers.

**The live site is a showcase of saved timelines.** A real request from Render came back blocked by YouTube, which refuses transcript requests from most cloud servers. New videos are processed from a home connection, and both versions share one database, so they appear on the live site straight away. YouTube can also block a home connection after a few quick requests.

**Setup**

- **Render:** Blueprint at `backend/render.yaml`, with `GOOGLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CORS_ORIGINS` set to the exact frontend URL.
- **Vercel:** root directory `frontend`, with `NEXT_PUBLIC_API_URL` set to the Render URL and `NEXT_PUBLIC_READ_ONLY=true`.
- **Safeguards on the public site:** visitors can't create, rename or delete maps (`READ_ONLY_MAPS`), and AI requests are capped per day (`DAILY_PROCESS_LIMIT`).

**Options weighed for processing new videos in the cloud**

| Option | Why it wasn't used |
|---|---|
| Have Gemini watch the video directly | Far more tokens than a transcript; the project has to stay free |
| Residential proxy or hosted transcript service | Monthly cost |
| Ask users to paste a transcript | Defeats the point of a one-link tool |

**Free-tier behaviour:** Render sleeps after about 15 idle minutes, so the first visit can take around a minute. Supabase pauses free projects after a period of inactivity.

Docker Compose reads its variables from a `.env` file in the repo root. The file passes validation, but a full Docker build has not been run.

## Limitations

- YouTube videos only. PDF and audio were planned but never built.
- The live site can't process new videos, because YouTube blocks its cloud server. Locally, YouTube can still block after a few quick requests; the app reports this as a 503.
- Only the first 300,000 characters of a transcript (about 4 hours) are analyzed.
- The level of detail varies between runs: the same long transcript produced 10 nodes once and 41 another time.
- Speakers are guessed from context, because YouTube captions don't label them.
- Graph quality hasn't been evaluated, and timestamps from the model aren't validated.
- No accounts: every saved map is public on the live site.
- Two npm audit findings remain, both from PostCSS bundled in Next.js. They need an attacker-controlled stylesheet at build time, and this app processes none. The fix is Next.js 16.
## Learning log: mistakes and what I learned

I built this in two layers: a fast first version, then a rebuild where I found out what had never worked. Each layer records what went wrong and the lesson.

### Layer 1 - The first build (2026-01-11, Cursor, Next.js, FastAPI, Gemini, Supabase)

*What I built:* A Next.js and FastAPI app that sent YouTube transcripts to Gemini and drew the result with React Flow, built in four commits in one day. It looked complete, but it could not be installed and run from scratch.

| # | Mistake | What actually happened | Lesson |
|---|---|---|---|
| 1.1 | **Committed a real API key** | Commit `5bd6dd8` hardcoded a Google key as a default in `config.py`. The next commit removed it, but the repo is public and git history keeps it. | Removing a secret doesn't un-leak it. Rotate it, and never give secrets default values. |
| 1.2 | **Pins that could never install** | `pydantic==2.6.1` conflicted with `langchain==0.3.13`, so `pip` failed with `ResolutionImpossible`. | Test installs in a clean environment, not one that grew over time. |
| 1.3 | **Config that crashed the deploy** | `render.yaml` set `CORS_ORIGINS` as a comma-separated string. pydantic-settings tried to parse it as JSON and raised `SettingsError` at import, before my custom parser ran. | Run the app with the exact environment production will use. |
| 1.4 | **Hid a broken API from the compiler** | `react-player` was v3, but the code used the v2 API (`url`, `seekTo`). A hand-written `react-player.d.ts` declared the old API, so TypeScript passed while the video had an empty `src`. | A type file you write yourself is a claim, not a check. A passing build doesn't mean it runs. |
| 1.5 | **Hardcoded a model that got retired** | `gemini-1.5-flash` was shut down in September 2025, and the docstrings said "1.5 Pro" anyway. | Treat external model names as configuration. |
| 1.6 | **Left the database open** | The migration used `GRANT ALL` to `anon` with an RLS policy of `USING (true)`, and the browser wrote directly to Supabase. Anyone could delete every map. | RLS being on means nothing if the policy allows everything. |
| 1.7 | **Built an API and didn't use it** | The backend had a full `/maps` API, but the frontend went around it. The API's bugs stayed hidden: a missing map returned 500. | Unused code isn't tested code. |
| 1.8 | **Failed silently** | Map listing returned `success: true` with no database, saves failed without a word, long transcripts were cut off quietly, and PDF "transcription" returned placeholder text as success. | A fake success is worse than an error. |
| 1.9 | **Promised what didn't exist** | The README advertised PDFs and audio, while those classes were stubs marked `TODO`. | Document what runs today, and put plans in a separate list. |
| 1.10 | **Layout constants that disagreed** | Subtopic columns were 200 px apart but nodes were 260 px wide, so they overlapped. | Derive related numbers from each other, or at least look at the result. |
| 1.11 | **Shipped placeholder deploy config** | `vercel.json` pointed at `your-backend-url.onrender.com`. | Config that has never been used is a guess. |
| 1.12 | **No tests** | Zero tests, so nothing ever exercised the real flow. | Without a test or a real run, "done" only means "written". |

### Layer 2 - The rebuild (November 2026)

*What I did:* Audited everything, measured a baseline, then fixed it in six commits, verifying each from a clean install. I kept the stack and the UI, and scoped it to YouTube only.

| # | Decision | Why |
|---|---|---|
| 2.1 | Fixed the pins and CORS parsing first | Nothing else could be tested until the backend booted (1.2, 1.3). |
| 2.2 | Made the model a setting, and chose it by testing | `gemini-3.8-flash` was newest but hung, while `gemini-3.5-flash` answered in 1.7 s (1.5). |
| 2.3 | Used REST and a worker thread for Gemini | A plain `curl` worked while the library hung, which separated the key and model from the client. |
| 2.4 | Deleted the type shim and used react-player's real API | The compiler can now catch this kind of bug (1.4). |
| 2.5 | Replaced `onReady` with `durationchange` | YouTube can fire the event `onReady` depends on too early to catch, which left an endless spinner. |
| 2.6 | Updated playback time first when seeking | The active node comes from the time, so a paused click snapped back. |
| 2.7 | Upgraded Next.js to 15.5.29, not just 15.0.8 | Measuring showed 15.0.8 fixed nothing. |
| 2.8 | Gave each YouTube failure its own status | `503` means retry later and `404` means don't, and a blanket 500 lost that. |
| 2.9 | Kept `max_output_tokens` at 8,192 | I suspected it was too low, but a long-transcript test gave the same 19 nodes at 32,768. |
| 2.10 | Moved all database access to the backend | Removing the browser's access is simpler and safer than writing policies for it (1.6, 1.7). |
| 2.11 | Upgraded the Supabase client | Version 2.3.4 rejected the new `sb_secret_` keys with `Invalid API key`. |
| 2.12 | Removed about 1,300 lines of unused code | Stubs and unused routes were misleading (1.8, 1.9). |
| 2.13 | Added 37 tests that fake only the outside services (48 after later features) | They run in under a second and can't trigger a YouTube block (1.12). |
| 2.14 | Stayed local-first | YouTube's IP blocks make a hosted version unreliable with this design. |

One rebuild mistake is worth recording: my CORS fix in 2.1 broke the JSON format `docker-compose.yml` used, and I only caught it while reading that file for the cleanup. Now it uses the comma format, and a test covers that format.

*Known gaps I chose not to fix:* Next.js 16 upgrade, LangChain upgrade, authentication, deployment, an evaluation set for graph quality, frontend tests, a full Docker build.

### Layer 3 - The Loom redesign (November 2026)

*What I did:* After using the working app myself, I added renaming and redesigned the interface around one idea: a conversation is a thread, and it should light up as you watch.

| # | Decision | Why |
|---|---|---|
| 3.1 | Chose a concept before any styling | "The Loom" made the name literal and gave every later choice a test. |
| 3.2 | Kept saturated colour for threads and the main action | Everything else is ink and parchment, so the threads are what you notice. |
| 3.3 | Updated threads on topic change, not on each time tick | The result only changes when a new topic starts, so per-tick work would be wasted. |
| 3.4 | Replaced fake demo data with an empty state and a labelled sample | Fake data on first load looks like a real result. |
| 3.5 | Made the URL the source of truth for what's on screen | It fixed New Graph doing nothing, and gave shareable links and the active-row highlight together. |
| 3.6 | Labelled timed loading stages honestly | The server doesn't report progress. A real 19-minute talk took about 50 s, so I corrected my first "10 to 30 seconds" copy. |
| 3.7 | Fixed the sidebar overflow at its cause | Radix's scroll area uses `display: table`, which ignores `truncate`. |
| 3.8 | Added a `websockets` pin | Supabase's realtime package declares `>=11` but needs 13+, which broke an older virtual environment. |
| 3.9 | Rejected reading whole videos with Gemini | Video costs far more tokens than a transcript, and this project has to stay on free tiers. |
| 3.10 | Reused saved maps by video ID | A repeat request costs nothing, which matters most on free quotas. |
| 3.11 | Raised the transcript limit to 300,000 characters and `max_output_tokens` to 32,768 | This reverses 2.9: at larger sizes the 8,192 limit cut the JSON off mid-reply. |
| 3.12 | Accepted Gemini replies as a list of parts | A reply can arrive as a list instead of a string, which crashed parsing intermittently. |
| 3.13 | Moved saving to the server and added a read-only mode and a daily cap | Before going public, anyone could have written to the database or spent the free AI quota. |
| 3.14 | Tested YouTube from the real host, then made the live site a showcase | A real request from Render was blocked. An honest showcase beats a link box that can only fail. |

Two testing mistakes are worth recording. I reported that `npm run dev` loaded slowly, but the browser pane I was testing in was hidden and throttled. And one JSX comment in the wrong place broke the running app, right after I'd described the fix as done.

### Key takeaways

1. **A passing build is not a working app.** Mine compiled while the video player couldn't load a video.
2. **Test from a clean install.** That is what exposed the impossible dependencies and a leftover import.
3. **Measure before you change things, and measure at the extremes.** It ruled out the "smaller" Next.js patch, while a limit that looked fine at 19 nodes broke at larger sizes.
4. **Newest isn't the same as working.** The latest listed model was the one that hung.
5. **Isolate the layers when something hangs.** A plain `curl` showed which part was at fault in minutes.
6. **Fail loudly.** Every silent success here hid a real bug.
7. **The safest credential is the one the browser never has.**
8. **A fix can break something elsewhere.** Search for everything that depends on the behaviour you change.
9. **Check your test setup before trusting its numbers.** A hidden browser tab made a healthy page look slow.
10. **Design from one idea.** A single concept decided colour, motion and copy, and that's what made it feel designed.

## Future improvements

**AI and graph quality**
- Handle transcripts over 300,000 characters: split them into chunks and merge the graphs.
- Make the level of detail consistent, perhaps by asking for a node count based on video length.
- Build an evaluation set of 10 to 30 real videos, measuring topics, timestamps, cost and latency.
- Validate model output: timestamps within the video, start before end, no edges to missing nodes.
- Improve speaker detection, for example with diarization.
- Choose the output language for non-English videos.
- Add a model fallback or startup check, since model availability changes.

**Product**
- Report real progress from the server while processing; the current stages are timed estimates.
- Save graph edits and node positions.
- Add PDF, audio and long-document input.
- From the original plan: searchable nodes, topic importance scoring, sentiment mapping, comparing speakers' perspectives, exportable maps.
- Build proper pages for import, history and settings.

**Deployment and reliability**
- Allow new videos on the live site if a free way around YouTube's cloud blocking appears.
- Add authentication and per-user maps so visitors can have their own timelines.
- Reduce free-tier cold starts, which can make the first visit take about a minute.

**Technical debt**
- Upgrade or replace LangChain and remove the REST and worker-thread workaround.
- Upgrade to Next.js 16 and FastAPI's current release, then lift the `httpx` pin.
- Replace the deprecated `next lint` with the ESLint CLI.
- Add frontend tests and CI.
- Run and verify a full Docker build.
- Set a fixed `search_path` on the `updated_at` trigger function, as the Supabase advisor suggests.

## License

MIT
