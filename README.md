# Du Doces Distribuidora - E-commerce

E-commerce completo para Du Doces Distribuidora com frontend responsivo, backend Node.js/Express, sistema de pagamento PIX, e integração com ChatVolt AI.

## 🚀 Funcionalidades

- **Frontend Responsivo**: Design moderno com tema escuro e vermelho como cor primária
- **Banner Carousel**: Autoplay com navegação por setas e dots
- **Filtros**: Por categoria (Bebidas, Salgadinhos, Chocolates, Utilidades) e marcas
- **Carrinho**: Persistência via localStorage, soma total, controle de quantidade
- **Autenticação**: Login/Cadastro com JWT
- **Pagamento PIX**: Simulação com QR Code e confirmação automática
- **Chat IA**: Integração com ChatVolt para suporte ao cliente
- **Admin Panel**: Gerenciamento de produtos e pedidos

## 📁 Estrutura do Projeto

```
├── index.html          # Página principal (SPA)
├── style.css           # Estilos CSS
├── app.js             # Lógica do frontend
├── server.js          # Backend Node.js/Express
├── config.js          # Configurações (API, ChatVolt)
├── package.json       # Dependências Node.js
├── vercel.json        # Configuração Vercel
└── README.md          # Documentação
```

## 🛠️ Tecnologias

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- SPA com roteamento via hash
- localStorage para persistência
- Design responsivo

### Backend
- Node.js + Express
- SQLite para banco de dados
- JWT para autenticação
- QR Code para PIX
- CORS habilitado

## 🚀 Deploy no Railway

### Passo a Passo Completo

1. **Preparação do Projeto**
   - O projeto já está configurado com `railway.json` e `.gitignore`
   - Todas as dependências estão no `package.json`
   - O código está otimizado para produção

2. **Deploy no Railway**
   - Acesse [Railway.app](https://railway.app)
   - Faça login com sua conta GitHub
   - Clique em "New Project" → "Deploy from GitHub repo"
   - Selecione este repositório
   - O Railway detectará automaticamente o Node.js

3. **Configuração de Variáveis de Ambiente**
   - No dashboard do Railway, vá em "Variables"
   - Adicione a variável:
     - `JWT_SECRET`: Uma chave secreta forte (ex: "sua-chave-super-secreta-123")
   - A variável `PORT` é definida automaticamente pelo Railway

4. **Deploy Automático**
   - O Railway fará o build e deploy automaticamente
   - O frontend e backend serão servidos da mesma URL
   - Acesse a URL fornecida pelo Railway

### ✅ Verificação Pós-Deploy
- Acesse `/health` para verificar se a API está funcionando
- Teste o carrinho e sistema de pagamento
- Verifique se o ChatVolt está funcionando

## 📱 Uso

### Produtos
- Visualize produtos com filtros por categoria e marca
- Busque produtos pelo nome ou marca
- Adicione produtos ao carrinho

### Carrinho
- Controle quantidade com botões +/-
- Remova produtos
- Visualize total
- Persistência no localStorage

### Checkout
- Faça login ou cadastre-se
- Preencha endereço de entrega
- Gere pagamento PIX
- Escaneie QR Code
- Confirmação automática após 20s

### Chat IA
- Botão flutuante no canto inferior direito
- Integração com ChatVolt
- Suporte ao cliente 24/7

## 🔧 Configuração

### ChatVolt
1. Obtenha sua chave API em [ChatVolt](https://chatvolt.ai)
2. Configure no `config.js`:
```javascript
CHATVOLT_KEY: "sua-chave-aqui"
```

### API Backend
1. O `config.js` está configurado para usar automaticamente o domínio atual
2. Não é necessário alterar nada após o deploy no Railway

## 🧪 Testando Localmente

### Backend
```bash
npm install
npm run dev
```

### Frontend
Abra `index.html` no navegador ou use um servidor local.

## 📋 Rotas da API

- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Produto específico
- `POST /api/login` - Login
- `POST /api/signup` - Cadastro
- `POST /api/orders` - Criar pedido
- `POST /api/payments/pix` - Gerar PIX
- `GET /api/payments/status/:id` - Status do pagamento
- `GET /api/orders/:userId` - Pedidos do usuário

## 🎨 Design

- **Tema**: Escuro por padrão
- **Cor primária**: Vermelho (#C62828)
- **Responsivo**: Mobile-first
- **Tipografia**: System fonts
- **Componentes**: Cards, botões, inputs estilizados

## 🔐 Segurança

- Senhas hasheadas com bcrypt
- JWT para autenticação
- CORS configurado
- Validação de entrada
- Sanitização de dados

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o projeto, entre em contato via ChatVolt ou abra uma issue no repositório.
