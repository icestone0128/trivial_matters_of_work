// Firebase Configuration
const firebaseConfig = {
  projectId: "live-wordcloud-89273",
  appId: "1:62963581775:web:bdb33eb3eea7cf97943b3a",
  storageBucket: "live-wordcloud-89273.firebasestorage.app",
  apiKey: "AIzaSyCMXbjye5RYo8oI0YzmgsRC_uHL3CaHvJQ",
  authDomain: "live-wordcloud-89273.firebaseapp.com",
  messagingSenderId: "62963581775"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collectionName = "wordcloud_inputs";

// Vibrant, High-Contrast Multi-Color Palette for Light Theme
const neonColors = [
  "#e65100", // 深活力橘 (Vibrant Orange)
  "#00796b", // 深薄荷綠 (Teal Green)
  "#1976d2", // 現代亮藍 (Electric Blue)
  "#c2185b", // 玫瑰深粉 (Rose Pink)
  "#5e35b1", // 深紫羅蘭 (Deep Violet)
  "#d84315", // 鐵鏽紅磚 (Rust Red)
  "#2e7d32", // 活力草綠 (Grass Green)
  "#0288d1", // 晴空蔚藍 (Sky Blue)
  "#e91e63", // 鮮艷洋紅 (Magenta)
  "#f57c00"  // 亮金黃橘 (Amber Orange)
];

// App State
let allInputs = [];
let currentMode = "submit"; // "submit" or "display"

// DOM Elements
const appContainer = document.getElementById("app-container");
const viewToggleBtn = document.getElementById("view-toggle-btn");
const inputForm = document.getElementById("input-form");
const wordInput = document.getElementById("word-input");
const totalInputsEl = document.getElementById("total-inputs");
const uniqueWordsEl = document.getElementById("unique-words");
const wordCloudContainer = document.getElementById("word-cloud-container");
const emptyStateEl = document.getElementById("empty-state");
const floatingExitBtn = document.getElementById("floating-exit-btn");

// Modals
const qrModal = document.getElementById("qr-modal");
const qrZoomBtn = document.getElementById("qr-zoom-btn");
const adminModal = document.getElementById("admin-modal");
const adminPanelBtn = document.getElementById("admin-panel-btn");
const adminForm = document.getElementById("admin-form");
const adminPasswordInput = document.getElementById("admin-password");
const adminErrorMsg = document.getElementById("admin-error-msg");

// --- Mode Toggle and URL Management ---

// Determine initial mode from URL search parameter
function initViewMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  
  if (mode === "display") {
    enableDisplayMode();
  } else {
    enableSubmitMode();
  }
}

function enableDisplayMode() {
  currentMode = "display";
  appContainer.className = "display-mode";
  document.querySelector("header").style.opacity = "0";
  setTimeout(() => {
    document.querySelector("header").classList.add("hidden");
  }, 500);
  
  // Show floating display controls/overlay
  document.getElementById("projection-footer").classList.remove("hidden");
  floatingExitBtn.classList.remove("hidden");
  
  // Dynamic resize on change
  renderWordCloud();
}

function enableSubmitMode() {
  currentMode = "submit";
  appContainer.className = "submit-mode";
  document.querySelector("header").classList.remove("hidden");
  setTimeout(() => {
    document.querySelector("header").style.opacity = "1";
  }, 50);
  
  document.getElementById("projection-footer").classList.add("hidden");
  floatingExitBtn.classList.add("hidden");
  
  renderWordCloud();
}

// Toggle View Button Handler
viewToggleBtn.addEventListener("click", () => {
  if (currentMode === "submit") {
    // Add param without refreshing to keep state
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?mode=display';
    window.history.pushState({ path: newUrl }, '', newUrl);
    enableDisplayMode();
  } else {
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    enableSubmitMode();
  }
});

// Floating Exit Button click handler
floatingExitBtn.addEventListener("click", () => {
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.pushState({ path: newUrl }, '', newUrl);
  enableSubmitMode();
});

// If browser back/forward buttons are clicked
window.addEventListener("popstate", () => {
  initViewMode();
});

// --- Dynamic QR Code Generation ---

function generateQRCodes() {
  // Mobile submission URL (strip mode parameter)
  const currentUrl = window.location.href;
  const submitUrl = currentUrl.split('?')[0]; 
  
  // Standard card QR
  new QRious({
    element: document.getElementById("qr-code"),
    value: submitUrl,
    size: 200,
    background: '#ffffff',
    foreground: '#03001e',
    level: 'H'
  });

  // Modal zoomed QR
  new QRious({
    element: document.getElementById("modal-qr"),
    value: submitUrl,
    size: 400,
    background: '#ffffff',
    foreground: '#03001e',
    level: 'H'
  });

  // Corner projection mode QR
  new QRious({
    element: document.getElementById("projection-qr"),
    value: submitUrl,
    size: 150,
    background: '#ffffff',
    foreground: '#03001e',
    level: 'H'
  });

  // Display URL text in modal
  document.getElementById("modal-url-text").textContent = submitUrl;
}

// Modal Toggle Handlers
qrZoomBtn.addEventListener("click", () => qrModal.classList.remove("hidden"));
document.querySelectorAll(".modal-close-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    qrModal.classList.add("hidden");
    adminModal.classList.add("hidden");
    adminErrorMsg.classList.add("hidden");
    adminPasswordInput.value = "";
  });
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", () => {
    qrModal.classList.add("hidden");
    adminModal.classList.add("hidden");
    adminErrorMsg.classList.add("hidden");
    adminPasswordInput.value = "";
  });
});

document.querySelector(".cancel-btn").addEventListener("click", () => {
  adminModal.classList.add("hidden");
  adminErrorMsg.classList.add("hidden");
  adminPasswordInput.value = "";
});

adminPanelBtn.addEventListener("click", () => {
  adminModal.classList.remove("hidden");
});

// --- Database Operations ---

// Real-time listener for Firestore collection
function listenForData() {
  db.collection(collectionName)
    .orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
      allInputs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.text) {
          allInputs.push(data.text.trim());
        }
      });
      
      // Update statistics
      updateStats();
      // Render text cloud
      renderWordCloud();
    }, (error) => {
      console.error("Firestore Listen failed: ", error);
      if (error.code === "permission-denied") {
        // Trigger alert to help users understand Firestore needs initialization
        wordCloudContainer.innerHTML = `
          <div class="empty-state">
            <p style="color: #ff4081;">⚠️ 資料庫讀取失敗</p>
            <span style="display:block; max-width: 400px; margin: 10px auto; line-height: 1.5;">
              您的 Firebase 專案 <strong>live-wordcloud-89273</strong> 的 Firestore 資料庫可能尚未啟用。<br>
              請至 Firebase Console 點擊「建立資料庫」並將規則設為允許讀寫即可正常運作。
            </span>
          </div>`;
      }
    });
}

// Update statistics display
function updateStats() {
  totalInputsEl.textContent = allInputs.length;
  
  const uniqueCount = new Set(allInputs).size;
  uniqueWordsEl.textContent = uniqueCount;
}

// Add word to database
inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rawText = wordInput.value.trim();
  
  if (rawText.length === 0) return;
  if (rawText.length > 20) {
    alert("請輸入長度不超過 20 的字詞");
    return;
  }

  // Clear input field immediately for good UX
  wordInput.value = "";

  db.collection(collectionName).add({
    text: rawText,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    console.log("Document successfully written!");
  })
  .catch((error) => {
    console.error("Error writing document: ", error);
    alert("送出失敗，請確認資料庫是否已啟用。");
  });
});

// Clear database entries via batch
adminForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const password = adminPasswordInput.value;

  // Pre-shared client admin password (simple verification)
  if (password !== "0128") {
    adminErrorMsg.classList.remove("hidden");
    return;
  }

  // Verification pass, execute batch delete
  adminModal.classList.add("hidden");
  adminPasswordInput.value = "";

  // Optimistic UI Update: Clear immediately for instant UX feedback
  allInputs = [];
  updateStats();
  renderWordCloud();
  
  db.collection(collectionName).get()
    .then((snapshot) => {
      if (snapshot.empty) {
        alert("資料庫中目前沒有資料需要清空！");
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit();
    })
    .then(() => {
      console.log("All entries successfully cleared!");
    })
    .catch((error) => {
      console.error("Error clearing database: ", error);
      alert("清空資料庫失敗：" + error.message);
    });
});

// --- Word Cloud Rendering Algorithm ---

function renderWordCloud() {
  // Clear previous word element DOMs (except empty-state)
  const existingWords = wordCloudContainer.querySelectorAll(".word");
  existingWords.forEach(w => w.remove());

  if (allInputs.length === 0) {
    emptyStateEl.classList.remove("hidden");
    return;
  }
  
  emptyStateEl.classList.add("hidden");

  // 1. Calculate word frequencies
  const freqMap = {};
  allInputs.forEach(word => {
    const lowerWord = word.toLowerCase();
    freqMap[lowerWord] = {
      originalText: word, // Maintain case of first input
      count: (freqMap[lowerWord] ? freqMap[lowerWord].count : 0) + 1
    };
  });

  // Convert to sorted array (highest count first)
  const sortedWords = Object.keys(freqMap)
    .map(key => ({
      text: freqMap[key].originalText,
      count: freqMap[key].count
    }))
    .sort((a, b) => b.count - a.count);

  // Take top 60 words to avoid performance lag and extreme overlap
  const wordsToDisplay = sortedWords.slice(0, 60);

  // 2. Determine container dimensions
  const containerWidth = wordCloudContainer.offsetWidth || 600;
  const containerHeight = wordCloudContainer.offsetHeight || 400;

  // 3. Determine size scaling metrics
  const maxCount = wordsToDisplay[0].count;
  const minCount = wordsToDisplay[wordsToDisplay.length - 1].count;

  // Dynamic scale limits based on screen size
  const isMobile = window.innerWidth <= 768;
  const maxFontSize = isMobile ? 36 : (currentMode === "display" ? 72 : 52);
  const minFontSize = isMobile ? 12 : 16;

  // Placed boxes tracker (to prevent collision/overlaps)
  const placedRects = [];

  // 4. Position and render each word via spiral layout
  wordsToDisplay.forEach((wordObj, index) => {
    // Generate span element
    const wordEl = document.createElement("span");
    wordEl.className = "word word-float";
    wordEl.textContent = wordObj.text;

    // Calculate font size (logarithmic scaling looks better than linear)
    let size = minFontSize;
    if (maxCount > minCount) {
      const weight = Math.log(wordObj.count) / Math.log(maxCount);
      size = minFontSize + weight * (maxFontSize - minFontSize);
    } else if (maxCount === minCount) {
      size = (maxFontSize + minFontSize) / 2; // Flat average
    }
    
    wordEl.style.fontSize = `${size}px`;

    // Visual attributes: Rank color mapping
    // Top ranks get specialized colors, others random neon
    let colorIndex;
    if (index === 0) {
      wordEl.style.fontWeight = "900";
      colorIndex = 1; // Pink for maximum word
    } else if (index === 1 || index === 2) {
      wordEl.style.fontWeight = "800";
      colorIndex = 0; // Cyan for runners-up
    } else {
      wordEl.style.fontWeight = "700";
      colorIndex = Math.floor(Math.random() * neonColors.length);
    }
    
    wordEl.style.color = neonColors[colorIndex];
    wordEl.style.zIndex = 100 - index; // Ranks higher on z-index stack

    // Micro-animation stagger delays
    wordEl.style.animationDelay = `${index * 0.05}s`;

    // Temporarily append element to measure its actual rendered sizes
    wordCloudContainer.appendChild(wordEl);
    
    // Position the element using Archimedean spiral
    positionWord(wordEl, placedRects, containerWidth, containerHeight);
  });
}

// Archimedean spiral positioning to avoid overlapping
function positionWord(wordEl, placedRects, containerWidth, containerHeight) {
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;
  
  const w = wordEl.offsetWidth;
  const h = wordEl.offsetHeight;
  
  let theta = 0;
  const dTheta = 0.1;
  const spiralSpacing = 4;
  let placed = false;
  
  // Try up to 350 spiral points
  for (let i = 0; i < 350; i++) {
    const r = spiralSpacing * theta;
    // Add minor random rotation factor to spread out positioning shapes
    const x = cx + r * Math.cos(theta) - w / 2;
    const y = cy + r * Math.sin(theta) - h / 2;
    
    // Boundary check (prevent words from sticking off container edges)
    if (x < 15 || y < 15 || x + w > containerWidth - 15 || y + h > containerHeight - 15) {
      theta += dTheta;
      continue;
    }
    
    // Check overlapping collision
    const currentRect = { left: x, top: y, right: x + w, bottom: y + h };
    let intersects = false;
    
    for (const rect of placedRects) {
      // Basic bounding box AABB intersection check with safe padding
      const padding = 3;
      if (!(currentRect.left > rect.right + padding || 
            currentRect.right < rect.left - padding || 
            currentRect.top > rect.bottom + padding || 
            currentRect.bottom < rect.top - padding)) {
        intersects = true;
        break;
      }
    }
    
    if (!intersects) {
      wordEl.style.left = `${x + w/2}px`;
      wordEl.style.top = `${y + h/2}px`;
      placedRects.push(currentRect);
      placed = true;
      break;
    }
    
    theta += dTheta;
  }
  
  if (!placed) {
    wordEl.remove(); // Remove element if it couldn't fit
  }
}

// Re-render wordcloud on window resize to ensure layout compatibility
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderWordCloud();
  }, 250);
});

// --- Initialization ---

window.addEventListener("DOMContentLoaded", () => {
  initViewMode();
  generateQRCodes();
  listenForData();
});
