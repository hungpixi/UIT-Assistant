// content_citd.js — V1.6 (Giữ nguyên logic, clean code)
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

// Retry với interval vì trang dùng Ajax/React (table load muộn)
let retries = 0;
const interval = setInterval(() => {
  retries++;
  if (retries > 15) { // Timeout sau 30 giây
    clearInterval(interval);
    console.warn("[UIT CITD] Timeout: Không tìm thấy bảng TKB.");
    return;
  }
  if (scanSchedule()) clearInterval(interval);
}, 2000);
