// Panel Script - GPT Interceptor
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const getBtn = document.getElementById('getBtn');
const statusDiv = document.getElementById('status');
const responseDiv = document.getElementById('response');
const responseSection = document.getElementById('responseSection');
const closeBtn = document.getElementById('closeBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

let conversationHistory = [];

// Carrega histórico do storage
function loadHistory() {
  chrome.storage.local.get(['conversationHistory'], (result) => {
    if (result.conversationHistory) {
      conversationHistory = result.conversationHistory;
      updateHistoryDisplay();
    }
  });
}

// Salva histórico no storage
function saveHistory() {
  chrome.storage.local.set({ conversationHistory });
}

// Atualiza a exibição do histórico
function updateHistoryDisplay() {
  if (conversationHistory.length === 0) {
    historyList.innerHTML = '<div style="color: #999; font-size: 11px; text-align: center; padding: 20px 0;">Nenhum histórico</div>';
    return;
  }

  historyList.innerHTML = conversationHistory.map((item, index) => `
    <div class="history-item ${item.role}">
      <strong>${item.role === 'user' ? '👤 Você' : '🤖 GPT'}:</strong>
      <div style="margin-top: 4px; opacity: 0.8;">
        ${item.content.substring(0, 80)}${item.content.length > 80 ? '...' : ''}
      </div>
      <div class="history-time">${new Date(item.timestamp).toLocaleTimeString('pt-BR')}</div>
    </div>
  `).join('');
}

// Verifica se a aba do ChatGPT está aberta
function checkChatGPTTab() {
  chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
    if (tabs.length > 0) {
      statusDiv.textContent = '✅ ChatGPT detectado';
      statusDiv.classList.remove('error');
      statusDiv.classList.add('connected');
      sendBtn.disabled = false;
      getBtn.disabled = false;
    } else {
      statusDiv.textContent = '⚠️ Abra o ChatGPT em outra aba';
      statusDiv.classList.remove('connected');
      statusDiv.classList.add('error');
      sendBtn.disabled = true;
      getBtn.disabled = true;
    }
  });
}

// Envia mensagem
sendBtn.addEventListener('click', async () => {
  const message = messageInput.value.trim();
  
  if (!message) {
    statusDiv.textContent = '⚠️ Digite uma mensagem';
    statusDiv.classList.add('error');
    return;
  }

  sendBtn.disabled = true;
  statusDiv.textContent = '📨 Enviando para ChatGPT...';
  statusDiv.classList.remove('error');
  responseSection.style.display = 'none';

  // Adiciona ao histórico
  conversationHistory.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  try {
    // Envia para o background que gerencia tudo
    chrome.runtime.sendMessage({
      type: 'SEND_MESSAGE_TO_GPT',
      message: message
    }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = '❌ ' + chrome.runtime.lastError.message;
        statusDiv.classList.add('error');
        sendBtn.disabled = false;
        return;
      }

      if (response?.success) {
        statusDiv.textContent = '✅ Resposta recebida do GPT!';
        statusDiv.classList.remove('error');
        statusDiv.classList.add('connected');

        // Adiciona resposta ao histórico
        conversationHistory.push({
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString()
        });
        saveHistory();
        updateHistoryDisplay();

        messageInput.value = '';
        
        // Exibe a resposta
        responseSection.style.display = 'block';
        responseDiv.classList.remove('empty');
        responseDiv.textContent = response.response;
      } else {
        statusDiv.textContent = `❌ Erro: ${response?.error || 'Desconhecido'}`;
        statusDiv.classList.add('error');
      }
      
      sendBtn.disabled = false;
    });

  } catch (error) {
    console.error('Erro:', error);
    statusDiv.textContent = '❌ Erro: ' + error.message;
    statusDiv.classList.add('error');
    sendBtn.disabled = false;
  }
});

// Obtém resposta
getBtn.addEventListener('click', async () => {
  getBtn.disabled = true;
  statusDiv.textContent = '⏳ Obtendo resposta do ChatGPT...';
  responseSection.style.display = 'none';

  try {
    chrome.runtime.sendMessage({
      type: 'GET_RESPONSE'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Erro:', chrome.runtime.lastError);
        statusDiv.textContent = '❌ ' + chrome.runtime.lastError.message;
        statusDiv.classList.add('error');
        getBtn.disabled = false;
        return;
      }

      if (response?.success) {
        responseSection.style.display = 'block';
        responseDiv.classList.remove('empty');
        responseDiv.textContent = response.response;

        // Adiciona ao histórico se não estiver já
        if (conversationHistory.length === 0 || conversationHistory[conversationHistory.length - 1].role !== 'assistant') {
          conversationHistory.push({
            role: 'assistant',
            content: response.response,
            timestamp: new Date().toISOString()
          });
          saveHistory();
          updateHistoryDisplay();
        }

        statusDiv.textContent = '✅ Resposta obtida';
        statusDiv.classList.remove('error');
        statusDiv.classList.add('connected');
      } else {
        statusDiv.textContent = `❌ Erro: ${response?.error || 'Desconhecido'}`;
        statusDiv.classList.add('error');
      }
      
      getBtn.disabled = false;
    });
  } catch (error) {
    console.error('Erro:', error);
    statusDiv.textContent = '❌ Erro: ' + error.message;
    statusDiv.classList.add('error');
    getBtn.disabled = false;
  }
});

// Limpa histórico
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
    conversationHistory = [];
    saveHistory();
    updateHistoryDisplay();
    responseSection.style.display = 'none';
    statusDiv.textContent = '✅ Histórico limpo';
    statusDiv.classList.remove('error');
  }
});

// Fecha o painel
closeBtn.addEventListener('click', () => {
  window.close();
});

// Verifica ChatGPT ao carregar
checkChatGPTTab();
loadHistory();

// Verifica periodicamente
setInterval(checkChatGPTTab, 2000);

// Listener para mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PANEL_UPDATE') {
    loadHistory();
    checkChatGPTTab();
  }
});
