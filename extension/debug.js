// Script de Debug - Cole no console do Chrome na página do ChatGPT

console.log('🔍 GPT Interceptor Debug Tool');
console.log('=============================\n');

// 1. Verifica textareas
console.log('1️⃣  TEXTAREAS ENCONTRADAS:');
const textareas = document.querySelectorAll('textarea');
console.log(`   Total: ${textareas.length}`);
textareas.forEach((ta, i) => {
  console.log(`   [${i}] Classes: ${ta.className}`);
  console.log(`       ID: ${ta.id || 'nenhum'}`);
  console.log(`       Placeholder: ${ta.placeholder}`);
});

// 2. Verifica elementos contenteditable
console.log('\n2️⃣  ELEMENTOS CONTENTEDITABLE:');
const editables = document.querySelectorAll('[contenteditable="true"]');
console.log(`   Total: ${editables.length}`);
editables.forEach((el, i) => {
  console.log(`   [${i}] Tag: ${el.tagName}, Classes: ${el.className}`);
});

// 3. Verifica botões
console.log('\n3️⃣  BOTÕES DE ENVIO:');
const buttons = document.querySelectorAll('button');
console.log(`   Total de botões: ${buttons.length}`);
let sendButtonCount = 0;
buttons.forEach((btn, i) => {
  const ariaLabel = btn.getAttribute('aria-label') || '';
  if (ariaLabel.toLowerCase().includes('send') || btn.textContent.toLowerCase().includes('send')) {
    console.log(`   [${i}] ✅ Possível botão de envio`);
    console.log(`       Aria-label: ${ariaLabel}`);
    console.log(`       Texto: ${btn.textContent}`);
    sendButtonCount++;
  }
});
if (sendButtonCount === 0) {
  console.log('   ⚠️  Nenhum botão de envio óbvio encontrado');
}

// 4. Verifica mensagens
console.log('\n4️⃣  MENSAGENS ENCONTRADAS:');
const messages = document.querySelectorAll('[data-message-id]');
console.log(`   Total (data-message-id): ${messages.length}`);

const articles = document.querySelectorAll('article');
console.log(`   Total (article): ${articles.length}`);

const divMessages = document.querySelectorAll('div[class*="message"]');
console.log(`   Total (div com class contendo 'message'): ${divMessages.length}`);

// 5. Estrutura do DOM
console.log('\n5️⃣  ESTRUTURA DO DOM:');
console.log(`   Document Title: ${document.title}`);
console.log(`   URL: ${window.location.href}`);
console.log(`   Document ready: ${document.readyState}`);

// 6. Função auxiliar para testar injeção
console.log('\n6️⃣  FUNÇÕES AUXILIARES:');
console.log('   use: testTextareaInjection("Olá mundo!")');
console.log('   use: testButtonClick()');
console.log('   use: testMessageCapture()');

window.testTextareaInjection = function(text) {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Texto injetado na textarea');
    return true;
  } else {
    console.error('❌ Textarea não encontrada');
    return false;
  }
};

window.testButtonClick = function() {
  const buttons = document.querySelectorAll('button');
  for (let btn of buttons) {
    const ariaLabel = btn.getAttribute('aria-label') || '';
    if (ariaLabel.toLowerCase().includes('send')) {
      console.log('✅ Clicando no botão de envio');
      btn.click();
      return true;
    }
  }
  console.error('❌ Botão de envio não encontrado');
  return false;
};

window.testMessageCapture = function() {
  const messages = document.querySelectorAll('[data-message-id]');
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.innerText || lastMessage.textContent;
    console.log('✅ Última mensagem capturada:');
    console.log(content);
    return content;
  } else {
    console.error('❌ Nenhuma mensagem encontrada');
    return null;
  }
};

console.log('\n✅ Debug tool carregado com sucesso!');
