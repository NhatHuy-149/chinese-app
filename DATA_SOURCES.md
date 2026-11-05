# Data sources and licenses

All third-party data is downloaded by `npm run data:fetch`, pinned to exact versions.
Raw files live in `sources/raw/` (git-ignored).

| Source | Version | Used for | License | Shipped in the app? |
|---|---|---|---|---|
| Hand-written legacy data (`legacy/index.html`) | — | meanings, Han-Viet, character explanations, dialogue and paragraph sentences | owner's own work | yes (`source: "manual"`) |
| [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) | commit `7ac65bf` | candidate words, HSK levels, part of speech, classifiers, frequency rank | MIT (repository) | word list and pinyin only |
| ↳ English glosses inside it | — | LLM input at build time | derived from CC-CEDICT (CC BY-SA; 3.0 or 4.0, unconfirmed) | **no** |
| ↳ frequency rank inside it | — | ordering words by everyday frequency | derived from SUBTLEX-CH via krmanik/HSK-3.0-words-list ("free for research", no explicit license) | **no** (the app ships its own ordinal `freqRank`) |
| [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) `graphics.txt` | commit `bddc96d` | stroke data for Hanzi Writer | Arphic Public License | yes (`public/data/strokes/`) |
| Make Me a Hanzi `dictionary.txt` | commit `bddc96d` | radical and decomposition of new characters | LGPL v3+ | yes (radical, parts) |
| [Unihan](https://www.unicode.org/charts/unihan.html) `kVietnamese` | Unicode 16.0.0 | Han-Viet hints for the LLM | Unicode License v3 | **no** (hints only) |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | npm 3.x | pinyin cross-check | MIT | build-time (and later the Speak screen) |
| Claude (Anthropic API) | `claude-sonnet-5-5`, `claude-opus-5-5` | everyday filter, topic, Vietnamese meaning, Han-Viet, example sentences, second-pass review | generated content | yes, marked `source: "ai"` / `aiFields` |

Notes
- Stroke data for the 616 legacy characters comes from the legacy app (originally Make Me a Hanzi via Hanzi Writer); the others come straight from Make Me a Hanzi.
- AI-generated fields are listed per word in `aiFields`; entries the reviewer doubted carry `needsReview: true` and are listed in `docs/needs-review.md`.
