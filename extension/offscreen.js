// Offscreen Document - GPT Interceptor
// Este documento roda em background e pode acessar APIs web completas

console.log('🌐 Offscreen document carregado');

let lastCapturedResponse = '';
let monitoringInterval = null;
let chatGPTFrame = null;

// Listener de mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Offscreen recebeu:', request.type);
  
  if (request.type === 'START_MONITORING') {
    console.log('🔍 Iniciando monitoramento de ChatGPT');
    startMonitoring(request.tabId);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'STOP_MONITORING') {
    console.log('⏹️ Parando monitoramento');
    stopMonitoring();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'GET_CACHED_RESPONSE') {
    console.log('📤 Retornando resposta em cache');
    sendResponse({ 
      success: lastCapturedResponse.length > 10, 
      response: lastCapturedResponse 
    });
    return true;
  }
  
  if (request.type === 'CLEAR_CACHE') {
    console.log('🗑️ Limpando cache do offscreen');
    lastCapturedResponse = '';
    sendResponse({ success: true });
    return true;
  }
});

// Inicia monitoramento usando fetch para ler o conteúdo da aba
function startMonitoring(tabId) {
  if (monitoringInterval) {
    console.log('⚠️ Monitoramento já está ativo');
    return;
  }
  
  console.log('✅ Monitoramento iniciado');
  
  // Polling a cada 2 segundos
  monitoringInterval = setInterval(async () => {
    try {
      // Solicita ao background para executar script na aba do ChatGPT
      chrome.runtime.sendMessage({
        type: 'POLL_CHATGPT_DOM',
        tabId: tabId
      }).catch(err => {
        console.log('Erro ao fazer poll:', err);
      });
    } catch (error) {
      console.error('Erro no monitoramento:', error);
    }
  }, 2000);
}

function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('✅ Monitoramento parado');
  }
}

// Recebe resposta capturada do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RESPONSE_FROM_DOM') {
    if (request.response && request.response !== lastCapturedResponse) {
      console.log('✅ Nova resposta recebida do DOM!');
      console.log('Tamanho:', request.response.length);
      lastCapturedResponse = request.response;
      
      // Notifica o background
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_CAPTURED_RESPONSE',
        response: request.response,
        timestamp: Date.now()
      }).catch(err => console.log('Erro ao notificar:', err));
    }
    sendResponse({ success: true });
    return true;
  }
});

console.log('✅ Offscreen document pronto');
