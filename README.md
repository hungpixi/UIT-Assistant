# 🎓 UIT Student Assistant v1.9

> Extension mạnh mẽ dành riêng cho sinh viên Khoa học Máy tính & Mạng máy tính tại Đại học Công nghệ Thông tin (UIT) - ĐHQG TP.HCM. Tự động hóa quá trình học tập, nói không với việc đi học muộn hay miss thông báo quan trọng.

![Version](https://img.shields.io/badge/version-1.9-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20Extension-success.svg)
![Author](https://img.shields.io/badge/author-Hungpixi-orange.svg)

## 🚀 Tính năng nổi bật

- **Đồng Bộ TKB Tự Động**: Quét và lưu trữ Thời khóa biểu từ CITD Student Portal.
- **Smart Lifecycle (Không ngốn RAM)**: Tự động ngủ đông (IDLE) và chỉ "thức dậy" (WATCHING) kiểm tra MS Teams khi đến gần giờ học.
- **Auto-Join Tối Thượng**:
  - Tự động bắt link học trong Channel Chung của mỗi môn học trên MS Teams.
  - Tự động vượt Lobby/Pre-join screen: tự động Turn Off Mic & Camera để tránh quê xệ, rồi bấm Join vào lớp.
- **Auto-Notification Bot (V1.9 New ✨)**: Auto Macro tự động dò tìm cấu hình tắt/bật thông báo kênh trên Teams. Kích hoạt chỉ với 1 Click từ Popup, Bot sẽ cài lại toàn bộ cấu hình hiển thị Biểu Ngữ (Banner) khi có link học tiết mới nhất.
- **Floating UI Tools**: Truy cập siêu nhanh các tools cho sinh viên UIT từ màn hình Teams học.

## 📥 Cài đặt nhanh (Dành cho Developer)

1. Clone repo này về máy tính bằng [GitHub CLI](https://cli.github.com/):
   ```bash
   gh repo clone <your-username>/UIT-Assistant
   ```
2. Mở trình duyệt Chrome/Edge và truy cập vào `chrome://extensions/`.
3. Bật **Developer mode** ở góc phải trên.
4. Bấm **Load unpacked** và chọn đến thư mục gốc của repo vừa clone.
5. Cắm ghim Extension lại trên thanh Toolbar và bắt đầu lười biếng một cách năng suất nhé! 😎

## 🖥 Hướng dẫn sử dụng

1. **Bước 1**: Đăng nhập Portal CITD để kích hoạt session.
2. **Bước 2**: Đồng bộ Lịch Học (nhấn "Quét Lịch Ngay").
3. **Bước 3**: Mở Tab MS Teams trên trình duyệt. (Bot phải có tab Teams để chích Content Script vào).
4. **Bước 4**: Bấm nút **Cài Auto-Notify** để tự động set cảnh báo khi Giảng viên nhắn báo vô lớp.

## 🤝 Đóng góp (Contributing)
Issues và Pull Requests luôn được chào đón. Nếu thấy tool hay, đừng quên cho repo một ⭐️ nhé!

---
*Created by [Hungpixi](http://zalo.me/0834422439) with ❤️*
