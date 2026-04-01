// content_citd.js — V2.0 (MutationObserver thay thế polling)
// Chạy khi user mở student.citd.edu.vn/projects
// Tự động quét bảng TKB và lưu vào chrome.storage

console.log("[UIT CITD] Schedule scraper active. Waiting for table...");

function parseTime(rawTime) {
  // Chuẩn hóa: "18h15", "8h00", "18 h 15" → "18h15"
  return rawTime.replace(/\s/g, "").toLowerCase();
}

function scanSchedule() {
  const rows = document.querySelectorAll("table tbody tr");
  if (rows.length === 0) return false;

  const schedule = [];

  rows.forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 7) return;

    const code = tds[1]?.innerText.trim();
    const name = tds[2]?.innerText.trim();
    const teacher = tds[4]?.innerText.trim();
    const day = tds[5]?.innerText.trim();
    const time = parseTime(tds[6]?.innerText.trim() || "");

    if (name && teacher && day && time) {
      schedule.push({ code, name, teacher, day, time });
    }
  });

  if (schedule.length === 0) return false;

  chrome.storage.local.set({ schedule }, () => {
    console.log("[UIT CITD] Schedule saved:", schedule.length, "subjects.");
    chrome.runtime.sendMessage({ type: "SCHEDULE_SYNCED", data: schedule });
  });

  return true;
}

// Thử quét ngay nếu table đã có sẵn (trang load đồng bộ)
if (!scanSchedule()) {
  // Trang dùng Ajax/React → dùng MutationObserver thay vì setInterval polling
  const observer = new MutationObserver(() => {
    if (scanSchedule()) observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Safety: ngắt observer sau 30 giây nếu không tìm thấy bảng
  setTimeout(() => {
    observer.disconnect();
    console.warn("[UIT CITD] Timeout: Không tìm thấy bảng TKB sau 30 giây.");
  }, 30000);
}
