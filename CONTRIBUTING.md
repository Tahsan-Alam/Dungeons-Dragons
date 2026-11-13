# Contributing

Everyone works from this repository. Use one small branch and pull request per task; `main` is the shared working version. We do not need a separate `develop` branch.

## First setup

Follow [Run locally](README.md#run-locally). Use Node 26. Solo play and automated tests work without AI credentials. Initialize the local database only when testing online rooms.

## A normal contribution

1. Choose a task from [ROADMAP.md](ROADMAP.md), or open a GitHub issue describing a bug or feature. Say who is working on it to avoid duplicate work.
2. Update your local copy and create a branch:

   ```sh
   git switch main
   git pull --ff-only origin main
   git switch -c feature/narrator-audio
   ```

   Use a short descriptive name, such as `fix/mobile-menu` or `feature/new-encounter`.
3. Make and test the change. Use `npm run check` for types, automated tests and a production build. For UI work, also check a phone-sized and desktop-sized window.
4. Commit and push your branch:

   ```sh
   git add <the-files-you-changed>
   git commit -m "Describe the change"
   git push -u origin feature/narrator-audio
   ```

5. Open a pull request into `main`. Explain what changed and how you checked it. Link its issue with `Closes #123` when applicable. Ask another teammate to review it, then merge after the checks pass. Squash merging is convenient for a single task, but not required.
6. Update the roadmap when a checkpoint is completed. Keep the actual work and contribution history in commits, issues and pull requests.

The PR review convention is a team agreement; branch protection has not been configured. The repository owner can enable it later.

## Versions

Current checkpoint: **`v0.1.0-alpha.1`**.

- `alpha.1`, `alpha.2`, `alpha.3`: playable experiments; features and saves may change.
- `0.1.0-beta.1`: the planned first-release features are in place; focus on testing and fixes.
- `0.1.0`: the first tested release of that scope. Use later minor versions for new features and patch versions for fixes.

Use commits for everyday progress. Only create a version at a useful demonstration or submission checkpoint; do not number every pull request.

For a new checkpoint, a maintainer updates the version in `package.json` and `package-lock.json`, adds its notes to [CHANGELOG.md](CHANGELOG.md), merges those changes, then tags the tested commit:

```sh
git switch main
git pull --ff-only origin main
# Example for the NEXT checkpoint, after updating the package version and changelog:
git tag -a v0.1.0-alpha.2 -m "Second alpha checkpoint"
git push origin v0.1.0-alpha.2
```

Keep published tags fixed. If a checkpoint needs a correction, make another commit and version. GitHub's Tags page provides source downloads; a formal GitHub Release is optional. Mark alpha/beta releases as pre-releases if using Releases.

## Hosting and credentials

A GitHub push shares code; it does not publish the hosted game. Coordinate publication with the current site maintainer. Keep the existing `.openai/hosting.json` identity and database configuration intact unless intentionally changing hosting.

Do not commit API keys, `.env` files, `.dev.vars` files, local databases, browser saves or generated build output. Use the scripted AI fixtures for ordinary development. Agree on a provider, budget and server-side secret setup before enabling paid model calls.

## Team AI development

Follow [TEAM-DEVELOPMENT.md](TEAM-DEVELOPMENT.md). Each person uses their own feature branch, local database and server-side project key. The stable ChatGPT Site remains the shared demo; it is not needed to test your changes with AI. The normal configuration requires no AI password. Each database has its own spending ledger, so agree on budgets before enabling paid testing. Fixtures and automated tests make no provider calls.
