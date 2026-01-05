// Service Worker - GPT Interceptor
let offscreenTabId = null;

// Cria/mantém o offscreen document na aba do ChatGPT
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length > 0) {
    console.log('✅ Offscreen document já existe');
    return existingContexts[0];
  }
  
  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['TESTING'],
      justification: 'Needed to inject and capture ChatGPT messages'
    });
    console.log('✅ Offscreen document criado');
  } catch (error) {
    console.error('Erro ao criar offscreen document:', error);
  }
}

// Abre o painel quando o usuário clica no ícone
chrome.action.onClicked.addListener((tab) => {
  openPanel();
});

// Abre o painel via comando de teclado
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open_panel') {
    openPanel();
  }
});

// Função para abrir o painel como janela
function openPanel() {
  const panelUrl = chrome.runtime.getURL('panel.html');
  
  chrome.windows.create({
    url: panelUrl,
    type: 'popup',
    width: 450,
    height: 700,
    top: 100,
    left: 100
  }, (window) => {
    if (chrome.runtime.lastError) {
      console.error('Erro ao abrir painel:', chrome.runtime.lastError);
    } else {
      console.log('✅ Painel aberto com ID:', window.id);
    }
  });
}

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensagem recebida no Background:', request.type);
  
  if (request.type === 'SEND_MESSAGE_TO_GPT') {
    // Encontra a aba do ChatGPT e injeta o content script se necessário
    chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
      if (tabs.length === 0) {
        console.error('❌ Aba do ChatGPT não encontrada');
        sendResponse({ success: false, error: 'ChatGPT não está aberto em nenhuma aba' });
        return;
      }

      const chatGPTTabId = tabs[0].id;
      console.log('✅ Aba do ChatGPT encontrada:', chatGPTTabId);

      // Primeiro, injeta o content script (será ignorado se já estiver injetado)
      chrome.scripting.executeScript({
        target: { tabId: chatGPTTabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('Content script já estava injetado ou erro:', chrome.runtime.lastError.message);
        } else {
          console.log('✅ Content script injetado');
        }

        // Agora envia a mensagem para o content script
        chrome.tabs.sendMessage(chatGPTTabId, {
          type: 'INJECT_MESSAGE',
          message: request.message
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Erro ao enviar para content script:', chrome.runtime.lastError);
            sendResponse({ success: false, error: 'Erro: ' + chrome.runtime.lastError.message });
          } else {
            console.log('✅ Resposta do content script:', response);
            sendResponse(response);
          }
        });
      });
    });
    return true;
  }

  if (request.type === 'GET_RESPONSE') {
    chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
      if (tabs.length === 0) {
        console.error('❌ Aba do ChatGPT não encontrada');
        sendResponse({ success: false, error: 'ChatGPT não está aberto em nenhuma aba' });
        return;
      }

      const chatGPTTabId = tabs[0].id;
      console.log('✅ Aba do ChatGPT encontrada para GET_RESPONSE:', chatGPTTabId);

      // Injeta content script se necessário
      chrome.scripting.executeScript({
        target: { tabId: chatGPTTabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('Content script status:', chrome.runtime.lastError.message);
        }

        // Envia mensagem para obter resposta
        chrome.tabs.sendMessage(chatGPTTabId, {
          type: 'GET_GPT_RESPONSE'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Erro ao obter resposta:', chrome.runtime.lastError);
            sendResponse({ success: false, error: 'Erro: ' + chrome.runtime.lastError.message });
          } else {
            console.log('✅ Resposta obtida:', response);
            sendResponse(response);
          }
        });
      });
    });
    return true;
  }
});

console.log('✅ GPT Interceptor Background Service Worker carregado');
