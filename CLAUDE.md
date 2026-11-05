# CLAUDE.md

> Nguồn: mục 1 và mục 2 của `PROMPT_hoan_thien_app.md`. Các tham chiếu "mục N" bên dưới trỏ tới file đó.

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

## 2. Quy tắc làm việc

- **Hỏi trước khi đoán** với các quyết định sản phẩm chưa rõ (xem mục 11). Không tự thêm tính năng ngoài phạm vi.
- **Làm theo phase** (mục 10). Hết mỗi phase: chạy test, tóm tắt thay đổi, nêu rủi ro, rồi **dừng chờ duyệt**.
- **Commit nhỏ, thường xuyên** (`git init` nếu chưa có). Mỗi commit một ý, message rõ ràng bằng tiếng Anh.
- **Không xóa code hay dữ liệu cũ.** Chuyển vào `/legacy` và ghi chú. Chỉ xóa khi tôi đồng ý.
- **Không đưa API key vào code phía client, không commit `.env`.**
- Giữ code ngắn gọn: ít phụ thuộc, hàm nhỏ, tên rõ nghĩa, không trừu tượng hóa sớm.
- Mọi nội dung hiển thị cho người dùng bằng **tiếng Việt**; mã nguồn và comment bằng tiếng Anh.
- Khi không chắc một thông tin kỹ thuật (hỗ trợ trình duyệt, giá, giấy phép, mã model), **hãy tự kiểm tra** rồi báo lại, đừng nói như thể chắc chắn.
