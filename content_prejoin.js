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
      showUIToast("✅ Đang vào phòng học. Chúc bạn học tốt!");
      joinBtns[0].click();
      clearInterval(retryInterval); // Xong nhiệm vụ, giải phóng timer
    }
    
  }, 1000); // Check mỗi giây
  
  // Dọn dẹp timer nếu qua 30 giây vẫn không có gì
  setTimeout(() => clearInterval(retryInterval), 30000);
}

// ─────────────────────────────────────────────
// UI THÔNG BÁO (TOAST)
// ─────────────────────────────────────────────
function showUIToast(message) {
  let container = document.getElementById('uit-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'uit-toast-container';
    container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;";
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 20px; background: rgba(25, 25, 25, 0.9); color: #fff;
    border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; transform: translateX(120%); transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex; align-items: center; gap: 10px;
  `;
  
  toast.innerHTML = `<div>${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

// Chạy luôn vì document_idle
autoClickJoinNow();
