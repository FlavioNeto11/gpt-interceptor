// Background Service Worker - GPT Interceptor
let chatGPTTabId = null;

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

    // Injeta o content script se necessário
    await chrome.scripting.executeScript({
      target: { tabId: chatGPTTabId },
      files: ['content.js']
    }).catch(err => {
      console.log('Content script já injetado ou erro:', err.message);
    });

    // Aguarda mais tempo para garantir que o content script está pronto
    await new Promise(resolve => setTimeout(resolve, 800));

    // Pede a resposta com timeout maior
    const responsePromise = new Promise((resolve) => {
      chrome.tabs.sendMessage(chatGPTTabId, {
        type: 'GET_GPT_RESPONSE',
        timestamp: Date.now()
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Erro ao obter resposta:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('✅ Resposta obtida:', response);
          resolve(response);
        }
      });
    });

    // Aguarda resposta com timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: false, error: 'Timeout ao obter resposta. Tente novamente.' });
      }, 15000);
    });

    const result = await Promise.race([responsePromise, timeoutPromise]);
    sendResponse(result);

  } catch (error) {
    console.error('Erro em handleGetResponse:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('✅ GPT Interceptor Background Service Worker carregado');
