const apiKey = "6cf1b91669b34cfa90a089173bc32bef";
const backendURL = "http://192.168.137.248:5000/predict";
const AUTH_API_URL = "https://truth-lens-fvxm.onrender.com/api";
let latestNewsTitles = [];
window.lockFlip = false;

// Sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('closed');
}

async function checkNews() {
  const userInput = document.getElementById('newsInput').value.trim();
  const resultTitle = document.getElementById('news-result-title');
  const resultMsg = document.getElementById('news-result-message');
  const resultCard = document.getElementById('news-result-card');
  const overlay = document.getElementById('magnifier-overlay');

  if (!userInput) {
    alert("⚠️ Please enter a news headline or statement!");
    return;
  }

  const wordCount = userInput.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 10) {
    alert(`⚠️ Please enter at least 10 words (currently ${wordCount}).`);
    return;
  }

  resultTitle.textContent = "";
  resultMsg.textContent = "";
  resultCard.classList.remove("success", "error");

  document.body.style.pointerEvents = "auto";
  overlay.classList.remove("hidden");

  const inputBox = document.getElementById('newsInput');
  const rect = inputBox.getBoundingClientRect();
  const magnifiers = overlay.querySelectorAll('.magnifier');

  const zones = [
    { x: -rect.width / 3, y: -50 },
    { x: rect.width / 4, y: -30 },
    { x: -20, y: 40 }
  ];

  magnifiers.forEach((m, i) => {
    const zone = zones[i % zones.length];
    const randomOffsetX = Math.random() * 20 - 10;
    const randomOffsetY = Math.random() * 10 - 5;
    const finalX = rect.left + rect.width / 2 + zone.x + randomOffsetX;
    const finalY = rect.top + rect.height / 2 + zone.y + randomOffsetY;
    m.style.left = `${finalX}px`;
    m.style.top = `${finalY}px`;
  });

  const lowerInput = userInput.toLowerCase();
  const isFromLatest = latestNewsTitles.some(title =>
    lowerInput.includes(title) || title.includes(lowerInput)
  );

  if (isFromLatest) {
    await new Promise(r => setTimeout(r, 5000));
    overlay.classList.add("hidden");
    document.body.style.pointerEvents = "auto";
    
    // ⭐ LOCK FLIP
    lockFlipState(true);
    flipTo("news-result");

    resultCard.classList.add("success");
    resultTitle.textContent = "✅ REAL NEWS";
    resultMsg.textContent = "This is verified from a trusted news source.";
    launchConfetti();
    
    // ⭐ UNLOCK after 10 seconds
    setTimeout(() => { 
      lockFlipState(false);
      console.log("🔓 Flip unlocked");
    }, 10000);
    
    return;
  }

  try {
    const [response] = await Promise.all([
      fetch(backendURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userInput })
      }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);

    const data = await response.json();
    const result = data.result;

    overlay.classList.add("hidden");
    document.body.style.pointerEvents = "auto";

    // ⭐ LOCK FLIP
    lockFlipState(true);
    flipTo("news-result");

    if (result === "REAL NEWS") {
      resultCard.classList.add("success");
      resultTitle.textContent = "✅ REAL NEWS";
      resultMsg.textContent = "This seems trustworthy.";
      launchConfetti();
      saveNewsCheckToHistory(userInput, "REAL NEWS");
    } else {
      resultCard.classList.add("error");
      resultTitle.textContent = "🚨 FAKE NEWS DETECTED!";
      resultMsg.textContent = "This might be misleading!";
      saveNewsCheckToHistory(userInput, "FAKE NEWS");
    }

    // ⭐ UNLOCK after 10 seconds
    setTimeout(() => { 
      lockFlipState(false);
      console.log("🔓 Flip unlocked");
    }, 10000);

  } catch (error) {
    console.error(error);
    alert("❌ Error connecting to backend!");
    overlay.classList.add("hidden");
    document.body.style.pointerEvents = "auto";
  }
}

// ⭐ NEW FUNCTION: Manages flip lock state + disables history button
function lockFlipState(isLocked) {
  window.lockFlip = isLocked;
  const historyBtn = document.getElementById('history-btn');
  
  if (isLocked) {
    console.log("🔒 FLIP LOCKED - Disabling history button");
    if (historyBtn) {
      historyBtn.disabled = true;
      historyBtn.style.opacity = "0.5";
      historyBtn.style.cursor = "not-allowed";
      historyBtn.style.pointerEvents = "none";
    }
  } else {
    console.log("🔓 FLIP UNLOCKED - Enabling history button");
    if (historyBtn) {
      historyBtn.disabled = false;
      historyBtn.style.opacity = "1";
      historyBtn.style.cursor = "pointer";
      historyBtn.style.pointerEvents = "auto";
    }
  }
}

function getSelectedLanguage() {
  const langDropdown = document.getElementById("languageSelect");
  if (langDropdown) {
    return langDropdown.value.toLowerCase();
  }
  return "english";
}
// Community Forum Tab Switching
function switchForumTab(tabName) {
  // Hide all tabs
  const tabs = document.querySelectorAll('.forum-tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  // Remove active from all buttons
  const buttons = document.querySelectorAll('.forum-tab');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  const selectedTab = document.getElementById(tabName + '-tab');
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Mark button as active
  event.target.classList.add('active');
  
  console.log('✅ Switched to', tabName, 'tab');
}

async function fetchLatestNews() {
  try {
    const response = await fetch(`${AUTH_API_URL}/news`);

    const data = await response.json();

    if (data.status !== "ok") {
      console.error("Error fetching news:", data);
      return;
    }

    const ul = document.getElementById("news-list");
    ul.innerHTML = "";

    latestNewsTitles = [];

    data.articles.forEach((article) => {
      if (article.title) {
        latestNewsTitles.push(article.title.trim().toLowerCase());
      }

      const li = document.createElement("li");
      li.textContent = article.title;
      ul.appendChild(li);
    });
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function flipTo(section) {
  // ⭐ Prevent flip while locked
  if (window.lockFlip && section !== "news-result") {
    console.log("⛔ FLIP BLOCKED: Flip is locked. Cannot navigate to:", section);
    return;
  }

  const flipContainer = document.getElementById("flip-container");

  flipContainer.classList.remove(
    "flipped-fact",
    "flipped-about",
    "flipped-howitworks",
    "flipped-report",
    "flipped-newsresult",
    "flipped-signin",
    "flipped-signup",
    "flipped-resources",
    "flipped-history",
    "flipped-community"
  );

  if (section === "fact") {
    flipContainer.classList.add("flipped-fact");
  } else if (section === "about") {
    flipContainer.classList.add("flipped-about");
  } else if (section === "howitworks") {
    flipContainer.classList.add("flipped-howitworks");
  } else if (section === "report") {
    flipContainer.classList.add("flipped-report");
  } else if (section === "news-result") {
    flipContainer.classList.add("flipped-newsresult");
    console.log("✅ Flipped to NEWS-RESULT");
  } else if (section === "signin") {
    flipContainer.classList.add("flipped-signin");
  } else if (section === "signup") {
    flipContainer.classList.add("flipped-signup");
  } else if (section === "resources") {
    flipContainer.classList.add("flipped-resources");
  } else if (section === "community") {
  flipContainer.classList.add("flipped-community");
  console.log("✅ Flipped to COMMUNITY");
  } else if (section === "history") {
    flipContainer.classList.add("flipped-history");
    console.log("✅ Flipped to HISTORY");
    loadUserHistory();
  }

  const links = document.querySelectorAll(".left-sidebar .sidebar-links a");
  links.forEach((link) => link.classList.remove("active"));
  if (section === "fact") links[0].classList.add("active");
  else if (section === "about") links[1].classList.add("active");
  else if (section === "howitworks") links[2].classList.add("active");
  else if (section === "report") links[5].classList.add("active");
}

function flipBack() {
  // ⭐ Allow back button to work, but don't allow other navigation while locked
  if (window.lockFlip) {
    console.log("⛔ FLIP BLOCKED: Other navigation locked, but back button allowed");
  }

  const flipContainer = document.getElementById("flip-container");
  flipContainer.classList.remove(
    "flipped-fact",
    "flipped-about",
    "flipped-howitworks",
    "flipped-report",
    "flipped-newsresult",
    "flipped-signin",
    "flipped-signup",
    "flipped-resources",
    "flipped-history",
    "flipped-community"
  );

  console.log("✅ Flipped back to main");

  const links = document.querySelectorAll(".left-sidebar .sidebar-links a");
  links.forEach((link) => link.classList.remove("active"));
}

function toggleTheme() {
  const signedInUser = localStorage.getItem("signedInUser");
  if (!signedInUser) {
    alert("🔒 Please sign in to change theme!");
    return;
  }

  const thumb = document.getElementById("toggle-thumb");
  const toggle = document.querySelector(".theme-toggle");
  const fireEffect = document.getElementById("fire-effect");
  const snowEffect = document.getElementById("snow-effect");

  if (thumb.classList.contains("ice")) {
    thumb.classList.remove("ice");
    thumb.classList.add("fire");
    thumb.textContent = "🔥";
    thumb.style.left = "32px";
    toggle.classList.add("fire");

    fireEffect.style.animation = "none";
    void fireEffect.offsetWidth;
    fireEffect.style.animation = "fireFlash 2s ease-out forwards";
  } else {
    thumb.classList.remove("fire");
    thumb.classList.add("ice");
    thumb.textContent = "❄️";
    thumb.style.left = "0";
    toggle.classList.remove("fire");
    createSnow();
  }
}

function createSnow() {
  const snowEffect = document.getElementById("snow-effect");
  snowEffect.innerHTML = "";

  const numFlakes = 50;
  for (let i = 0; i < numFlakes; i++) {
    const flake = document.createElement("div");
    flake.classList.add("snowflake");
    flake.style.left = Math.random() * 100 + "vw";
    flake.style.fontSize = Math.random() * 14 + 8 + "px";
    flake.style.opacity = Math.random() * 0.5 + 0.5;
    flake.style.animationDuration = Math.random() * 3 + 2 + "s";
    flake.textContent = "❄️";
    snowEffect.appendChild(flake);
  }

  snowEffect.style.opacity = "1";
  setTimeout(() => {
    snowEffect.style.opacity = "0";
  }, 2000);
}

function launchConfetti() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0, 1), y: Math.random() - 0.2 }
    }));
  }, 250);
}

// ========== AUTHENTICATION FUNCTIONS ==========

async function testBackendConnection() {
  try {
    const response = await fetch(`${AUTH_API_URL}/signin`);
    const data = await response.json();
    console.log('✅ Backend connected:', data);
  } catch (error) {
    console.error('❌ Cannot connect to backend:', error);
  }
}

async function handleSignUp(event) {
  event.preventDefault();
  
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();

  if (!username || !email || !password) {
    alert('⚠️ Please fill all fields');
    return;
  }

  if (password.length < 4) {
    alert('⚠️ Password must be at least 4 characters');
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
      alert(`❌ Server error: ${response.status}`);
      return;
    }

    const data = await response.json();

    if (data.success) {
      alert('✅ Sign Up Successful!\n\nYour account has been created.\nNow you can sign in with your credentials.');
      document.getElementById('signup-form').reset();
      
      setTimeout(() => {
        flipTo('signin');
      }, 800);
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (error) {
    console.error('Sign Up Error:', error);
    alert('❌ Error: ' + error.message);
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  
  const username = document.getElementById('signin-username').value.trim();
  const password = document.getElementById('signin-password').value.trim();

  if (!username || !password) {
    alert('⚠️ Please enter username and password');
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('📥 SignIn Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response not OK. Status:', response.status, 'Body:', errorText);
      alert(`❌ Server error: ${response.status}`);
      return;
    }

    const data = await response.json();
    console.log('📦 SignIn Response data:', data);

    if (data.success) {
      localStorage.setItem('signedInUser', data.username);
      localStorage.setItem('signInTime', Date.now().toString());
      
      simulateSignIn(data.username);
      document.getElementById('signin-form').reset();
      flipBack();
      alert(data.message);
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (error) {
    console.error('❌ SignIn Error:', error);
    alert('❌ Error connecting to server: ' + error.message);
  }
}

function onUserSignedIn(username) {
  const signInBtn = document.getElementById("signin-btn");
  signInBtn.classList.add("signed-in");
  signInBtn.textContent = username;

  signInBtn.animate(
    [
      { transform: "scale(0.9)", opacity: 0.5 },
      { transform: "scale(1)", opacity: 1 }
    ],
    { duration: 500, easing: "ease-out" }
  );
}

function onUserSignedOut() {
  const signInBtn = document.getElementById("signin-btn");
  signInBtn.classList.remove("signed-in");
  signInBtn.textContent = "Sign In";
  signInBtn.style.pointerEvents = "auto";
}

function simulateSignIn(username) {
  const btn = document.querySelector(".signin-btn");
  const text = btn.querySelector(".signin-text");

  const limitedName = username.trim().substring(0, 5);
  text.textContent = limitedName;
  btn.classList.add("signed-in");
  btn.removeAttribute("onclick");

  if (!localStorage.getItem("signInTime")) {
    localStorage.setItem("signInTime", Date.now().toString());
  }
  localStorage.setItem("signedInUser", username);

  console.log(`✅ Signed in as ${limitedName}`);

  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.style.display = 'block';
  }

  const toggle = document.querySelector(".theme-toggle");
  if (toggle) toggle.style.pointerEvents = "auto";
  const thumb = document.getElementById("toggle-thumb");
  if (thumb) thumb.style.opacity = "1";

  const lockIcon = document.getElementById("lock-icon");
  if (lockIcon) lockIcon.style.opacity = "0";

  setAutoLogoutTimers();
}

function simulateSignOut(auto = false) {
  const btn = document.querySelector(".signin-btn");
  const text = btn.querySelector(".signin-text");

  btn.classList.remove("signed-in", "signout-warning");
  text.textContent = "Sign In";
  btn.setAttribute("onclick", "flipTo('signin')");

  clearTimeout(window.warningTimer);
  clearTimeout(window.logoutTimer);
  localStorage.removeItem("signedInUser");
  localStorage.removeItem("signInTime");
  localStorage.removeItem("authToken");

  if (auto) {
    alert("⚠️ Session expired. You have been logged out.");
  }

  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.style.display = 'none';
  }
  
  const historyPanel = document.getElementById('history-panel');
  if (historyPanel) {
    historyPanel.style.display = 'none';
  }

  const toggle = document.querySelector(".theme-toggle");
  if (toggle) toggle.style.pointerEvents = "none";
  const thumb = document.getElementById("toggle-thumb");
  if (thumb) thumb.style.opacity = "0.4";

  const lockIcon = document.getElementById("lock-icon");
  if (lockIcon) lockIcon.style.opacity = "1";

  console.log("🔒 User logged out.");
}

function setAutoLogoutTimers() {
  const signInTime = parseInt(localStorage.getItem("signInTime"));
  const elapsed = Date.now() - signInTime;
  const totalSession = 2 * 60 * 1000;
  const remaining = totalSession - elapsed;

  clearTimeout(window.warningTimer);
  clearTimeout(window.logoutTimer);

  if (remaining <= 0) {
    simulateSignOut(true);
    return;
  }

  window.warningTimer = setTimeout(() => {
    const btn = document.querySelector(".signin-btn");
    btn.classList.remove("signed-in");
    btn.classList.add("signout-warning");
  }, Math.max(remaining - 60 * 1000, 0));

  window.logoutTimer = setTimeout(() => {
    simulateSignOut(true);
  }, remaining);

  console.log(`⏱️ Auto logout in ${Math.round(remaining / 1000)} s`);
}

async function loadUserHistory() {
  const username = localStorage.getItem('signedInUser');
  console.log('📚 Loading history for:', username);
  
  if (!username) {
    console.log('❌ No user logged in');
    document.getElementById('history-list').innerHTML = '<p style="text-align: center; color: red;">Please log in to view history</p>';
    return;
  }

  try {
    const url = `${AUTH_API_URL}/user/${username}/history`;
    console.log('📤 Fetching from:', url);
    
    const response = await fetch(url);
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (data.success && data.history && data.history.length > 0) {
      console.log('✅ Found', data.history.length, 'items');
      displayHistory(data.history);
    } else {
      console.log('ℹ️ No history items');
      document.getElementById('history-list').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No checks yet</p>';
    }
  } catch (error) {
    console.error('❌ Error loading history:', error);
    document.getElementById('history-list').innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Error loading history</p>';
  }
}

function toggleHistoryPanel() {
  const historyPanel = document.getElementById("historyPanel");
  if (!historyPanel) return;
  historyPanel.classList.toggle("visible");
}

function displayHistory(history) {
  const historyList = document.getElementById('history-list');
  
  if (!history || history.length === 0) {
    historyList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No checks yet</p>';
    return;
  }

  let html = '';
  
  history.forEach((item) => {
    const date = new Date(item.checked_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const isReal = item.result.includes('REAL');
    const resultColor = isReal ? '#28a745' : '#dc3545';
    const resultEmoji = isReal ? '✅' : '🚨';
    
    const headline = item.headline.substring(0, 60) + (item.headline.length > 60 ? '...' : '');
    
    html += `
      <div style="padding: 12px; margin: 8px 0; background: #f9f9f9; border-radius: 6px; border-left: 4px solid ${resultColor};">
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">${date}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 500; word-break: break-word;">${headline}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${resultColor}; font-weight: bold;">${resultEmoji} ${item.result}</p>
        <button onclick="deleteHistoryItem(${item.id})" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 12px; text-decoration: underline; padding: 0;">Delete</button>
      </div>
    `;
  });
  
  historyList.innerHTML = html;
  console.log('✅ History displayed');
}

async function deleteHistoryItem(historyId) {
  const username = localStorage.getItem('signedInUser');
  
  if (!confirm('Delete this history item?')) return;
  
  try {
    const response = await fetch(`${AUTH_API_URL}/user/${username}/history/${historyId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      loadUserHistory();
    }
  } catch (error) {
    console.error('Error deleting history:', error);
  }
}

async function saveNewsCheckToHistory(headline, result) {
  const username = localStorage.getItem('signedInUser');
  
  if (!username) return;

  try {
    const response = await fetch(`${AUTH_API_URL}/user/${username}/save-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline, result })
    });
    
    const data = await response.json();
    console.log('✅ Saved to history');
  } catch (error) {
    console.error('❌ Error saving history:', error);
  }
}

// ========== MAIN INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
  window.lockFlip = false;
  console.log("✅ Flip lock initialized");
  
  // Bind all back buttons
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Back button clicked. lockFlip =", window.lockFlip);
    flipBack(); // ✅ This should ALWAYS work
  }, true);
});

  // ⭐ REMOVE inline onclick from history button - use event listener only
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    // Remove any inline onclick
    historyBtn.removeAttribute('onclick');
    
    // Add event listener
    historyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Do NOT allow history button during flip lock
      if (window.lockFlip) {
        console.log("⛔ History button disabled during lock");
        return;
      }
      
      console.log("History button clicked");
      flipTo('history');
    }, true);
  }

  // Bind sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const handler = link.getAttribute('onclick');
    if (handler) {
      link.removeAttribute('onclick');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Extract the flipTo call from the handler
        if (handler.includes('flipTo')) {
          const match = handler.match(/flipTo\(['"](.+?)['"]\)/);
          if (match) {
            flipTo(match[1]);
          }
        }
      }, true);
    }
  });

  // Bind signup link
  const signupLink = document.getElementById("signup-link");
  if (signupLink) {
    signupLink.removeAttribute('onclick');
    signupLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      flipTo("signup");
    }, true);
  }

  // Bind back-to-signin link
  const backToSignin = document.getElementById("back-to-signin");
  if (backToSignin) {
    backToSignin.removeAttribute('onclick');
    backToSignin.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      flipTo("signin");
    }, true);
  }

  fetchLatestNews();
  testBackendConnection();

  const savedUser = localStorage.getItem("signedInUser");
  const signInTime = localStorage.getItem("signInTime");

  const toggle = document.querySelector(".theme-toggle");
  if (toggle) toggle.style.pointerEvents = "none";
  const thumb = document.getElementById("toggle-thumb");
  if (thumb) thumb.style.opacity = "0.4";

  if (savedUser && signInTime) {
    const elapsed = Date.now() - parseInt(signInTime);

    if (elapsed < 2 * 60 * 1000) {
      simulateSignIn(savedUser);
    } else {
      simulateSignOut(true);
    }
  }

  const closeHistoryBtn = document.getElementById('close-history');
  if (closeHistoryBtn) {
    closeHistoryBtn.removeAttribute('onclick');
    closeHistoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('history-panel').style.display = 'none';
    }, true);
  }
});

setInterval(fetchLatestNews, 10000);