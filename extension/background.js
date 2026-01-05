// Background Service Worker - GPT Interceptor
let chatGPTTabId = null;
let cachedResponse = null; // Cache da última resposta capturada
let responseTimestamp = 0;

// Listener para comandos (Ctrl+Shift+Y)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open_panel') {
    openPanel();
  }
});

// Listener para clique no ícone
chrome.action.onClicked.addListener(() => {
  openPanel();
});

// Abre o painel como janela fixa
function openPanel() {
  chrome.windows.create({
    url: 'panel.html',
    type: 'popup',
    width: 450,
    height: 700,
    focused: true
  });
}


// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background recebeu:', request.type);
  
  // Recebe notificação de resposta capturada pelo content script
  if (request.type === 'RESPONSE_CAPTURED') {
    console.log('✅ Resposta capturada pelo observer!');
    cachedResponse = request.response;
    responseTimestamp = request.timestamp;
    // Não precisa sendResponse aqui, é apenas notificação
    return;
  }
  
  if (request.type === 'SEND_MESSAGE_TO_GPT') {
    handleSendMessage(request.message, sendResponse);
    return true;
  }

  if (request.type === 'GET_RESPONSE') {
    handleGetResponse(sendResponse);
    return true;
  }
});

// Envia mensagem para o ChatGPT
async function handleSendMessage(message, sendResponse) {
  try {
    // Limpa cache ao enviar nova mensagem
    cachedResponse = null;
    responseTimestamp = 0;
    console.log('🗑️ Cache limpo para nova mensagem');
    
    const tabs = await chrome.tabs.query({ 
      url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] 
    });

    if (tabs.length === 0) {
      sendResponse({ success: false, error: 'ChatGPT não está aberto' });
      return;
    }

    chatGPTTabId = tabs[0].id;
    console.log('✅ Aba ChatGPT encontrada:', chatGPTTabId);

    // Injeta o content script
    await chrome.scripting.executeScript({
      target: { tabId: chatGPTTabId },
      files: ['content.js']
    }).catch(err => {
      console.log('Content script já injetado ou erro:', err.message);
    });

    // Aguarda um pouco para garantir que o script foi injetado
    await new Promise(resolve => setTimeout(resolve, 500));

    // Envia a mensagem
    chrome.tabs.sendMessage(chatGPTTabId, {
      type: 'INJECT_MESSAGE',
      message: message
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Erro ao enviar:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Mensagem injetada');
        sendResponse({ success: true });
      }
    });

  } catch (error) {
    console.error('Erro em handleSendMessage:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Obtém a resposta do ChatGPT
async function handleGetResponse(sendResponse) {
  try {
    // Primeiro, verifica se temos resposta em cache (capturada pelo observer)
    if (cachedResponse && cachedResponse.length > 10) {
      // Cache válido nos últimos 60 segundos
      const now = Date.now();
      if (responseTimestamp > 0 && (now - responseTimestamp) < 60000) {
        console.log('✅ Retornando resposta do cache (observer)');
        sendResponse({ success: true, response: cachedResponse, fromCache: true });
        return;
      }
    }
    
    if (!chatGPTTabId) {
      const tabs = await chrome.tabs.query({ 
        url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] 
      });

      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'ChatGPT não está aberto' });
        return;
      }

      chatGPTTabId = tabs[0].id;
    }

    console.log('🔍 Executando captura direta no DOM do ChatGPT...');
    
    // Executa código diretamente na aba para capturar a resposta
    const results = await chrome.scripting.executeScript({
      target: { tabId: chatGPTTabId },
      func: () => {
        // Esta função roda DIRETO na aba do ChatGPT
        try {
          let messages = document.querySelectorAll('[role="article"]');
          
          if (messages.length === 0) {
            messages = document.querySelectorAll('[data-message-id]');
          }
          
          if (messages.length === 0) {
            return { success: false, error: 'Nenhuma mensagem encontrada' };
          }
          
          const lastMessage = messages[messages.length - 1];
          const response = (lastMessage.innerText || lastMessage.textContent || '').trim();
          
          if (response.length > 10) {
            return { success: true, response: response };
          }
          
          return { success: false, error: 'Resposta vazia ou muito curta' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });

    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      console.log('✅ Resultado da execução:', result);
      
      // Atualiza cache se sucesso
      if (result.success) {
        cachedResponse = result.response;
        responseTimestamp = Date.now();
      }
      
      sendResponse(result);
    } else {
      sendResponse({ success: false, error: 'Falha ao executar script' });
    }

  } catch (error) {
    console.error('Erro em handleGetResponse:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('✅ GPT Interceptor Background Service Worker carregado');
