// Popup Script - GPT Interceptor
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const getBtn = document.getElementById('getBtn');
const statusDiv = document.getElementById('status');
const responseDiv = document.getElementById('response');

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
      statusDiv.textContent = '❌ Abra o ChatGPT em uma aba';
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
  statusDiv.textContent = '📨 Injetando mensagem no ChatGPT...';
  statusDiv.classList.remove('error');
  responseDiv.style.display = 'none';

  try {
    // Injeta a mensagem no ChatGPT
    chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
      if (tabs.length === 0) {
        statusDiv.textContent = '❌ ChatGPT não encontrado';
        statusDiv.classList.add('error');
        sendBtn.disabled = false;
        return;
      }

      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, {
        type: 'INJECT_MESSAGE',
        message: message
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Erro ao enviar mensagem:', chrome.runtime.lastError);
          statusDiv.textContent = '❌ ' + chrome.runtime.lastError.message;
          statusDiv.classList.add('error');
          sendBtn.disabled = false;
          return;
        }

        if (response?.success) {
          statusDiv.textContent = '✅ Resposta recebida do GPT!';
          statusDiv.classList.remove('error');
          statusDiv.classList.add('connected');

          messageInput.value = '';
          
          // Exibe a resposta
          responseDiv.style.display = 'block';
          responseDiv.innerHTML = `
            <div class="response-title">✅ Resposta do GPT:</div>
            <div>${response.response || 'Processando...'}</div>
          `;
        } else {
          statusDiv.textContent = `❌ Erro: ${response?.error || 'Desconhecido'}`;
          statusDiv.classList.add('error');
        }
        
        sendBtn.disabled = false;
      });
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
  responseDiv.style.display = 'none';

  chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
    if (tabs.length === 0) {
      statusDiv.textContent = '❌ ChatGPT não encontrado';
      statusDiv.classList.add('error');
      getBtn.disabled = false;
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'GET_GPT_RESPONSE'
    }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('Erro:', chrome.runtime.lastError);
        statusDiv.textContent = '❌ ' + chrome.runtime.lastError.message;
        statusDiv.classList.add('error');
        getBtn.disabled = false;
        return;
      }

      if (response?.success) {
        responseDiv.style.display = 'block';
        responseDiv.innerHTML = `
          <div class="response-title">✅ Resposta do GPT:</div>
          <div>${response.response || 'Nenhuma resposta encontrada'}</div>
        `;
        statusDiv.textContent = '✅ Resposta obtida';
        statusDiv.classList.remove('error');
        statusDiv.classList.add('connected');
        // Não envia para backend aqui (precisa de messageId); apenas mostra
      } else {
        statusDiv.textContent = `❌ Erro: ${response?.error || 'Desconhecido'}`;
        statusDiv.classList.add('error');
      }
      
      getBtn.disabled = false;
    });
  });
});

// Verifica a aba ao abrir o popup
checkChatGPTTab();

// Verifica periodicamente
setInterval(checkChatGPTTab, 2000);
