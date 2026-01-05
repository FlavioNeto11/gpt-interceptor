// Offscreen Document - Gerencia injeção e captura do ChatGPT em background
let activeChatGPTTabId = null;
let pendingMessage = null;
let messageTimeout = null;

// Aguarda o botão de envio aparecer e clica
async function waitAndClickSendButton(timeout = 10000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      let button = document.querySelector('button[data-testid="send-button"]');
      
      if (!button) {
        button = document.getElementById('composer-submit-button');
      }
      
      if (!button) {
        button = document.querySelector('button.composer-submit-btn');
      }
      
      if (button && button.offsetHeight > 0) {
        clearInterval(checkInterval);
        console.log('✅ Botão encontrado! Clicando...');
        button.click();
        console.log('🖱️ Clique executado');
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.error('❌ Timeout aguardando botão');
        resolve(false);
      }
    }, 100);
  });
}

// Injeta mensagem
async function injectMessage(message) {
  console.log('📝 Injetando mensagem...');
  
  let inputElement = document.querySelector('div[contenteditable="true"][id="prompt-textarea"]');
  
  if (!inputElement) {
    console.error('❌ Campo não encontrado');
    return false;
  }
  
  console.log('✅ Campo encontrado');
  
  inputElement.textContent = '';
  inputElement.innerHTML = `<p>${message}</p>`;
  
  const events = [
    new Event('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true, cancelable: true }),
    new Event('beforeinput', { bubbles: true, cancelable: true })
  ];
  
  events.forEach(event => inputElement.dispatchEvent(event));
  console.log('✏️ Mensagem injetada');
  
  return true;
}

// Captura resposta
async function captureResponse(timeout = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let lastMessageContent = '';
    
    const checkInterval = setInterval(() => {
      try {
        let messages = document.querySelectorAll('[role="article"]');
        
        if (messages.length === 0) {
          messages = document.querySelectorAll('[data-message-id]');
        }
        
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          const response = (lastMessage.innerText || lastMessage.textContent || '').trim();
          
          if (response.length > 10 && response !== lastMessageContent &&
              !response.toLowerCase().includes('typing')) {
            
            lastMessageContent = response;
            clearInterval(checkInterval);
            console.log('✅ Resposta capturada!');
            resolve({ success: true, response: response });
            return;
          }
        }
        
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          console.error('⏱️ Timeout');
          resolve({ success: false, error: 'Timeout' });
        }
      } catch (error) {
        console.error('Erro ao capturar:', error.message);
      }
    }, 1000);
  });
}

// Listener para mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Offscreen recebeu:', request.type);
  
  if (request.type === 'INJECT_AND_CAPTURE') {
    const { message } = request;
    
    (async () => {
      try {
        // Injeta e aguarda
        const injected = await injectMessage(message);
        if (!injected) {
          sendResponse({ success: false, error: 'Falha ao injetar' });
          return;
        }
        
        // Aguarda renderização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clica botão
        const clicked = await waitAndClickSendButton(10000);
        if (!clicked) {
          sendResponse({ success: false, error: 'Falha ao clicar' });
          return;
        }
        
        // Aguarda resposta
        const result = await captureResponse(30000);
        sendResponse(result);
      } catch (error) {
        console.error('Erro:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Resposta assíncrona
  }
  
  if (request.type === 'GET_RESPONSE') {
    (async () => {
      const result = await captureResponse(15000);
      sendResponse(result);
    })();
    
    return true;
  }
});

console.log('✅ Offscreen Document carregado');
