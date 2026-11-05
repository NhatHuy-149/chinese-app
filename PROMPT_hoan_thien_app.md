# PROMPT: Hoàn thiện app luyện tiếng Trung — "luyện tập nhiều" thay vì "thêm tài liệu"

> Cách dùng: đặt file này vào thư mục dự án. Nhắn cho Claude Code đúng một câu:
> **"Đọc kỹ PROMPT_hoan_thien_app.md. Chỉ làm Phase 0 rồi dừng lại chờ tôi duyệt."**
> Sau đó copy mục "1. Triết lý & nguyên tắc" và "2. Quy tắc làm việc" sang file `CLAUDE.md` để Claude Code nhớ ở mọi phiên.

---

## 0. Vai trò của bạn (Claude Code)

Bạn là kỹ sư phần mềm kiêm người thiết kế sản phẩm cho một app học tiếng Trung cá nhân. Người dùng là người Việt, học tiếng Trung để giao tiếp với người Trung Quốc, và là developer frontend (React, TypeScript, Tailwind), nên có thể đọc và sửa code.

Mục tiêu của phiên này: biến app hiện tại (một file `index.html` rất lớn) thành một app **nhỏ, đơn giản, tập trung vào luyện tập có phản hồi**, và cho thấy được **toàn bộ quá trình tiến bộ**.

---

## 1. Triết lý & nguyên tắc (giữ xuyên suốt)

**Châm ngôn: vấn đề không phải là nguồn tài liệu, vấn đề là luyện tập được bao nhiêu.**

Từ đó suy ra:

1. **Mọi thứ phục vụ vòng lặp luyện tập:** thử làm → nhận sửa lỗi → làm lại. Tính năng nào không phục vụ vòng lặp này thì bỏ hoặc ẩn đi.
2. **Ba kỹ năng cốt lõi, đều phải có sửa lỗi:**
   - **Luyện viết câu có sửa** (người học viết, app sửa và giải thích).
   - **Luyện nói có sửa** (người học nói, app nhận lại bằng giọng nói rồi sửa).
   - **Luyện nghe tóm tắt ý** (nghe không có chữ, viết lại ý chính, app chấm xem bắt được bao nhiêu ý).
3. **Đo lượng luyện tập, không đo lượng tài liệu.** Có hai tầng số liệu:
   - **Mục tiêu hằng ngày:** hôm nay đã luyện bao nhiêu (số câu viết, số phút nói, số đoạn nghe, số từ ôn).
   - **Kết quả tổng hợp toàn bộ (màn Tiến trình):** thấy cả quá trình từ ngày đầu tới nay, gồm khối lượng đã luyện, chất lượng thay đổi ra sao, từ vựng đã đi được bao xa, lỗi sai nào đang giảm.
4. **Ghi lại mọi lượt luyện ngay từ ngày đầu.** Mỗi lượt ôn, viết, nói, nghe đều được lưu thành một sự kiện có thời gian trong nhật ký (xem mục 8). Lịch sử không thể dựng lại về sau nếu không ghi từ đầu, và mọi số liệu tổng hợp đều tính từ nhật ký này.
5. **Đơn giản nhất có thể.** Tối đa 5 mục chính. Mỗi màn hình một việc chính, một nút chính. Không thêm cài đặt, huy hiệu, bảng xếp hạng. Chỉ có chuỗi ngày, mục tiêu hằng ngày và màn Tiến trình.
6. **Học theo sai sót:** lỗi người học hay mắc phải được ghi lại, thống kê theo loại và đưa ra ôn lại.
7. **Mobile-first**, dùng được bằng một tay, chữ Hán đủ lớn, hoạt động khi mất mạng ở các phần không cần AI.
8. **Trung thực về độ chính xác:** AI sửa có thể sai. Giao diện phải có chỗ để người học đánh dấu "kết quả này sai" và hiển thị rõ khi nội dung do AI tạo. Số liệu tổng hợp cũng phải trung thực: không bịa số, không làm tròn đẹp, ghi rõ khi dữ liệu còn ít.

---

## 2. Quy tắc làm việc

- **Hỏi trước khi đoán** với các quyết định sản phẩm chưa rõ (xem mục 11). Không tự thêm tính năng ngoài phạm vi.
- **Làm theo phase** (mục 10). Hết mỗi phase: chạy test, tóm tắt thay đổi, nêu rủi ro, rồi **dừng chờ duyệt**.
- **Commit nhỏ, thường xuyên** (`git init` nếu chưa có). Mỗi commit một ý, message rõ ràng bằng tiếng Anh.
- **Không xóa code hay dữ liệu cũ.** Chuyển vào `/legacy` và ghi chú. Chỉ xóa khi tôi đồng ý.
- **Không đưa API key vào code phía client, không commit `.env`.**
- Giữ code ngắn gọn: ít phụ thuộc, hàm nhỏ, tên rõ nghĩa, không trừu tượng hóa sớm.
- Mọi nội dung hiển thị cho người dùng bằng **tiếng Việt**; mã nguồn và comment bằng tiếng Anh.
- Khi không chắc một thông tin kỹ thuật (hỗ trợ trình duyệt, giá, giấy phép, mã model), **hãy tự kiểm tra** rồi báo lại, đừng nói như thể chắc chắn.

---

## 3. Tình trạng hiện tại (đọc kỹ trước khi làm)

Thư mục `chinese-app` có `index.html` (khoảng 2 MB, hơn 8000 dòng, một file duy nhất). Bên trong có:

- **`DATA`**: mảng thẻ hội thoại. Mỗi thẻ có `section?, time, mark, hanzi, pinyin, viet, meaning, words[]`; mỗi `word` có `{h, p, hv, m, st}` = chữ Hán, pinyin, Hán Việt, nghĩa tiếng Việt, chiết tự (có thẻ HTML `<b>`).
- **`vocabGroups`**: nhóm từ vựng sinh từ `DATA`, loại từ trùng giữa các nhóm (khoảng 670 từ duy nhất, 15 nhóm theo buổi học).
- **`PARAGRAPHS` + `PW`**: khoảng 30 đoạn văn, mỗi câu có chữ Hán, pinyin, nghĩa và danh sách từ kèm chiết tự.
- **`WRITE_DATA`** (khoảng 616 chữ, 148 bộ thủ, có tên bộ thủ tiếng Việt và nghĩa từng chữ) và **`STROKE_DATA`** (khoảng 1,3 MB nét chữ lấy từ Make Me a Hanzi, dùng với Hanzi Writer).
- **Các tab**: Hội thoại, Từ vựng, Ôn từ vựng (2 chiều), Ôn câu (2 chiều), Luyện đọc, Đoạn văn, Luyện viết (theo bộ thủ), Ghi chú (tô màu và ghi chú), Kiểm câu (gọi Claude để sửa câu).
- **`localStorage`** đang dùng các khóa: `hztMasteredWords`, `hztWordStreaks`, `hztAutoMaster`, `hztWritten`, `hztHighlights`, `hztMySentences`, `hztApiKey`, `hztApiModel`.
- Tính năng "Kiểm câu" hiện gọi Claude trực tiếp từ trình duyệt (khi chạy trong claude.ai hoặc với API key người dùng tự dán). Cách này **không phù hợp** cho app hoàn chỉnh; phải thay bằng một lớp proxy phía server (mục 7).
- **App cũ chưa có nhật ký luyện tập**, nên không có lịch sử thật để dựng màn Tiến trình. Lịch sử bắt đầu tính từ ngày app mới chạy. Đừng bịa dữ liệu quá khứ; chỉ có thể nhập trạng thái "đã biết" ban đầu của từ vựng.

Dữ liệu cũ là **tài sản cần giữ** (đặc biệt phần chiết tự, nghĩa tiếng Việt và câu ví dụ viết tay), nhưng giao diện cũ có nhiều tính năng sẽ bị lược bớt.

---

## 4. Phạm vi: làm gì, bỏ gì

**Làm (theo thứ tự ưu tiên):**
1. **Nhật ký luyện tập** (event log) làm nền cho mọi số liệu (mục 8).
2. Hệ thống ôn từ vựng lặp lại ngắt quãng (SRS) với **2500 từ thông dụng nhất, chia theo chủ đề** (mục 5).
3. **Luyện viết câu có sửa** (mục 6.3).
4. **Luyện nói có sửa** (mục 6.4).
5. **Luyện nghe tóm tắt ý** (mục 6.5).
6. Mục **Tổng quan** gồm hai màn: **Hôm nay** (mục tiêu hằng ngày, sổ lỗi sai) và **Tiến trình** (kết quả tổng hợp toàn bộ quá trình) (mục 6.1).
7. Sao lưu/nhập tiến độ và nhật ký, cài đặt tối thiểu.

**Ẩn hoặc bỏ khỏi giao diện chính (chuyển vào `/legacy`, hỏi tôi nếu muốn giữ):**
- Tab Hội thoại dạng thẻ chat, Luyện đọc, Đoạn văn, Ghi chú tô màu, Luyện viết theo bộ thủ.
- Giữ lại **thông tin chiết tự, bộ thủ và nét chữ** như một phần phụ trong thẻ chi tiết của từ (xem nét chữ chỉ tải khi bấm).
- Các câu ví dụ và đoạn văn đã viết tay được dùng làm **nội dung nền** cho phần nghe và nói (mục 6.4, 6.5).

---

## 5. Dữ liệu từ vựng: 2500 từ thông dụng nhất, chia theo chủ đề

### 5.1 Yêu cầu
- **Tổng 2500 từ duy nhất**, **đã bao gồm** khoảng 670 từ hiện có (không phải thêm 2500 nữa). Tính phần còn thiếu rồi bổ sung bằng các từ phổ biến nhất chưa có.
- Chọn theo **tần suất sử dụng thực tế trong giao tiếp**, ưu tiên từ cho hội thoại hằng ngày. Không chọn thuần theo sách giáo khoa.
- Mỗi từ thuộc **đúng một chủ đề chính**. Khoảng 25 đến 30 chủ đề, mỗi chủ đề 40 đến 120 từ. Ví dụ gợi ý (bạn chốt danh sách cuối): chào hỏi và giao tiếp, gia đình và con người, số đếm và thời gian, ăn uống, mua sắm và quần áo, nhà cửa và đồ dùng, cơ thể và sức khỏe, giao thông và du lịch, địa điểm và phương hướng, công việc và nghề nghiệp, học tập, công nghệ và điện thoại, thời tiết và thiên nhiên, cảm xúc và tính cách, sở thích và thể thao, tiền bạc và ngân hàng, động từ thông dụng, tính từ thông dụng, trạng từ và liên từ, lượng từ và đại từ.
- Trong mỗi chủ đề, sắp xếp theo tần suất giảm dần, chia thành **bộ học 10 đến 15 từ** để học dần.

### 5.2 Nguồn dữ liệu
- Tìm một **danh sách từ HSK hoặc danh sách tần suất có giấy phép mở**, ví dụ các repo GitHub có "HSK vocabulary" dạng JSON, và CC-CEDICT cho nghĩa tiếng Anh. **Tự kiểm tra giấy phép** của từng nguồn, ghi nguồn và giấy phép vào `DATA_SOURCES.md`. Cân nhắc chuẩn HSK nào (2.0 hay 3.0) phù hợp; báo cho tôi lựa chọn và lý do trước khi dùng.
- **Pinyin:** lấy từ nguồn, đối chiếu chéo bằng một thư viện pinyin; đánh dấu các từ hai nguồn không khớp để tôi xem lại (đa âm tiết, thanh nhẹ, biến điệu).
- **Nghĩa tiếng Việt, Hán Việt, 1 câu ví dụ đơn giản (chữ Hán, pinyin, nghĩa Việt):** tạo bằng LLM theo **lô** bằng script build (không gọi lúc chạy app). Mỗi mục gắn `source: "ai"` hoặc `"manual"` (dữ liệu viết tay cũ giữ `"manual"` và **không bị ghi đè**).
- **Chiết tự, bộ thủ, số nét:** từ dữ liệu cũ; từ mới dùng Make Me a Hanzi (đã dùng trong app cũ). Từ nào không có chiết tự thì để trống, đừng bịa.
- **Bước kiểm chứng bắt buộc:** chạy lượt LLM thứ hai để kiểm tra nghĩa tiếng Việt và câu ví dụ (đúng ngữ pháp, dùng đúng từ đích, độ khó phù hợp). Mục nào bị đánh dấu nghi ngờ thì ghi `needsReview: true`.
- Xuất script **lấy mẫu ngẫu nhiên 40 từ** để tôi tự kiểm tra bằng mắt.

### 5.3 Mô hình dữ liệu từ (đề xuất, có thể chỉnh)
```ts
type Word = {
  id: string;            // ổn định, ví dụ hanzi + pinyin không dấu
  hanzi: string;
  pinyin: string;        // có dấu thanh
  hanViet?: string;
  vi: string;            // nghĩa tiếng Việt ngắn
  topic: string;         // id chủ đề
  freqRank: number;      // thứ hạng tần suất
  pos?: string;          // loại từ
  radical?: string; strokes?: number; structure?: string; // chiết tự
  example?: { zh: string; py: string; vi: string };
  source: "manual" | "ai";
  needsReview?: boolean;
};
```
Dữ liệu để dạng JSON tĩnh trong `public/data/` (chia file theo chủ đề), tải khi cần. `id` của từ phải **ổn định giữa các phiên bản** vì nhật ký luyện tập tham chiếu tới nó.

### 5.4 Ôn từ vựng (SRS)
- Thuật toán đơn giản: Leitner hoặc SM-2 rút gọn. Giải thích ngắn gọn cách chọn.
- Hai chiều: Việt → Trung, Trung → Việt. Từ chỉ coi là "thuộc" khi vượt qua nhiều lần ôn cách quãng ở cả hai chiều.
- **Số từ mới mỗi ngày mặc định 20, chỉnh được từ 5 đến 50.** Có trần số thẻ ôn lại mỗi ngày; khi tồn thẻ quá nhiều thì tự dừng thêm từ mới.
- Nhập từ vựng cũ: chuyển `hztMasteredWords` thành trạng thái "đã biết" ban đầu (không bắt học lại từ đầu). Các từ này ghi vào nhật ký bằng một sự kiện nhập liệu riêng (`kind: "import"`), **không tính vào khối lượng luyện tập** để số liệu không bị thổi phồng.

---

## 6. Các màn hình

Thanh điều hướng dưới cùng, 5 mục: **Tổng quan · Từ vựng · Viết · Nói · Nghe**. Giao diện tham chiếu ở Phụ lục A.

### 6.1 Tổng quan (hai màn: Hôm nay và Tiến trình)

Ở đầu mục Tổng quan có một công tắc hai ngăn: **Hôm nay** (mặc định) và **Tiến trình**.

#### Hôm nay
- Mục tiêu hằng ngày (mặc định): ôn 20 từ, viết 5 câu, nói 5 câu (hoặc 3 phút), nghe 2 đoạn. Hiển thị tiến độ gọn, một nút lớn "Bắt đầu" dẫn tới việc tiếp theo chưa làm.
- Chuỗi ngày (số ngày liên tiếp có luyện) và tóm tắt tuần này.
- **Sổ lỗi sai:** 3 đến 5 loại lỗi mắc nhiều nhất gần đây (ví dụ lượng từ, trật tự từ, 了/过, thanh điệu), bấm vào để làm bài ngắn chữa đúng loại lỗi đó.
- Không biểu đồ phức tạp, không thông báo đẩy.

#### Tiến trình (kết quả tổng hợp toàn bộ quá trình)
Mục đích: người học nhìn thấy **cả hành trình**, không chỉ hôm nay, để thấy mình đã luyện bao nhiêu và có tiến bộ thật hay không. Mọi số liệu **tính từ nhật ký sự kiện** (mục 8), không cần gọi LLM.

Bộ lọc thời gian ở đầu màn: **7 ngày · 30 ngày · Từ đầu**. Các khối, theo thứ tự từ trên xuống:

1. **Tổng từ ngày đầu:** ngày bắt đầu; số ngày đã luyện trên tổng số ngày (chuyên cần); chuỗi hiện tại và chuỗi dài nhất; tổng số: từ đã thuộc (x/2500), câu đã viết, phút đã nói, đoạn đã nghe, lượt ôn từ.
2. **Khối lượng luyện tập:**
   - Biểu đồ cột theo tuần (hoặc theo ngày khi lọc 7 ngày), tách theo 4 kỹ năng: ôn từ, viết, nói, nghe.
   - **Lịch nhiệt** 12 đến 16 tuần gần nhất: mỗi ô một ngày, đậm nhạt theo lượng luyện, bấm vào ô xem chi tiết ngày đó.
3. **Chất lượng theo thời gian** (đường hoặc cột nhỏ, mỗi kỹ năng một biểu đồ nhỏ, có nhãn trục rõ):
   - Từ vựng: tỷ lệ trả lời đúng khi ôn.
   - Viết: tỷ lệ câu đúng ngay lần đầu, và số chỗ phải sửa trung bình mỗi câu.
   - Nói: mức khớp trung bình khi nhại theo mẫu.
   - Nghe: điểm tóm tắt trung bình.
   - Mỗi biểu đồ ghi kèm số lượt làm làm cơ sở (ví dụ "dựa trên 34 lượt"); dưới ngưỡng tối thiểu (ví dụ 5 lượt) thì hiện "chưa đủ dữ liệu" thay vì vẽ đường.
4. **Từ vựng theo chủ đề:** thanh tiến độ cho từng chủ đề (đã thuộc / tổng).
   - **Dự báo hoàn thành 2500 từ:** tính từ tốc độ thực tế 30 ngày gần nhất, ghi rõ đây là **ước tính** và chỉ hiện khi đã có ít nhất 14 ngày dữ liệu.
5. **Lỗi sai theo loại:** 5 loại lỗi hàng đầu, kèm xu hướng so với kỳ trước (tăng, giảm, giữ nguyên) và số lần.
6. **Mốc đã đạt (timeline đơn giản):** ví dụ 100, 500, 1000, 1500, 2000, 2500 từ thuộc; 50, 100, 500 câu viết; 1 giờ và 10 giờ nói; 10 và 50 đoạn nghe, mỗi mốc kèm ngày đạt. Không huy hiệu, không hiệu ứng.
7. **Tóm tắt tuần:** vào mỗi Chủ nhật hoặc khi mở app đầu tuần, 3 dòng so sánh tuần vừa rồi với tuần trước (khối lượng, chất lượng, lỗi nổi bật). Sinh bằng quy tắc, không dùng LLM.
8. **Xuất dữ liệu:** nút xuất nhật ký (JSON, và CSV tóm tắt theo ngày) để người học lưu hoặc phân tích bên ngoài.

Yêu cầu chung của màn Tiến trình: đọc được trên điện thoại một tay; biểu đồ tự viết bằng SVG nhẹ hoặc dùng thư viện rất nhỏ (nêu lựa chọn ở Phase 0); không phân biệt chỉ bằng màu (có nhãn, họa tiết hoặc số); có trạng thái **trống** rõ ràng khi chưa có dữ liệu; hiển thị đúng với lịch sử vài tháng.

### 6.2 Từ vựng
- Danh sách chủ đề, mỗi chủ đề hiện tiến độ (số từ đã thuộc / tổng).
- Bấm chủ đề → các bộ 10 đến 15 từ → học thẻ và ôn SRS.
- Thẻ từ: chữ Hán, pinyin, nghĩa, ví dụ, nút nghe, chiết tự; bấm để xem nét chữ (tải Hanzi Writer khi cần).
- Tìm kiếm một từ bất kỳ.

### 6.3 Viết (luyện viết câu có sửa)
Luồng chính:
1. **Đề bài:** app gợi ý "Viết 1 câu về [chủ đề] dùng từ [A], [B]" (lấy từ những từ người học đang ôn), hoặc chế độ **tự do**.
2. Người học viết, được phép **trộn tiếng Việt và chữ Hán**, kể cả chữ Hán sai chính tả hoặc pinyin.
3. App trả về (qua LLM, mục 7): **câu đúng** (chữ Hán), **pinyin**, **nghĩa tiếng Việt**, **danh sách chỗ sửa** (phần sai, phần đúng, lý do ngắn bằng tiếng Việt), **nhãn loại lỗi** (`error_tags`), và tùy chọn **một cách nói tự nhiên hơn**.
4. **Bắt buộc gõ lại một lần** câu đã sửa (không cho copy). So sánh với đáp án; sai thì hiện chỗ lệch. Chỉ khi gõ lại xong mới tính là hoàn thành.
5. Nút **Lưu câu** đưa vào bộ ôn câu: hiển thị nghĩa tiếng Việt, người học gõ lại tiếng Trung, so sánh. Dùng cùng cơ chế SRS.
6. Nút **"Kết quả này sai"** để người học đánh dấu và ghi chú.
7. Ghi sự kiện vào nhật ký (mục 8): có đúng ngay lần đầu không, số chỗ sửa, các nhãn lỗi, gõ lại có đúng không.

### 6.4 Nói (luyện nói có sửa)
Hai chế độ, chuyển bằng một nút:

**A. Nhại theo mẫu (shadowing):**
- Lấy câu mục tiêu từ các câu đã lưu, ví dụ của từ đang học, hoặc đoạn văn cũ.
- Phát mẫu (TTS), tốc độ 0.7x / 1x. Người học bấm ghi âm và nói.
- Dùng nhận diện giọng nói của trình duyệt (`SpeechRecognition`, `zh-CN`) để lấy văn bản.
- **So khớp:** so chữ Hán, rồi so **pinyin có thanh điệu** (dùng thư viện pinyin như `pinyin-pro`). Nếu chữ khác nhau nhưng pinyin không dấu giống nhau thì gợi ý khả năng **sai thanh điệu**. Tô màu chỗ lệch. Cho nghe lại bản ghi của mình cạnh bản mẫu.

**B. Nói tự do:**
- Đề bài ngắn bằng tiếng Việt hoặc tiếng Trung (ví dụ "Giới thiệu bản thân", "Hôm nay bạn ăn gì?"). Người học nói 20 đến 60 giây.
- Văn bản nhận diện được gửi LLM để sửa: ngữ pháp, dùng từ, cách nói tự nhiên, kèm pinyin và nghĩa tiếng Việt, cùng nhãn lỗi như phần Viết.
- Sau đó người học **nói lại bản đã sửa** (chuyển sang chế độ A).

**Giới hạn phải nói thẳng trong giao diện:** nhận diện giọng nói chỉ cho biết máy có "hiểu" mình hay không, **không chấm chính xác thanh điệu và phát âm**. Ghi chú điều này ngắn gọn ở đầu màn hình. Chế độ nhận diện chỉ chạy trên trình duyệt hỗ trợ (kiểm tra thực tế); với trình duyệt không hỗ trợ, cho phép ghi âm để tự nghe lại và tự đánh giá.

Ghi sự kiện vào nhật ký: chế độ, thời lượng nói (giây), mức khớp (nếu có), các nhãn lỗi (nếu có).

### 6.5 Nghe (nghe tóm tắt ý)
Luồng chính:
1. Chọn mức độ (tự động theo số từ đã học) và chủ đề, hoặc để app chọn.
2. App phát một đoạn ngắn (3 đến 6 câu, khoảng 40 đến 120 chữ) bằng TTS, **không hiện chữ**. Tốc độ 0.8x / 1x, tối đa 3 lần nghe lại trước khi chấm.
3. Người học **viết tóm tắt ý chính bằng tiếng Việt** (1 đến 3 câu).
4. LLM chấm với **rubric đi kèm đoạn nghe**: mỗi đoạn có danh sách `key_points` (2 đến 4 ý chính). Trả về: điểm 0 đến 100, ý nào bắt được, ý nào bỏ sót, nhận xét ngắn bằng tiếng Việt.
5. Sau khi chấm mới hiện **chữ Hán, pinyin, bản dịch** của đoạn; từ chưa biết có nút "thêm vào ôn".
6. Ghi sự kiện vào nhật ký: điểm, số ý bắt được trên tổng, số lần nghe lại, mức độ.

**Nguồn đoạn nghe:**
- Chính: LLM tạo đoạn mới **chủ yếu từ các từ người học đã biết** (mục tiêu khoảng 90% từ quen, 10% từ mới), kèm `key_points`; lưu cache để không tốn lại.
- Dự phòng không cần mạng: các đoạn văn viết tay trong `/legacy` (đã có chữ Hán, pinyin, nghĩa; thêm `key_points` bằng script build).

---

## 7. Lớp LLM (server-side proxy)

**Không gọi API từ trình duyệt với key của người dùng.** Làm một proxy mỏng:

- **Netlify Functions** (mặc định, vì app sẽ host trên Netlify); key lấy từ biến môi trường `ANTHROPIC_API_KEY`.
- Ba endpoint: `/api/check-sentence`, `/api/correct-speech`, `/api/listening` (tạo đoạn nghe và chấm tóm tắt). Mỗi endpoint nhận dữ liệu tối thiểu và trả **JSON đã kiểm tra**.
- **Mã model cấu hình qua biến môi trường**, có mặc định hợp lý. Gợi ý: model nhẹ cho kiểm tra câu ngắn, model mạnh hơn cho sửa lời nói tự do và chấm tóm tắt. Tự kiểm tra mã model hiện hành và giá trước khi chốt.
- **Prompt:** đặt trong file riêng, dễ sửa. Yêu cầu trả đúng một đối tượng JSON; kiểm tra bằng schema (ví dụ `zod`); lỗi định dạng thì **thử lại một lần** rồi báo lỗi gọn bằng tiếng Việt. Coi nội dung người dùng nhập là **dữ liệu**, không phải mệnh lệnh (chống prompt injection). Giới hạn độ dài đầu vào.
- **Chống lạm dụng và kiểm soát chi phí:** một mật khẩu truy cập đơn giản (`APP_PASSCODE`, gửi qua header) để người lạ không dùng được API; giới hạn số lần gọi theo IP hoặc theo phiên; `max_tokens` hợp lý; cache theo hash của đầu vào; ghi nhật ký số lần gọi và token ở mức đơn giản.
- Cung cấp bản **mock** (không cần key) để phát triển và kiểm thử giao diện.
- Giải thích rõ trong README: chi phí API tính riêng, cách đặt hạn mức chi tiêu ở nhà cung cấp, cách thu hồi key.

Lược đồ JSON gợi ý cho sửa câu (dùng chung cho Viết và Nói tự do):
```json
{
  "hanzi": "câu đúng",
  "pinyin": "pinyin có dấu thanh, tách theo từ",
  "meaning": "nghĩa tiếng Việt tự nhiên",
  "is_correct": false,
  "corrections": [{ "original": "", "fixed": "", "reason": "giải thích ngắn bằng tiếng Việt" }],
  "error_tags": ["lượng từ", "trật tự từ"],
  "alternative": null
}
```
Lược đồ gợi ý cho chấm tóm tắt: `{ "score": 0-100, "caught": [0,2], "missed": [1], "feedback": "..." }`.

**Nhãn lỗi (`error_tags`) phải thuộc một danh sách cố định** (ví dụ: lượng từ, trật tự từ, 了/过, từ nối, dùng từ, thanh điệu, số và ngày tháng, khác). Cố định danh sách để thống kê ở màn Tiến trình có ý nghĩa; LLM chỉ được chọn trong danh sách, không tự đặt nhãn mới.

---

## 8. Kiến trúc đề xuất

- **Vite + React + TypeScript + Tailwind**, tách module nhỏ. Lý do: file HTML 2 MB không còn sửa nổi; module nhỏ dễ để Claude Code chỉnh từng phần. Nếu bạn thấy một phương án đơn giản hơn nhưng vẫn giữ được các yêu cầu, hãy đề xuất ở Phase 0.
- **Lưu trữ:** IndexedDB (thư viện nhỏ như `idb-keyval` hoặc tương đương) cho trạng thái SRS, câu đã lưu và **nhật ký luyện tập**; **không dùng tài khoản**. Có nút **Xuất / Nhập JSON** để sao lưu và chuyển máy; bản xuất **bao gồm cả nhật ký**.
- **PWA** cài được lên điện thoại, cache dữ liệu tĩnh để học từ vựng khi mất mạng.
- **Dữ liệu tĩnh** trong `public/data/*.json`, tải theo chủ đề.
- **Giao diện:** tối giản, nền tối (giữ cảm giác app cũ), chữ Hán dùng font có sẵn hỗ trợ tốt (ví dụ Noto Serif SC), nút bấm lớn.
- Cấu trúc gợi ý: `src/{features/{overview,vocab,write,speak,listen},lib/{srs,pinyin,speech,storage,api,stats},ui}`, `netlify/functions/`, `scripts/` (build dữ liệu, sinh dữ liệu mẫu), `legacy/`.

### 8.1 Nhật ký luyện tập (event log) — nền của màn Tiến trình
- **Chỉ ghi thêm (append-only):** mỗi lượt luyện là một sự kiện, không sửa, không xóa (trừ khi người học chọn xóa toàn bộ dữ liệu). Số liệu tổng hợp luôn **tính lại từ nhật ký**; có thể cache theo ngày để nhanh nhưng nhật ký là nguồn sự thật.
- **Phải có từ Phase 2**, trước khi làm bất kỳ màn luyện tập nào, để không mất dữ liệu về sau.
- Mô hình đề xuất:
```ts
type PracticeEvent = {
  id: string;
  ts: number;                 // thời điểm (ms); ngày hiển thị theo múi giờ của thiết bị
  skill: "vocab" | "write" | "speak" | "listen";
  kind: string;               // ví dụ "review", "check", "shadow", "free", "gist", "import"
  itemId?: string;            // id từ / câu / đoạn liên quan
  durationSec?: number;
  countsAsPractice: boolean;  // false cho import và các sự kiện không phải luyện tập thật
  metrics: {
    // vocab:  { correct: boolean, direction: "vi2zh" | "zh2vi", box?: number }
    // write:  { firstTryCorrect: boolean, corrections: number, retypeOk: boolean }
    // speak:  { mode: "shadow" | "free", matchPct?: number, speakSec: number }
    // listen: { score: number, caught: number, total: number, replays: number, level: string }
    [k: string]: number | string | boolean;
  };
  errorTags?: string[];       // từ danh sách cố định ở mục 7
  flaggedWrong?: boolean;     // người học báo "kết quả AI này sai"
};
```
- **Quy ước tính toán** (ghi trong `STATS.md`, có unit test):
  - "Ngày có luyện" = có ít nhất một sự kiện `countsAsPractice` trong ngày theo giờ địa phương. Mốc đổi ngày mặc định 00:00 (hỏi tôi nếu muốn 04:00).
  - Chuỗi ngày, tỷ lệ chuyên cần, tổng phút nói, tuần (bắt đầu từ thứ Hai) đều có định nghĩa rõ ràng.
  - Sự kiện có `flaggedWrong` bị **loại khỏi** thống kê chất lượng.
  - Dữ liệu ít hơn ngưỡng tối thiểu thì không vẽ xu hướng.
- **Riêng tư:** nhật ký ở lại trên thiết bị; chỉ nội dung câu cần sửa mới gửi tới proxy LLM; không gửi nhật ký.

---

## 9. Chất lượng và kiểm thử

- **Unit test** (Vitest) cho: thuật toán SRS, so khớp chữ/pinyin, parser kết quả LLM, tính mục tiêu hằng ngày, và **toàn bộ hàm tổng hợp của màn Tiến trình** (chuỗi ngày, tổng theo tuần, tỷ lệ chuyên cần, xu hướng lỗi, dự báo, mốc đạt) dựa trên bộ dữ liệu mẫu cố định, gồm các ca biên: ngày chuyển múi giờ, tuần giao năm, lịch sử trống, chỉ một sự kiện, sự kiện `import`, sự kiện bị `flaggedWrong`.
- **Script sinh dữ liệu mẫu** (`scripts/seed-history`) tạo khoảng 90 ngày lịch sử giả (có chỗ nghỉ, có tiến bộ dần) để kiểm tra màn Tiến trình bằng mắt. Dữ liệu mẫu **chỉ dùng khi phát triển** và phải gắn nhãn rõ, không bao giờ lẫn vào dữ liệu thật.
- **Kiểm thử thủ công** theo danh sách ngắn trong `TESTING.md` cho từng màn hình, gồm cả trường hợp lỗi (mất mạng, từ chối quyền micro, LLM trả sai định dạng, hết lượt gọi) và trạng thái trống của màn Tiến trình.
- Hiệu năng: lần tải đầu nhẹ (không nhúng toàn bộ 2500 từ và dữ liệu nét chữ vào gói chính); màn Tiến trình vẫn mượt với vài nghìn sự kiện.
- Truy cập: tương phản đủ, cỡ chữ đủ, dùng được bằng bàn phím trên máy tính; biểu đồ có mô tả bằng chữ.

---

## 10. Lộ trình theo phase (dừng và chờ duyệt sau mỗi phase)

**Phase 0 — Khảo sát và đề xuất (KHÔNG sửa code):**
Đọc `index.html`, báo cáo: danh sách tính năng hiện có, kích thước và cấu trúc dữ liệu, các khóa `localStorage`, phần nào tái sử dụng được. Đề xuất: kiến trúc cuối cùng, danh sách chủ đề cho 2500 từ, nguồn dữ liệu và giấy phép, kế hoạch di chuyển dữ liệu cũ, mô hình nhật ký sự kiện và cách vẽ biểu đồ, các điểm bạn thấy chưa hợp lý trong prompt này. Trả lời các câu hỏi ở mục 11.

**Phase 1 — Dữ liệu:**
Script build tái lập được: trích dữ liệu cũ ra JSON; lập danh sách 2500 từ; tạo nghĩa Việt, ví dụ, chiết tự; chạy bước kiểm chứng; xuất mẫu 40 từ để tôi duyệt.

**Phase 2 — Khung app, nhật ký và Từ vựng:**
Dựng khung Vite/React, điều hướng 5 mục, **nhật ký sự kiện và tầng lưu trữ**, màn Từ vựng và SRS (ghi sự kiện ngay từ đầu), nhập dữ liệu cũ, xuất/nhập JSON gồm cả nhật ký.

**Phase 3 — Proxy LLM và màn Viết:**
Netlify Function với mock, schema, retry, passcode, rate limit; màn Viết hoàn chỉnh với bước gõ lại, lưu câu, ghi sự kiện và nhãn lỗi.

**Phase 4 — Màn Nói:**
Ghi âm, nhận diện giọng nói, so khớp chữ/pinyin, chế độ nhại theo mẫu và nói tự do, ghi sự kiện.

**Phase 5 — Màn Nghe:**
Tạo đoạn nghe với `key_points`, TTS, chấm tóm tắt, nguồn dự phòng offline, ghi sự kiện.

**Phase 6 — Tổng quan (Hôm nay và Tiến trình) và hoàn thiện:**
Mục tiêu hằng ngày, chuỗi ngày, sổ lỗi sai; **màn Tiến trình đầy đủ 8 khối** với bộ lọc thời gian, trạng thái trống, kiểm thử bằng dữ liệu mẫu; xuất dữ liệu; PWA; README triển khai lên Netlify; rà soát chi phí; dọn dẹp.

**Phase 7 — Tùy chọn (chỉ khi tôi yêu cầu):**
Gói từ vựng chuyên ngành riêng (ví dụ kỹ thuật điện và năng lượng mặt trời) ngoài 2500 từ cốt lõi; chấm phát âm chuyên sâu bằng dịch vụ riêng; đồng bộ nhiều thiết bị.

---

## 11. Câu hỏi bạn cần hỏi lại tôi ở Phase 0

1. Chuẩn danh sách từ nào (HSK 2.0 hay 3.0, hay danh sách tần suất khác) và vì sao?
2. Có giữ lại thông tin chiết tự và xem nét chữ trong thẻ từ không (đề xuất: có, dạng phụ)?
3. Mặc định số từ mới mỗi ngày (đề xuất 20) và các mục tiêu hằng ngày có hợp lý không?
4. Chọn Netlify Functions làm proxy có ổn không, và mật khẩu truy cập đơn giản có đủ không?
5. Màn Tiến trình: công tắc hai ngăn trong mục Tổng quan có ổn không, hay tôi muốn một mục riêng? Thư viện biểu đồ hay tự vẽ SVG?
6. Mốc đổi ngày dùng 00:00 hay 04:00 sáng? Có hiển thị dự báo ngày hoàn thành 2500 từ không?
7. Có tính năng nào trong app cũ bạn nghĩ tôi sẽ muốn giữ mà tôi chưa liệt kê?

---

## 12. Tiêu chí hoàn thành (định nghĩa "xong")

- Học và ôn được 2500 từ theo chủ đề; tiến độ và nhật ký không mất khi tải lại trang; có xuất/nhập gồm cả nhật ký.
- Một vòng luyện trong ngày (ôn từ, 1 câu viết, 1 câu nói, 1 đoạn nghe) hoàn thành trong **khoảng 15 đến 20 phút** trên điện thoại.
- Mỗi lượt Viết và Nói đều có sửa lỗi và có bước làm lại; mỗi lượt Nghe đều có chấm ý chính.
- Mọi lượt luyện thật đều sinh sự kiện trong nhật ký, và sự kiện nhập liệu không bị tính là luyện tập.
- Màn **Hôm nay** cho thấy rõ số lượng đã luyện trong ngày và tuần.
- Màn **Tiến trình** cho thấy được cả quá trình: tổng từ ngày đầu, khối lượng theo tuần và lịch nhiệt, chất lượng theo thời gian, từ vựng theo chủ đề, lỗi sai theo loại, mốc đạt được; đúng với dữ liệu mẫu 90 ngày và hiển thị tử tế khi dữ liệu trống hoặc ít; có ghi chú rõ chỗ nào chỉ là ước tính.
- Có thể triển khai lên Netlify theo README, key API không lộ phía client, có mock để chạy thử không tốn tiền.
- Mọi nội dung do AI tạo đều được gắn nhãn và có cách báo sai.

---

## Phụ lục A. Giao diện tham chiếu

Đã có bản xem trước 5 màn hình (điện thoại 390 px). Người dùng sẽ xem hình; bản mô tả dưới đây để bạn bám theo khi dựng. Số liệu trong hình chỉ là dữ liệu mẫu.

**Phong cách:** nền tối, thẻ bo góc 14 px, thanh tiến độ cao 8 px, nút chính cao tối thiểu 52 px, mọi mục chạm được cao tối thiểu 44 px. Không dùng emoji, biểu tượng là nét vẽ đơn giản. Chữ Hán dùng Noto Serif SC, chữ còn lại Inter.

| Vai trò | Màu |
|---|---|
| Nền | `#131820` |
| Thẻ | `#1C2430` |
| Đường viền | `#2B3645` |
| Chữ chính | `#EEEAE0` |
| Chữ phụ | `#A3AEBB` |
| Nhấn chính (vàng đồng) | `#E3A83B` |
| Pinyin, liên kết | `#7CB4EA` |
| Đúng | `#7ED4A0` |
| Sai | `#F2918F` |

Không phân biệt đúng/sai chỉ bằng màu: luôn kèm chữ ("Bắt được", "Bỏ sót") hoặc biểu tượng.

**Thanh dưới cùng:** 5 mục có biểu tượng và nhãn: Tổng quan (lịch), Từ vựng (sách), Viết (bút), Nói (micro), Nghe (tai nghe). Mục đang chọn màu vàng đồng, chữ đậm. (Hình xem trước ghi nhãn mục đầu là "Hôm nay"; bản cuối đổi thành "Tổng quan" và thêm công tắc Hôm nay / Tiến trình ở đầu màn.)

1. **Hôm nay:** ngày và tiêu đề lớn, nhãn "Chuỗi N ngày" ở góc phải; thẻ "Mục tiêu hôm nay" gồm 4 hàng (Ôn từ vựng, Viết câu, Nói, Nghe), mỗi hàng có số đã làm/mục tiêu và thanh tiến độ (hàng đã đủ hiện "Xong" màu xanh); nút lớn vàng "Bắt đầu: viết 2 câu nữa"; thẻ "Lỗi hay gặp" với 3 hàng (tên lỗi, số lần, nút "Luyện").
2. **Từ vựng:** thẻ "Đã thuộc x / 2500 từ" với thanh tiến độ; nút lớn "Ôn hôm nay · N thẻ"; ô tìm kiếm; thẻ "Chủ đề" liệt kê chủ đề, mỗi chủ đề có "đã thuộc/tổng từ" và thanh tiến độ màu xanh dương.
3. **Viết:** thẻ đề bài kèm các từ gợi ý; thẻ kết quả gồm nhãn "Đã sửa" và "Do AI tạo", câu gốc của người học, câu đúng chữ lớn, pinyin, nghĩa Việt, danh sách chỗ sửa (chữ sai gạch đỏ → chữ đúng xanh, lý do, nhãn loại lỗi); ô "Gõ lại câu đã sửa (không dán được)"; hai nút "Lưu câu" và "Kết quả này sai".
4. **Nói:** công tắc "Nhại theo mẫu / Nói tự do"; thẻ câu mẫu (chữ Hán, pinyin, nghĩa) với nút "Nghe mẫu" và chọn tốc độ 0.7x / 1x; nút ghi âm tròn lớn kèm thời lượng đã ghi; thẻ "Máy nghe được" tô đỏ chữ lệch, hiện "Khớp N%" và gợi ý sai thanh điệu; nút "Nghe lại bản của tôi" và "Thử lại"; dòng chú thích nhỏ về giới hạn của nhận diện giọng nói.
5. **Nghe:** thẻ phát audio (nút phát, dạng sóng, chọn tốc độ, "Còn N lần nghe"); ô tóm tắt ý bằng tiếng Việt; thẻ "Kết quả chấm" có điểm /100 và từng ý chính kèm "Bắt được" / "Bỏ sót", nhận xét ngắn; nút "Xem chữ Hán và bản dịch" và "Thêm N từ mới vào ôn".

**Màn Tiến trình (chưa có hình xem trước):** dựng theo mục 6.1. Bố cục gợi ý từ trên xuống: công tắc 7 ngày / 30 ngày / Từ đầu; thẻ tổng từ ngày đầu (dạng lưới số liệu 2 cột); thẻ khối lượng theo tuần (cột xếp chồng 4 kỹ năng, có chú giải) và lịch nhiệt; bốn biểu đồ nhỏ chất lượng; thanh tiến độ theo chủ đề kèm dự báo; thẻ lỗi theo loại kèm xu hướng; timeline mốc; thẻ tóm tắt tuần; nút xuất dữ liệu. Mỗi thẻ có tiêu đề nhỏ viết hoa, cùng kiểu với các thẻ ở màn Hôm nay.
