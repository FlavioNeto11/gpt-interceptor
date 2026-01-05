// 🧪 Script Completo de Teste do GPT Interceptor
// Cole isto no console em https://chatgpt.com/

console.clear();
console.log('%c🧪 GPT Interceptor - Teste Completo', 'color: #00ff00; font-size: 18px; font-weight: bold; background: #000;');
console.log('%c========================================', 'color: #00ff00');

const results = {
  timestamp: new Date().toISOString(),
  tests: []
};

// Teste 1: Textarea
console.log('\n📝 Teste 1: Procurando Textarea...');
const textarea = document.querySelector('textarea');
if (textarea) {
  console.log('✅ Textarea encontrada');
  results.tests.push({ name: 'Textarea', status: 'OK', details: { id: textarea.id, class: textarea.className } });
} else {
  console.log('❌ Textarea não encontrada');
  results.tests.push({ name: 'Textarea', status: 'FAIL' });
}

// Teste 2: Encontrar botões
console.log('\n🔘 Teste 2: Procurando Botões...');
const allButtons = document.querySelectorAll('button');
console.log(`Total de botões: ${allButtons.length}`);

const buttonDetails = [];
let potentialSendButtons = [];

allButtons.forEach((btn, index) => {
  const ariaLabel = btn.getAttribute('aria-label') || '';
  const dataTestId = btn.getAttribute('data-testid') || '';
  const isVisible = btn.offsetHeight > 0;
  
  const detail = {
    index,
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
    visible: isVisible,
    class: btn.className.substring(0, 50)
  };
  
  buttonDetails.push(detail);
  
  if ((ariaLabel.toLowerCase().includes('send') || 
       ariaLabel.toLowerCase().includes('submit') ||
       dataTestId.toLowerCase().includes('send')) && isVisible) {
    potentialSendButtons.push({ index, ariaLabel, dataTestId });
    console.log(`✅ Botão potencial encontrado [${index}]: "${ariaLabel}"`);
  }
});

if (potentialSendButtons.length > 0) {
  console.log(`✅ ${potentialSendButtons.length} botão(es) de envio potencial encontrado(s)`);
  results.tests.push({ name: 'Send Button', status: 'FOUND', count: potentialSendButtons.length });
} else {
  console.log('⚠️  Nenhum botão óbvio de envio encontrado');
  results.tests.push({ name: 'Send Button', status: 'NOT_FOUND', totalButtons: allButtons.length });
}

// Teste 3: Testar injeção de mensagem
console.log('\n📤 Teste 3: Testando Injeção de Mensagem...');
if (textarea) {
  const testMsg = 'TESTE_INJECAO_' + Date.now();
  textarea.value = testMsg;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  console.log(`✅ Mensagem injetada: "${testMsg}"`);
  results.tests.push({ name: 'Injection', status: 'OK', message: testMsg });
} else {
  console.log('❌ Não foi possível injetar (textarea não encontrada)');
  results.tests.push({ name: 'Injection', status: 'FAIL' });
}

// Teste 4: Estrutura do DOM
console.log('\n🏗️  Teste 4: Analisando Estrutura do DOM...');
if (textarea) {
  let parent = textarea.parentElement;
  let level = 0;
  const domStructure = [];
  
  for (let i = 0; i < 8; i++) {
    if (parent) {
      const info = {
        level: i,
        tag: parent.tagName,
        class: parent.className.substring(0, 50),
        buttons: parent.querySelectorAll('button').length
      };
      domStructure.push(info);
      console.log(`  Nível ${i}: <${parent.tagName}> (${parent.querySelectorAll('button').length} botões)`);
      parent = parent.parentElement;
    }
  }
  results.tests.push({ name: 'DOM Structure', status: 'OK', structure: domStructure });
}

// Teste 5: Teste de Clique
console.log('\n🖱️  Teste 5: Testando Clique no Botão...');
if (potentialSendButtons.length > 0) {
  try {
    const firstPotentialButton = allButtons[potentialSendButtons[0].index];
    console.log('Clicando no botão...');
    firstPotentialButton.click();
    console.log('✅ Clique executado com sucesso');
    results.tests.push({ name: 'Click Test', status: 'OK' });
  } catch (err) {
    console.log('❌ Erro ao clicar:', err.message);
    results.tests.push({ name: 'Click Test', status: 'FAIL', error: err.message });
  }
} else {
  console.log('⚠️  Não foi possível testar (botão não encontrado)');
  results.tests.push({ name: 'Click Test', status: 'SKIPPED' });
}

// Resumo Final
console.log('\n%c========================================', 'color: #00ff00');
console.log('%c📊 RESUMO DOS TESTES', 'color: #00ff00; font-size: 14px; font-weight: bold;');
console.log('%c========================================', 'color: #00ff00');

let passed = 0;
let failed = 0;

results.tests.forEach(test => {
  const emoji = test.status === 'OK' || test.status === 'FOUND' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️ ';
  console.log(`${emoji} ${test.name}: ${test.status}`);
  if (test.status === 'OK' || test.status === 'FOUND') passed++;
  if (test.status === 'FAIL') failed++;
});

console.log('\n' + JSON.stringify(results, null, 2));

console.log('\n%c========================================', 'color: #00ff00');
if (failed === 0 && passed >= 3) {
  console.log('%c✅ TUDO FUNCIONANDO!', 'color: #00ff00; font-size: 14px; font-weight: bold;');
} else if (passed >= 2) {
  console.log('%c⚠️  Alguns problemas, mas pode funcionar', 'color: #ffff00; font-size: 14px; font-weight: bold;');
} else {
  console.log('%c❌ Problemas detectados', 'color: #ff0000; font-size: 14px; font-weight: bold;');
}
console.log('%c========================================', 'color: #00ff00');

// Exportar resultados
window.gptInterceptorTestResults = results;
console.log('\n💾 Resultados salvos em: window.gptInterceptorTestResults');
console.log('   Use: console.table(window.gptInterceptorTestResults.tests)');
console.log('   Ou: JSON.stringify(window.gptInterceptorTestResults, null, 2)');
