// background.js — V1.6 Lifecycle Manager
// Trạng thái: IDLE | PRE_CLASS | WATCHING | CLASS_DETECTED
// Bot chỉ tồn tại khi cần. Ngoài giờ học = 0 RAM consumption.

let state = "IDLE";

// ─────────────────────────────────────────────
// KHỞI CÀI ĐẶT khi Extension được nạp lần đầu
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ schedule: [], zaloGroup: "", isActive: true });
  // Alarm nhẹ: check 1 lần / 5 phút. Chrome alarm KHÔNG tốn RAM.
  chrome.alarms.create("lifecycleCheck", { periodInMinutes: 5 });
  console.log("[UIT v1.6] Extension installed. Lifecycle alarm set.");
});

// Khi Chrome restart, alarm tự tạo lại nếu chưa có
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get("lifecycleCheck", (a) => {
    if (!a) chrome.alarms.create("lifecycleCheck", { periodInMinutes: 5 });
  });
});

// ─────────────────────────────────────────────
// HÀM CHÍNH: Kiểm tra giờ học có sắp tới không
// ─────────────────────────────────────────────
function getImminentClass(schedule) {
  const now = new Date();
  const dayMap = {
    "Chủ nhật": 0, "Thứ 2": 1, "Thứ 3": 2,
    "Thứ 4": 3, "Thứ 5": 4, "Thứ 6": 5, "Thứ 7": 6
  };

  for (const item of schedule) {
    if (dayMap[item.day] !== now.getDay()) continue;

    const match = item.time.match(/(\d+)h(\d+)?/);
    if (!match) continue;
    const h = parseInt(match[1]);
    const m = match[2] ? parseInt(match[2]) : 0;

    const classStart = new Date();
    classStart.setHours(h, m, 0, 0);
    const diff = (classStart - now) / 60000; // phút

    // Trong vòng 30 phút trước và 90 phút sau khi lớp bắt đầu
    if (diff <= 30 && diff > -90) {
      return item;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// VÒNG ĐỜI: Chạy mỗi 5 phút
// ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "lifecycleCheck") return;

  chrome.storage.local.get(["schedule", "isActive"], ({ schedule, isActive }) => {
    if (!isActive || !schedule || schedule.length === 0) return;

    const imminentClass = getImminentClass(schedule);

    // Chưa tới giờ → giữ IDLE, không làm gì
    if (!imminentClass && state === "IDLE") return;

    // Hết giờ (đã qua 90 phút) → reset về IDLE
    if (!imminentClass && state !== "IDLE") {
      console.log("[UIT] Hết khung giờ. Reset về IDLE.");
      sendSleepToTeams();
      state = "IDLE";
      return;
    }

    // Sắp tới giờ + đang IDLE → kích hoạt PRE_CLASS
    if (imminentClass && state === "IDLE") {
      state = "PRE_CLASS";
      console.log(`[UIT] Sắp có lớp: ${imminentClass.name}. Chuyển PRE_CLASS → WATCHING.`);

      chrome.notifications.create({
        type: "basic",
        iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        title: "⏰ Sắp có lớp học!",
        message: `${imminentClass.name} — GV: ${imminentClass.teacher}. Bot đang bật cảm biến Teams.`
      });

      wakeUpTeams(imminentClass);
    }
  });
});

// ─────────────────────────────────────────────
// ĐÁNH THỨC Teams
// ─────────────────────────────────────────────
function wakeUpTeams(classInfo) {
  chrome.tabs.query({ url: "*://teams.cloud.microsoft/*" }, (tabs) => {
    if (tabs.length > 0) {
      // Đã có tab Teams → gửi lệnh WAKE_UP
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: "WAKE_UP",
          classInfo: classInfo
        });
      });
      state = "WATCHING";
    } else {
      // Chưa có tab Teams → mở mới
      chrome.tabs.create({ url: "https://teams.cloud.microsoft", active: false }, (tab) => {
        // Content script sẽ tự nhận WAKE_UP sau khi load xong vì state = WATCHING
        state = "WATCHING";
        // Sau 8 giây chờ Teams load, gửi wake up
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            type: "WAKE_UP",
            classInfo: classInfo
          });
        }, 8000);
      });
    }
  });
}

// ─────────────────────────────────────────────
// RU NGỦ Teams (giải phóng RAM)
// ─────────────────────────────────────────────
function sendSleepToTeams() {
  chrome.tabs.query({ url: "*://teams.cloud.microsoft/*" }, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: "SLEEP_NOW" }));
  });
}

// ─────────────────────────────────────────────
// NHẬN TÍN HIỆU TỪ CONTENT SCRIPTS
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {

  // Content CITD báo đã sync TKB xong
  if (req.type === "SCHEDULE_SYNCED") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      title: "✅ Đồng bộ lịch thành công!",
      message: `Đã lưu ${req.data.length} môn học. Bot sẽ tự bật trước mỗi giờ học.`
    });
    sendResponse({ ok: true });
  }

  // Content Teams báo tìm thấy link GV
  else if (req.type === "CLASS_DETECTED") {
    if (state === "CLASS_DETECTED") return; // chống duplicate
    state = "CLASS_DETECTED";
    console.log("[UIT] CLASS_DETECTED! Teacher:", req.teacherName, "| Link:", req.link);

    // 1. Notification
    chrome.notifications.create({
      type: "basic",
      requireInteraction: true,
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      title: "🚨 GV vừa bật lớp!",
      message: `${req.courseName} — ${req.teacherName}. Đang tham gia...`
    });

    // 2. Mở tab Join meeting (Teams sẽ tự detect tắt cam/mic qua URL params)
    const joinUrl = buildJoinUrl(req.link);
    // Lưu tạm thời link này vào Storage để Popup UI có thể móc ra hiện Icon Video
    chrome.storage.local.set({ lastMeetingLink: joinUrl, lastMeetingClass: req.courseName, lastMeetingTime: Date.now() });

    chrome.tabs.create({ url: joinUrl, active: true });

    // 3. Tắt Observer → IDLE
    if (sender?.tab) {
      chrome.tabs.sendMessage(sender.tab.id, { type: "SLEEP_NOW" });
    }
    sendSleepToTeams();
    state = "IDLE";
    sendResponse({ ok: true });
  }

  // Popup hỏi trạng thái VÒNG ĐỜI
  else if (req.type === "GET_STATE") {
    sendResponse({ state });
  }

  // Popup hỏi trạng thái ĐĂNG NHẬP (Smart Checklist V1.8)
  else if (req.type === "CHECK_LOGINS") {
    let citdLogin = false;
    let teamsLogin = false;

    // Quét cookie của Portal
    chrome.cookies.getAll({ url: "https://student.citd.edu.vn" }, (citdCookies) => {
      if (citdCookies && citdCookies.length > 0) {
        citdLogin = true;
      }
      
      // Sang Quét Teams (Phải khớp chính xác host_permissions trong manifest)
      chrome.cookies.getAll({ url: "https://teams.cloud.microsoft" }, (teamCookies) => {
        if (teamCookies && teamCookies.length > 0) {
          teamsLogin = true;
        }
        sendResponse({ citdLogin, teamsLogin });
      });
    });
    
    // Yêu cầu trả Async cho Chrome Runtime
    return true; 
  }

  return true;
});

// ─────────────────────────────────────────────
// TẠO URL JOIN VỚI TẮT CAM + MIC MẶC ĐỊNH
// Teams hỗ trợ tham số URL để preset device
// ─────────────────────────────────────────────
function buildJoinUrl(originalLink) {
  // Giữ link gốc, thêm fragment để Teams biết preset (cam off, mic off)
  // Cách chuẩn: Teams đọc ?preferredCamera=off&preferredMicrophone=off
  try {
    const url = new URL(originalLink);
    url.searchParams.set("preferredCamera", "off");
    url.searchParams.set("preferredMicrophone", "off");
    return url.toString();
  } catch {
    // Nếu URL lỗi, trả về nguyên bản
    return originalLink;
  }
}
