// Service Worker para gerenciar mensagens entre content script e popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensagem recebida no Background:', request.type, sender);
  
  if (request.type === 'SEND_MESSAGE_TO_GPT') {
    // Encontra a aba do ChatGPT e envia a mensagem
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
    return true; // Para resposta assíncrona
  }

  if (request.type === 'GET_RESPONSE') {
    // Obtém a resposta do ChatGPT
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
