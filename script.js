const apiKey = "6cf1b91669b34cfa90a089173bc32bef";
const BACKEND_BASE = "https://truth-lens-fvxm.onrender.com";  // your Render backend
const backendURL = `${BACKEND_BASE}/api/predict`;
const AUTH_API_URL = `${BACKEND_BASE}/api`;

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
    showPopup("⚠️ Please enter a news headline or statement!", "warning");
    return;
  }

  const wordCount = userInput.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 10) {
    showPopup("⚠️ Please enter at least 10 words.", "warning");
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
    const result = data.prediction;

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
    showPopup("❌ Error connecting to backend!", "error");
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

async function fetchLatestNews(retryCount = 0) {
  const ul = document.getElementById("news-list");
  const loader = document.getElementById("news-loader");

  loader.style.display = "flex";
  ul.style.display = "none";

  try {
    const response = await fetch(`${AUTH_API_URL}/news`, { cache: "no-store" });
    
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();

    if (data.status !== "ok") {
      console.error("Error fetching news:", data);
      throw new Error("Invalid response format");
    }

    latestNewsTitles = [];
    ul.innerHTML = "";

    data.articles.forEach((article) => {
      if (article.title) {
        latestNewsTitles.push(article.title.trim().toLowerCase());
      }
      const li = document.createElement("li");
      li.textContent = article.title;
      ul.appendChild(li);
    });

    loader.style.display = "none";
    ul.style.display = "block";

  } catch (error) {
    console.warn(`⚠️ Backend not ready yet (attempt ${retryCount + 1})`);

    // Reset loader animation to indicate it’s still alive
    loader.style.animation = "none";
    void loader.offsetWidth; // force reflow
    loader.style.animation = "loaderFade 2s ease-in-out infinite";

    // Keep bouncing dots visible while retrying
    if (retryCount < 6) {
      setTimeout(() => fetchLatestNews(retryCount + 1), 10000);
    } else {
      loader.innerHTML = "<p style='color:red;'>❌ Backend still not responding. Please refresh.</p>";
    }
  }
}

function flipTo(section) {
  // ⭐ Prevent flip while locked
// Allow NEWS-RESULT & OTP even when locked
  if (window.lockFlip && !["news-result", "otp"].includes(section)) {
      console.log("⛔ Flip blocked:", section);
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
    "flipped-community",
    "flipped-faqs",
    "flipped-privacy",
    "flipped-contact",
    "flipped-otp"
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
  } else if (section === "faqs") {
  flipContainer.classList.add("flipped-faqs");
  console.log("✅ Flipped to FAQS");
  } else if (section === "privacy") {
  flipContainer.classList.add("flipped-privacy");
  console.log("✅ Flipped to PRIVACY");
  } else if (section === "contact") {
  flipContainer.classList.add("flipped-contact");
  console.log("✅ Flipped to CONTACT");
  }
  else if (section === "otp") {
  flipContainer.classList.add("flipped-otp");
  console.log("✅ Flipped to OTP Verification");
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
    "flipped-community",
    "flipped-faqs",
    "flipped-privacy",
    "flipped-contact",
    "flipped-otp"
  );

  console.log("✅ Flipped back to main");

  const links = document.querySelectorAll(".left-sidebar .sidebar-links a");
  links.forEach((link) => link.classList.remove("active"));
}

function toggleTheme(event) {
  const signedInUser = localStorage.getItem("signedInUser");

  // 🔒 Not logged in → show toast instead of alert
  if (!signedInUser) {
    event?.stopPropagation();
    const toggle = document.querySelector(".theme-toggle");
    toggle.classList.add("locked");
    setTimeout(() => toggle.classList.remove("locked"), 400);

    showToast("🔒 Please sign in to use this feature!", "warning");
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

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.warn("⚠️ Toast element not found in HTML");
    return;
  }

  // Reset first
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // Force reflow to restart animation
  void toast.offsetWidth;

  // Show toast
  toast.classList.add("show");

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ===== POPUP HANDLER =====
function showPopup(message, type = "info") {
  const overlay = document.getElementById("popup-overlay");
  const box = overlay.querySelector(".popup-box");
  const msg = overlay.querySelector(".popup-message");
  const icon = overlay.querySelector(".popup-icon");

  if (!overlay) {
    console.error("⚠️ Popup overlay not found in HTML");
    return;
  }

  // Set message
  msg.textContent = message;

  // Choose icon by type
  let emoji = "ℹ️";
  if (type === "success") emoji = "✅";
  else if (type === "error") emoji = "❌";
  else if (type === "warning") emoji = "⚠️";

  icon.textContent = emoji;

  // Set class for color styling
  box.className = `popup-box ${type}`;

  // Show popup
  overlay.classList.remove("hidden");
}

function closePopup() {
  const overlay = document.getElementById("popup-overlay");
  overlay.classList.add("hidden");
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

// Handle Contact Form Submission
function handleContactSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const subject = document.getElementById('contact-subject').value;
  const message = document.getElementById('contact-message').value.trim();
  const responseDiv = document.getElementById('contact-response');
  
  // Simple validation
  if (!name || !email || !subject || !message) {
    responseDiv.style.display = 'block';
    responseDiv.style.background = '#f8d7da';
    responseDiv.style.color = '#721c24';
    responseDiv.textContent = '❌ Please fill all fields';
    return;
  }
  
  // Log message (in real app, send to backend)
  console.log('📧 Contact Form Submitted:', {
    name,
    email,
    subject,
    message,
    timestamp: new Date().toLocaleString()
  });
  
  // Show success message
  responseDiv.style.display = 'block';
  responseDiv.style.background = '#d4edda';
  responseDiv.style.color = '#155724';
  responseDiv.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
  
  // Reset form
  document.getElementById('contact-form').reset();
  
  // Hide message after 3 seconds
  setTimeout(() => {
    responseDiv.style.display = 'none';
  }, 3000);
}

// Toggle FAQ Item
function toggleFAQ(element) {
  const faqItem = element.parentElement;
  const isOpen = faqItem.classList.contains('open');
  
  // Close all other FAQs
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('open');
  });
  
  // Toggle current FAQ
  if (!isOpen) {
    faqItem.classList.add('open');
    console.log('✅ FAQ opened');
  } else {
    faqItem.classList.remove('open');
    console.log('✅ FAQ closed');
  }
}

// Filter FAQs by Category
function filterFAQs(category) {
  const faqItems = document.querySelectorAll('.faq-item');
  let visibleCount = 0;
  
  // Update active category button
  document.querySelectorAll('.faq-category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Show/hide FAQs based on category
  faqItems.forEach(item => {
    if (category === 'all' || item.dataset.category === category) {
      item.classList.remove('hidden');
      item.classList.remove('open');
      visibleCount++;
    } else {
      item.classList.add('hidden');
    }
  });
  
  console.log(`✅ Showing ${visibleCount} FAQs in ${category} category`);
}

// Search FAQs
function searchFAQs() {
  const searchInput = document.getElementById('faq-search-input');
  const searchTerm = searchInput.value.toLowerCase();
  const faqItems = document.querySelectorAll('.faq-item');
  let visibleCount = 0;
  
  faqItems.forEach(item => {
    const title = item.querySelector('.faq-title').textContent.toLowerCase();
    const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
    
    if (title.includes(searchTerm) || answer.includes(searchTerm)) {
      item.classList.remove('hidden');
      visibleCount++;
    } else {
      item.classList.add('hidden');
      item.classList.remove('open');
    }
  });
  
  console.log(`✅ Found ${visibleCount} FAQs matching "${searchTerm}"`);
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
    showPopup("⚠️ Please fill all fields", "warning");
    return;
  }

  if (password.length < 4) {
    showPopup("⚠️ Password must be at least 4 characters", "warning");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!data.success) {
      showPopup(`❌ ${data.message}`, "error");
      return;
    }

    // SUCCESS → Always proceed to OTP
    otpEmail = data.email;

    showPopup("📧 Sending OTP to your email...", "info");
    await sendOTPEmail(otpEmail);

    flipTo("otp");
    showPopup("✅ Account created! Verify your email with OTP.", "success");

  } catch (err) {
    console.error("❌ Sign Up Error:", err);
    showPopup("❌ Server error: " + err.message, "error");
  }
}


let generatedOTP = null;
let otpEmail = null;

// ===== Generate 6-digit OTP =====
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== Send OTP via EmailJS =====
async function sendOTPEmail(email) {
  try {
    const response = await fetch(`${AUTH_API_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.success) {
      generatedOTP = data.otp;
      showPopup("✅ OTP sent to your email!", "success");
    } else {
      showPopup("❌ Failed to send OTP. Try again later.", "error");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    showPopup("❌ Network error while sending OTP.", "error");
  }
}


// ===== Resend OTP =====
function resendOTP() {
  if (!otpEmail) return;
  generatedOTP = generateOTP();
  sendOTPEmail(otpEmail);
  document.getElementById("otp-status").textContent = "New OTP sent!";
}

// ===== Handle OTP Verification =====
async function handleOTPVerification(event) {
  event.preventDefault();

  const enteredOTP = document.getElementById("otp-input").value.trim();

  if (!otpEmail) {
    showPopup("❌ Email missing for OTP verification", "error");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/verify-otp`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpEmail, otp: enteredOTP })
    });

    const data = await response.json();

    if (data.success) {
      showPopup("✅ OTP Verified Successfully!", "success");
      flipTo("signin");
    } else {
      showPopup(`❌ ${data.message}`, "error");
    }
  } catch (err) {
    console.error(err);
    showPopup("❌ Server error during OTP verification.", "error");
  }
}


async function handleSignIn(event) {
  event.preventDefault();
  
  const username = document.getElementById('signin-username').value.trim();
  const password = document.getElementById('signin-password').value.trim();

  if (!username || !password) {
    showPopup('⚠️ Please enter username and password', 'warning');
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('📥 SignIn Response status:', response.status);

    if (response.status === 401) {
      showPopup('❌ You are not registered! Please sign up.', 'error');
      document.getElementById('signin-form').reset();
      setTimeout(() => {
        flipTo('signup');  // Redirects to sign-up page
      }, 1000);
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response not OK. Status:', response.status, 'Body:', errorText);
      showPopup(`❌ Server error: ${response.status}`, 'error');
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
      showPopup(data.message, data.success ? 'success' : 'error');
    } else {
      showPopup(`❌ ${data.message}`,'error');
    }
  } catch (error) {
    console.error('❌ SignIn Error:', error);
    showPopup('❌ Error connecting to server: ' + error.message, 'error');
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

  const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.style.display = "inline-block";
  logoutBtn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
}


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
    showPopup("🔒 Session expired. You’ve been logged out.", "info");
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

  const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.style.display = "none";
}


  console.log("🔒 User logged out.");
}

function setAutoLogoutTimers() {
  const signInTime = parseInt(localStorage.getItem("signInTime"));
  const elapsed = Date.now() - signInTime;
  const totalSession = 10 * 60 * 1000;
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
    flipBack(); // no stopPropagation
  });
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
    });
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
      });
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
    });
  }

  // Bind back-to-signin link
  const backToSignin = document.getElementById("back-to-signin");
  if (backToSignin) {
    backToSignin.removeAttribute('onclick');
    backToSignin.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      flipTo("signin");
    });
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

    if (elapsed < 10 * 60 * 1000) {
      simulateSignIn(savedUser);
      const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) logoutBtn.style.display = "inline-block";

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
    });
  }
});

setInterval(fetchLatestNews, 30000);