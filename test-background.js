// test-background.js
// Giả lập logic kiểm tra lịch học (getImminentClass) của background.js
// để đảm bảo tính năng offset hoạt động chính xác.

function getImminentClass(schedule, teacherConfigs = {}, mockNow = new Date()) {
  const dayMap = {
    "Chủ nhật": 0, "Thứ 2": 1, "Thứ 3": 2,
    "Thứ 4": 3, "Thứ 5": 4, "Thứ 6": 5, "Thứ 7": 6
  };

  for (const item of schedule) {
    if (dayMap[item.day] !== mockNow.getDay()) continue;

    const match = item.time.match(/(\d+)h(\d+)?/);
    if (!match) continue;
    const h = parseInt(match[1]);
    const m = match[2] ? parseInt(match[2]) : 0;

    const classStart = new Date(mockNow.getTime()); // Clone mockNow để giữ cùng thứ/ngày/tháng/năm
    classStart.setHours(h, m, 0, 0);

    // Tinh chỉnh giờ học dựa trên teacherConfigs
    let offsetMinutes = 0;
    if (teacherConfigs && teacherConfigs[item.teacher]) {
       offsetMinutes = parseInt(teacherConfigs[item.teacher].offset) || 0;
    }
    classStart.setMinutes(classStart.getMinutes() + offsetMinutes);

    const diff = (classStart - mockNow) / 60000; // phút

    // Trong vòng 30 phút trước và 90 phút sau khi lớp bắt đầu (đã bao gồm offset)
    if (diff <= 30 && diff > -90) {
      return { ...item, _appliedOffset: offsetMinutes, _diff: diff };
    }
  }
  return null;
}

// ---------------------------------------------------------
// TEST RUNNER
// ---------------------------------------------------------
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// Giả lập hôm nay là "Thứ 2" (getDay() === 1)
const baseDate = new Date("2026-04-06T00:00:00"); // 6/4/2026 là Thứ 2

const mockSchedule = [
  { name: "Cơ Sở Dữ Liệu", teacher: "Nguyen Van A", day: "Thứ 2", time: "10h00" },
  { name: "Lập trình Web", teacher: "Tran Thi B", day: "Thứ 2", time: "13h30" }
];

console.log("=== Bắt đầu Unit Tests cho getImminentClass ===");

// 1. Bình thường - Đang là 09:40 Thứ 2 (Trước giờ học 20p)
let mockNow1 = new Date(baseDate);
mockNow1.setHours(9, 40, 0, 0);
let res1 = getImminentClass(mockSchedule, {}, mockNow1);
assert(res1 && res1.name === "Cơ Sở Dữ Liệu" && res1._diff === 20, "Tự bắt lớp 10h00 lúc 09h40 (Không Offset)");

// 2. Bình thường - Đang là 09:20 Thứ 2 (Trước giờ học 40p -> Quá sớm, ko bắt)
let mockNow2 = new Date(baseDate);
mockNow2.setHours(9, 20, 0, 0);
let res2 = getImminentClass(mockSchedule, {}, mockNow2);
assert(res2 === null, "Chưa bắt lớp lúc 09h20 (Còn 40 phút nữa mới vào)");

// 3. Offset Sớm (+ 15 phút) - Đang là 09h20
// Lớp chuyển thành 10h15. So với 09h20 thì còn tận 55 phút nữa (không bắt)
let mockNow3 = new Date(baseDate);
mockNow3.setHours(9, 20, 0, 0);
let offsetV1 = { "Nguyen Van A": { offset: 15 } };
let res3 = getImminentClass(mockSchedule, offsetV1, mockNow3);
assert(res3 === null, "Lớp CSDL dời xuống 10h15, lúc 09h20 chưa thể bắt.");

// 4. Offset Trễ ( - 15 phút ) - Đang là 09h20
// Lớp chuyển thành 09h45. So với 09h20 thì classStart (09h45) - now (09h20) = 25 phút. Đủ điều kiện <= 30.
let offsetV2 = { "Nguyen Van A": { offset: -15 } };
let res4 = getImminentClass(mockSchedule, offsetV2, mockNow3);
assert(res4 && res4.name === "Cơ Sở Dữ Liệu" && res4._diff === 25, "Lớp CSDL học sớm lúc 09h45, lúc 09h20 bắt được thành công (diff = 25p).");

// 5. Quá Giờ (đã quá 90 phút) - Lớp 10h00, lúc này là 11h40, diff = -100
let mockNow5 = new Date(baseDate);
mockNow5.setHours(11, 40, 0, 0);
let res5 = getImminentClass(mockSchedule, {}, mockNow5);
assert(res5 === null, "Đã quá 90 phút lớp học (Hết hạn). Trả về null.");

console.log(`\n=== Tổng kết: ${passed}/${total} test pass! ===\n`);
