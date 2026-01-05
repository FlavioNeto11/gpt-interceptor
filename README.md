# 📱 GPT Interceptor - Chrome Extension

## 🎯 Visão Geral

**GPT Interceptor** é uma extensão do Chrome que captura mensagens enviadas e respostas recebidas do ChatGPT diretamente no navegador.

```
┌─────────────────────────────────────┐
│     ChatGPT no Navegador            │
│  ┌──────────────────────────────┐   │
│  │  GPT Interceptor Extension   │   │
│  │  - Injeta mensagens         │   │
│  │  - Captura respostas        │   │
│  │  - Standalone (sem servidor)│   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
gpt-interceptor/
├── extension/
│   ├── manifest.json       - Configuração Manifest V3
│   ├── popup.html          - Interface de usuário
│   ├── popup.js            - Lógica da popup
│   ├── content.js          - Content script (injeta no ChatGPT)
│   └── background.js       - Service worker
├── setup.sh                - Script de setup
└── .gitignore              - Configuração Git
```

## ⚙️ Funcionalidades

### ✅ Content Script (`extension/content.js`)
- **Injeta mensagens** no campo de entrada do ChatGPT
- **Aguarda resposta** da IA com timeout configurável
- **Captura resposta** completa do ChatGPT
- Suporta múltiplas estratégias de seleção de botões
- Logging detalhado para debugging

### ✅ Manifest V3 (`extension/manifest.json`)
- Suporta `chatgpt.com` e `chat.openai.com`
- Permissões: `host_permissions`, `scripting`, `content_scripts`
- Service worker como background script
- Version: 3

### ✅ Popup (`extension/popup.html` + `extension/popup.js`)
- Interface simples para interação com a extensão
- Comunicação com content script via `chrome.runtime`

### ✅ Background Worker (`extension/background.js`)
- Gerencia eventos de tab
- Comunica entre popup e content script

## 🚀 Como Usar

### 1. Instalar a Extensão
1. Abra `chrome://extensions/` no Chrome
2. Ative "Modo de desenvolvedor" (canto superior direito)
3. Clique em "Carregar extensão sem empacotamento"
4. Selecione a pasta `extension/`

### 2. Usar a Extensão
1. Acesse [ChatGPT](https://chat.openai.com) ou [OpenAI Chat](https://chatgpt.com)
2. Abra a popup da extensão
3. Envie mensagens via popup - a extensão injetará no chat
4. Aguarde a resposta do GPT (timeout: 30 segundos)
5. A resposta é capturada e exibida

### 3. Verificar Logs
- Abra DevTools: `F12` → Abas Console
- Procure por logs com prefixos:
  - ✅ - Sucesso
  - 📝 - Ações
  - ❌ - Erros
  - 📨 - Mensagens recebidas
  - 🖱️  - Interações do DOM

## 🛠️ Desenvolvimento

### Requisitos
- Google Chrome/Chromium
- Sem dependências externas (0 npm packages)
- Sem servidor backend

### Estrutura do Content Script
```javascript
// content.js funciona em 4 funções principais:

1. waitAndClickSendButton()    // Aguarda e clica botão
2. injectMessage()              // Injeta texto no chat
3. sendMessageToGPT()           // Coordena envio
4. captureGPTResponse()         // Aguarda e captura resposta
```

## 🔍 Debugging

### Habilitar Logs Detalhados
1. Abra `extension/content.js`
2. Todos os `console.log()` já estão habilitados
3. Abra DevTools na página do ChatGPT: `F12`
4. Aba "Console" mostra todos os eventos

### Erros Comuns

| Erro | Solução |
|------|----------|
| "Botão não encontrado" | ChatGPT pode ter mudado seletor. Verificar DOM em DevTools |
| "Timeout aguardando resposta" | Aumentar timeout em `captureGPTResponse(30000)` |
| Extensão não carrega | Verificar manifest.json, recarregar em `chrome://extensions/` |

## 🔐 Permissões Necessárias

```json
{
  "permissions": ["runtime", "tabs", "webNavigation"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*"
  ]
}
```

## 📚 Referências

- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Runtime API](https://developer.chrome.com/docs/extensions/reference/runtime/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

## ✨ Próximos Passos (Opcional)

- [ ] Adicionar interface gráfica melhorada
- [ ] Suporte a histórico de mensagens
- [ ] Exportar conversas (JSON/PDF)
- [ ] Configurações avançadas (timeouts, seletores customizados)

---

**Última atualização**: Janeiro 2026  
**Status**: ✅ Funcional e Standalone (sem dependências de servidor)
