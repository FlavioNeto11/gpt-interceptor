// Content Script - GPT Interceptor
let lastResponse = '';
let isWaitingForResponse = false;

// Aguarda o botao aparecer e clica nele
async function waitAndClickSendButton(timeout = 10000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      // Estratégia 1: Procura por data-testid="send-button"
      let button = document.querySelector('button[data-testid="send-button"]');
      
      // Estratégia 2: Por id
      if (!button) {
        button = document.getElementById('composer-submit-button');
      }
      
      // Estratégia 3: Por classe
      if (!button) {
        button = document.querySelector('button.composer-submit-btn');
      }
      
      // Se encontrou e está visível
      if (button && button.offsetHeight > 0) {
        clearInterval(checkInterval);
        console.log('✅ Botao encontrado! Clicando...');
        button.click();
        console.log('🖱️  Clique executado');
        resolve(true);
        return;
      }
      
      // Timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.error('❌ Timeout aguardando botao aparecer');
        resolve(false);
      }
    }, 100); // Verifica a cada 100ms
  });
}

// Injeta mensagem no campo de entrada
async function injectMessage(message) {
  console.log('📝 Injetando mensagem...');
  
  // Procura o contenteditable do ProseMirror
  let inputElement = document.querySelector('div[contenteditable="true"][id="prompt-textarea"]');
  
  if (!inputElement) {
    console.error('❌ Campo de entrada nao encontrado');
    return false;
  }
  
  console.log('✅ Campo encontrado');
  
  // Limpa e injeta
  inputElement.textContent = '';
  inputElement.innerHTML = `<p>${message}</p>`;
  
  // Dispara eventos
  const events = [
    new Event('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true, cancelable: true }),
    new Event('beforeinput', { bubbles: true, cancelable: true })
  ];
  
  events.forEach(event => inputElement.dispatchEvent(event));
  console.log('✏️  Mensagem injetada e eventos disparados');
  
  return true;
}

// Envia mensagem para o GPT
async function sendMessageToGPT(message) {
  try {
    console.log('🚀 Iniciando envio de mensagem...');
    isWaitingForResponse = true;
    
    // Injeta a mensagem
    const injected = await injectMessage(message);
    if (!injected) {
      return false;
    }
    
    // Aguarda um pouco para o React processar
    console.log('⏳ Aguardando renderizacao...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Aguarda e clica no botao
    const clicked = await waitAndClickSendButton(10000);
    if (!clicked) {
      console.error('❌ Nao conseguiu clicar no botao');
      isWaitingForResponse = false;
      return false;
    }
    
    console.log('✅ Mensagem enviada!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    isWaitingForResponse = false;
    return false;
  }
}

// Captura resposta do GPT
async function captureGPTResponse(timeout = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let lastMessageContent = '';
    let checkCount = 0;
    
    const checkInterval = setInterval(() => {
      checkCount++;
      
      try {
        // Procura mensagens
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
            isWaitingForResponse = false;
            resolve({ success: true, response: response });
            return;
          }
        }
        
        // Timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          console.error('⏱️  Timeout');
          isWaitingForResponse = false;
          resolve({ success: false, error: 'Timeout' });
        }
      } catch (error) {
        console.error('Erro ao capturar:', error.message);
      }
    }, 1000);
  });
}

// Listener de mensagens da extensao
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content Script recebeu:', request.type);
  
  if (request.type === 'INJECT_MESSAGE') {
    console.log('📨 Recebido: INJECT_MESSAGE');
    const { message } = request;
    
    // Responde imediatamente que recebeu
    sendResponse({ success: true, received: true });
    
    // Processa em background
    sendMessageToGPT(message).then(success => {
      if (success) {
        console.log('⏳ Aguardando resposta...');
        captureGPTResponse(30000).then((result) => {
          console.log('✅ Resposta capturada');
          // A resposta será obtida por GET_GPT_RESPONSE
        });
      }
    });
    
    return true;
  }
  
  if (request.type === 'GET_GPT_RESPONSE') {
    console.log('📨 Recebido: GET_GPT_RESPONSE');
    captureGPTResponse(15000).then(result => {
      console.log('Enviando resultado:', result);
      sendResponse(result);
    });
    return true;
  }
});

console.log('✅ GPT Interceptor Content Script Carregado!');
