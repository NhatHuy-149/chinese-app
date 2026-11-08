# Tiến độ và việc tiếp theo (cập nhật 2026-11-05)

## Đã xong
- Phase 0–6 ở mức chạy được: từ vựng + SRS, Viết, Nói, Nghe, Tổng quan (Hôm nay, Tiến trình 8 khối),
  sao lưu/nhập, nhập dữ liệu app cũ, PWA, Netlify Functions (AI Gateway + Haiku 5.5, có mock).
- Dữ liệu: 719 từ (712 từ cũ + 7 từ mới), 559 câu mẫu, 30 đoạn nghe có ý chính.
- Đã kiểm tra bằng trình duyệt headless: các màn hiển thị đúng, luồng Viết (mock), ôn từ, nạp dữ liệu mẫu.

## Chưa làm / cần làm tiếp
1. **Deploy lên Netlify** và đặt `APP_PASSCODE`; thử AI thật (Haiku qua AI Gateway) và đo chi phí.
2. **Mở rộng từ vựng lên ~2500 từ giao tiếp**: chạy `LLM_MANUAL=1 node scripts/llm-classify.ts`,
   trả lời các lô trong `data/llm-pending/`, `npm run data:apply -- classify`, rồi select / enrich / verify / words.
3. Bước kiểm chứng lần 2 cho phần do AI viết (`llm-verify`) chưa chạy cho 80 câu ví dụ đã thêm.
4. Thử thật trên điện thoại: nhận diện giọng nói zh-CN trên iPhone, giọng đọc TTS.
5. Xem lại `docs/needs-review.md` (3 mục) và `docs/review-sample.md`.

## Video (tab thứ 6)
- Phase 1 xong: link YouTube + file phụ đề, chia đoạn, lặp đoạn/câu, tốc độ, pinyin trên chữ.
- Phase 2 (tải video + Whisper) và Phase 3 (từ vựng, shadowing, xuất .srt/mp4, chuyển phồn→giản) chưa làm.
- Chưa kiểm tra phát video thật (trình duyệt headless không phát được YouTube); logic lặp đã có unit test.

## Quyết định đã chốt
20 từ mới/ngày; Nói 10 câu/ngày; đổi ngày 04:00; hosting Netlify; AI trong app qua Netlify AI Gateway
(Haiku 5.5, gói Free); không dùng SUBTLEX-CH trực tiếp.
