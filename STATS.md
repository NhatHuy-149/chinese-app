# Định nghĩa số liệu

Mọi con số trong app được tính lại từ **nhật ký luyện tập** (IndexedDB, store `events`, chỉ ghi thêm).
Mã nguồn: `src/lib/stats.ts`, kiểm thử: `src/lib/stats.test.ts`.

## Sự kiện
| skill | kind | Ý nghĩa | metrics |
|---|---|---|---|
| vocab | `new`, `review` | Một lần trả lời thẻ từ | `correct`, `direction` (zh2vi / vi2zh), `box` sau khi chấm |
| vocab | `import` | Từ đã thuộc nhập từ app cũ (**không tính là luyện tập**) | `box` (áp cho cả hai chiều) |
| write | `check` | Một câu đã được AI sửa | `firstTryCorrect`, `corrections`, `retypeOk` (gõ lại đúng ngay lần đầu), `retypeDone` |
| write | `sentence-review` | Ôn một câu đã lưu | `correct` |
| speak | `shadow` | Một lần nhại theo mẫu | `matchPct` (nếu có nhận diện), `speakSec`, `selfRated` |
| speak | `free` | Một lần nói tự do đã được sửa | `speakSec`, `corrections` |
| listen | `gist` | Một đoạn nghe đã chấm | `score`, `caught`, `total`, `replays`, `level`, `selfGraded` |
| bất kỳ | `flag` | Người học báo "kết quả AI sai" (`itemId` = id sự kiện bị báo) | `note`, `targetType` |

`durationSec` = thời gian đo được từ lúc mở bài đến lúc trả lời, mỗi sự kiện tính tối đa 5 phút.

## Quy ước
- **Ngày** bắt đầu lúc **04:00** giờ của thiết bị. Tuần bắt đầu **thứ Hai**.
- **Ngày có luyện**: có ít nhất một sự kiện `countsAsPractice = true`.
- **Chuỗi hiện tại**: số ngày có luyện liên tiếp tính lùi từ hôm nay; nếu hôm nay chưa luyện thì tính từ hôm qua (chuỗi chưa mất).
- **Chuyên cần**: số ngày có luyện / số ngày lịch kể từ ngày luyện đầu tiên (tính cả hai đầu).
- **Từ đã thuộc**: cả hai chiều ở hộp Leitner ≥ 4 (khoảng ôn ≥ 8 ngày). Tính bằng cách phát lại `box` trong các sự kiện vocab.
- **Mục tiêu hằng ngày**: ôn từ = số thẻ đã trả lời; viết = số câu `check` đã gõ lại xong; nói = số lượt `shadow`/`free`; nghe = số đoạn `gist`.
- **Khối lượng**: tổng phút đo được theo kỹ năng, theo ngày (lọc 7 ngày) hoặc theo tuần.
- **Chất lượng**: trung bình theo kỳ; **kỳ dưới 5 lượt không vẽ**; sự kiện bị báo sai bị **loại**.
- **Xu hướng lỗi**: số nhãn lỗi trong kỳ so với kỳ liền trước cùng độ dài.
- **Dự báo**: tốc độ thuộc từ trung bình 30 ngày gần nhất; chỉ hiện khi có **≥ 14 ngày** dữ liệu và tốc độ > 0; luôn ghi là ước tính.
- **Tóm tắt tuần**: so tuần trọn vẹn vừa qua với tuần trước đó, sinh bằng quy tắc (không dùng AI).
