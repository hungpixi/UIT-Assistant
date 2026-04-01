document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs Logic
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      // Remove active from all
      navItems.forEach(n => n.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));
      
      // Add active to current
      item.classList.add('active');
      const targetId = item.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Verify background status
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    const badge = document.getElementById('botStatus');
    if (chrome.runtime.lastError || !res) {
      badge.textContent = "Không thể kết nối";
      badge.classList.remove('active');
    } else {
      badge.textContent = `VÒNG ĐỜI: ${res.state}`;
      if (res.state !== "IDLE") badge.classList.add('active');
    }
  });

  // Load Data
  loadSchedule();
  loadTeacherConfigs();
  loadNotificationLogs();

  // Test Notification Button
  document.getElementById('btnTestNotif').addEventListener('click', () => {
    const title = document.getElementById('notifTitle').value || "Báo thức test";
    const msg = document.getElementById('notifMessage').value || "Đây là nội dung thử nghiệm.";
    chrome.runtime.sendMessage({
      type: "SEND_NOTIFICATION",
      title: title,
      message: msg,
      requireInteraction: false
    }, () => {
      setTimeout(loadNotificationLogs, 500); // Reload logs after a short delay
    });
  });

  // Save Teacher Configs Button
  document.getElementById('btnSaveConfigs').addEventListener('click', saveTeacherConfigs);
});

// ----------------------------------------------------
// TAB 1: SCHEDULE OVERVIEW
// ----------------------------------------------------
function loadSchedule() {
  chrome.storage.local.get("schedule", ({ schedule }) => {
    const grid = document.getElementById('scheduleGrid');
    if (!schedule || schedule.length === 0) {
      grid.innerHTML = '<p class="text-muted">Chưa có dữ liệu. Vui lòng quay lại Extension Popup để đồng bộ TKB.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'schedule-list';
    
    // Sử dụng hàm render có sẵn trong schedule-logic.js (nếu được nhúng)
    if (typeof renderScheduleList === 'function') {
      renderScheduleList(schedule, ul, null);
    } else {
      // Fallback
      schedule.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.day} - ${item.time}: ${item.name} (GV: ${item.teacher})`;
        li.style.marginBottom = '10px';
        ul.appendChild(li);
      });
    }
    
    grid.innerHTML = '';
    grid.appendChild(ul);
  });
}

// ----------------------------------------------------
// TAB 2: TEACHERS CONFIG
// ----------------------------------------------------
let currentTeachers = [];

function loadTeacherConfigs() {
  chrome.storage.local.get(["schedule", "teacherConfigs"], ({ schedule, teacherConfigs }) => {
    const listEl = document.getElementById('teacherConfigList');
    
    if (!schedule || schedule.length === 0) {
      listEl.innerHTML = '<p class="text-muted">Cần đồng bộ TKB trước khi cài đặt.</p>';
      return;
    }

    // Extract unique teachers
    const tp = new Set();
    schedule.forEach(item => tp.add(item.teacher));
    currentTeachers = Array.from(tp).sort();

    const configs = teacherConfigs || {};
    listEl.innerHTML = '';

    currentTeachers.forEach(teacher => {
      const container = document.createElement('div');
      container.className = 'teacher-item';
      
      const info = document.createElement('div');
      info.className = 'teacher-info';
      const strong = document.createElement('strong');
      strong.textContent = `👨‍🏫 ${teacher}`;
      const muted = document.createElement('span');
      muted.className = 'text-muted';
      muted.textContent = 'Offset (phút) cho bot gọi:';
      info.appendChild(strong);
      info.appendChild(muted);
      
      const controls = document.createElement('div');
      controls.className = 'teacher-controls';
      
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'form-control offset-input';
      input.dataset.teacher = teacher;
      input.value = (configs[teacher] && configs[teacher].offset) || 0;
      
      controls.appendChild(input);
      container.appendChild(info);
      container.appendChild(controls);
      listEl.appendChild(container);
    });
  });
}

function saveTeacherConfigs() {
  const inputs = document.querySelectorAll('.offset-input');
  const configs = {};
  
  inputs.forEach(input => {
    const teacher = input.dataset.teacher;
    const offset = parseInt(input.value) || 0;
    if (offset !== 0) {
      configs[teacher] = { offset: offset };
    }
  });

  chrome.storage.local.set({ teacherConfigs: configs }, () => {
    const btn = document.getElementById('btnSaveConfigs');
    const oldText = btn.textContent;
    btn.textContent = "✅ Đã Lưu Thành Công";
    btn.classList.add('btn-accent');
    btn.classList.remove('btn-primary');
    
    setTimeout(() => {
      btn.textContent = oldText;
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-accent');
    }, 2000);
  });
}

// ----------------------------------------------------
// TAB 3: NOTIFICATIONS & LOGS
// ----------------------------------------------------
function loadNotificationLogs() {
  chrome.storage.local.get("notificationLogs", ({ notificationLogs }) => {
    const logList = document.getElementById('logList');
    if (!notificationLogs || notificationLogs.length === 0) {
      logList.innerHTML = '<p class="text-muted">Chưa có hoạt động nào được ghi nhận.</p>';
      return;
    }

    logList.innerHTML = '';
    notificationLogs.forEach(log => {
      const item = document.createElement('div');
      item.className = 'log-item';
      
      const date = new Date(log.timestamp);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.toLocaleDateString('vi-VN')}`;
      
      const timeEl = document.createElement('span');
      timeEl.className = 'log-time';
      timeEl.textContent = timeStr;
      const titleEl = document.createElement('span');
      titleEl.className = 'log-title';
      titleEl.textContent = log.title;
      const msgEl = document.createElement('span');
      msgEl.className = 'log-msg';
      msgEl.textContent = log.message;
      item.appendChild(timeEl);
      item.appendChild(titleEl);
      item.appendChild(msgEl);
      logList.appendChild(item);
    });
  });
}
