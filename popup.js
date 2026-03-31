document.addEventListener('DOMContentLoaded', () => {
  const statusBox = document.getElementById('statusBox');
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.getElementById('statusText');
  const scheduleList = document.getElementById('scheduleList');
  
  const btnLoginPortal = document.getElementById('btnLoginPortal');
  const btnSyncTKB = document.getElementById('btnSyncTKB');
  const btnOpenTeams = document.getElementById('btnOpenTeams');
  const btnAutoTeams = document.getElementById('btnAutoTeams');

  const activeLinkContainer = document.getElementById('active-link-container');
  const btnOpenMeeting = document.getElementById('btnOpenMeeting');
  const meetingClassName = document.getElementById('meeting-className');

  // Load Status
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (!res) {
      statusText.textContent = "Chưa kết nối Background";
      statusIndicator.className = "status-indicator";
      return;
    }
    const st = res.state;
    statusIndicator.className = "status-indicator";
    if (st === "IDLE") {
      statusIndicator.classList.add("idle");
      statusText.innerHTML = "💤 <b>Đang ngủ</b> (Chờ TKB)";
    } else if (st === "PRE_CLASS") {
      statusIndicator.classList.add("pre");
      statusText.innerHTML = "⏳ <b>Chuẩn bị học</b> (Đợi 30p)";
    } else if (st === "WATCHING") {
      statusIndicator.classList.add("watching");
      statusText.innerHTML = "🔴 <b>Đang quét Teams</b>";
    } else if (st === "CLASS_DETECTED") {
      statusIndicator.classList.add("detected");
      statusText.innerHTML = "✅ <b>Đã phát hiện Link!</b>";
    }
  });

  // Load Schedule & Meeting Link
  chrome.storage.local.get(["schedule", "lastMeetingLink", "lastMeetingClass", "lastMeetingTime"], (data) => {
    // 1. Render Schedule
    renderScheduleList(data.schedule || [], scheduleList, btnSyncTKB);

    // 2. Hiển thị nút VÀO LỚP (Nếu đang có link bắt được)
    if (data.lastMeetingLink && data.lastMeetingTime) {
      const hoursSince = (Date.now() - data.lastMeetingTime) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        activeLinkContainer.style.display = 'block';
        meetingClassName.textContent = data.lastMeetingClass || "Lớp học";
        btnOpenMeeting.onclick = () => {
           chrome.tabs.create({ url: data.lastMeetingLink, active: true }, (tab) => {
             if (chrome.runtime.lastError) {}
           });
        };
      }
    }
  });

  // ─────────────────────────────────────────────
  // V1.8: SMART CHECKLIST (QUÉT ĐĂNG NHẬP)
  // ─────────────────────────────────────────────
  chrome.runtime.sendMessage({ type: "CHECK_LOGINS" }, (res) => {
    if (res && res.citdLogin) {
      btnLoginPortal.innerHTML = "✅ Đã Đăng Nhập CITD";
      btnLoginPortal.classList.add("btn-success");
      btnLoginPortal.style.pointerEvents = "none"; // Không cần bấm nữa
    }
    if (res && res.teamsLogin) {
      btnOpenTeams.innerHTML = "✅ Đã Đăng Nhập Teams";
      btnOpenTeams.classList.add("btn-success");
      btnOpenTeams.style.pointerEvents = "none"; // Không cần bấm nữa
    }
  });

  // Checklist Actions
  btnLoginPortal.addEventListener('click', () => {
    chrome.tabs.create({ url: "https://student.citd.edu.vn/signin" }, (tab) => {
      if (chrome.runtime.lastError) {}
    });
  });

  btnSyncTKB.addEventListener('click', () => {
    chrome.tabs.create({ url: "https://student.citd.edu.vn/projects" }, (tab) => {
      if (chrome.runtime.lastError) {}
    });
  });

  btnOpenTeams.addEventListener('click', () => {
    chrome.tabs.create({ url: "https://teams.cloud.microsoft" }, (tab) => {
      if (chrome.runtime.lastError) {}
    });
  });

  // V1.9 Bấm nút từ Popup -> Gọi thẳng content script của Teams (nếu đang bật)
  btnAutoTeams.addEventListener('click', () => {
    chrome.tabs.query({ url: ["*://teams.cloud.microsoft/*", "*://teams.microsoft.com/*"] }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      
      if (tabs && tabs.length > 0 && tabs[0].id) {
        // Tab Teams đã mở, ném mìn WAKE UP MACRO xuống
        chrome.tabs.sendMessage(tabs[0].id, { type: "RUN_MACRO", target: "teams" }, (res) => {
           if (chrome.runtime.lastError) {
             console.warn("[UIT] Popup to Teams channel failed.");
             return;
           }
           if (res && res.status === "started") {
             btnAutoTeams.innerHTML = "✅ Đang Chạy Macro...";
             btnAutoTeams.classList.remove("highlight");
             btnAutoTeams.style.backgroundColor = "#28a745";
             btnAutoTeams.style.borderColor = "#28a745";
             btnAutoTeams.style.color = "white";
             btnAutoTeams.style.pointerEvents = "none";
           }
        });
      } else {
        alert("🚨 Lỗi: Bạn chưa mở Tab MS Teams nào cả! Hãy hoàn thành Bước 3 (Mở và Đăng Nhập MS Teams) trước khi kích hoạt Macro nhé.");
      }
    });
  });
});
