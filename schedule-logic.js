/**
 * Hàm render danh sách lịch học (Dùng chung cho Popup và Unit Test)
 */
function renderScheduleList(list, scheduleList, btnSyncTKB) {
  if (list.length === 0) {
    scheduleList.innerHTML = `<li class="empty-state">Hôm nay rảnh rang! Không có lớp nào.</li>`;
    if (btnSyncTKB) btnSyncTKB.textContent = "Quét Lịch Ngay";
  } else {
    if (btnSyncTKB) {
      btnSyncTKB.innerHTML = "✅ Đã Đồng Bộ TKB";
      btnSyncTKB.classList.remove("highlight");
      btnSyncTKB.style.backgroundColor = "#28a745";
      btnSyncTKB.style.borderColor = "#28a745";
      btnSyncTKB.style.color = "white";
    }

    // Render lịch học cả tuần
    const dayOrder = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const groupedSchedule = {};
    
    dayOrder.forEach(day => {
      groupedSchedule[day] = list.filter(item => item.day === day);
    });

    scheduleList.innerHTML = "";
    
    let hasAnyClass = false;
    dayOrder.forEach(day => {
      const dayClasses = groupedSchedule[day];
      if (dayClasses.length > 0) {
        hasAnyClass = true;
        // Thêm tiêu đề ngày
        const dayHeader = document.createElement("li");
        dayHeader.className = "day-header";
        dayHeader.innerHTML = `📅 <strong>${day}</strong>`;
        scheduleList.appendChild(dayHeader);

        dayClasses.forEach(item => {
          const li = document.createElement("li");
          li.className = "class-item";
          // V1.9: Thêm chữ Giáo viên nếu chưa có chức danh (ThS, TS, GS, PGS...)
          const hasTitle = /^(ThS|TS|GS|PGS|Giáo viên)\.?\s/i.test(item.teacher);
          const teacherDisplay = hasTitle ? item.teacher : `Giáo viên ${item.teacher}`;
          li.innerHTML = `<span class="time-badge">${item.time}</span> <strong>${item.name}</strong><br>👨‍🏫 ${teacherDisplay}`;
          scheduleList.appendChild(li);
        });
      }
    });

    if (!hasAnyClass) {
      scheduleList.innerHTML = `<li class="empty-state">Tuần này rảnh rang! Không có lớp nào.</li>`;
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { renderScheduleList };
}
