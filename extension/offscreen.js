// Offscreen Document - GPT Interceptor
// Roda em background e armazena dados persistentemente

console.log('🌐 Offscreen document carregado');

let lastCapturedResponse = '';
let responseTimestamp = 0;

// Listener de mensagens - filtra por target
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Só processa mensagens direcionadas a este offscreen
  if (message.target !== 'offscreen') {
    return;
  }
  
  console.log('📨 Offscreen recebeu:', message.type);
  
  switch (message.type) {
    case 'store-response':
      // Armazena resposta recebida do background
      if (message.data && message.data !== lastCapturedResponse) {
        lastCapturedResponse = message.data;
        responseTimestamp = Date.now();
        console.log('💾 Resposta armazenada no offscreen');
        console.log('Tamanho:', message.data.length);
        
        // Notifica o background que temos nova resposta
        chrome.runtime.sendMessage({
          type: 'offscreen-has-response',
          target: 'background',
          data: {
            response: lastCapturedResponse,
            timestamp: responseTimestamp
          }
        });
      }
      sendResponse({ success: true });
      break;
      
    case 'get-response':
      // Retorna resposta armazenada
      console.log('📤 Retornando resposta armazenada');
      sendResponse({
        success: lastCapturedResponse.length > 10,
        response: lastCapturedResponse,
        timestamp: responseTimestamp
      });
      break;
      
    case 'clear-response':
      // Limpa resposta armazenada
      console.log('🗑️ Limpando cache do offscreen');
      lastCapturedResponse = '';
      responseTimestamp = 0;
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('Tipo de mensagem desconhecido:', message.type);
  }
  
  return true; // Mantém canal aberto para sendResponse assíncrono
});

console.log('✅ Offscreen document pronto e aguardando mensagens');
