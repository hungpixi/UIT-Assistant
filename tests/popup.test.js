/**
 * @jest-environment jsdom
 */
const { renderScheduleList } = require('../schedule-logic');

describe('Popup Schedule Rendering', () => {
  let scheduleList;
  let btnSyncTKB;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <ul id="scheduleList"></ul>
      <button id="btnSyncTKB"></button>
    `;
    scheduleList = document.getElementById('scheduleList');
    btnSyncTKB = document.getElementById('btnSyncTKB');
  });

  test('should show empty state when schedule is empty', () => {
    renderScheduleList([], scheduleList, btnSyncTKB);
    expect(scheduleList.innerHTML).toContain('Hôm nay rảnh rang! Không có lớp nào.');
  });

  test('should render classes grouped by day with "Giáo viên" prefix', () => {
    const mockSchedule = [
      { day: 'Thứ 2', time: '18h00', name: 'Toán rời rạc', teacher: 'Nguyễn Văn A' },
      { day: 'Thứ 2', time: '20h00', name: 'Lập trình C++', teacher: 'Trần Thị B' },
      { day: 'Thứ 3', time: '18h00', name: 'Mạng máy tính', teacher: 'Lê Văn C' }
    ];

    renderScheduleList(mockSchedule, scheduleList, btnSyncTKB);

    // Check Day Headers
    const headers = scheduleList.querySelectorAll('.day-header');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toContain('Thứ 2');
    expect(headers[1].textContent).toContain('Thứ 3');

    // Check Class Items
    const items = scheduleList.querySelectorAll('.class-item');
    expect(items.length).toBe(3);

    // Check Teacher Prefix
    expect(items[0].innerHTML).toContain('Giáo viên Nguyễn Văn A');
    expect(items[1].innerHTML).toContain('Giáo viên Trần Thị B');
    expect(items[2].innerHTML).toContain('Giáo viên Lê Văn C');
  });

  test('should not add "Giáo viên" if teacher already has a title (ThS, TS...)', () => {
    const mockSchedule = [
      { day: 'Thứ 4', time: '18h00', name: 'Hệ điều hành', teacher: 'ThS. Nguyễn Văn D' },
      { day: 'Thứ 4', time: '19h00', name: 'Toán cao cấp', teacher: 'TS Nguyễn Văn E' },
      { day: 'Thứ 5', time: '20h00', name: 'Mạng', teacher: 'Giáo viên Trần F' },
      { day: 'Thứ 6', time: '18h00', name: 'Lắp ráp', teacher: 'gs. lê G' } // Case insensitive
    ];

    renderScheduleList(mockSchedule, scheduleList, btnSyncTKB);

    const items = scheduleList.querySelectorAll('.class-item');
    expect(items[0].innerHTML).toContain('👨‍🏫 ThS. Nguyễn Văn D'); // Has dot
    expect(items[1].innerHTML).toContain('👨‍🏫 TS Nguyễn Văn E'); // No dot
    expect(items[2].innerHTML).toContain('👨‍🏫 Giáo viên Trần F'); // Already has 'Giáo viên'
    expect(items[3].innerHTML).toContain('👨‍🏫 gs. lê G'); // Case insensitive GS
  });
});
