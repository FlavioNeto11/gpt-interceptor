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
    console.log('✅ Resposta capturada pelo content script!');
    cachedResponse = request.response;
    responseTimestamp = request.timestamp;
    
    // Armazena no storage também
    chrome.storage.local.set({
      lastGPTResponse: request.response,
      lastGPTResponseTime: request.timestamp
    });
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
    
    // Limpa storage também
    await chrome.storage.local.remove(['lastGPTResponse', 'lastGPTResponseTime']);
    console.log('🗑️ Storage limpo');
    
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
    
    // Envia comando para limpar o lastResponse no content script também
    chrome.tabs.sendMessage(chatGPTTabId, {
      type: 'CLEAR_CACHE'
    }).catch(err => console.log('Erro ao limpar cache do content:', err));
    
    await new Promise(resolve => setTimeout(resolve, 200));

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
    console.log('🔍 handleGetResponse iniciado');
    console.log('🔍 chatGPTTabId:', chatGPTTabId);
    
    // Primeiro, verifica se temos resposta em cache (capturada pelo observer)
    if (cachedResponse && cachedResponse.length > 10) {
      // Cache válido nos últimos 60 segundos
      const now = Date.now();
      if (responseTimestamp > 0 && (now - responseTimestamp) < 60000) {
        console.log('✅ Retornando resposta do cache em memória (observer)');
        sendResponse({ success: true, response: cachedResponse, fromCache: true });
        return;
      }
    }
    
    // Tenta ler do storage como segundo fallback
    try {
      const stored = await chrome.storage.local.get(['lastGPTResponse', 'lastGPTResponseTime']);
      if (stored.lastGPTResponse && stored.lastGPTResponseTime) {
        const now = Date.now();
        if ((now - stored.lastGPTResponseTime) < 60000) {
          console.log('✅ Retornando resposta do storage');
          cachedResponse = stored.lastGPTResponse;
          responseTimestamp = stored.lastGPTResponseTime;
          sendResponse({ success: true, response: stored.lastGPTResponse, fromStorage: true });
          return;
        }
      }
    } catch (storageErr) {
      console.log('⚠️ Storage não disponível:', storageErr);
    }
    
    if (!chatGPTTabId) {
      console.log('🔍 chatGPTTabId não definido, procurando tabs...');
      const tabs = await chrome.tabs.query({ 
        url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] 
      });

      if (tabs.length === 0) {
        console.error('❌ ChatGPT não está aberto');
        sendResponse({ success: false, error: 'ChatGPT não está aberto' });
        return;
      }

      chatGPTTabId = tabs[0].id;
      console.log('✅ Tab encontrada:', chatGPTTabId);
    }

    console.log('📨 Enviando GET_GPT_RESPONSE para tab:', chatGPTTabId);
    
    // Pede diretamente ao content script que já está rodando na tab
    chrome.tabs.sendMessage(chatGPTTabId, {
      type: 'GET_GPT_RESPONSE'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erro chrome.runtime.lastError:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      console.log('📬 Resposta do content script:', response);
      
      if (response && response.success) {
        console.log('✅ Resposta obtida do content script');
        cachedResponse = response.response;
        responseTimestamp = Date.now();
        
        // Salva no storage também
        chrome.storage.local.set({
          lastGPTResponse: response.response,
          lastGPTResponseTime: Date.now()
        });
        
        sendResponse(response);
      } else {
        console.log('⚠️ Content script retornou erro ou sem sucesso:', response);
        sendResponse(response || { success: false, error: 'Sem resposta' });
      }
    });

  } catch (error) {
    console.error('❌ Erro em handleGetResponse:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('✅ GPT Interceptor Background Service Worker carregado');
