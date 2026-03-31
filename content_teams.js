// content_teams.js — V1.6
// QUAN TRỌNG: File này KHÔNG chạy bất kỳ logic nào khi được inject.
// Observer CHỈ được bật khi background.js gửi lệnh WAKE_UP.

console.log("[UIT Teams] Module loaded. Waiting for WAKE_UP signal...");

let observer = null;
let scheduleData = [];
let classInfo = null;

// ─────────────────────────────────────────────
// NHẬN LỆNH TỪ BACKGROUND
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {

  if (req.type === "WAKE_UP") {
    classInfo = req.classInfo;
    console.log("[UIT Teams] WAKE_UP received! Starting observer for:", classInfo?.name);

    // Lấy TKB mới nhất từ storage trước khi bật
    chrome.storage.local.get("schedule", ({ schedule }) => {
      scheduleData = schedule || [];
      startObserver();
    });
    sendResponse({ ok: true });
  }

  else if (req.type === "SLEEP_NOW") {
    stopObserver();
    console.log("[UIT Teams] SLEEP_NOW received. Observer disconnected. RAM freed.");
    sendResponse({ ok: true });
  }
});

// ─────────────────────────────────────────────
// BẬT OBSERVER
// ─────────────────────────────────────────────
function startObserver() {
  if (observer) return; // Tránh bật 2 lần

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) checkNode(node);
      }
    }
  });

  // Chờ DOM Teams load xong (Teams dùng React, cần đợi)
  const tryAttach = setInterval(() => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log("[UIT Teams] Observer ACTIVE. Scanning for meeting links...");
      clearInterval(tryAttach);

      // Quét luôn các tin nhắn đã có trên màn hình (GV có thể đăng từ trước)
      document.querySelectorAll('[data-tid="message-body"]').forEach(checkNode);
    }
  }, 1000);
}

// ─────────────────────────────────────────────
// TẮT OBSERVER (giải phóng RAM)
// ─────────────────────────────────────────────
function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log("[UIT Teams] Observer STOPPED.");
  }
}

// ─────────────────────────────────────────────
// PHÂN TÍCH TIN NHẮN MỚI
// ─────────────────────────────────────────────
function checkNode(node) {
  if (!node || !node.innerHTML) return;
  if (node.getAttribute("data-uit-scanned")) return;
  node.setAttribute("data-uit-scanned", "1"); // Đánh dấu đã quét

  const html = node.innerHTML;

  // Kiểm tra có link meeting không
  const hasMeetingLink = html.includes("meetup-join") || html.includes("Tham gia cuộc họp");
  if (!hasMeetingLink) return;

  // Tìm tên người gửi (leo ngược DOM)
  const senderName = getSenderName(node);
  console.log("[UIT Teams] Meeting link detected. Sender:", senderName);

  // Đối chiếu với danh sách GV trong TKB
  const matched = matchTeacher(senderName);
  if (!matched) {
    console.log("[UIT Teams] Sender not in schedule. Ignoring.");
    return;
  }

  // Lấy link meeting
  const linkEl = node.querySelector('a[href*="meetup-join"]');
  const meetingLink = linkEl ? linkEl.href : null;
  if (!meetingLink) {
    // Link ở dạng nút "Tham gia" — tìm nút Join và click
    tryClickJoinButton(node, matched, senderName);
    return;
  }

  // Báo về background
  reportClassDetected(matched.name, senderName, meetingLink);
}

// ─────────────────────────────────────────────
// TÌM TÊN NGƯỜI GỬI (leo DOM ngược lên)
// ─────────────────────────────────────────────
function getSenderName(node) {
  // Teams bọc mỗi message trong các wrapper, tên GV thường ở thẻ gần đó
  const selectors = [
    '[data-tid="message-author-name"]',
    '.fui-Text[class*="authorName"]',
    '.ui-chat__message__author',
    'span[class*="display-name"]'
  ];
  // Tìm trong container cha gần nhất
  let container = node;
  for (let i = 0; i < 6; i++) {
    if (!container.parentElement) break;
    container = container.parentElement;
    for (const sel of selectors) {
      const el = container.querySelector(sel);
      if (el && el.innerText.trim()) return el.innerText.trim();
    }
  }
  return "";
}

// ─────────────────────────────────────────────
// ĐỐI CHIẾU TÊN GV VỚI TKB (NÂNG CẤP V1.6)
// ─────────────────────────────────────────────
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchTeacher(senderName) {
  if (!senderName) return null;
  const cleanSender = removeAccents(senderName.toLowerCase());
  const senderWords = cleanSender.split(/[\s_.-]+/);

  for (const item of scheduleData) {
    const cleanTeacher = removeAccents(item.teacher.toLowerCase());
    
    // 1. Khớp hoàn toàn chuỗi (VD: "thay gia lap")
    if (cleanSender.includes(cleanTeacher) || cleanTeacher.includes(cleanSender)) {
      return item;
    }

    // 2. Khớp theo từng từ (VD: "Tram Nguyen" với "Nguyen Thi Thuy Tram")
    // GV có thể đảo Tên Họ, chỉ cần các chữ cái có nghĩa (dài > 2) đều tồn tại
    const significantWords = senderWords.filter(w => w.length > 2);
    if (significantWords.length > 0) {
       const isMatch = significantWords.every(word => cleanTeacher.includes(word));
       if (isMatch) return item;
    }
  }
  return null;
}


// ─────────────────────────────────────────────
// TỰ CLICK NÚT "THAM GIA" (Teams thường dùng nút thay vì link)
// Sau khi click → Teams mở dialog → content script click tiếp nút Join
// đồng thời tắt cam và mic trước khi vào
// ─────────────────────────────────────────────
function tryClickJoinButton(node, matchedSubject, senderName) {
  // Tìm nút "Tham gia" gần node này
  let joinBtn = node.querySelector('button[data-tid*="join"], button[class*="join"]');
  if (!joinBtn) {
    // Leo lên tìm tiếp
    let parent = node;
    for (let i = 0; i < 5; i++) {
      if (!parent.parentElement) break;
      parent = parent.parentElement;
      joinBtn = parent.querySelector('button[data-tid*="join"]');
      if (joinBtn) break;
    }
  }

  if (joinBtn) {
    console.log("[UIT Teams] Clicking JOIN button...");
    joinBtn.click();

    // Sau khi click, Teams mở Prejoin screen → tắt cam/mic rồi join
    waitForPrejoinAndJoin(matchedSubject, senderName);
  } else {
    // Không thấy nút → báo về background với link trống
    reportClassDetected(matchedSubject.name, senderName, "https://teams.cloud.microsoft");
  }
}

// ─────────────────────────────────────────────
// XỬ LÝ MÀN HÌNH PREJOIN (tắt cam + mic, rồi bấm Join)
// ─────────────────────────────────────────────
function waitForPrejoinAndJoin(matchedSubject, senderName) {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (attempts > 20) { clearInterval(interval); return; } // timeout 10s

    // Tìm nút toggle Camera
    const camBtn = document.querySelector(
      '[data-tid="toggle-video"], button[aria-label*="camera"], button[aria-label*="Camera"]'
    );
    // Tìm nút toggle Mic
    const micBtn = document.querySelector(
      '[data-tid="toggle-mute"], button[aria-label*="mute"], button[aria-label*="Mute"], button[aria-label*="microphone"]'
    );
    // Nút Join chính thức
    const joinNowBtn = document.querySelector(
      '[data-tid="prejoin-join-button"], button[data-tid*="join-now"]'
    );

    if (joinNowBtn) {
      // Tắt cam nếu đang bật
      if (camBtn && camBtn.getAttribute("aria-pressed") === "true") {
        console.log("[UIT Teams] Turning off camera...");
        camBtn.click();
      }
      // Tắt mic nếu đang bật
      if (micBtn && micBtn.getAttribute("aria-pressed") === "true") {
        console.log("[UIT Teams] Turning off mic...");
        micBtn.click();
      }

      // Đợi 500ms để Teams cập nhật state rồi mới bấm Join
      setTimeout(() => {
        console.log("[UIT Teams] Clicking JOIN NOW!");
        joinNowBtn.click();
        clearInterval(interval);

        // Báo về background để bắn Zalo + SLEEP
        reportClassDetected(matchedSubject.name, senderName,
          window.location.href);
      }, 500);
    }
  }, 500);
}

// ─────────────────────────────────────────────
// GỬI TÍN HIỆU VỀ BACKGROUND
// ─────────────────────────────────────────────
function reportClassDetected(courseName, teacherName, link) {
  chrome.runtime.sendMessage({
    type: "CLASS_DETECTED",
    courseName,
    teacherName,
    link
  });
  // Dừng observer ngay lập tức để không quét tiếp
  stopObserver();
}
