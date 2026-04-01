document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTS
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.getElementById('statusText');
  
  const scheduleList = document.getElementById('scheduleList');
  const activeLinkContainer = document.getElementById('active-link-container');
  const meetingClassName = document.getElementById('meeting-className');
  const btnOpenMeeting = document.getElementById('btnOpenMeeting');

  // ACTIONS
  const btnLoginPortal = document.getElementById('btnLoginPortal');
  const btnSyncTKB = document.getElementById('btnSyncTKB');
  const btnOpenTeams = document.getElementById('btnOpenTeams');
  const btnAutoTeams = document.getElementById('btnAutoTeams');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');

  // TABS LOGIC
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  navItems.forEach(nav => {
    nav.addEventListener('click', () => {
       const target = nav.dataset.tab;
       // Reset active
       navItems.forEach(n => n.classList.remove('active'));
       tabPanes.forEach(p => p.classList.remove('active'));
       
       // Set active
       nav.classList.add('active');
       document.getElementById(target).classList.add('active');
    });
  });

  // ======= HOME TAB LOGIC ======= //
  // 1. Get Status
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (!res) return;
    if (statusIndicator) statusIndicator.className = "status-indicator";
    if (res.state === "IDLE") {
      statusIndicator.classList.add("idle");
      statusText.innerHTML = "💤 Đang ngủ (Chờ TKB)";
    } else if (res.state === "PRE_CLASS") {
      statusIndicator.classList.add("pre");
      statusText.innerHTML = "⏳ Chuẩn bị học (Đợi 30p)";
    } else if (res.state === "WATCHING") {
      statusIndicator.classList.add("watching");
      statusText.innerHTML = "🔴 Đang quét Teams";
    } else if (res.state === "CLASS_DETECTED") {
      statusIndicator.classList.add("detected");
      statusText.innerHTML = "✅ Đã phát hiện Link!";
    }
  });

  // 2. Button Check (Portal, Teams, Sync)
  chrome.runtime.sendMessage({ type: "CHECK_LOGINS" }, (res) => {
    if (res && res.citdLogin) {
      btnLoginPortal.classList.add("btn-active-success");
      btnLoginPortal.innerHTML = "✅ Portal CĐ";
    }
    if (res && res.teamsLogin) {
      btnOpenTeams.classList.add("btn-active-success");
      btnOpenTeams.innerHTML = "✅ MS Teams";
    }
  });

  // ======= ACTIONS ======= //
  btnLoginPortal.addEventListener('click', () => chrome.tabs.create({ url: "https://student.citd.edu.vn/signin" }));
  btnSyncTKB.addEventListener('click', () => chrome.tabs.create({ url: "https://student.citd.edu.vn/projects" }));
  btnOpenTeams.addEventListener('click', () => chrome.tabs.create({ url: "https://teams.cloud.microsoft" }));
  btnOpenDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });
  
  if (btnAutoTeams) {
    btnAutoTeams.addEventListener('click', () => {
      chrome.tabs.query({ url: ["*://teams.cloud.microsoft/*", "*://teams.microsoft.com/*"] }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          btnAutoTeams.innerHTML = "🚨 Lỗi: Bạn chưa mở tab Teams!";
          btnAutoTeams.style.background = "#ff4d4f";
          btnAutoTeams.style.color = "#fff";
          return;
        }
        
        // Ưu tiên tab đang active (nếu user có nhiều tab Teams)
        let targetTab = tabs.find(t => t.active) || tabs[0];

        if (targetTab && targetTab.id) {
          chrome.tabs.sendMessage(targetTab.id, { type: "RUN_MACRO", target: "teams" }, (res) => {
             if (chrome.runtime.lastError) {
               console.warn("Error sending message to tab:", chrome.runtime.lastError.message);
               btnAutoTeams.innerHTML = "🚨 Lỗi: Sang Tab Teams nhấn F5 tải lại!";
               btnAutoTeams.style.background = "#ff4d4f";
               btnAutoTeams.style.color = "#fff";
               btnAutoTeams.style.fontSize = "12px";
               return;
             }
             if (res && res.status === "started") {
               btnAutoTeams.innerHTML = "⏳ Đang Thiết Lập Chuông...";
               btnAutoTeams.style.background = "#fff";
               btnAutoTeams.style.color = "#28a745";
               btnAutoTeams.style.pointerEvents = "none";
             }
          });
        }
      });
    });
  }

  // ======= SCHEDULE TAB LOGIC ======= //
  chrome.storage.local.get(["schedule", "lastMeetingLink", "lastMeetingClass", "lastMeetingTime"], (data) => {
    // Render Schedule using schedule-logic.js
    if (typeof renderScheduleList === 'function' && scheduleList) {
      renderScheduleList(data.schedule || [], scheduleList, btnSyncTKB);
    }

    // Active Link Detection
    if (data.lastMeetingLink && data.lastMeetingTime) {
      const hoursSince = (Date.now() - data.lastMeetingTime) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        if (activeLinkContainer) activeLinkContainer.style.display = 'block';
        if (meetingClassName) meetingClassName.textContent = data.lastMeetingClass || "Lớp Đang Họp";
        if (btnOpenMeeting) btnOpenMeeting.onclick = () => chrome.tabs.create({ url: data.lastMeetingLink, active: true });
      }
    }
  });

  // ======= SETTINGS TAB LOGIC ======= //
  const teacherInput = document.getElementById('teacherInput');
  const offsetInput = document.getElementById('offsetInput');
  const btnSaveOffset = document.getElementById('btnSaveOffset');
  const teacherListContainer = document.getElementById('teacherList');

  function renderTeacherOffsets() {
    chrome.storage.local.get("teacherConfigs", (data) => {
      const configs = data.teacherConfigs || {};
      if (teacherListContainer) teacherListContainer.innerHTML = "";
      
      const keys = Object.keys(configs);
      if (keys.length === 0) {
        if (teacherListContainer) teacherListContainer.innerHTML = "<li class='empty-state'>Chưa có tuỳ chỉnh nào...</li>";
        return;
      }

      keys.forEach(teacher => {
        const tr = document.createElement("li");

        const info = document.createElement("div");
        const nameSpan = document.createElement("span");
        nameSpan.className = "teacher-name";
        nameSpan.textContent = teacher;
        const offsetSpan = document.createElement("span");
        offsetSpan.className = "teacher-offset";
        const offset = configs[teacher].offset;
        offsetSpan.textContent = `${offset > 0 ? '+' + offset : offset} phút`;
        info.appendChild(nameSpan);
        info.appendChild(document.createTextNode(" "));
        info.appendChild(offsetSpan);
        
        const btnDelete = document.createElement("button");
        btnDelete.className = "btn-delete";
        btnDelete.innerText = "✕";
        btnDelete.onclick = () => {
          delete configs[teacher];
          chrome.storage.local.set({ teacherConfigs: configs }, () => {
            renderTeacherOffsets(); // Re-render
          });
        };
        
        tr.appendChild(info);
        tr.appendChild(btnDelete);
        if (teacherListContainer) teacherListContainer.appendChild(tr);
      });
    });
  }

  // Khởi chạy render list
  renderTeacherOffsets();

  if (btnSaveOffset) {
    btnSaveOffset.addEventListener('click', () => {
      const tName = teacherInput.value.trim();
      const tOffset = parseInt(offsetInput.value);
      
      if (!tName || isNaN(tOffset)) {
        alert("Vui lòng điền đủ Tên Giáo Viên và Số phút!");
        return;
      }

      chrome.storage.local.get("teacherConfigs", (data) => {
        let configs = data.teacherConfigs || {};
        configs[tName] = { offset: tOffset };
        
        chrome.storage.local.set({ teacherConfigs: configs }, () => {
          teacherInput.value = "";
          offsetInput.value = "";
          renderTeacherOffsets();
        });
      });
    });
  }

  // ======= NOTIFICATIONS TAB LOGIC ======= //
  const notificationList = document.getElementById('notificationList');
  function renderNotifications() {
    chrome.storage.local.get("notificationLogs", (data) => {
      const logs = data.notificationLogs || [];
      if (!notificationList) return;
      notificationList.innerHTML = "";
      
      if (logs.length === 0) {
        notificationList.innerHTML = '<li class="empty-state">Chưa có thông báo nào...</li>';
        return;
      }

      logs.forEach(log => {
        const li = document.createElement("li");
        li.className = "notif-item";

        // Format date/time
        const dateObj = new Date(log.timestamp);
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        const header = document.createElement("div");
        header.className = "notif-header";
        const titleSpan = document.createElement("span");
        titleSpan.className = "notif-title";
        titleSpan.textContent = log.title;
        const timeSpan = document.createElement("span");
        timeSpan.className = "notif-time";
        timeSpan.textContent = timeStr;
        header.appendChild(titleSpan);
        header.appendChild(timeSpan);
        const msgDiv = document.createElement("div");
        msgDiv.className = "notif-message";
        msgDiv.textContent = log.message;
        li.appendChild(header);
        li.appendChild(msgDiv);
        notificationList.appendChild(li);
      });
    });
  }

  // Gọi để render lần đầu lúc popup mở
  renderNotifications();
});
