# Artifact Center · 产物中心

Find the file a DSH conversation produced, together with its workspace and conversation history.

[中文说明](README.zh-CN.md) · [Requirements](docs/requirements.zh.md) · [Acceptance record](docs/acceptance.zh.md) · [MIT](LICENSE)

## Features

- A global sidebar panel that works without an active conversation.
- Historical backfill from complete session events, including file writes, edits and explicitly presented deliverables.
- Live workspace snapshots at turn end to detect shell and subprocess outputs. Large output bursts are summarized rather than flooding the list.
- Workspace/tag/date filters, favorites, notes, bounded text-content search and a virtualized list. Check or uncheck extensions directly under “Readable formats” to control visibility; the choice is saved in this browser.
- Native image, PDF, Markdown, Mermaid, text/code, CSV/TSV, sandboxed HTML and media previews. Office files and binaries use the system's applications; no format conversion takes place.
- Conversation links, path/link copying, file-handler selection, provenance history and CSV/Markdown export.
- Missing-file checks and confirmed moves to the system trash. Retrieve a file using your file manager, then check files to restore its index status.
- A read-only `artifact_search` Agent tool and Chinese/English UI.

History records provenance and metadata; it **does not preserve old file contents**. Snapshot results are labeled as inferred because filesystem changes cannot prove which concurrent task caused them. Historical shell outputs that have no recorded path cannot be reconstructed from current files alone. Starting with 0.1.2, a separate provenance table preserves recorded outputs and annotations when the derived list cache is rebuilt. Persisted turn checkpoints survive restarts; completed turns are recovered without including files modified after their recorded end time. Removing the entire storage domain also removes provenance and annotations. `enableBetterSidebar` is reserved; delegation to that optional plugin is not implemented. The built-in Markdown and Mermaid renderers work independently.

## Install

From npm (published baseline: 0.1.0):

```sh
dsh plugin --profile web add dsh-artifact-center
```

Or install the repository while directory review is pending:

```sh
dsh plugin --profile web add github:YQing0123/dsh-artifact-center
```

Restart the Host and refresh the browser. The Electron-managed `desktop` profile must be installed through its plugin manager; do not manage it with CLI commands. Market availability depends on acceptance of the [directory entry](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).

## Configuration

The plugin ID is `artifact-center`. Override settings in the profile's `cordis.patch.yml`:

```yaml
- update:
    artifact-center:
      config:
        backfillOnStart: true
        snapshotOnTurnEnd: true
        burstThreshold: 500
        maxIndexedFiles: 50000
        previewMaxBytes: 20971520
        textMaxBytes: 1048576
        validationIntervalMs: 300000
        readableExtensions:
          - md
          - txt
          - json
          - yaml
          - yml
          - csv
          - js
          - ts
          - png
          - jpg
          - pdf
        autoTags:
          - name: Deliverable
            kind: glob
            value: outputs/**
          - name: Spreadsheet
            kind: ext
            value: xlsx
```

Automatic tag rules accept `glob`, `ext` and `session` (conversation-title substring). `readableExtensions` is a whitelist of extensions without the leading dot; the Artifact Center navigation shows the active list under “Readable formats”. An empty list uses all built-in supported formats. Files outside this whitelist are not indexed or content-read. Default ignored directories: `.git`, `node_modules`, `dist`, `build`, `.next`, `__pycache__`, `.venv`, `target`, `.cache`, `.dsh`. `ignorePatterns` replaces the default list when explicitly supplied. State is held through the Host's `storageDomain` API under `artifact_center`.

HTTP routes under `/artifact-center/*` require the Host's browser authentication and same-origin request guard. Only indexed files inside their registered workspace can be read or opened; outside symlinks are rejected. HTML previews cannot execute scripts or access the network. Text search reads at most `textMaxBytes` per candidate; it is not a semantic or binary-document search engine.

## Agent tool

`artifact_search(query, workspace?, type?, tag?, since?, limit?)` returns matching metadata and paths. `workspace` accepts an ID or title; types include `doc`, `sheet`, `slide`, `image`, `web`, `data`, `code`, `media`, `archive` and `other`. `since` is an ISO timestamp and `limit` is at most 100. Missing and trashed files remain labeled in results.

## Development

Host and UI are plain JavaScript. Only the lazy Mermaid renderer is independently bundled; no Harness build preset or internal UI package is imported.

With the isolated development Host and authenticated `artifact-p0` browser running, `npm run test:ui` checks fixture-only previews, tag errors and a 10,000-record virtual list. API writes are intercepted and never reach real storage or system actions. `npm run test:locale` checks the English UI and restores the original language preference.

```sh
npm ci --legacy-peer-deps
npm run build:vendor
npm run check
npm test
npm pack
```

Renderer bundles and license notices are committed and shipped, so installation does not run a compiler. Test probes are excluded from the npm package and load only through a separate development overlay. Read [development notes](docs/dev-notes.zh.md) and [implementation corrections](docs/implementation.zh.md) before changing the integration.

The reference acceptance Host is DSH `0.1.7-rc.2`. Desktop `0.2.0` compatibility is declared in the optional native-opener peer range, but desktop installation must also pass that Host's plugin manager and browser acceptance. Older sessions rejected by the Host's migration are reported individually; their raw logs are never modified by this plugin.

## License

MIT. Browser renderers and their dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `vendor/`.
