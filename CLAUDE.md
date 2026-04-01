# 🌟 Global Rules — UIT Assistant Project (v2.0)

## 🎯 1. Nguyên tắc cốt lõi

1. **Lazy but Smart:** Ưu tiên tự động hóa. Không làm tay những gì máy làm được.
2. **Context là Vua:** Đọc kỹ README/SKILL.md trước khi code tính năng mới.
3. **Chất lượng > Số lượng:** Refactor ngay khi ngửi thấy Code Smell. Tránh Technical Debt.

---

## ⚡ 2. Tối ưu Token & Giới hạn

### Batching vs Splitting
- **Gộp** các bug/instruction nhỏ vào 1 prompt → giảm Input Token hao phí từ lịch sử chat.
- **Tách** khi task cần chiều sâu logic → tránh AI san phẳng Output, trả lời hời hợt.
- **Session mới** cho công việc hoàn toàn độc lập với context cũ.

### Tài liệu & Indexing
- Tận dụng Project Caching của Claude — cache tài liệu cốt lõi vào Workspace, đọc 1 lần.
- Khi file quá lớn (xuất hiện "Indexing"), AI dùng Search/Grep ~800-1000 dòng/lần.
- Task cần **tuyệt đối chính xác**: yêu cầu AI loop đọc toàn bộ file từng đoạn, không đọc ngẫu nhiên.

### Format
- **Markdown là chuẩn duy nhất.** Không xuất PDF/DOCX/Excel nếu chỉ cần xem text.
- Tránh nhồi PDF ảnh vào AI — OCR tốn tài nguyên và dễ hallucinate. Quy đổi sang TXT/Markdown trước.

### Model Routing
| Model | Dùng khi |
|-------|----------|
| **Haiku / Flash / GPT-4o-mini** | Task vặt: format, typo, fix syntax lộ liễu |
| **Sonnet / Pro** | Dev chính: logic code, review PR, audit bảo mật, docs tầm trung |
| **Opus / Ultra / o1** | Mastermind: Master Plan, refactor core, phân tích cực phức tạp |

---

## 🧪 3. TDD / BDD

- **Logic cốt lõi** (Parser, Data Transform): Bắt buộc viết Unit Test trước (TDD).
- **User Flow / UI**: Nên viết Integration Test (BDD) để check End-User Experience.
- Test cả Happy Path lẫn Edge Cases (dữ liệu rỗng, nhập sai, timeout...).

---

## 🧠 4. Skills — Auto-trigger khi nhận yêu cầu trùng khớp

- **API First:** Ưu tiên HTTP API thay vì giả lập chuột (RPA).
- **ADR:** Ghi rõ lý do chọn Framework/DB/Library khi ra quyết định kiến trúc.
- **Bug-Fix Playbook:** Tra cứu anti-patterns ngay khi fix lỗi.
- **GitHub CLI / Vercel CLI:** Thao tác branch/deploy qua CLI, không dùng GUI.
- **Effective Prompting:** Tự cải thiện chất lượng câu hỏi nội bộ, tránh đáp án hời hợt.

---

## 📌 Project-specific: UIT Assistant Chrome Extension

- **Manifest Version:** MV3 — Service Worker, không phải background page.
- **State persistence:** Dùng `chrome.storage.session` cho runtime state (không dùng biến module-level trong SW).
- **Content Scripts:** Teams (`content_teams.js` + `content_macro.js`), CITD (`content_citd.js`), Prejoin (`content_prejoin.js`).
- **Test:** Jest + `schedule-logic.js` là entry point cho unit test (có `module.exports`).
- **Không dùng `innerHTML` với dữ liệu từ storage** — dùng `textContent` hoặc DOM methods.
