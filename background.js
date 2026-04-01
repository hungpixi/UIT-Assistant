// background.js — V2.0 Lifecycle Manager (Fixed state persistence)
// Trạng thái: IDLE | PRE_CLASS | WATCHING | CLASS_DETECTED
// State lưu trong chrome.storage.session → không mất khi Service Worker bị Chrome kill

// ─────────────────────────────────────────────
// STATE MANAGEMENT — Persistent across SW restarts (Fix Bug 1)
// ─────────────────────────────────────────────
async function getState() {
  const { botState } = await chrome.storage.session.get("botState");
  return botState || "IDLE";
}

async function setState(newState) {
  await chrome.storage.session.set({ botState: newState });
  console.log(`[UIT] State → ${newState}`);
}

// ─────────────────────────────────────────────
// KHỞI CÀI ĐẶT khi Extension được nạp lần đầu
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ schedule: [], zaloGroup: "", isActive: true });
    console.log("[UIT] Lần đầu cài đặt: Khởi tạo Storage.");
  }

  chrome.alarms.get("lifecycleCheck", (a) => {
    if (!a) chrome.alarms.create("lifecycleCheck", { periodInMinutes: 5 });
  });
  chrome.alarms.get("updateCheck", (a) => {
    if (!a) chrome.alarms.create("updateCheck", { periodInMinutes: 720 });
  });
  console.log("[UIT v2.0] Extension ready. Alarms checked.");

  checkForUpdates();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get("lifecycleCheck", (a) => {
    if (!a) chrome.alarms.create("lifecycleCheck", { periodInMinutes: 5 });
  });
  chrome.alarms.get("updateCheck", (a) => {
    if (!a) chrome.alarms.create("updateCheck", { periodInMinutes: 720 });
  });

  checkForUpdates();
});

// ─────────────────────────────────────────────
// HÀM CHÍNH: Kiểm tra giờ học có sắp tới không
// ─────────────────────────────────────────────
function getImminentClass(schedule, teacherConfigs = {}) {
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

    let offsetMinutes = 0;
    if (teacherConfigs && teacherConfigs[item.teacher]) {
      offsetMinutes = parseInt(teacherConfigs[item.teacher].offset) || 0;
    }
    classStart.setMinutes(classStart.getMinutes() + offsetMinutes);

    const diff = (classStart - now) / 60000;

    if (diff <= 30 && diff > -90) {
      return { ...item, _appliedOffset: offsetMinutes };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// VÒNG ĐỜI: Chạy mỗi 5 phút hoặc Check Update
// ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "updateCheck") {
    checkForUpdates();
    return;
  }

  if (alarm.name !== "lifecycleCheck") return;

  const { schedule, isActive, teacherConfigs } = await chrome.storage.local.get(["schedule", "isActive", "teacherConfigs"]);
  if (!isActive || !schedule || schedule.length === 0) return;

  const state = await getState();
  const imminentClass = getImminentClass(schedule, teacherConfigs || {});

  if (!imminentClass && state === "IDLE") return;

  if (!imminentClass && state !== "IDLE") {
    console.log("[UIT] Hết khung giờ. Reset về IDLE.");
    sendSleepToTeams();
    await setState("IDLE");
    return;
  }

  if (imminentClass && state === "IDLE") {
    // Fix Bug 2: Bỏ qua nếu đã join lớp này trong vòng 90 phút qua
    const { recentlyJoinedUntil } = await chrome.storage.session.get("recentlyJoinedUntil");
    if (recentlyJoinedUntil && Date.now() < recentlyJoinedUntil) {
      console.log("[UIT] Đã join lớp trong phiên này, bỏ qua re-trigger.");
      return;
    }

    await setState("PRE_CLASS");
    const offsetText = imminentClass._appliedOffset
      ? ` (Đã điều chỉnh ${imminentClass._appliedOffset > 0 ? '+' : ''}${imminentClass._appliedOffset}p)` : '';
    console.log(`[UIT] Sắp có lớp: ${imminentClass.name}${offsetText}. Chuyển PRE_CLASS → WATCHING.`);

    sendNotification(
      "⏰ Sắp có lớp học!",
      `${imminentClass.name} — GV: ${imminentClass.teacher}${offsetText}. Bot đang bật cảm biến Teams.`
    );

    wakeUpTeams(imminentClass);
  }
});

// ─────────────────────────────────────────────
// TRÌNH TẠO THÔNG BÁO (NOTIFICATION SYSTEM V2.0)
// ─────────────────────────────────────────────
function sendNotification(title, message, requireInteraction = false, type = "basic") {
  const notifId = "uit_notif_" + Date.now();
  chrome.notifications.create(notifId, {
    type: type,
    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    title: title,
    message: message,
    requireInteraction: requireInteraction
  });

  chrome.storage.local.get("notificationLogs", ({ notificationLogs }) => {
    let logs = notificationLogs || [];
    logs.unshift({ timestamp: Date.now(), title, message });
    if (logs.length > 20) logs = logs.slice(0, 20);
    chrome.storage.local.set({ notificationLogs: logs });
  });

  return notifId;
}

// ─────────────────────────────────────────────
// ĐÁNH THỨC Teams
// ─────────────────────────────────────────────
function wakeUpTeams(classInfo) {
  const teamsPattern = "https://teams.cloud.microsoft/*";
  if (chrome.contentSettings) {
    chrome.contentSettings.notifications.set({ primaryPattern: teamsPattern, setting: "allow" });
    chrome.contentSettings.camera.set({ primaryPattern: teamsPattern, setting: "allow" });
    chrome.contentSettings.microphone.set({ primaryPattern: teamsPattern, setting: "allow" });
  }

  chrome.tabs.query({ url: "*://teams.cloud.microsoft/*" }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.warn("[UIT] Query error (No window?):", chrome.runtime.lastError.message);
      return;
    }

    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "WAKE_UP",
            classInfo: classInfo
          }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      });
      setState("WATCHING");
    } else {
      chrome.tabs.create({ url: "https://teams.cloud.microsoft", active: false }, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.id) {
          console.error("[UIT] Failed to create Teams tab or no window available.");
          return;
        }

        setState("WATCHING");
        const targetTabId = tab.id;
        setTimeout(() => {
          chrome.tabs.get(targetTabId, (currentTab) => {
            if (!chrome.runtime.lastError && currentTab && currentTab.id) {
              chrome.tabs.sendMessage(currentTab.id, {
                type: "WAKE_UP",
                classInfo: classInfo
              }, () => { if (chrome.runtime.lastError) {} });
            }
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
    if (chrome.runtime.lastError) return;
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: "SLEEP_NOW" }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      });
    }
  });
}

// ─────────────────────────────────────────────
// NHẬN TÍN HIỆU TỪ CONTENT SCRIPTS
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {

  if (req.type === "SCHEDULE_SYNCED") {
    sendNotification(
      "✅ Đồng bộ lịch thành công!",
      `Đã lưu ${req.data.length} môn học. Bot sẽ tự bật trước mỗi giờ học.`
    );
    sendResponse({ ok: true });
  }

  else if (req.type === "CLASS_DETECTED") {
    getState().then(async (currentState) => {
      if (currentState === "CLASS_DETECTED") {
        sendResponse({ ok: true });
        return;
      }
      await setState("CLASS_DETECTED");
      console.log("[UIT] CLASS_DETECTED! Teacher:", req.teacherName, "| Link:", req.link);

      sendNotification(
        "🚨 GV vừa bật lớp!",
        `${req.courseName} — ${req.teacherName}. Đang tham gia...`,
        true
      );

      const joinUrl = buildJoinUrl(req.link);
      chrome.storage.local.set({ lastMeetingLink: joinUrl, lastMeetingClass: req.courseName, lastMeetingTime: Date.now() });

      chrome.tabs.create({ url: joinUrl, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          console.warn("[UIT] Join tab creation failed:", chrome.runtime.lastError.message);
        }
      });

      if (sender && sender.tab && sender.tab.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: "SLEEP_NOW" }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
      sendSleepToTeams();

      // Fix Bug 2: Chặn re-trigger trong 90 phút tiếp theo
      await chrome.storage.session.set({ recentlyJoinedUntil: Date.now() + 90 * 60 * 1000 });
      await setState("IDLE");
      sendResponse({ ok: true });
    });
    return true; // async response
  }

  else if (req.type === "GET_STATE") {
    getState().then(state => sendResponse({ state }));
    return true; // async response
  }

  else if (req.type === "CHECK_LOGINS") {
    let citdLogin = false;
    let teamsLogin = false;

    chrome.cookies.getAll({ url: "https://student.citd.edu.vn" }, (citdCookies) => {
      if (citdCookies && citdCookies.length > 0) {
        citdLogin = true;
      }

      chrome.cookies.getAll({ url: "https://teams.cloud.microsoft" }, (teamCookies) => {
        if (teamCookies && teamCookies.length > 0) {
          teamsLogin = true;
        }
        sendResponse({ citdLogin, teamsLogin });
      });
    });

    return true;
  }

  else if (req.type === "SEND_NOTIFICATION") {
    sendNotification(req.title, req.message, req.requireInteraction);
    sendResponse({ ok: true });
  }

  return true;
});

// ─────────────────────────────────────────────
// TẠO URL JOIN VỚI TẮT CAM + MIC MẶC ĐỊNH
// ─────────────────────────────────────────────
function buildJoinUrl(originalLink) {
  try {
    const url = new URL(originalLink);
    url.searchParams.set("preferredCamera", "off");
    url.searchParams.set("preferredMicrophone", "off");
    return url.toString();
  } catch {
    return originalLink;
  }
}

// ─────────────────────────────────────────────
// AUTO UPDATE NOTIFIER (V1.9)
// ─────────────────────────────────────────────
async function checkForUpdates() {
  try {
    const remoteUrl = "https://raw.githubusercontent.com/hungpixi/UIT-Assistant/master/manifest.json";
    const res = await fetch(remoteUrl, { cache: "no-store" });
    const remoteManifest = await res.json();
    const localVersion = chrome.runtime.getManifest().version;
    const remoteVersion = remoteManifest.version;

    if (remoteVersion && remoteVersion !== localVersion && remoteVersion.localeCompare(localVersion, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
      console.log(`[UIT Auto-Update] Có bản mới: v${remoteVersion}. Máy đang chạy: v${localVersion}`);

      chrome.notifications.create("update_notifier", {
        type: "basic",
        iconUrl: "icon128.png",
        title: `🎉 UIT Assistant v${remoteVersion} Đã Ra Mắt!`,
        message: `Bạn đang dùng v${localVersion}. Click vào đây để tải ngay bản mới siêu xịn từ Github nhé!`,
        requireInteraction: true
      });
    }
  } catch (err) {
    console.error("[UIT Auto-Update] Lỗi check version:", err);
  }
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "update_notifier") {
    chrome.tabs.create({ url: "https://github.com/hungpixi/UIT-Assistant" }, (tab) => {
      if (chrome.runtime.lastError) {}
    });
    chrome.notifications.clear("update_notifier");
  }
});
