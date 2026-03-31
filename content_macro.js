// content_macro.js — V1.9 Auto-Notification UI Bot
// Nhiệm vụ: Tự động click Setting -> bật thông báo Biểu Ngữ cho tất cả các môn Teams.

console.log("[UIT Macro V1.9] Module loaded. Waiting for RUN_MACRO signal...");

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "RUN_MACRO" && req.target === "teams") {
      console.log("[UIT Macro V1.9] Nhận lệnh từ Popup. Bắt đầu Càn Quét Kênh UI...");
      
      // Xác nhận trước khi chạy vì Macro chiếm quyền chuột/chuỗi hành động UI
      if(confirm("Trợ lý sẽ tự động cấu hình Nhận Thông Báo (khi thầy cô đăng link thẻ / đăng bài / chat) cho Tất cả môn học hiện có của bạn.\n\n⚠️ Vui lòng ngâm trà và để tiến trình tự chạy từ 10-30 giây nhé!")) {
         autoSetChannelNotifications();
      }
      sendResponse({ status: "started" });
  }
});

async function autoSetChannelNotifications() {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // TÌM CÁC KÊNH CHUNG / GENERAL CỦA TẤT CẢ LỚP HỌC
  const channels = Array.from(document.querySelectorAll('.channel-name, .text-truncate')).filter(s => 
      s.innerText.trim() === 'Chung' || s.innerText.trim() === 'General'
  );

  if (channels.length === 0) {
      alert("Tớ không nhìn thấy Kênh Học nào cả!\n► Hướng dẫn: Mở thẻ 'Nhóm' (Teams) bên thanh Trái, để hiển thị danh sách Lớp rồi bấm RUN CÀI ĐẶT lại nhé.");
      return;
  }

  let successCount = 0;

  for (let i = 0; i < channels.length; i++) {
     try {
         const channelEl = channels[i];
         console.log(`[UIT Macro] Đang cấu hình lớp thứ ${i+1}/${channels.length} ...`);
         
         // 1. Dời Viewport / Bấm vào thẻ kênh (tương thích React/DOM ảo)
         channelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
         channelEl.click();
         await wait(1200); 

         // 2. Mở MENU mở rộng (... Tùy chọn)
         const container = channelEl.closest('a, div[role="treeitem"]') || document;
         const moreBtn = container.querySelector('button[aria-label*="tùy chọn"], button[aria-label*="options"], [data-tid*="more-options"]');
         
         if (moreBtn) {
             moreBtn.click();
             await wait(800);
         } else {
             // Fallback: Chuột phải
             channelEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
             await wait(800);
         }

         // 3. Chọn Cài Đặt Thông Báo (Channel notifications)
         const menuItems = Array.from(document.querySelectorAll('button, div, span')).filter(b => 
             (b.innerText && (b.innerText.includes("thông báo về kênh") || b.innerText.includes("Channel notifications")))
         );
         if (menuItems.length > 0) {
             menuItems[menuItems.length-1].click(); 
             await wait(1500); // Chờ Modal React Mounting văng ra
         } else {
             continue; // Bỏ qua nếu ko tìm thấy (có thể Team Lock quyền)
         }

         // 4. CHỌN "BIỂU NGỮ" TRONG MODAL 
         const dropdownBtn = document.querySelector('[role="combobox"][aria-label*="bài đăng mới"], [aria-label*="Tất cả bài đăng mới"], [role="button"][aria-label*="bài đăng mới"]');
         if (dropdownBtn) {
             dropdownBtn.click();
             await wait(600);
             // Chọn Banner (Biểu ngữ và nguồn cấp)
             const bannerOption = Array.from(document.querySelectorAll('[role="option"], li')).find(o => 
                 o.innerText && (o.innerText.includes("Biểu ngữ") || o.innerText.includes("Banner"))
             );
             if (bannerOption) bannerOption.click();
             await wait(500);
         }
         
         // 5. BẤM LƯU CONFIG
         const saveBtn = Array.from(document.querySelectorAll('button')).find(b => 
             b.innerText && (b.innerText.trim() === "Lưu" || b.innerText.trim() === "Save")
         );
         if (saveBtn) {
             saveBtn.click();
             successCount++;
         }
         await wait(1000); // Rút quân / Chờ tắt Drop Modal

     } catch(e) {
         console.warn(`[UIT Macro] Lỗi bỏ qua ở kênh ${i}: `, e);
     }
  }

  alert(`✅ Hoàn Tất Báo Cáo KQ: \nĐã TỰ ĐỘNG Set tính năng Cảnh báo Tường và Biểu ngữ ("Windows Reo lên") cho ${successCount}/${channels.length} Môn học!`);
}
