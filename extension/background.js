// Service Worker - GPT Interceptor
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
  
  // Cria uma janela nova com o painel
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
    chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
      if (tabs.length > 0) {
        console.log('✅ Aba do ChatGPT encontrada, enviando mensagem...');
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'INJECT_MESSAGE',
          message: request.message
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Erro ao enviar:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log('✅ Resposta recebida:', response);
            sendResponse(response);
          }
        });
      } else {
        console.error('❌ Aba do ChatGPT não encontrada');
        sendResponse({ success: false, error: 'ChatGPT tab not found' });
      }
    });
    return true;
  }

  if (request.type === 'GET_RESPONSE') {
    chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] }, (tabs) => {
      if (tabs.length > 0) {
        console.log('✅ Obtendo resposta do ChatGPT...');
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GET_GPT_RESPONSE'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Erro ao obter resposta:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log('✅ Resposta obtida:', response);
            sendResponse(response);
          }
        });
      } else {
        console.error('❌ Aba do ChatGPT não encontrada');
        sendResponse({ success: false, error: 'ChatGPT tab not found' });
      }
    });
    return true;
  }
});

console.log('✅ GPT Interceptor Background Service Worker carregado');
