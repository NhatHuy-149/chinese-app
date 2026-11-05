# Legacy app

`index.html` is the original single-file app (about 2 MB), kept unchanged so it
still opens in a browser. Its embedded data (DATA, PW, PARAGRAPHS, WRITE_DATA,
STROKE_DATA) is extracted to `legacy/data/*.json` by `scripts/extract-legacy.ts`.

The only change to index.html is an appended "Xuất dữ liệu cũ" button (2026-11-05) that
exports the old localStorage progress (API key excluded) for import into the new app.

Nothing here is deleted without the owner's approval (see CLAUDE.md).
