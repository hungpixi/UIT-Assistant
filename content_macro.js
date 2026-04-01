// content_macro.js — V1.9 Auto-Notification UI Bot
// Nhiệm vụ: Tự động click Setting -> bật thông báo Biểu Ngữ cho tất cả các môn Teams.

console.log("[UIT Macro V1.9] Module loaded. Waiting for RUN_MACRO signal...");

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "RUN_MACRO" && req.target === "teams") {
      console.log("[UIT Macro V1.9] Nhận lệnh từ Popup. Bắt đầu Càn Quét Kênh UI...");
      
      // Đã xác nhận trên Popup rồi, gọi thẳng hàm càn quét hệ thống luôn
      autoSetChannelNotifications();
      sendResponse({ status: "started" });
  }
});

async function autoSetChannelNotifications() {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  let successCount = 0;

  async function processChannelEl(channelEl, i, total) {
      console.log(`[UIT Macro] Đang cấu hình lớp thứ ${i+1}/${total} ...`);
      
      channelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      channelEl.click();
      await wait(1200); 

      const container = channelEl.closest('a, div[role="treeitem"]') || document;
      const moreBtn = container.querySelector('button[aria-label*="tùy chọn"], button[aria-label*="options"], [data-tid*="more-options"]');
      
      if (moreBtn) {
          moreBtn.click();
          await wait(800);
      } else {
          channelEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
          await wait(800);
      }

      const menuItems = Array.from(document.querySelectorAll('button, div, span')).filter(b => 
          (b.innerText && (b.innerText.includes("thông báo về kênh") || b.innerText.includes("Channel notifications")))
      );
      if (menuItems.length > 0) {
          menuItems[menuItems.length-1].click(); 
          await wait(1500); 
      } else {
          return false; 
      }

      // 3. Đợi hộp thoại (Dialog) Cài đặt thông báo hiển thị
      let dropdownBtn = null;
      let tryFindDropdown = 0;
      while (!dropdownBtn && tryFindDropdown < 3) {
          await wait(500);
          dropdownBtn = document.querySelector('[role="dialog"] [role="combobox"], [role="dialog"] button[aria-haspopup="listbox"]');
          if (!dropdownBtn) {
              dropdownBtn = Array.from(document.querySelectorAll('button')).find(b => 
                  b.getAttribute('role') === 'combobox' || b.getAttribute('aria-haspopup') === 'listbox'
              );
          }
          if (!dropdownBtn) {
              const labels = Array.from(document.querySelectorAll('label, span, div')).filter(el => 
                  el.innerText && (el.innerText.includes("bài đăng mới") || el.innerText.includes("All new posts"))
              );
              if (labels.length > 0) {
                  const container = labels[labels.length - 1].closest('div');
                  if (container && container.parentElement) {
                      dropdownBtn = container.parentElement.querySelector('button');
                  }
              }
          }
          tryFindDropdown++;
      }

      if (dropdownBtn) {
          dropdownBtn.click();
          await wait(800);
          // Tìm các lựa chọn. MSTeams V2 thường dùng [role="option"] trong Document Body
          const options = Array.from(document.querySelectorAll('[role="option"] span, [role="option"], li span, li'));
          const bannerOption = options.find(o => 
              o.innerText && (o.innerText.includes("Biểu ngữ") || o.innerText.includes("Banner") || o.innerText.includes("Hoạt động") || o.innerText.includes("Activity"))
          );
          if (bannerOption) {
              bannerOption.click();
          } else {
             // Thử click phần tử đầu tiên nếu không thấy
             if (options.length > 0) options[0].click();
          }
          await wait(600);
      }
      
      // 4. Tìm và bấm nút Lưu
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText && (b.innerText.trim() === "Lưu" || b.innerText.trim() === "Save")
      );
      if (saveBtn) {
          saveBtn.click();
          successCount++;
          await wait(1000);
          return true;
      }
      await wait(1000);
      return false;
  }

  // 1. CHẾ ĐỘ GRID VIEW (Lớp học hiển thị dạng Card)
  // Bỏ giới hạn thẻ div, và sử dụng "i" để bỏ qua viết hoa/viết thường (fui-Card, card, Card)
  let cards = Array.from(document.querySelectorAll('[data-tid="team-card"], *[class*="card" i], *[class*="Card"], [role="listitem"]'));
  
  // Lọc bớt các card không hợp lệ (quá nhỏ, không chứa chữ)
  cards = cards.filter(c => c && c.offsetHeight > 50 && c.innerText && c.innerText.trim().length > 3);
  cards = [...new Set(cards)];

  if (cards.length === 0) {
      // Fallback: Tìm qua các thẻ Tiêu đề có vẻ giống mã môn học (VD: MA003, IE005)
      const headings = document.querySelectorAll('h1, h2, h3, h4, [role="heading"]');
      headings.forEach(h => {
          if (h.innerText && h.innerText.length > 5) {
             const possibleCard = h.closest('a, [role="listitem"], [data-tid*="team"], button');
             if (possibleCard) cards.push(possibleCard);
          }
      });
      cards = [...new Set(cards)];
  }

  if (cards.length > 0) {
      console.log(`[UIT Macro] Phát hiện chế độ Grid View với ${cards.length} lớp học.`);
      // ... process cards
      for (let i = 0; i < cards.length; i++) {
          try {
              // Chờ DOM update
              await wait(500); 

              // Truy xuất lại Cards mỗi vòng lặp phòng khi React Render lại DOM
              let currentCards = Array.from(document.querySelectorAll('[data-tid="team-card"], *[class*="card" i], *[class*="Card"], [role="listitem"]'));
              currentCards = currentCards.filter(c => c && c.offsetHeight > 50 && c.innerText && c.innerText.trim().length > 3);
              currentCards = [...new Set(currentCards)];

              if (i >= currentCards.length) break;
              const card = currentCards[i];
              
              console.log(`[UIT Macro] Truy cập vào card thứ ${i+1}/${currentCards.length}...`);
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.click();
              await wait(2500); // Chờ load vào bên trong Teams
              
              const channels = Array.from(document.querySelectorAll('.channel-name, .text-truncate')).filter(s => 
                  s.innerText.trim() === 'Chung' || s.innerText.trim() === 'General'
              );
              
              if (channels.length > 0) {
                  await processChannelEl(channels[0], i, currentCards.length);
              }
              
              // Bấm nút quay lại (Back to All Teams)
              let backBtn = document.querySelector('button[aria-label*="Tất cả các nhóm"], button[title*="Tất cả các nhóm"], button[aria-label*="All teams"], button[title*="All teams"], [data-tid="team-back-button"]');
              if (!backBtn) {
                // Fallback tìm span hoặc chữ có nội dung quay lại
                const spans = Array.from(document.querySelectorAll("span, div, a, button")).filter(el => {
                    const txt = el.innerText?.trim()?.toLowerCase() || '';
                    return txt === "tất cả các nhóm" || txt === "all teams" || txt.includes("nhóm");
                });
                if (spans.length > 0) {
                    backBtn = spans[0].closest("button, a, [role='button']") || spans[0];
                }
              }
              
              if (backBtn) {
                  backBtn.click();
                  await wait(2000); // Chờ màn hình Grid load lại
              } else {
                  console.warn("[UIT Macro] Không tìm thấy nút Back để thoát khỏi lớp. Dùng history.back()");
                  history.back();
                  await wait(2000);
              }
          } catch(e) {
              console.warn(`[UIT Macro] Lỗi bỏ qua ở card ${i}: `, e);
              let backBtn = document.querySelector('button[aria-label*="Tất cả các nhóm"], button[title*="Tất cả các nhóm"]');
              if (backBtn) backBtn.click();
              await wait(2000);
          }
      }
      
      alert(`✅ Hoàn Tất Báo Cáo KQ: \nĐã TỰ ĐỘNG Set tính năng Cảnh báo Tường và Biểu ngữ ("Windows Reo lên") cho ${successCount}/${cards.length} Môn học!`);
      return;
  }

  // 2. CHẾ ĐỘ LIST VIEW (Các kênh Chung hiển thị sẵn bên trái)
  const channels = Array.from(document.querySelectorAll('.channel-name, .text-truncate')).filter(s => 
      s.innerText.trim() === 'Chung' || s.innerText.trim() === 'General'
  );

  if (channels.length > 0) {
      for (let i = 0; i < channels.length; i++) {
         try {
             await processChannelEl(channels[i], i, channels.length);
         } catch(e) {
             console.warn(`[UIT Macro] Lỗi bỏ qua ở kênh ${i}: `, e);
         }
      }
      alert(`✅ Hoàn Tất Báo Cáo KQ: \nĐã TỰ ĐỘNG Set tính năng Cảnh báo Tường và Biểu ngữ ("Windows Reo lên") cho ${successCount}/${channels.length} Môn học!`);
      return;
  }

  // 3. KHÔNG TÌM THẤY LỚP NÀO CẢ (Đang ở sai thẻ)
  alert("Vẫn không nhìn thấy Kênh Học/Lớp học nào cả!\n► Hãy bấm chuột vào bên trong một lớp học bất kỳ, sau đó BẤM LẠI NÚT KÍCH HOẠT để cài nha.");
}
