// Content Script - GPT Interceptor
let lastResponse = '';
let isWaitingForResponse = false;
let capturedResponses = {}; // Armazena respostas por ID
let messageObserver = null;
let lastMessageCount = 0;

// Inicia observador de mutações no DOM
function startMessageObserver() {
  if (messageObserver) {
    console.log('⚠️ Observer já está rodando');
    return;
  }
  
  console.log('🔍 Iniciando observador de mensagens...');
  console.log('URL atual:', window.location.href);
  
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  
  messageObserver = new MutationObserver((mutations) => {
    // Procura mensagens a cada mutação
    let messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    
    if (messages.length === 0) {
      messages = document.querySelectorAll('[role="article"]');
    }
    
    if (messages.length === 0) {
      messages = document.querySelectorAll('[data-message-id]');
    }
    
    // Se o número de mensagens AUMENTOU (nova mensagem chegou)
    if (messages.length > lastMessageCount && messages.length > 0) {
      console.log(`📈 Contagem mudou de ${lastMessageCount} para ${messages.length} - NOVA MENSAGEM!`);
      lastMessageCount = messages.length;
      
      const lastMessage = messages[messages.length - 1];
      const response = (lastMessage.innerText || lastMessage.textContent || '').trim();
      
      console.log('📝 Nova resposta capturada:', response.substring(0, 100) + '...');
      
      // Só armazena se for diferente da última E tiver conteúdo válido
      if (response.length > 10 && response !== lastResponse) {
        lastResponse = response;
        console.log('✅ Nova resposta detectada e ARMAZENADA pelo observer!');
        console.log('Tamanho:', response.length);
        
        // Armazena no storage também
        chrome.storage.local.set({ 
          lastGPTResponse: response,
          lastGPTResponseTime: Date.now()
        }).then(() => {
          console.log('💾 Resposta salva no storage');
        });
        
        // Envia notificação para o background
        chrome.runtime.sendMessage({
          type: 'RESPONSE_CAPTURED',
          response: response,
          timestamp: Date.now()
        }).then(() => {
          console.log('📤 Notificação enviada ao background');
        }).catch(err => console.log('❌ Erro ao notificar:', err));
      } else {
        console.log('⚠️ Resposta não armazenada (duplicada ou inválida)');
      }
    }
  });
  
  messageObserver.observe(targetNode, config);
  console.log('✅ Observer ativo e monitorando DOM');
  
  // Faz uma checagem inicial
  setTimeout(() => {
    let messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (messages.length === 0) {
      messages = document.querySelectorAll('[role="article"]');
    }
    console.log(`📊 Checagem inicial: ${messages.length} mensagens no DOM`);
    lastMessageCount = messages.length;
  }, 500);
}

// Inicia o observer quando o script carrega
console.log('🚀 Content Script iniciando...');
setTimeout(startMessageObserver, 1000);

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
    }, 100);
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
    let messageCount = 0;
    
    const checkInterval = setInterval(() => {
      try {
        // Procura mensagens
        let messages = document.querySelectorAll('[role="article"]');
        
        if (messages.length === 0) {
          messages = document.querySelectorAll('[data-message-id]');
        }
        
        if (messages.length > 0) {
          // A última mensagem deve ser a resposta
          const lastMessage = messages[messages.length - 1];
          const response = (lastMessage.innerText || lastMessage.textContent || '').trim();
          
          // Verifica se temos uma resposta nova e significante
          if (response.length > 10 && response !== lastMessageContent &&
              !response.toLowerCase().includes('typing')) {
            
            // Se a contagem de mensagens mudou, é uma resposta nova
            if (messages.length > messageCount) {
              messageCount = messages.length;
              lastMessageContent = response;
              
              clearInterval(checkInterval);
              console.log('✅ Resposta capturada com sucesso!');
              console.log('Tamanho da resposta:', response.length);
              isWaitingForResponse = false;
              
              // Armazena a resposta
              lastResponse = response;
              
              resolve({ success: true, response: response });
              return;
            }
          }
        }
        
        // Timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          console.error('⏱️  Timeout esperando resposta');
          isWaitingForResponse = false;
          resolve({ success: false, error: 'Timeout esperando resposta' });
        }
      } catch (error) {
        console.error('Erro ao capturar:', error.message);
      }
    }, 500); // Verifica a cada 500ms em vez de 1000ms
  });
}

// Listener de mensagens da extensao
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content Script recebeu:', request.type);
  
  if (request.type === 'CLEAR_CACHE') {
    console.log('🗑️ Limpando cache do content script');
    lastResponse = '';
    lastMessageCount = 0; // Reset para forçar detecção de nova mensagem
    
    // Limpa o storage também
    chrome.storage.local.remove(['lastGPTResponse', 'lastGPTResponseTime']).then(() => {
      console.log('🗑️ Storage limpo pelo content script');
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'INJECT_MESSAGE') {
    console.log('📨 Recebido: INJECT_MESSAGE');
    const { message } = request;
    
    // LIMPA CACHE ANTES DE ENVIAR
    lastResponse = '';
    console.log('🗑️ Cache limpo antes de enviar nova mensagem');
    
    // Conta mensagens atuais para saber quando chegar nova
    let currentMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (currentMessages.length === 0) {
      currentMessages = document.querySelectorAll('[role="article"]');
    }
    lastMessageCount = currentMessages.length;
    console.log(`📊 Contagem atual antes de enviar: ${lastMessageCount} mensagens`);
    
    // Responde imediatamente que recebeu
    sendResponse({ success: true, received: true });
    
    // Processa o envio
    sendMessageToGPT(message).then(success => {
      if (success) {
        console.log('⏳ Aguardando resposta do GPT...');
        // Captura a resposta assim que enviou
        captureGPTResponse(45000).then((result) => {
          console.log('✅ Resultado da captura:', result);
          if (result.success) {
            lastResponse = result.response;
          }
        });
      } else {
        console.error('❌ Falha ao enviar mensagem');
      }
    });
    
    return true;
  }
  
  if (request.type === 'GET_GPT_RESPONSE') {
    console.log('📨 Recebido: GET_GPT_RESPONSE');
    
    // Se já temos uma resposta armazenada, retorna ela
    if (lastResponse && lastResponse.length > 10) {
      console.log('✅ Retornando resposta armazenada');
      sendResponse({ success: true, response: lastResponse });
    } else {
      // Caso contrário, tenta capturar novamente
      console.log('⏳ Tentando capturar resposta...');
      captureGPTResponse(10000).then(result => {
        console.log('📤 Enviando resultado:', result);
        sendResponse(result);
      });
    }
    
    return true;
  }
});

console.log('✅ GPT Interceptor Content Script Carregado!');
