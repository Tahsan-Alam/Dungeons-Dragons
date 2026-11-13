# Team development

Use GitHub `main` as the code baseline, individual branches/local servers for work, and the existing ChatGPT Site as the stable shared demo. Changes can be tested with AI locally before anyone publishes. This does not require moving hosting or keeping the owner's PC online.

## First setup on each computer

Install Node 26 and Git, then:

```sh
git clone https://github.com/Tahsan-Alam/Dungeons-Dragons.git
cd Dungeons-Dragons
npm ci
npm run local:setup
git switch -c feature/your-task
npm run dev -- --port 5347 --hostname 127.0.0.1
```

Open the URL printed by the server. `local:setup` creates `.dev.vars` from the example only if absent, builds the application, and initializes/upgrades the checkout's local D1 database. Rerunning preserves saves, settings and spending records. Stop running servers before rebuilding on Windows. Unsupported future migrations stop with an instruction to review them rather than resetting data.

## Enable AI for your version

Ask the owner to invite you to the funded OpenAI project and use a separate project key for development. Everyone can use the same billing account without copying one person's key between computers. Keep each key only in that computer's ignored root `.dev.vars`:

```dotenv
OPENAI_API_KEY=<your development project key>
AI_ACCESS_MODE=open
AI_MODE=openai
AI_ENABLE_PAID=I_ACCEPT_SMALL_API_CHARGES
AI_ENABLE_AUDIO=I_ACCEPT_PAID_AUDIO
AI_PLANNER_MODEL=gpt-6-luna
AI_CAMPAIGN_MICRO_USD=400000
AI_DAY_MICRO_USD=1000000
AI_MONTH_MICRO_USD=4000000
```

Restart after changing this file. These example limits allow $0.40 per creation/campaign scope, $1 per UTC day and $4 per UTC month **for this checkout**. Voice can use shorter funded windows at this campaign allowance; longer calls require enough remaining allowance. Leave `AI_ENABLE_AUDIO=DISABLED` for text-only development. `AI_MODE=fixture` turns paid work off. Never put credentials in browser code, Git, screenshots or chat.

AI settings shows availability and server limits; open mode has no password prompt. Enable AI there if this browser was previously opted out. Create an adventure, send a message and look for “Last reply from AI.” Missing credentials, provider failures or exhausted allowance are reported instead of presenting built-in drafts as live AI.

The hosted $25/month ceiling stays unchanged. **Local ledgers do not share it:** three $4 development allowances can add $12 on top of hosted usage. Agree on the total with the owner before testing; app reservations are conservative estimates, not verified billing. Never delete a ledger to regain allowance. Separate keys enable revocation and attribution, not a global app budget. Provider controls are managed separately.

## Can we use one shared key?

The app accepts the same development API key in each person's local .dev.vars; no code change is needed. Sharing is the fewest initial steps, but every copy has the same permissions and rotating it means updating all computers. It also makes individual usage harder to identify. Keep a dedicated development credential separate from the hosted production key, and transfer it only through a private secret-sharing tool, never Git or chat.

Our recommendation remains one key per teammate under the same funded project. Invite the two teammates once, let each create their project key, and keep the same setup commands. OpenAI recommends project membership instead of sharing personal keys: https://help.openai.com/en/articles/5008148-can-i-share-my-api-key-with-my-teammatecoworker

Either arrangement uses the project's billing and does not combine the separate local spending ledgers. No keys are created or copied by local:setup.

## Work together

1. Claim a GitHub issue with one owner and a clear result. Coordinate shared types, routes, schemas and global styles before editing them.
2. Start each task from updated `main`: `git switch main`, `git pull --ff-only origin main`, then create a feature branch. Commit or stash your own work before switching.
3. Develop/test locally. Rerun `npm run local:setup` after schema changes and `npm ci` when the lockfile changes. Run `npm run check` before review; check desktop/mobile light and dark modes for visible changes.
4. Push the branch and open a PR. Another teammate can check out that branch and run it with their own `.dev.vars` and database. Separate clones allow two versions on different ports without mixing saves.
5. Review, merge into `main`, then have one release coordinator publish the agreed commit to the existing ChatGPT Site. A push or merge alone does not deploy it.

## Share a preview

For now, teammates can check out a branch or screen-share their local version. `127.0.0.1` URLs are private to that computer, not public preview links.

Cloudflare branch previews are a possible next step for browser-only review. They are **not configured by this change**: they require an account, supported tooling, a separate deployment target, server secrets and explicit database isolation. Do not point development at the production database or change `.openai/hosting.json` to make a preview. Local development already enables independent AI testing without that setup.

Open AI access means any visitor who can reach that deployment can use its allowance. Local servers bind to loopback by default. If you later expose a preview publicly, choose its audience deliberately; keys remain server-side, but visitors share its budget.
