# Kiểm thử

## Tự động
```
npm test          # vitest: SRS, ngày/tuần, số liệu Tiến trình, so khớp chữ, parser kết quả AI
npm run build     # kiểm tra kiểu + đóng gói
```

## Dữ liệu mẫu cho màn Tiến trình
1. `npm run seed` tạo `build/seed-history.json` (90 ngày giả, có ngày nghỉ, tiến bộ dần).
2. Mở app với `?dev=1` (ví dụ `http://localhost:5173/?dev=1`). App dùng **cơ sở dữ liệu riêng** và hiện dải đỏ "DỮ LIỆU MẪU".
3. Cài đặt → Nhập bản sao lưu → chọn file trên. Dữ liệu thật **từ chối** file này.

## Kiểm thử thủ công (trên điện thoại)
**Từ vựng**
- [ ] Ôn hôm nay: hiện đáp án, Nhớ / Chưa nhớ; thẻ chưa nhớ quay lại cuối phiên.
- [ ] Chủ đề → Học bộ này; tìm kiếm theo chữ Hán, pinyin không dấu, nghĩa.
- [ ] Thẻ từ: nghe, chiết tự, "Xem nét chữ" (lần đầu cần mạng), "Báo dữ liệu này sai".
- [ ] Tắt mạng sau khi đã mở các chủ đề: từ vựng vẫn ôn được.

**Viết**
- [ ] Theo đề và tự do; câu trộn tiếng Việt/pinyin được sửa.
- [ ] Gõ lại: không dán được; sai thì gạch chân chỗ lệch; đúng thì hoàn thành.
- [ ] Lưu câu → Ôn câu đã lưu (ngày hôm sau). "Kết quả này sai" ghi nhận.
- [ ] Lỗi: mất mạng, sai mật khẩu, hết lượt gọi (429), AI trả sai định dạng → thông báo tiếng Việt.

**Nói**
- [ ] Từ chối quyền micro → thông báo rõ. Trình duyệt không có nhận diện (Firefox) → vẫn ghi âm và tự đánh giá.
- [ ] Nhại theo mẫu: nghe mẫu 0.7x/1x, ghi, thấy "Khớp N%", gợi ý sai thanh, nghe lại bản ghi.
- [ ] Nói tự do → sửa → "Nói lại bản đã sửa".

**Nghe**
- [ ] AI tạo đoạn; tối đa 4 lần phát (1 + 3 lần nghe lại) trước khi chấm.
- [ ] Đoạn có sẵn khi mất mạng; tự chấm theo ý chính.
- [ ] Sau chấm: Bắt được / Bỏ sót, xem chữ Hán, thêm từ mới vào ôn.

**Video**
- [ ] Dán link YouTube + chọn file .srt/.vtt tiếng Trung → mở được; file không có chữ Hán → báo lỗi rõ.
- [ ] Chia đoạn 3/5/10 phút, ranh giới rơi đúng cuối câu; danh sách đoạn hiện số lần đã nghe.
- [ ] Lặp đoạn đúng số lần rồi dừng, hiện "Sang đoạn tiếp"; "mãi mãi" thì lặp liên tục.
- [ ] Tốc độ 0.5x–1.25x; câu trước/sau; Lặp câu; phím Space, ←, →, R.
- [ ] Bật/tắt Chữ Hán / Pinyin / Dịch; pinyin đúng chữ đa âm (银行, 不行).
- [ ] Đóng app mở lại: video, phụ đề, số lần nghe và cài đặt còn nguyên.

**Tổng quan**
- [ ] Hôm nay: mục tiêu, nút "Bắt đầu" dẫn tới việc chưa xong, lỗi hay gặp → Luyện.
- [ ] Tiến trình khi **chưa có dữ liệu**: trạng thái trống. Với dữ liệu mẫu: đủ 8 khối, lọc 7/30/Từ đầu.
- [ ] Xuất JSON/CSV; nhập lại JSON trên máy khác; nhập dữ liệu app cũ.
