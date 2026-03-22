document.addEventListener("DOMContentLoaded", () => {

  console.log("✅ App Loaded");

  // ================= INSTALL =================
  let deferredPrompt;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const btn = document.getElementById("installBtn");
    if (btn) btn.style.display = "inline-block";
  });

  document.addEventListener("click", async (e) => {
    if (e.target.id === "installBtn") {

      if (!deferredPrompt) {
        alert("Install not ready yet. Wait few seconds.");
        return;
      }

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });

  // ================= LOGIN =================
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const user = document.getElementById("username").value;
      const pass = document.getElementById("password").value;

      if (user === "admin" && pass === "admin@123") {
        sessionStorage.setItem("user", user);
        window.location.href = "dashboard.html";
      } else {
        alert("Invalid login");
      }
    });
    return;
  }

  // ================= ROUTE PROTECTION =================
  if (!sessionStorage.getItem("user") && window.location.pathname.includes("dashboard")) {
    window.location.href = "index.html";
  }

  // ================= NAV =================
  const toAI = document.getElementById("toAI");
  if (toAI) toAI.onclick = () => window.location.href = "ai.html";

  const toDash = document.getElementById("toDash");
  if (toDash) toDash.onclick = () => window.location.href = "dashboard.html";

  const toPredict = document.getElementById("toPredict");
  if (toPredict) toPredict.onclick = () => window.location.href = "prediction.html";

  // ================= LOGOUT =================
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.onclick = () => {

      const confirmLogout = confirm("Are you sure you want to logout?");
      if (!confirmLogout) return;

      sessionStorage.clear();
      localStorage.removeItem("aircare_live");

      window.location.href = "index.html";
    };
  }

  // ================= ML FUNCTION =================
  function linearRegressionPredict(data) {

    const n = data.length;
    if (n < 3) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumXX += i * i;
    }

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const c = (sumY - m * sumX) / n;

    return Math.round(m * n + c);
  }

  // ================= DASHBOARD =================
  const connectBtn = document.getElementById("connectBtn");

  if (connectBtn) {

    const status = document.getElementById("status");
    const aqVal = document.getElementById("aqVal");
    const tempVal = document.getElementById("tempVal");
    const humVal = document.getElementById("humVal");
    const gasVal = document.getElementById("gasVal");
    const pulseVal = document.getElementById("pulseVal");
    const suggestions = document.getElementById("suggestions");
    const disconnectBtn = document.getElementById("disconnect");

    const ctx = document.getElementById("chart").getContext("2d");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "AQ", data: [] },
          { label: "Temp", data: [] },
          { label: "Hum", data: [] }
        ]
      }
    });

    let history = JSON.parse(localStorage.getItem("aq_history")) || [];

    function updateUI(data) {

      if (!data) return;

      aqVal.textContent = data.aq ?? "--";
      tempVal.textContent = data.temp ?? "--";
      humVal.textContent = data.hum ?? "--";
      gasVal.textContent = data.gas ?? "--";
      pulseVal.textContent = data.pulse ?? "--";

      localStorage.setItem("aircare_live", JSON.stringify(data));

      const time = new Date().toLocaleTimeString();

      chart.data.labels.push(time);
      chart.data.datasets[0].data.push(data.aq);
      chart.data.datasets[1].data.push(data.temp);
      chart.data.datasets[2].data.push(data.hum);

      if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(d => d.data.shift());
      }

      chart.update();

      history.push(data.aq);
      if (history.length > 20) history.shift();
      localStorage.setItem("aq_history", JSON.stringify(history));

      const predicted = linearRegressionPredict(history);

      let msg = "All good 😊";

      if (data.gas_status === "LEAK") msg = "🚨 Gas Leak!";
      else if (data.aq > 300) msg = "🚨 Dangerous air!";
      else if (data.pulse > 110) msg = "⚠️ High pulse!";

      if (predicted) msg += `<br>📈 ML Prediction: ${predicted}`;

      suggestions.innerHTML = `<p>${msg}</p>`;
    }

    connectBtn.onclick = async () => {
      try {
        status.textContent = "Connecting...";

        await window.BluetoothConnector.connect((data) => {
          status.textContent = "Connected";
          updateUI(data);
        });

      } catch {
        status.textContent = "Connection failed";
      }
    };

    if (disconnectBtn) {
      disconnectBtn.onclick = () => {
        window.BluetoothConnector.disconnect();
        localStorage.removeItem("aircare_live");
        status.textContent = "Disconnected";
      };
    }
  }

  // ================= AI CHAT =================
  const chatWindow = document.getElementById("chatWindow");

  if (chatWindow) {

    const sendBtn = document.getElementById("sendBtn");
    const input = document.getElementById("userInput");
    const micBtn = document.getElementById("micBtn");

    function pushUser(text) {
      const d = document.createElement("div");
      d.className = "user-msg";
      d.innerText = text;
      chatWindow.appendChild(d);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function pushBot(text) {
      const d = document.createElement("div");
      d.className = "bot-msg";
      d.innerText = text;
      chatWindow.appendChild(d);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function showTyping() {
      const d = document.createElement("div");
      d.className = "bot-msg typing";
      d.id = "typing";
      d.innerHTML = "<span>.</span><span>.</span><span>.</span>";
      chatWindow.appendChild(d);
    }

    function removeTyping() {
      const t = document.getElementById("typing");
      if (t) t.remove();
    }

    function speak(text) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    }

    function smartAI(data) {
      if (!data) return "Connect device first 😌";

      let res = `AQ: ${data.aq}, Gas: ${data.gas_status}, Pulse: ${data.pulse}\n`;

      if (data.aq > 150) res += "⚠️ Avoid outdoor air\n";
      if (data.gas_status !== "SAFE") res += "🚨 Ventilate room\n";
      if (data.pulse > 100) res += "❤️ Take rest\n";

      return res;
    }

    sendBtn.onclick = () => {

      const q = input.value.trim();
      if (!q) return;

      input.value = "";

      pushUser(q);

      const data = JSON.parse(localStorage.getItem("aircare_live"));

      showTyping();

      setTimeout(() => {
        removeTyping();
        const res = smartAI(data);
        pushBot(res);
        speak(res);
      }, 1000);
    };

    // 🎤 VOICE
    if (micBtn) {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = "en-US";

      micBtn.onclick = () => {
        micBtn.classList.add("active");
        recognition.start();
      };

      recognition.onresult = (e) => {
        input.value = e.results[0][0].transcript;
        micBtn.classList.remove("active");
      };

      recognition.onend = () => {
        micBtn.classList.remove("active");
      };
    }

    setTimeout(() => {
      pushBot("Hey 😏 I'm SmartAir AI.");
    }, 800);
  }

  // ================= PREDICTION PAGE =================
  const predictionValue = document.getElementById("predictionValue");

  if (predictionValue) {

    const history = JSON.parse(localStorage.getItem("aq_history")) || [];
    const predicted = linearRegressionPredict(history);

    predictionValue.innerText = predicted ?? "--";

    const predictionText = document.getElementById("predictionText");

    if (predicted) {

      let msg = `📊 Predicted AQ: ${predicted}\n`;

      if (predicted > 300) msg += "🚨 Dangerous air expected!";
      else if (predicted > 150) msg += "⚠️ Unhealthy air expected.";
      else msg += "✅ Air remains safe.";

      predictionText.innerText = msg;
    }

    const ctx = document.getElementById("predictionChart").getContext("2d");

    const labels = history.map((_, i) => i);
    labels.push("Next");

    const dataPoints = [...history, predicted];

    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "AQ + Prediction",
          data: dataPoints,
          borderWidth: 2
        }]
      }
    });
  }

});