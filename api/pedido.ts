interface PedidoRequest {
  cliente: {
    nome: string;
    telefone: string;
    endereco: string;
    regiao: string;
  };
  itens: Array<{
    tipo: "acai" | "polpa";
    tamanhoId?: string;
    acompanhamentos?: string[];
    extras?: string[];
    sabor?: string;
    quantidade: number;
  }>;
  pagamento: {
    forma: "pix" | "cartao" | "dinheiro";
    valorParaTroco?: number;
  };
  observacoes?: string;
}

const CATALOG_ACAI: Record<string, { nome: string; tamanho: string; preco: number }> = {
  acai_300: { nome: "Açaí Tradicional", tamanho: "Pequeno (300ml)", preco: 14.0 },
  acai_500: { nome: "Açaí Tradicional", tamanho: "Médio (500ml)", preco: 19.0 },
  acai_700: { nome: "Açaí Tradicional", tamanho: "Grande (700ml)", preco: 25.0 },
  acai_mousse_300: { nome: "Açaí com Mousse de Maracujá", tamanho: "Pequeno (300ml)", preco: 17.0 },
  acai_mousse_500: { nome: "Açaí com Mousse de Maracujá", tamanho: "Médio (500ml)", preco: 22.0 },
  acai_mousse_700: { nome: "Açaí com Mousse de Maracujá", tamanho: "Grande (700ml)", preco: 28.0 },
};

const EXTRAS_PRECO: Record<string, { nome: string; preco: number }> = {
  extra_kiwi: { nome: "Kiwi", preco: 4.0 },
  extra_morango: { nome: "Morango", preco: 4.0 },
  extra_nutella: { nome: "Nutella", preco: 4.0 },
};

const POLPAS_PRECO: Record<string, { precoUnidade: number; precoPacote10: number }> = {
  "Abacaxi": { precoUnidade: 3.0, precoPacote10: 21.0 },
  "Abacaxi com hortelã": { precoUnidade: 3.0, precoPacote10: 21.0 },
  "Acerola": { precoUnidade: 3.0, precoPacote10: 21.0 },
  "Acerola com laranja": { precoUnidade: 3.0, precoPacote10: 21.0 },
  "Caju": { precoUnidade: 2.0, precoPacote10: 17.0 },
  "Cajá": { precoUnidade: 3.0, precoPacote10: 24.0 },
  "Cajá com manga": { precoUnidade: 2.0, precoPacote10: 14.0 },
  "Cupuaçu": { precoUnidade: 3.5, precoPacote10: 27.0 },
  "Goiaba": { precoUnidade: 2.0, precoPacote10: 14.0 },
  "Graviola": { precoUnidade: 3.0, precoPacote10: 20.0 },
  "Manga": { precoUnidade: 2.0, precoPacote10: 16.0 },
  "Maracujá": { precoUnidade: 3.5, precoPacote10: 29.0 },
  "Morango": { precoUnidade: 3.0, precoPacote10: 21.0 },
  "Tamarindo": { precoUnidade: 2.0, precoPacote10: 16.0 },
};

const TAXAS: Record<string, { nome: string; taxa: number; isRetirada: boolean }> = {
  sao_francisco: { nome: "No Condomínio (São Francisco)", taxa: 0, isRetirada: false },
  fora_condominio: { nome: "Fora do Condomínio", taxa: 4, isRetirada: false },
  retirada: { nome: "Retirada no Local", taxa: 0, isRetirada: true },
};

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function escapeHtml(text: string | undefined | null): string {
  if (text == null) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export default async function handler(req: any, res: any) {
  // Configurar CORS para permitir chamadas do frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ erro: "METODO_NAO_PERMITIDO" });
  }

  try {
    const body: PedidoRequest = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!body || !body.cliente || !body.itens) {
      return res.status(400).json({ erro: "PAYLOAD_INVALIDO" });
    }

    const { cliente, itens, pagamento, observacoes } = body;
    const regInfo = TAXAS[cliente.regiao] ?? TAXAS.fora_condominio;

    let subtotal = 0;
    const descricoesItens: string[] = [];

    for (const item of itens) {
      if (item.tipo === "acai" && item.tamanhoId) {
        const p = CATALOG_ACAI[item.tamanhoId] ?? { nome: "Açaí", tamanho: item.tamanhoId, preco: 14 };
        let itemPreco = p.preco;
        const extrasNomes: string[] = [];
        if (item.extras) {
          for (const exId of item.extras) {
            const ex = EXTRAS_PRECO[exId];
            if (ex) {
              itemPreco += ex.preco;
              extrasNomes.push(ex.nome);
            }
          }
        }
        subtotal += itemPreco * (item.quantidade || 1);

        let itemDesc = `• ${item.quantidade || 1}x ${p.nome} ${p.tamanho} — ${brl(itemPreco * (item.quantidade || 1))}`;
        if (item.acompanhamentos && item.acompanhamentos.length > 0) {
          itemDesc += `\n   <i>Acompanhamentos:</i> ${escapeHtml(item.acompanhamentos.join(", "))}`;
        }
        if (extrasNomes.length > 0) {
          itemDesc += `\n   <i>Extras:</i> ${escapeHtml(extrasNomes.join(", "))}`;
        }
        descricoesItens.push(itemDesc);
      } else if (item.tipo === "polpa" && item.sabor) {
        const p = POLPAS_PRECO[item.sabor] ?? { precoUnidade: 3.0, precoPacote10: 21.0 };
        const qtd = item.quantidade || 1;
        const pacotes = Math.floor(qtd / 10);
        const avulsas = qtd % 10;
        const polpaTotal = pacotes * p.precoPacote10 + avulsas * p.precoUnidade;
        subtotal += polpaTotal;

        const detalhes = [];
        if (pacotes > 0) detalhes.push(`${pacotes} pct(s) com 10`);
        if (avulsas > 0) detalhes.push(`${avulsas} un avulsa(s)`);
        descricoesItens.push(`• Polpa de ${escapeHtml(item.sabor)} (${detalhes.join(" + ")}) — ${brl(polpaTotal)}`);
      }
    }

    const taxaEntrega = regInfo.taxa;
    const total = Number((subtotal + taxaEntrega).toFixed(2));

    // Gerar ID do pedido no formato PED-YYYYMMDD-XXXX
    const agora = new Date();
    const dataStr = agora.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const pedidoId = `PED-${dataStr}-${rand}`;

    const digTelefone = cliente.telefone.replace(/\D/g, "");
    const zapTelefone = digTelefone.startsWith("55") ? digTelefone : `55${digTelefone}`;
    const zapLink = `https://wa.me/${zapTelefone}`;

    let formaPagtoStr = pagamento.forma.toUpperCase();
    if (pagamento.forma === "dinheiro" && pagamento.valorParaTroco) {
      const troco = pagamento.valorParaTroco - total;
      formaPagtoStr += ` (Paga com ${brl(pagamento.valorParaTroco)}, troco de ${brl(troco > 0 ? troco : 0)})`;
    }

    // Montar mensagem HTML para o Telegram
    const msgLinhas: string[] = [
      "🔔 <b>NOVO PEDIDO RECEBIDO!</b>",
      "",
      `🆔 <b>Pedido:</b> <code>${pedidoId}</code>`,
      `👤 <b>Cliente:</b> ${escapeHtml(cliente.nome)}`,
      `📱 <b>WhatsApp:</b> <a href="${zapLink}">${escapeHtml(formatPhone(digTelefone))}</a>`,
    ];

    if (regInfo.isRetirada) {
      msgLinhas.push(`🏪 <b>Tipo:</b> Retirada no Local`);
    } else {
      msgLinhas.push(`📍 <b>Endereço:</b> ${escapeHtml(cliente.endereco)}`);
      msgLinhas.push(`🛵 <b>Região:</b> ${escapeHtml(regInfo.nome)}`);
    }

    if (observacoes && observacoes.trim()) {
      msgLinhas.push(`📝 <b>Obs:</b> ${escapeHtml(observacoes.trim())}`);
    }

    msgLinhas.push("", "🛒 <b>Itens do Pedido:</b>");
    msgLinhas.push(...descricoesItens);
    msgLinhas.push("");
    msgLinhas.push(`💳 <b>Pagamento:</b> ${escapeHtml(formaPagtoStr)}`);
    msgLinhas.push(`Subtotal: ${brl(subtotal)}`);
    msgLinhas.push(`Taxa de Entrega: ${taxaEntrega === 0 ? "Grátis" : brl(taxaEntrega)}`);
    msgLinhas.push(`💰 <b>Total: ${brl(total)}</b>`);

    const telegramMessage = msgLinhas.join("\n");

    // Disparar notificação para o Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8879864964:AAESIbpP0Te9WC-5PbLkDKjLgKjCqs6uPEA";
    const chatId = process.env.TELEGRAM_CHAT_ID || "-5585609430";

    if (botToken && chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
      } catch (tgErr) {
        console.error("Erro ao enviar mensagem para Telegram:", tgErr);
      }
    }

    const pixChave = process.env.PIX_CHAVE || "08573986360";
    const tempoEstimado = process.env.TEMPO_ESTIMADO || "30 a 50 minutos";

    return res.status(200).json({
      pedidoId,
      subtotal,
      taxaEntrega,
      total,
      formaPagamento: pagamento.forma,
      pixChave,
      tempoEstimado,
    });
  } catch (err: any) {
    console.error("Erro ao processar pedido:", err);
    return res.status(500).json({ erro: "ERRO_INTERNO", detalhe: err?.message || String(err) });
  }
}
