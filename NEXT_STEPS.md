# Tiến độ và việc tiếp theo (cập nhật 2026-11-05)

## Đã xong
- Phase 0: khảo sát, quyết định (xem PHASE0_REPORT.md).
- Phase 1 (phần lõi): script dữ liệu, chế độ trả lời thủ công (LLM_MANUAL=1, không tốn tiền API).
  Dữ liệu đợt 1 trong public/data: 719 từ (712 từ cũ + 7 từ mới), 27 chủ đề, 60 bộ học.
- Đã cài thư viện cho app (React, Vite, Tailwind, idb, vitest, vite-plugin-pwa, Netlify functions).

## Việc tiếp theo
1. Dựng khung app (Phase 2): điều hướng 5 mục, nhật ký sự kiện (IndexedDB), màn Từ vựng + SRS (Leitner),
   nhập dữ liệu cũ, xuất/nhập JSON.
2. Netlify Functions dùng AI Gateway + Haiku 5.5 (gói Free), có mock; màn Viết, Nói, Nghe.
3. Tổng quan (Hôm nay, Tiến trình), PWA, deploy Netlify.
4. Thêm dần từ mới: chạy `LLM_MANUAL=1 node scripts/llm-classify.ts`, trả lời các lô trong
   data/llm-pending/, rồi `npm run data:apply -- classify`, tiếp tục select/enrich/verify/words.

## Quyết định đã chốt
20 từ mới/ngày; Nói 10 câu/ngày; đổi ngày 04:00; hosting Netlify; AI trong app qua Netlify AI Gateway
(Haiku 5.5, gói Free); không dùng SUBTLEX-CH trực tiếp.
