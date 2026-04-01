/**
 * Render danh sách lịch học theo tuần.
 * Dùng chung cho Popup, Dashboard, và Unit Test.
 * Highlight ngày hôm nay để dễ nhìn.
 */
function renderScheduleList(list, scheduleList, btnSyncTKB) {
  if (list.length === 0) {
    scheduleList.innerHTML = `<li class="empty-state">Hôm nay rảnh rang! Không có lớp nào.</li>`;
    if (btnSyncTKB) btnSyncTKB.textContent = "Quét Lịch Ngay";
    return;
  }

  if (btnSyncTKB) {
    btnSyncTKB.innerHTML = "✅ Đã Đồng Bộ TKB";
    btnSyncTKB.classList.remove("highlight");
    btnSyncTKB.style.backgroundColor = "#28a745";
    btnSyncTKB.style.borderColor = "#28a745";
    btnSyncTKB.style.color = "white";
  }

  const dayOrder = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
  const dayIndexMap = { "Thứ 2": 1, "Thứ 3": 2, "Thứ 4": 3, "Thứ 5": 4, "Thứ 6": 5, "Thứ 7": 6, "Chủ nhật": 0 };
  const todayIndex = new Date().getDay();

  const groupedSchedule = {};
  dayOrder.forEach(day => {
    groupedSchedule[day] = list.filter(item => item.day === day);
  });

  scheduleList.innerHTML = "";

  let hasAnyClass = false;
  dayOrder.forEach(day => {
    const dayClasses = groupedSchedule[day];
    if (dayClasses.length === 0) return;

    hasAnyClass = true;
    const isToday = dayIndexMap[day] === todayIndex;

    // Tiêu đề ngày — highlight nếu là hôm nay
    const dayHeader = document.createElement("li");
    dayHeader.className = isToday ? "day-header day-today" : "day-header";
    const headerIcon = document.createTextNode(isToday ? "📅 " : "📅 ");
    const headerStrong = document.createElement("strong");
    headerStrong.textContent = isToday ? `${day} — HÔM NAY` : day;
    dayHeader.appendChild(headerIcon);
    dayHeader.appendChild(headerStrong);
    scheduleList.appendChild(dayHeader);

    dayClasses.forEach(item => {
      const li = document.createElement("li");
      li.className = isToday ? "class-item class-today" : "class-item";

      // Fix XSS: dùng DOM methods thay vì innerHTML
      const timeBadge = document.createElement("span");
      timeBadge.className = "time-badge";
      timeBadge.textContent = item.time;

      const nameStrong = document.createElement("strong");
      const hasTitle = /^(ThS|TS|GS|PGS|Giáo viên)\.?\s/i.test(item.teacher);
      const teacherDisplay = hasTitle ? item.teacher : `Giáo viên ${item.teacher}`;
      nameStrong.textContent = item.name;

      const teacherNode = document.createTextNode(`👨‍🏫 ${teacherDisplay}`);

      li.appendChild(timeBadge);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(nameStrong);
      li.appendChild(document.createElement("br"));
      li.appendChild(teacherNode);

      scheduleList.appendChild(li);
    });
  });

  if (!hasAnyClass) {
    scheduleList.innerHTML = `<li class="empty-state">Tuần này rảnh rang! Không có lớp nào.</li>`;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { renderScheduleList };
}
