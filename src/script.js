const API_URL = "/.netlify/functions/checkin";
const REQUEST_TIMEOUT_MS = 10000;

let ultimaLeitura = "";
let bloqueado = false;

// Sons
const somOk = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
const somErro = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

function vibrar() {
  if (navigator.vibrate) navigator.vibrate(150);
}

function mostrarFeedback(msg, tipo) {
  const overlay = document.getElementById("overlay");
  const nome = document.getElementById("nome");

  overlay.innerText = tipo === "ok" ? "LIBERADO" : "NEGADO";
  overlay.className = tipo + " show";

  nome.innerText = msg;

  if (tipo === "ok") {
    somOk.play();
    vibrar();
  } else {
    somErro.play();
  }

  setTimeout(() => {
    overlay.classList.remove("show");
  }, 1000);
}

function onScanSuccess(decodedText) {
  if (bloqueado) return;

  if (decodedText === ultimaLeitura) return;

  bloqueado = true;
  ultimaLeitura = decodedText;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const periodo = document.getElementById("periodoSelect").value;

  fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    signal: controller.signal,
    body: JSON.stringify({
      action: "checkin",
      token: decodedText,
      periodo: periodo
    })
  })
    .then(async res => {
      let data;
      try {
        data = await res.json();
      } catch (_) {
        throw new Error("Resposta inválida do servidor (HTTP " + res.status + ")");
      }

      if (!res.ok) {
        throw new Error(data.mensagem || "Erro HTTP " + res.status);
      }
      return data;
    })
    .then(data => {
      const mensagem = (data && data.mensagem) ? data.mensagem : "Sucesso";
      if (data && data.sucesso) {
        mostrarFeedback(mensagem, "ok");
      } else {
        mostrarFeedback(mensagem, "erro");
      }
      setTimeout(() => {
        bloqueado = false;
      }, 1200);
    })
    .catch(err => {
      if (err.name === "AbortError") {
        mostrarFeedback("Tempo de resposta excedido", "erro");
      } else {
        mostrarFeedback(err.message || "Erro de conexão", "erro");
      }
      bloqueado = false;
    });
}

function iniciarScanner() {
  const qr = new Html5Qrcode("reader");

  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    onScanSuccess
  ).catch(err => {
    alert("Erro ao abrir câmera: " + err);
  });
}

iniciarScanner();