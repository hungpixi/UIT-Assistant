// ─────────────────────────────────────────────
// CONTENT PRE-JOIN: Tự Động Bypass Sảnh Chờ MS Teams
// Chạy trên các subdomain *://teams.cloud.microsoft/meetup-join/*
// ─────────────────────────────────────────────

console.log("[UIT v1.8] Đã nạp Prejoin Bypass Script.");

// Hàm rà quét nút bấm liên tục (vì React của Teams render khá chậm)
function autoClickJoinNow() {
  const retryInterval = setInterval(() => {
    
    // 1. Trường hợp 1: Trình duyệt hỏi "Bạn muốn tham gia cuộc họp bằng cách nào?"
    // Rất hay gặp khi máy bấm link lạ. Cứ bắt nó "Tiếp tục trên trình duyệt này"
    const continueBrowserBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent.includes('Continue on this browser') || 
      b.textContent.includes('Tiếp tục trên trình duyệt này') ||
      b.getAttribute('data-tid') === 'joinOnWeb'
    );
    if (continueBrowserBtns.length > 0) {
      console.log("[UIT] Bấm Chọn Join trên Web Browser.");
      continueBrowserBtns[0].click();
      return; // click xong thì return để rà ở vòng lặp giây tiếp theo
    }

    // 2. Trường hợp 2: Đã vào sảnh Pre-join (Màn hình ngắm Cam + Nút Tham Gia Ngay)
    // Cam và Mic đã bị ngắt tự động nhờ URL Param (?preferredCamera=off&preferredMicrophone=off)
    // Việc còn lại là click vô "Join Now"
    const joinBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent.trim().toLowerCase() === 'tham gia ngay' ||
      b.textContent.trim().toLowerCase() === 'join now' ||
      (b.getAttribute('data-tid') || "").includes('prejoin-join-button')
    );
    
    if (joinBtns.length > 0) {
      console.log("[UIT] Tuyệt vời! Tìm thấy nút Tham Gia Ngay. Bye bye Lobby!");
      joinBtns[0].click();
      clearInterval(retryInterval); // Xong nhiệm vụ, giải phóng timer
    }
    
  }, 1000); // Check mỗi giây
  
  // Dọn dẹp timer nếu qua 30 giây vẫn không có gì
  setTimeout(() => clearInterval(retryInterval), 30000);
}

// Chạy luôn vì document_idle
autoClickJoinNow();
