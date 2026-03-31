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
    console.log("[UIT Teams] WAKE_UP received! Starting navigation context for:", classInfo?.name);

    // Lấy TKB mới nhất từ storage trước khi bật
    chrome.storage.local.get("schedule", ({ schedule }) => {
      scheduleData = schedule || [];
      if (classInfo) {
        navigateToSubject(classInfo);
      } else {
        startObserver();
      }
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
// TỰ ĐỘNG ĐIỀU HƯỚNG ĐẾN ĐÚNG MÔN HỌC
// ─────────────────────────────────────────────
function navigateToSubject(classInfo) {
  if (!classInfo || (!classInfo.code && !classInfo.name)) {
    startObserver();
    return;
  }

  let attempts = 0;
  console.log("[UIT Teams] Bắt đầu luồng điều hướng Môn Học:", classInfo.code || classInfo.name);

  const navInterval = setInterval(() => {
    attempts++;
    if (attempts > 20) {
      console.warn("[UIT Teams] Timeout chờ điều hướng UI MS Teams. Buộc bật màn quét đại chà...");
      clearInterval(navInterval);
      startObserver();
      return;
    }
    
    // 1. Kiểm tra xem có đang ở trong 1 Team/Nhóm cụ thể nào không (Biểu hiện bằng nút Back All Teams)
    let backBtn = document.querySelector('button[aria-label*="Tất cả các nhóm"], button[title*="Tất cả các nhóm"], button[aria-label*="All teams"], button[title*="All teams"]');
    
    // Fallback: Tìm thẻ chứa chữ Tất cả các nhóm
    if (!backBtn) {
      const spans = Array.from(document.querySelectorAll("span, div, a")).filter(el => {
        const txt = el.innerText?.trim();
        return txt === "Tất cả các nhóm" || txt === "All teams";
      });
      if (spans.length > 0) {
        backBtn = spans[0].closest("button, a, div") || spans[0];
      }
    }

    if (backBtn && backBtn.offsetParent !== null) {
      // Đang ở trong 1 Nhóm, hãy kiểm tra tiêu đề nhóm đấy xem có giống mã môn học không
      const pageText = document.body.innerText || "";
      const isCorrectTeam = pageText.includes(classInfo.code) || pageText.includes(classInfo.name);
      
      if (isCorrectTeam) {
        console.log("[UIT Teams] Đã ở đúng kênh môn học:", classInfo.code);
        clearInterval(navInterval);
        startObserver();
        return;
      } else {
        console.log("[UIT Teams] Phát hiện đang ở sai môn. Chuyển hướng trở Về Danh Sách Nhóm.");
        backBtn.click();
        return; // Đợi vòng tick (interval) sau để giao diện kịp chuyển
      }
    }

    // 2. Chắc chắn rằng thanh menu bên trái đang ở thẻ "Nhóm" (Teams)
    // Nếu chưa ở tab Teams (vd đag ở Chat), click để sang Teams
    const teamsTabBtn = document.querySelector('button[data-tid="app-bar-2b7bb30a-d1d4-40fe-a204-8ce5b1cacdb1"], button[aria-label="Nhóm"], button[aria-label="Teams"]');
    if (teamsTabBtn && teamsTabBtn.getAttribute("aria-selected") !== "true") {
      console.log("[UIT Teams] Bấm chuyển sang tab Nhóm trên menu trái.");
      teamsTabBtn.click();
      return;
    }

    // 3. Đang ở màn Dashboard Danh sách nhóm -> Quét tìm Card môn học để click vào
    const allCards = document.querySelectorAll('[data-tid="team-card"], div[class*="card"]');
    const keyword = classInfo.code || classInfo.name;
    
    for (const card of allCards) {
      if (card.innerText && card.innerText.includes(keyword)) {
        console.log("[UIT Teams] Đã tìm thấy Card môn học:", keyword);
        
        // KIỂM TRA NHANH: Nếu ở ngoài có nút "Tham gia ngay" thì bấm luôn!
        const quickJoinBtn = Array.from(card.querySelectorAll('button')).find(btn => {
          const txt = btn.innerText?.trim();
          return txt === "Tham gia ngay" || txt === "Join now";
        });

        if (quickJoinBtn) {
          console.log("[UIT Teams] Click Nhanh nút Tham gia ngay từ Dashboard!");
          showUIToast(`🚀 Đang tự động join lớp ${classInfo.name}...`);
          quickJoinBtn.click();
          clearInterval(navInterval);
          // Sau khi click thì Teams sẽ nhảy vào màn Prejoin
          return;
        }

        // Nếu không có nút bấm nhanh, thì click vào card để vào trong kênh như bình thường
        console.log("[UIT Teams] Không thấy nút nhanh, tiến hành vào trong kênh...");
        showUIToast(`📂 Đang vào kênh môn ${classInfo.name}...`);
        card.click();
        clearInterval(navInterval);
        setTimeout(() => startObserver(), 2000);
        return;
      }
    }

  }, 1000);
}

// ─────────────────────────────────────────────
// UI THÔNG BÁO (TOAST) SIÊU XỊN
// ─────────────────────────────────────────────
function showUIToast(message) {
  // Tạo container nếu chưa có
  let container = document.getElementById('uit-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'uit-toast-container';
    container.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 99999;
      display: flex; flex-direction: column; gap: 10px;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 20px; background: rgba(25, 25, 25, 0.85); color: #fff;
    border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; font-weight: 500; min-width: 250px;
    transform: translateX(120%); transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex; align-items: center; gap: 10px;
  `;
  
  toast.innerHTML = `
    <div style="background: #0078d4; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <img src="${chrome.runtime.getURL('icon128.png')}" style="width: 20px; height: 20px;">
    </div>
    <div>${message}</div>
  `;

  container.appendChild(toast);
  
  // Animation vào
  setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);

  // Tự biến mất sau 5s
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

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
    showUIToast("🎯 Đã tìm thấy nút Tham Gia! Đang vào lớp...");
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
