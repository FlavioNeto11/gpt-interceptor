// 🔍 Script de Debug para Encontrar o Botão de Envio
// Cole isto no console de https://chatgpt.com/

console.clear();
console.log('%c🔍 GPT Button Inspector', 'color: blue; font-size: 16px; font-weight: bold;');
console.log('%c================================', 'color: blue');

// 1. Encontra textarea
const textarea = document.querySelector('textarea');
console.log('\n1️⃣  TEXTAREA:');
if (textarea) {
  console.log('✅ Encontrada');
  console.log('  ID:', textarea.id);
  console.log('  Class:', textarea.className);
  console.log('  Placeholder:', textarea.placeholder);
} else {
  console.log('❌ Não encontrada');
}

// 2. Encontra todos os botões
console.log('\n2️⃣  BOTÕES ENCONTRADOS:');
const allButtons = document.querySelectorAll('button');
console.log(`Total: ${allButtons.length} botões`);

// 3. Procura por botão de envio
console.log('\n3️⃣  PROCURANDO BOTÃO DE ENVIO:');

let sendButton = null;
let foundMethod = '';

// Método 1: aria-label
let btn = document.querySelector('button[aria-label*="Send"]');
if (btn) {
  sendButton = btn;
  foundMethod = 'button[aria-label*="Send"]';
}

// Método 2: aria-label com send minúsculo
if (!btn) {
  btn = document.querySelector('button[aria-label*="send"]');
  if (btn) {
    sendButton = btn;
    foundMethod = 'button[aria-label*="send"]';
  }
}

// Método 3: Procura por todos os botões e mostra
if (!sendButton) {
  console.log('Botões disponíveis com aria-label:');
  allButtons.forEach((button, index) => {
    const ariaLabel = button.getAttribute('aria-label') || '(sem aria-label)';
    const dataTestId = button.getAttribute('data-testid') || '(sem data-testid)';
    const classes = button.className;
    
    console.log(`  [${index}] aria-label: "${ariaLabel}", data-testid: "${dataTestId}"`);
    
    if (ariaLabel.toLowerCase().includes('send') || 
        ariaLabel.toLowerCase().includes('submit') ||
        dataTestId.toLowerCase().includes('send')) {
      sendButton = button;
      foundMethod = `Encontrado no índice ${index}`;
    }
  });
}

if (sendButton) {
  console.log('\n✅ BOTÃO ENCONTRADO!');
  console.log('Método:', foundMethod);
  console.log('aria-label:', sendButton.getAttribute('aria-label'));
  console.log('data-testid:', sendButton.getAttribute('data-testid'));
  console.log('class:', sendButton.className);
  console.log('innerHTML:', sendButton.innerHTML.substring(0, 100));
  
  // Testa o clique
  console.log('\n4️⃣  TESTE DE CLIQUE:');
  console.log('Clicando no botão...');
  sendButton.click();
  console.log('✅ Clique executado');
} else {
  console.log('\n❌ Botão de envio NÃO ENCONTRADO');
  console.log('\nTentando estratégia alternativa...');
  
  // Procura por qualquer coisa próxima à textarea
  if (textarea) {
    let parent = textarea.parentElement;
    for (let i = 0; i < 5; i++) {
      if (parent) {
        const buttons = parent.querySelectorAll('button');
        console.log(`  Nível ${i}: ${buttons.length} botões`);
        if (buttons.length > 0) {
          buttons.forEach((btn, idx) => {
            console.log(`    [${idx}] ${btn.getAttribute('aria-label') || btn.className}`);
          });
        }
        parent = parent.parentElement;
      }
    }
  }
}

// 5. Teste de injeção de mensagem
console.log('\n5️⃣  TESTE DE INJEÇÃO:');
if (textarea) {
  const testMessage = 'Teste: ' + new Date().toLocaleTimeString();
  textarea.value = testMessage;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  console.log(`✅ Texto injetado: "${testMessage}"`);
  console.log('Agora clique manualmente no botão de envio para confirmar que a mensagem foi injetada.');
} else {
  console.log('❌ Não foi possível injetar (textarea não encontrada)');
}

console.log('\n%c================================', 'color: blue');
console.log('%c✅ Debug concluído!', 'color: green; font-size: 14px; font-weight: bold;');
console.log('%cCopie o console log inteiro e envie para o desenvolvedor', 'color: orange');
