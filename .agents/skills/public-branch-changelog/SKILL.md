---
name: public-branch-changelog
description: Review the current Git branch and produce a public-facing Markdown changelog for the official FedRAMP 2026 rules site. Use when the user asks for a changelog, branch changelog, public change summary, or summary of all changes on the current branch.
---

# Public branch changelog

Produce a concise changelog for readers who need to understand what changed without reading code. Do not edit `content/changelog.md` or any other file unless the user explicitly asks.

## Determine the change set

1. Inspect the branch and working tree:

   ```bash
   git branch --show-current
   git status --short
   ```

2. Determine the default branch from the local origin HEAD when available:

   ```bash
   git symbolic-ref --short refs/remotes/origin/HEAD
   ```

   Use `origin/main` only as a fallback. Fetch `origin` first when freshness matters and network access is available.

3. Find the merge base and review committed changes, replacing `<default-ref>` and `<merge-base>`:

   ```bash
   git merge-base HEAD <default-ref>
   git diff --name-status <merge-base>...HEAD -- . ':(exclude)tools/rules/**'
   git diff --stat <merge-base>...HEAD -- . ':(exclude)tools/rules/**'
   git log --oneline <merge-base>..HEAD -- . ':(exclude)tools/rules/**'
   ```

4. Review uncommitted and untracked work:

   ```bash
   git diff --name-status -- . ':(exclude)tools/rules/**'
   git diff --stat -- . ':(exclude)tools/rules/**'
   git ls-files --others --exclude-standard -- . ':(exclude)tools/rules/**'
   ```

   Include this work when the request concerns the current branch generally, unless it is clearly unrelated. Ask before including it only when doing so would materially change the public summary.

## Apply the changelog scope

- Summarize this repository only.
- Don't include changes to the changelog in the changelog.
- Ignore `tools/rules/**`. Do not inspect or summarize submodule contents.
- Do not treat `src/` or `html/` as independent source changes. Use them only to verify generated pages and URLs.
- **Content updates:** Cover every changed public page under `content/`. State what changed for readers in no more than two sentences and link the public page. Group changes that only affect spelling, formatting, or metadata.
- **Site structure:** Summarize navigation, titles, placement, additions, removals, or renamed pages from `zensical.toml`.
- **Generated page experience:** Describe public effects caused by `tools/config.json`, templates, partials, or generation scripts. Summarize the result, not the implementation. Include at most two example links.
- **Tooling:** Briefly group tests, build scripts, type checking, dependencies, hooks, and developer workflow changes.

## Build public links

Read `site_url` from `zensical.toml`. Strip the leading `content/` or `src/`, remove `.md`, and treat `index.md` as its parent directory:

- `content/index.md` maps to the site root.
- `content/foo/index.md` maps to `/foo/`.
- `content/foo/bar.md` maps to `/foo/bar/`.

For generated pages, derive the output path from `tools/config.json`, `src/.generated-markdown.json` when present, or the built `src/` tree.

## Write for public readers

- Use plain language and active voice.
- Start entries with concrete verbs such as Added, Updated, Clarified, Moved, Removed, Renamed, or Improved.
- Explain the public meaning of the change.
- Avoid commit hashes, internal paths, implementation detail, hype, and vague phrases such as "miscellaneous updates."
- Keep most entries to one sentence.
- Consolidate aggressively on large branches while covering every changed narrative file in `content/`.
- Omit empty sections.

## Return only the changelog

Return only a fenced Markdown block, with no commentary before or after it:

````markdown
```markdown
## Branch Changelog

### Content Updates

- [Page Title](https://fedramp.gov/2026/path/): Clarified ...

### Site Structure

- Added [Page Title](https://fedramp.gov/2026/path/) to ...

### Generated Page Experience

- Updated generated rule pages to ...

### Tooling

- Improved checks for ...
```
````
