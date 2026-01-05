#!/bin/bash
# Script de Instalação e Teste - GPT Interceptor com Servidor
# Execute: node setup.js (ou bash setup.sh em Linux/Mac)

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🚀 GPT Interceptor - Setup & Test${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}\n"

# Verificar se Node.js está instalado
echo -e "${BLUE}1️⃣  Verificando Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION} encontrado${NC}"
else
    echo -e "${RED}❌ Node.js não encontrado. Por favor, instale em: https://nodejs.org${NC}"
    exit 1
fi

# Verificar se npm está instalado
echo -e "\n${BLUE}2️⃣  Verificando npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm ${NPM_VERSION} encontrado${NC}"
else
    echo -e "${RED}❌ npm não encontrado${NC}"
    exit 1
fi

# Instalar dependências do servidor
echo -e "\n${BLUE}3️⃣  Instalando dependências do servidor...${NC}"
cd server 2>/dev/null || {
    echo -e "${RED}❌ Erro: Não conseguiu encontrar pasta 'server'${NC}"
    echo -e "${YELLOW}💡 Execute este script na raiz do projeto gpt-interceptor${NC}"
    exit 1
}

if [ -f package.json ]; then
    npm install
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
else
    echo -e "${RED}❌ Erro: package.json não encontrado${NC}"
    exit 1
fi

echo -e "\n${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ✨ Setup Completo!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}📋 Próximos Passos:${NC}\n"

echo -e "${CYAN}1️⃣  Iniciar o Servidor:${NC}"
echo -e "   ${BLUE}npm start${NC}\n"

echo -e "${CYAN}2️⃣  Em outro terminal, testar a integração:${NC}"
echo -e "   ${BLUE}npm test${NC}\n"

echo -e "${CYAN}3️⃣  No Browser:${NC}"
echo -e "   • Abrir: https://chatgpt.com"
echo -e "   • Clicar no ícone GPT Interceptor"
echo -e "   • Digitar uma mensagem"
echo -e "   • Clicar em 'Enviar'\n"

echo -e "${CYAN}4️⃣  Verificar Dados:${NC}"
echo -e "   Em outro terminal:"
echo -e "   ${BLUE}curl http://localhost:3000/api/conversations${NC}\n"

echo -e "${GREEN}✅ Tudo pronto! Boa sorte! 🚀${NC}\n"
