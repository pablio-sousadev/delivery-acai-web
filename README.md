# 🍧 Açaí da Hora — Frontend Web

Cardápio interativo e sistema de pedidos online direto para delivery via WhatsApp. Desenvolvido em **React 18** com **Vite 5**, responsivo para smartphones e otimizado para carregamento instantâneo.

---

## 🚀 Como Hospedar na Vercel

1. Acesse seu painel na [Vercel](https://vercel.com).
2. Clique em **Add New... > Project**.
3. Importe este repositório (`delivery-acai-web`).
4. A Vercel detectará automaticamente as configurações através do `vercel.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. *(Opcional)* Em **Environment Variables**, configure:
   - `VITE_API_URL`: URL do seu backend Fastify (ex: `https://seu-backend.onrender.com` ou similar). Se estiver em teste local, pode deixar vazio.
   - `VITE_WHATSAPP`: Número da loja com DDD para receber os pedidos (ex: `5561995610630`).
   - `VITE_PIX_CHAVE`: Chave Pix exibida no checkout.
6. Clique em **Deploy**! Em menos de 1 minuto seu cardápio estará online.

---

## 🛠️ Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor local
npm run dev
```

Acesse em: `http://localhost:5173`

Para gerar a build de produção:
```bash
npm run build
```

---

## 📁 Estrutura de Arquivos

```
├── public/                 # Imagens reais do cardápio, logo e miniaturas dos produtos
│   ├── cardapio-1.jpg      # Cardápio oficial: Açaí Tradicional
│   ├── cardapio-2.jpg      # Cardápio oficial: Açaí com Mousse de Maracujá
│   ├── cardapio-3.jpg      # Catálogo oficial: Polpas de Fruta
│   ├── items/              # Fotos reais dos copos, acompanhamentos e polpas
│   └── logo.jpg            # Logomarca oficial Açaí da Hora
├── src/
│   ├── App.tsx             # Aplicação principal (tabs, montador de açaí, carrinho, checkout)
│   ├── catalog.json        # Catálogo sincronizado com preços e opções
│   ├── lib.ts              # Utilitários, regras de frete e tipos
│   ├── styles.css          # Design system com cores oficiais da loja
│   └── main.tsx            # Ponto de entrada React
├── vercel.json             # Configuração para deploy direto na Vercel com SPA rewrites
└── vite.config.ts          # Configuração do Vite + React plugin
```

---

## 📱 Funcionalidades

- **Seletor de Categoria:** Alterna facilmente entre *Açaí Tradicional* e *Açaí com Mousse de Maracujá*.
- **Acompanhamentos Grátis:** Limite visual de até 5 inclusos com fotos reais dos ingredientes.
- **Catálogo de Polpas:** 14 sabores 100% naturais com compra avulsa ou pacote econômico de 10 unidades.
- **Cálculo de Frete:**
  - *No Condomínio (São Francisco):* Grátis
  - *Fora do Condomínio:* Taxa fixa de R$ 4,00
  - *Retirada no Local:* Grátis
- **Comanda Formatada no WhatsApp:** O cliente clica em "Acompanhar Pedido no WhatsApp" e envia a comanda já preenchida e formatada diretamente para a loja.
