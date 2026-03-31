# 🎓 UIT Student Assistant v1.9

> Extension tự động hóa dành riêng cho sinh viên hệ Đào tạo Từ xa (trạm CITD), thuộc **Khoa Khoa học và Kỹ thuật Thông tin**, chuyên ngành **Công nghệ Thông tin** tại Đại học Công nghệ Thông tin (UIT) - ĐHQG TP.HCM. Trợ thủ đắc lực giúp bạn làm chủ các buổi học trực tuyến qua MS Teams, nói không với việc đi muộn hay "miss" thông báo quan trọng.

![Version](https://img.shields.io/badge/version-1.9-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20Extension-success.svg)
![Author](https://img.shields.io/badge/author-Hungpixi-orange.svg)

## 💡 Đặt vấn đề & Quá trình suy nghĩ (Context)

Là một sinh viên chuyên ngành Công nghệ Thông tin theo học hệ từ xa (CITD) tại UIT, 100% thời lượng học tập của chúng ta diễn ra trực tuyến thông qua nền tảng **Microsoft Teams**. Tuy nhiên, trải nghiệm học thực tế lại phát sinh quá nhiều thao tác thủ công và bất tiện:

- ❌ **Lịch học rời rạc:** Lịch học được báo thường xuyên trên Portal CITD, nhưng lại chẳng dính dáng gì đến ứng dụng Lịch (Calendar) trên MS Teams. Nếu không tự nhớ hoặc đi hẹn báo thức bằng tay, khả năng "ngủ quên" giờ học là cực kỳ cao.
- ❌ **Lỡ mất Link vào lớp:** Giảng viên thường tung link "Join Meeting" đột ngột vào channel *Chung (General)* của môn học. Rất nhiều sinh viên bị "lỡ đò" chỉ vì Teams không ưu tiên nổ thông báo. Muốn không lỡ? Phải đi click tay `Bật Cảnh Báo (Banner and Feed)` cho từng môn một, mỗi học kỳ lại phải mở lên click lại cho cả chục môn – quá rườm rà!
- ❌ **Sự cố Camera & Mic:** Luống cuống bấm Link chạy nhanh vào lớp lúc trễ giờ khiến nhiều anh em quên check lại Mic hoặc Camera ở màn hình chờ (Pre-join screen), dẫn đến những khoảnh khắc "quê xệ" lọt âm thanh đời tư vào lớp.
- ❌ **Sát thủ diệt RAM:** Treo các phần mềm chạy ngầm cảnh báo hoặc bật sẵn trình duyệt chờ link 24/7 chỉ để ngóng xem có đi học không là sự lãng phí tài nguyên RAM vô nghĩa.

**🎯 Giải pháp (The Solution):**
Xuất phát từ nỗi đau trên, với tư duy của một dân IT *"Lười biếng để thúc đẩy năng suất"*, **UIT Assistant** ra đời nhằm giải phóng sức lao động thông qua tự động hóa:
1. **Sức mạnh đồng bộ:** Một cú click quẹt toàn bộ lịch trên CITD về lưu trữ mà không cần gõ phím.
2. **Kiến trúc Vòng đời thông minh (Smart Lifecycle):** Bot ngủ đông hoàn toàn khi không có lớp, **0% tốn RAM**. Nó chỉ "thức dậy" khi chẩn đoán sắp đến giờ học rồi lén mở dần cảm biến trên MS Teams.
3. **Bot Auto-Notify:** Dùng bot mô phỏng hành vi để tự chui vào mười mấy môn học gạt công tắc nhận cảnh báo tự động thay cho người dùng.
4. **Auto-Join Tàng hình:** Tốc độ tóm link ánh sáng! Ngay khi Giảng viên thả link, công cụ tiêm thẳng Params vào URL để khoá mõm Mic và dập Camera từ trong trứng nước trước khi nhảy mượt vào lớp, bảo vệ tuyệt đối hình ảnh sinh viên.
## 🚀 Tính năng nổi bật

- **Đồng Bộ TKB Tự Động**: Quét và lưu trữ Thời khóa biểu từ CITD Student Portal.
- **Smart Lifecycle (Không ngốn RAM)**: Tự động ngủ đông (IDLE) và chỉ "thức dậy" (WATCHING) kiểm tra MS Teams khi đến gần giờ học.
- **Auto-Join Tối Thượng**:
  - Tự động bắt link học trong Channel Chung của mỗi môn học trên MS Teams.
  - Tự động vượt Lobby/Pre-join screen: tự động Turn Off Mic & Camera để tránh quê xệ, rồi bấm Join vào lớp.
- **Auto-Notification Bot (V1.9 New ✨)**: Auto Macro tự động dò tìm cấu hình tắt/bật thông báo kênh trên Teams. Kích hoạt chỉ với 1 Click từ Popup, Bot sẽ cài lại toàn bộ cấu hình hiển thị Biểu Ngữ (Banner) khi có link học tiết mới nhất.
- **Floating UI Tools**: Truy cập siêu nhanh các tools cho sinh viên UIT từ màn hình Teams học.

## 📥 Cài đặt nhanh

### Cách 1: Tải về thủ công (Dành cho Sinh viên/Người dùng thường)
1. Bấm vào nút màu xanh lá cây **Code** ở trên cùng trang này > Chọn **Download ZIP** để tải toàn bộ thư mục về máy tính.
2. Giải nén thư mục vừa tải về.
3. Mở trình duyệt Chrome/Edge và truy cập vào địa chỉ: `chrome://extensions/`.
4. Bật công tắc **Developer mode** ở góc phải trên.
5. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén) và chọn đến thư mục bạn vừa giải nén lúc nãy.
6. Cắm ghim Extension lại trên thanh Toolbar và bắt đầu lười biếng một cách năng suất nhé! 😎

> 💡 **Khó Ư? Đừng Lo!** Bạn nào đọc mà không biết cài thì cứ liên hệ thẳng Zalo: **0834.422.439** nhé, tớ sẽ xếp lịch UltraView qua cài hộ tận máy cho, đảm bảo dễ ẹt! 🩺

### Cách 2: Bằng dòng lệnh (Dành cho Developer)
Clone repo thẳng vào máy tính bằng [GitHub CLI](https://cli.github.com/):
```bash
gh repo clone hungpixi/UIT-Assistant
```
*(Clone xong thì lặp lại từ Bước 3 của Cách 1 nha)*

## 🖥 Hướng dẫn sử dụng

1. **Bước 1**: Đăng nhập Portal CITD để kích hoạt session.
2. **Bước 2**: Đồng bộ Lịch Học (nhấn "Quét Lịch Ngay").
3. **Bước 3**: Mở Tab MS Teams trên trình duyệt. (Bot phải có tab Teams để chích Content Script vào).
4. **Bước 4**: Bấm nút **Cài Auto-Notify** để tự động set cảnh báo khi Giảng viên nhắn báo vô lớp.

## 🤝 Đóng góp (Contributing)
Issues và Pull Requests luôn được chào đón. Nếu thấy tool hay, đừng quên cho repo một ⭐️ nhé!

---
*Created by [Hungpixi](http://zalo.me/0834422439) with ❤️*
