# Phase 0 — Khảo sát và đề xuất

Ngày: 2026-11-05. Không sửa code. Chỉ tạo `CLAUDE.md` (mục 1 + 2 của prompt) và file này.
Số liệu bên dưới đo bằng script đọc trực tiếp `index.html` (Node, chỉ đọc).

---

## Quyết định đã chốt

**2026-11-05: Từ vựng**
- Tiêu chí chọn từ là **dùng trong giao tiếp đời sống thật**. HSK chỉ dùng làm nguồn ứng viên, không dùng làm tiêu chí chọn.
- **Giữ toàn bộ từ cũ** (cả chữ đơn và cụm) với `source: "manual"`. Cụm được gắn `type: "phrase"`.
- **Tổng số từ không bó buộc ở 2500.** Kho = từ cũ + khoảng 2500 từ giao tiếp thông dụng nhất. Trùng giữa hai nhóm thì chỉ tính một lần. Giao diện, mốc và dự báo dùng **tổng thực tế** ("x / N từ"), không ghi cứng 2500.

Chi tiết cách chọn: xem mục C (đã cập nhật).

**2026-11-05: Mục tiêu, giờ, model, hạ tầng**
- **Từ mới mỗi ngày:** mặc định 20, chỉnh được từ 5 đến 50.
- **Mục tiêu Nói:** 10 câu/ngày, tính theo số câu. Các mục tiêu khác giữ như prompt: ôn 20 từ, viết 5 câu, nghe 2 đoạn.
- **Mốc đổi ngày:** 04:00 giờ địa phương.
- **Model:**
  - `claude-haiku-5-5` cho `check-sentence`.
  - `claude-sonnet-5-5` cho `correct-speech` và `listening`.
  - Cả hai đặt qua biến môi trường.
- **Git:** khởi tạo repo cục bộ; người dùng sẽ kết nối remote.
- **Hosting: Netlify.** Lý do:
  - Có kết nối Netlify MCP trong phiên làm việc, nên Claude Code đọc, cấu hình và triển khai trực tiếp được.
  - Tài khoản Netlify của người dùng đã liên kết GitHub `NhatHuy-149`.
  - Theo tài liệu Netlify (lấy qua MCP ngày 2026-11-05): function đồng bộ chạy tối đa 60 giây, streaming 60 giây; có sẵn `config.rateLimit` theo IP và Netlify Blobs cho cache. Con số 10 giây ghi trước đây lấy từ một bài cũ trên diễn đàn, nay không còn đúng.
  - Logic LLM vẫn viết độc lập với nền tảng.
- **Chuyển tiến độ cũ:** app mới sẽ chạy trên domain mới, nên không đọc được `localStorage` của app cũ. Cách làm: thêm nút "Xuất dữ liệu cũ" vào `legacy/index.html`, mở app cũ tại nơi đang dùng, xuất file JSON, rồi nhập file đó vào app mới. Cách này dùng được bất kể app cũ đang mở ở đâu.

- **Không dùng SUBTLEX-CH.** Xếp hạng tần suất dùng trường `frequency` trong repo drkameleon (MIT), kết hợp bước LLM gắn nhãn `everyday` (mục C, bước 3). Nguồn gốc của con số tần suất này sẽ được ghi vào `DATA_SOURCES.md` ở Phase 1.

---

## A. Hiện trạng `index.html`

**Kích thước:** 2,06 MB, 8 484 dòng, một file duy nhất. Thư mục chưa có git.

| Khối | Dung lượng | Nội dung đo được |
|---|---|---|
| `STROKE_DATA` | **1 381 KB (67% file)** | 616 chữ, mỗi chữ `{strokes, medians, radStrokes}` (Make Me a Hanzi) |
| `DATA` | 295 KB | 452 thẻ câu, 15 buổi (`section`), 849 mục từ → **670 từ duy nhất** |
| `PW` | 101 KB | 557 từ dùng trong đoạn văn (42 từ không có trong `DATA`) |
| `PARAGRAPHS` | 58 KB | 30 đoạn, 199 câu, 12 chủ đề; mỗi đoạn 42–182 chữ (TB 104) |
| `WRITE_DATA` | 49 KB | 616 chữ, 148 bộ thủ, 465 nghĩa chữ, ghi chú bộ thủ |
| HTML/CSS/JS còn lại | ~180 KB | 9 tab, quiz engine, highlight, kiểm câu |

**Cấu trúc thẻ `DATA`:** `section?, time, mark, hanzi, pinyin, viet (phiên âm bồi), meaning, words[]`; `word = {h, p, hv, m, st}`.

**Chất lượng dữ liệu từ (quan trọng cho Phase 1):**
- 670 "từ" gồm: 184 chữ đơn, 421 từ 2 chữ, 61 từ 3 chữ, 4 cụm 4 chữ. Một phần **không phải mục từ điển**: chữ đơn tách từ từ ghép (今, 天…), cụm như `桌子上`, `给他们`, `你怎么了`, `又…又…`.
- 24 chữ Hán có nhiều cách ghi pinyin/nghĩa khác nhau tùy ngữ cảnh: `谢谢 xièxiè / xièxie`, `下雨 xià yǔ / xiàyǔ`, `的` (sở hữu / ngữ khí), `在`, `好`…
- 13 từ thiếu Hán Việt (hư từ như 的 吗 呢 吧, và 爸爸 妈妈, 桌子上 给他们) — hợp lý, không cần bịa.
- 670/670 từ có chiết tự (600 có thẻ `<b>`). Đây là tài sản quý nhất.
- Buổi `sing-1` là lời bài hát ("你看啊春日的蝴蝶…") — nên giữ ở legacy, không dùng làm nội dung nghe/nói chuẩn.
- 633 chữ khác nhau trong DATA+PW, 616 có nét chữ (17 chữ thiếu).

**9 tab hiện có:** Hội thoại (thẻ chat + nghe TTS + **ghi âm, nhận diện giọng nói, chấm khớp LCS** — đã có sẵn một bản shadowing thô), Từ vựng (tìm kiếm, chiết tự), Ôn từ vựng (trắc nghiệm 2 chiều, tự đánh dấu thuộc sau 3 lần đúng liên tiếp), Ôn câu (trắc nghiệm + điền chỗ trống), Luyện đọc, Đoạn văn (ẩn/hiện pinyin, nghĩa), Luyện viết (theo bộ thủ, Hanzi Writer, in giấy tập viết), Ghi chú (tô màu 4 màu + ghi chú), Kiểm câu (gọi Claude qua `window.claude` hoặc API key dán vào trình duyệt; có chế độ copy prompt thủ công; lưu câu; sao lưu JSON câu).

**Khóa `localStorage`:**

| Khóa | Dạng | Dùng ở app mới |
|---|---|---|
| `hztMasteredWords` | mảng chữ Hán | → trạng thái "đã biết" ban đầu (sự kiện `import`) |
| `hztWordStreaks` | `{hanzi: số lần đúng liên tiếp}` | → gợi ý hộp SRS ban đầu cho từ chưa thuộc (tùy chọn) |
| `hztAutoMaster` | boolean | bỏ |
| `hztWritten` | mảng chữ đã tập viết | giữ trong bản xuất legacy |
| `hztHighlights` | `{id,key,s,e,text,color,note,ts}[]` | giữ trong bản xuất legacy (ghi chú cá nhân) |
| `hztMySentences` | `{id,input,hanzi,pinyin,meaning,corrections,note,ts}[]` | → bộ ôn câu (giữ `ts` gốc, sự kiện `import`) |
| `hztApiKey`, `hztApiModel` | chuỗi | **không chuyển**; khuyên người dùng thu hồi key cũ |

**Tái sử dụng được:** toàn bộ dữ liệu (DATA, PW, PARAGRAPHS, WRITE_DATA, STROKE_DATA); prompt + `parseResult` của Kiểm câu (đã có chống prompt injection cơ bản); logic chọn giọng TTS và cảnh báo khi không có giọng zh; logic ghi âm `MediaRecorder` + `SpeechRecognition`. Giao diện thì viết lại.

---

## B. Kiến trúc đề xuất

Giữ đề xuất của prompt: **Vite + React + TypeScript + Tailwind**, vì bạn quen stack này và chia module nhỏ dễ chỉnh. Không thấy phương án đơn giản hơn đáng đổi (Preact tiết kiệm ~30 KB nhưng thêm điểm khác biệt không cần thiết).

Thư viện (ít, nhỏ):
- `idb` (~1 KB) thay vì `idb-keyval`: nhật ký append-only cần object store riêng có index theo `ts`; `idb-keyval` chỉ lưu key→value, ghi thêm một sự kiện sẽ phải ghi lại cả mảng.
- `pinyin-pro` (MIT): **chỉ tải khi vào màn Nói** (gói từ điển khá nặng), và dùng trong script build.
- `zod`: ở Netlify Functions; phía client dùng để kiểm tra file nhập.
- `vite-plugin-pwa` cho PWA.
- `hanzi-writer` tải động khi bấm xem nét.
- Biểu đồ: **tự vẽ SVG** (cột xếp chồng, lịch nhiệt, đường nhỏ) — 3–4 component, không thêm phụ thuộc, dễ thêm nhãn chữ cho truy cập.

Dữ liệu tĩnh:
- `public/data/topics.json` (danh sách chủ đề + bộ học) và `public/data/words/<topic>.json`.
- Nét chữ: **tách mỗi chữ một file** `public/data/strokes/<chữ>.json` (thay khối 1,4 MB nhúng sẵn), PWA cache khi đã mở. Chữ mới lấy từ Make Me a Hanzi bằng script build.
- `public/data/listening-offline.json` từ 30 đoạn văn cũ + `key_points`.

Netlify Functions: `check-sentence`, `correct-speech`, `listening`. Lưu ý: function **không có trạng thái**, nên rate limit và cache cần một kho lưu — đề xuất **Netlify Blobs** (có sẵn trên Netlify, không thêm dịch vụ ngoài).

---

## C. Nguồn dữ liệu từ vựng và giấy phép

| Nguồn | Dùng cho | Giấy phép (đã tra) | Ghi chú |
|---|---|---|---|
| [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) | Danh sách HSK 2.0 + 3.0, có trường `frequency` | MIT | Trường tần suất lấy từ krmanik/HSK-3.0; **nguồn gốc gốc của con số tần suất chưa rõ**, Phase 1 sẽ kiểm |
| [SUBTLEX-CH](https://pmc.ncbi.nlm.nih.gov/articles/PMC2880003/) | Tần suất theo phụ đề phim (sát giao tiếp nhất) | "Miễn phí cho nghiên cứu", **không thấy giấy phép rõ ràng** | Chỉ đề xuất dùng lúc build để xếp hạng, không phát hành lại file |
| [CC-CEDICT](https://en.wikipedia.org/wiki/CEDICT) | Nghĩa tiếng Anh làm đầu vào cho LLM | CC BY-SA (wiki dự án ghi 3.0, các nguồn mới ghi 4.0 — chưa xác nhận trang MDBG) | Đề xuất **không đưa nghĩa tiếng Anh vào app**, chỉ dùng tham chiếu lúc build, để tránh ràng buộc share-alike lên dữ liệu |
| Make Me a Hanzi ([COPYING](https://github.com/yhong91/makemeahanzi/blob/master/COPYING)) | Nét chữ (`graphics.txt`), bộ thủ/phân tích (`dictionary.txt`) | graphics: Arphic Public License; dictionary: LGPL v3+ | App cũ đã dùng; ghi nguồn trong `DATA_SOURCES.md`. Có ý kiến cũ cho rằng Arphic PL có thể hạn chế thương mại — với app cá nhân không ảnh hưởng |
| [pinyin-pro](https://www.jsdelivr.com/package/npm/pinyin-pro) | Đối chiếu pinyin, so khớp lời nói | MIT | |

**Cách chọn từ (cập nhật theo quyết định ngày 2026-11-05):**
1. **Nguồn ứng viên:** toàn bộ HSK 2.0 ∪ 3.0 (khoảng 11 000 mục), lấy từ repo drkameleon.
2. **Xếp hạng theo tần suất khẩu ngữ.** SUBTLEX-CH lấy từ phụ đề phim và truyền hình, nên sát hội thoại đời thường nhất. Nếu không dùng được nó (vướng giấy phép), dùng trường `frequency` của drkameleon.
3. **Lọc bằng LLM lúc build:** gắn nhãn `everyday: true/false` để loại từ thiên về văn viết, học thuật hoặc chính trị dù tần suất cao. Phần đã lọc được ghi lại để bạn xem.
4. **Lấy khoảng 2500 từ đầu bảng sau khi lọc, rồi hợp với toàn bộ từ cũ.** Tổng không cố định.
5. **Ưu tiên hiển thị:** trong mỗi chủ đề, từ cũ đã học đứng trước, sau đó xếp theo tần suất.

---

## D. Danh sách chủ đề đề xuất (27)

1. Chào hỏi & giao tiếp cơ bản · 2. Câu giao tiếp thường dùng (cụm cố định) · 3. Đại từ & lượng từ · 4. Số đếm & đơn vị · 5. Thời gian & ngày tháng · 6. Gia đình & quan hệ · 7. Con người & ngoại hình · 8. Cảm xúc & tính cách · 9. Cơ thể & sức khỏe · 10. Ăn uống & nhà hàng · 11. Mua sắm & tiền bạc · 12. Quần áo & màu sắc · 13. Nhà cửa & đồ dùng · 14. Sinh hoạt hằng ngày · 15. Giao thông & du lịch · 16. Địa điểm & phương hướng · 17. Dịch vụ trong thành phố (ngân hàng, bệnh viện, bưu điện) · 18. Công việc & nghề nghiệp · 19. Học tập & ngôn ngữ · 20. Công nghệ & điện thoại · 21. Thời tiết & thiên nhiên · 22. Sở thích, thể thao & giải trí · 23. Động từ thông dụng: hành động · 24. Động từ thông dụng: tư duy & giao tiếp · 25. Tính từ thông dụng · 26. Trạng từ & mức độ · 27. Hư từ (giới từ, liên từ, trợ từ)

Rủi ro: các nhóm ngữ pháp (23–27) dễ vượt 120 từ; khi đó tách tiếp thay vì nhồi.

---

## E. Kế hoạch di chuyển dữ liệu cũ

1. **Phase 1 (script):** trích `DATA`, `PW`, `PARAGRAPHS`, `WRITE_DATA`, `STROKE_DATA` ra JSON trong `legacy/data/` (không sửa nội dung). Gộp vào danh sách từ mới với `source: "manual"`; script không bao giờ ghi đè trường `manual`. Từ có nhiều nghĩa theo ngữ cảnh (24 từ) giữ nghĩa chung + lưu các nghĩa ngữ cảnh làm ví dụ.
2. **`id` từ:** đề xuất `hanzi + pinyin số thanh` (ví dụ `好|hao3`) thay vì pinyin không dấu, vì không dấu sẽ trùng với chữ đa âm cùng âm khác thanh (好 hǎo/hào). Chuẩn hóa `xièxie`/`xièxiè`, bỏ khoảng trắng.
3. **localStorage chỉ đọc được trên cùng origin.** Nếu app cũ đang mở bằng `file://` hoặc domain khác app mới, app mới **không đọc được trực tiếp**. Đề xuất: thêm vào bản legacy một nút "Xuất toàn bộ dữ liệu cũ" (JSON gồm 6 khóa, trừ API key), app mới có màn nhập file đó. Đây là sửa nhỏ trên bản sao trong `/legacy`, không đụng file gốc.
4. Khi nhập: từ đã thuộc → SRS hộp cao ở cả hai chiều, lịch ôn kiểm tra rải đều trong ~3 tuần đầu (để xác nhận thật sự còn nhớ); ghi sự kiện `kind: "import"`, `countsAsPractice: false`. Câu đã lưu → bộ ôn câu.
5. `index.html` gốc chuyển nguyên vào `legacy/index.html`, vẫn mở được.

---

## F. Nhật ký sự kiện và biểu đồ

Giữ mô hình `PracticeEvent` của prompt, thêm:
- `v: 1` (phiên bản lược đồ, để nâng cấp về sau).
- `dev?: true` cho dữ liệu sinh bởi `seed-history`; app thật từ chối nhập file có sự kiện `dev`.
- `kind: "sentence-review"` (skill `write`) cho ôn câu đã lưu.

Lưu trữ: IndexedDB store `events` (keyPath `id`, index `ts`), store `srs`, `sentences`, `cache`. Mọi số liệu tính bằng hàm thuần trong `lib/stats` (dễ unit test), cache theo ngày, xóa cache khi có sự kiện mới.

Biểu đồ SVG tự viết: cột xếp chồng 4 kỹ năng (có họa tiết + chú giải chữ), lịch nhiệt 16 tuần (5 mức, có số khi bấm), đường nhỏ chất lượng (ẩn và ghi "chưa đủ dữ liệu" khi < 5 lượt).

---

## G. Lớp LLM: model và chi phí (đã tra, giá theo bảng ngày 2026-10-06)

| Model | Giá vào / ra (USD / 1M token) | Đề xuất dùng cho |
|---|---|---|
| `claude-haiku-5-5` | 0,10 / 0,50 | `check-sentence` (câu ngắn) |
| `claude-sonnet-5-5` | 2 / 10 | `correct-speech`, tạo đoạn nghe, chấm tóm tắt |
| `claude-opus-5-5` | 4 / 20 | dự phòng nếu Sonnet sửa chưa tốt; script build kiểm chứng |

Ước tính thô (không phải số đo): một vòng luyện/ngày ≈ 5 lần Haiku + ~9 lần Sonnet × ~1 500 token ≈ **0,1 USD/ngày, ~3 USD/tháng**. Sinh nghĩa Việt + ví dụ cho ~1 900 từ mới, 2 lượt, qua Batch API (giảm 50%): ước tính vài USD một lần. Sẽ đo thật ở Phase 1/3.

Mã model đặt trong biến môi trường; mặc định như bảng trên.

---

## H. Những điểm tôi thấy chưa hợp lý trong prompt

1. **"670 từ hiện có" không phải 670 mục từ:** có chữ đơn tách từ từ ghép và cụm câu. Cần lọc, nếu không 2500 sẽ bị thổi phồng (xem C, E).
2. **`id` = hanzi + pinyin không dấu** sẽ trùng với chữ đa âm (xem E.2).
3. **Nhận diện giọng nói:** Chrome (Android/desktop) hỗ trợ tốt và gửi âm thanh lên máy chủ Google; Safari macOS/iOS chỉ hỗ trợ một phần (`webkitSpeechRecognition`, gửi về Apple); Firefox không bật mặc định; Chrome trên iPhone dùng WebKit nên giống Safari ([caniuse](https://caniuse.com/speech-recognition)). Chưa rõ chất lượng `zh-CN` trên iOS — phải thử trên máy thật ở Phase 4. Nên ghi chú riêng tư: âm thanh đi qua dịch vụ của Google/Apple.
4. **Giọng TTS tiếng Trung phụ thuộc thiết bị.** Nếu máy không có giọng `zh-CN`, cả Nghe và Nói mẫu đều hỏng. Cần màn kiểm tra giọng lúc đầu.
5. **Rate limit theo IP trên Netlify Functions** cần kho lưu (Netlify Blobs); prompt chưa nói.
6. **Mục tiêu "nói 5 câu (hoặc 3 phút)"** có hai thước đo — cần chọn một để thanh tiến độ không mơ hồ.
7. **"Thuộc" yêu cầu cả hai chiều**, nhưng dữ liệu `hztMasteredWords` cũ chỉ đến từ trắc nghiệm (dễ hơn gõ lại). Vì vậy từ nhập vào nên được kiểm tra lại nhẹ, như E.4.
8. **Quy tắc "commit thường xuyên, `git init` nếu chưa có"** mâu thuẫn nhẹ với "Phase 0 không sửa code". Tôi **chưa** `git init` — chờ bạn duyệt.
9. **"Xem mục 8"** trong nguyên tắc 4 thực ra là mục 8.1.
10. Nghe bằng TTS không có ngữ điệu tự nhiên như người thật — chấp nhận được ở giai đoạn này, nhưng nên nói rõ.

---

## I. Trả lời câu hỏi mục 11 (đề xuất, chờ bạn chốt)

1. **Chuẩn từ:** HSK 3.0 (chuẩn hiện hành từ 2021, sát giao tiếp hơn 2.0), cấp 1–3 + một phần cấp 4, xếp thứ tự trong chủ đề theo tần suất. Nguồn: drkameleon (MIT). SUBTLEX-CH chỉ dùng lúc build nếu bạn đồng ý với giấy phép "cho nghiên cứu".
2. **Chiết tự + nét chữ:** có, dạng phụ trong thẻ từ, nét chữ tải khi bấm.
3. **20 từ mới/ngày:** hợp lý nhưng hơi nhiều khi đang làm thêm viết/nói/nghe — đề xuất **15** lúc đầu, trần ôn 150 thẻ/ngày. Mục tiêu khác giữ như prompt; Nói tính **theo số câu (5)**.
4. **Netlify Functions + passcode:** ổn cho dùng cá nhân, kèm rate limit (Netlify Blobs) và **đặt hạn mức chi tiêu ở Anthropic Console** — đây mới là hàng rào thật.
5. **Tiến trình:** công tắc hai ngăn trong Tổng quan là ổn (giữ 5 mục). Biểu đồ tự vẽ SVG.
6. **Mốc đổi ngày:** đề xuất **04:00** (luyện lúc 1 giờ sáng vẫn tính cho "hôm nay" theo cảm nhận). Dự báo 2500 từ: có, theo điều kiện ≥ 14 ngày dữ liệu và ghi "ước tính".
7. **Có thể bạn muốn giữ:** (a) phiên âm bồi `viet` cho câu (hữu ích lúc đầu, có thể ẩn mặc định); (b) **in giấy tập viết** chữ Hán; (c) ghi chú tô màu — đề xuất bỏ khỏi giao diện nhưng giữ dữ liệu trong bản xuất; (d) chế độ "copy prompt thủ công" khi không có mạng tới proxy — đề xuất bỏ.
