# Luyện tiếng Trung

App cá nhân luyện tiếng Trung theo vòng **thử → được sửa → làm lại**: ôn từ vựng (SRS), viết câu có sửa,
nói có sửa, nghe tóm tắt ý, và màn Tiến trình cho thấy cả quá trình. Dữ liệu học ở trên máy (IndexedDB),
không cần tài khoản.

## Chạy trên máy
```
npm install
npm run dev        # http://localhost:5173 — phần AI tự dùng kết quả mẫu (không cần key)
npm test
```

## Triển khai lên Netlify (miễn phí)
1. Netlify → **Add new project → Import from Git** → chọn repo `chinese-app`. Build command và thư mục
   đã có trong `netlify.toml`.
2. **Site configuration → Environment variables**, thêm:
   - `APP_PASSCODE` = một mật khẩu bạn tự đặt (app gửi kèm mỗi lần gọi AI; người lạ không dùng được).
   - (tùy chọn) `AI_MODEL` — mặc định `claude-haiku-5-5`.
   - (tùy chọn) `AI_MOCK=1` để chạy thử không tốn lượt gọi.
3. Deploy. Sau lần deploy production đầu tiên, **Netlify AI Gateway** tự cấp quyền gọi Claude cho
   function (không cần key Anthropic).
4. Mở app → Tổng quan → biểu tượng cài đặt → nhập mật khẩu ở mục "AI sửa lỗi".
5. Trên điện thoại: mở trang bằng Chrome/Safari → "Thêm vào màn hình chính".

## Chi phí và kiểm soát
- Gói Free của Netlify có **300 credit/tháng**, dùng chung cho mọi thứ (AI Gateway tính 180 credit / 1 USD
  dùng AI). Ước tính với Haiku 5.5 cho một người luyện mỗi ngày: rất thấp so với hạn mức, nhưng **chưa đo thật**;
  xem mức dùng ở Netlify → Usage. Hết credit thì AI tạm dừng đến tháng sau; phần không cần AI vẫn chạy.
- Mỗi IP tối đa 20 lượt gọi AI/phút; kết quả trùng được cache (Netlify Blobs).
- Nếu muốn dùng key Anthropic riêng thay cho AI Gateway: đặt `ANTHROPIC_API_KEY` trong Environment variables
  (Netlify sẽ dùng key của bạn). Hãy **đặt hạn mức chi tiêu** trong Anthropic Console và **thu hồi key**
  ở mục API Keys nếu nghi bị lộ. Không bao giờ đưa key vào code hay commit `.env`.

## Dữ liệu
- Từ vựng: `public/data/` (sinh bằng `scripts/`, xem `DATA_SOURCES.md`). Nội dung do AI tạo được gắn nhãn.
- Định nghĩa số liệu: `STATS.md`. Kiểm thử: `TESTING.md`.
- App cũ: `legacy/index.html` (có nút "Xuất dữ liệu cũ" để chuyển tiến độ sang app mới).

## Cấu trúc
```
src/features/{overview,vocab,write,speak,listen}   màn hình
src/lib/                                           srs, stats, events, storage, speech, api…
netlify/functions/                                 check-sentence, correct-speech, listening
netlify/lib/                                       prompt, schema, mock, gọi AI
scripts/                                           build dữ liệu, seed, icon
```
