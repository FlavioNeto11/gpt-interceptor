// Background Service Worker - GPT Interceptor
let chatGPTTabId = null;
let cachedResponse = null; // Cache da última resposta capturada
let responseTimestamp = 0;
let offscreenCreated = false;

// Cria offscreen document se necessário
async function setupOffscreenDocument() {
  if (offscreenCreated) {
    console.log('✅ Offscreen já existe');
    return;
  }

  // Verifica se já existe
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });

  if (existingContexts.length > 0) {
    console.log('✅ Offscreen document já existe');
    offscreenCreated = true;
    return;
  }

  // Cria novo offscreen document
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_SCRAPING'],
      justification: 'Monitor ChatGPT responses in background'
    });
    offscreenCreated = true;
    console.log('✅ Offscreen document criado');
  } catch (error) {
    console.error('❌ Erro ao criar offscreen:', error);
  }
}

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
  
  // Recebe notificação do offscreen quando tem nova resposta
  if (request.type === 'offscreen-has-response' && request.target === 'background') {
    console.log('✅ Offscreen notificou nova resposta!');
    cachedResponse = request.data.response;
    responseTimestamp = request.data.timestamp;
    return true;
  }
  
  // Recebe notificação de resposta capturada pelo content script
  if (request.type === 'RESPONSE_CAPTURED') {
    console.log('✅ Resposta capturada pelo observer!');
    cachedResponse = request.response;
    responseTimestamp = request.timestamp;
    
    // Envia pro offscreen armazenar também
    setupOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({
        type: 'store-response',
        target: 'offscreen',
        data: request.response
      }).catch(err => console.log('Offscreen não disponível:', err));
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
    // Garante que offscreen existe
    await setupOffscreenDocument();
    
    // Limpa cache ao enviar nova mensagem
    cachedResponse = null;
    responseTimestamp = 0;
    console.log('🗑️ Cache limpo para nova mensagem');
    
    // Limpa storage também
    await chrome.storage.local.remove(['lastGPTResponse', 'lastGPTResponseTime']);
    console.log('🗑️ Storage limpo');
    
    // Limpa cache do offscreen
    chrome.runtime.sendMessage({ 
      type: 'clear-response',
      target: 'offscreen'
    }).catch(err => 
      console.log('Offscreen não disponível:', err)
    );
    
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
    console.log('🔍 Tentando obter resposta...');
    
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
      console.log('Storage não disponível:', storageErr);
    }
    
    // Terceiro fallback: tenta offscreen
    try {
      await setupOffscreenDocument();
      const offscreenResponse = await chrome.runtime.sendMessage({
        type: 'get-response',
        target: 'offscreen'
      });
      
      if (offscreenResponse && offscreenResponse.success) {
        const now = Date.now();
        if ((now - offscreenResponse.timestamp) < 60000) {
          console.log('✅ Retornando resposta do offscreen');
          cachedResponse = offscreenResponse.response;
          responseTimestamp = offscreenResponse.timestamp;
          sendResponse({ success: true, response: offscreenResponse.response, fromOffscreen: true });
          return;
        }
      }
    } catch (offscreenErr) {
      console.log('Offscreen não disponível:', offscreenErr);
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
          // Tenta múltiplos seletores
          let messages = document.querySelectorAll('[data-message-author-role="assistant"]');
          
          if (messages.length === 0) {
            messages = document.querySelectorAll('[role="article"]');
          }
          
          if (messages.length === 0) {
            messages = document.querySelectorAll('[data-message-id]');
          }
          
          console.log('Mensagens encontradas:', messages.length);
          
          if (messages.length === 0) {
            return { success: false, error: 'Nenhuma mensagem encontrada' };
          }
          
          const lastMessage = messages[messages.length - 1];
          const response = (lastMessage.innerText || lastMessage.textContent || '').trim();
          
          console.log('Resposta capturada:', response.substring(0, 100));
          
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
        
        // Salva no storage também
        chrome.storage.local.set({
          lastGPTResponse: result.response,
          lastGPTResponseTime: Date.now()
        });
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
