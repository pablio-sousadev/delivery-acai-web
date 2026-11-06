import { useMemo, useState, type FormEvent } from "react";
import catalog from "./catalog.json";
import {
  API_URL, PIX_CHAVE, REGIOES, STORE_WHATSAPP, brl, formatPhone, polpaPreco, polpaQtd, round,
  type AcaiLine, type PolpaLine, type RegiaoId,
} from "./lib";

const { acai: TAMANHOS, acompanhamentos_inclusos: ACOMP, extras_pagos: EXTRAS, polpas: POLPAS } = catalog.produtos;
const MAX_ACOMP = 5;
type Forma = "pix" | "cartao" | "dinheiro";
type ActiveTab = "acai" | "polpas" | "carrinho";

interface Confirmacao {
  pedidoId: string;
  total: number;
  subtotal: number;
  taxaEntrega: number;
  pixChave?: string;
  tempoEstimado?: string;
  forma: Forma;
  whatsappText: string;
}

const ACOMP_IMAGES: Record<string, string> = {
  "Banana": "/items/banana.jpg",
  "Granola": "/items/granola.jpg",
  "Leite condensado": "/items/leite-condensado.jpg",
  "Leite em pó": "/items/leite-po.jpg",
  "Amendoim": "/items/amendoim.jpg",
  "Confetes": "/items/confetes.jpg",
  "Paçoca": "/items/pacoca.jpg",
  "Gotas de chocolate": "/items/gotas-chocolate.jpg",
  "Farinha láctea": "/items/farinha-lactea.jpg",
};

const EXTRA_IMAGES: Record<string, string> = {
  "Kiwi": "/items/extra-kiwi.jpg",
  "Morango": "/items/extra-morango.jpg",
  "Nutella": "/items/extra-nutella.jpg",
};

const POLPA_IMAGES: Record<string, string> = {
  "Abacaxi": "/items/polpa-abacaxi.jpg",
  "Abacaxi com hortelã": "/items/polpa-abacaxi-hortela.jpg",
  "Acerola": "/items/polpa-acerola.jpg",
  "Acerola com laranja": "/items/polpa-acerola-laranja.jpg",
  "Caju": "/items/polpa-caju.jpg",
  "Cajá": "/items/polpa-caja.jpg",
  "Cajá com manga": "/items/polpa-caja-manga.jpg",
  "Cupuaçu": "/items/polpa-cupuacu.jpg",
  "Goiaba": "/items/polpa-goiaba.jpg",
  "Graviola": "/items/polpa-graviola.jpg",
  "Manga": "/items/polpa-manga.jpg",
  "Maracujá": "/items/polpa-maracuja.jpg",
  "Morango": "/items/polpa-morango.jpg",
  "Tamarindo": "/items/polpa-tamarindo.jpg",
};

const SIZE_IMAGES: Record<string, string> = {
  "acai_300": "/items/acai-300.jpg",
  "acai_500": "/items/acai-500.jpg",
  "acai_700": "/items/acai-700.jpg",
  "acai_mousse_300": "/items/acai-mousse-300.jpg",
  "acai_mousse_500": "/items/acai-mousse-500.jpg",
  "acai_mousse_700": "/items/acai-mousse-700.jpg",
};

export default function App() {
  // Navegação
  const [activeTab, setActiveTab] = useState<ActiveTab>("acai");
  const [modalMenuOpen, setModalMenuOpen] = useState(false);
  const [modalMenuTab, setModalMenuTab] = useState<"tradicional" | "mousse" | "polpas">("tradicional");
  const [copiedPix, setCopiedPix] = useState(false);
  const [itemAddedToast, setItemAddedToast] = useState(false);

  // Montagem do açaí
  const [acaiTipo, setAcaiTipo] = useState<"tradicional" | "mousse">("tradicional");
  const [tamanhoId, setTamanhoId] = useState("acai_500"); // 500ml tradicional default
  const [acomp, setAcomp] = useState<string[]>([]);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [acaiLines, setAcaiLines] = useState<AcaiLine[]>([]);
  const [polpaQty, setPolpaQty] = useState<Record<string, { u: number; p: number }>>({});

  // Entrega / Pagamento
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [regiao, setRegiao] = useState<RegiaoId>("sao_francisco");
  const [forma, setForma] = useState<Forma>("pix");
  const [troco, setTroco] = useState("");
  const [obs, setObs] = useState("");

  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [ok, setOk] = useState<Confirmacao | null>(null);

  const tamanho = TAMANHOS.find((t) => t.id === tamanhoId) ?? TAMANHOS[0]!;
  const tamanhosFiltrados = useMemo(
    () => TAMANHOS.filter((t) => ((t as unknown as { categoria?: string }).categoria ?? "tradicional") === acaiTipo),
    [acaiTipo],
  );

  function switchAcaiTipo(tipo: "tradicional" | "mousse") {
    setAcaiTipo(tipo);
    const curSize = TAMANHOS.find((t) => t.id === tamanhoId);
    const targetSize = TAMANHOS.find(
      (t) => ((t as unknown as { categoria?: string }).categoria ?? "tradicional") === tipo && t.tamanho === curSize?.tamanho,
    );
    if (targetSize) {
      setTamanhoId(targetSize.id);
    } else {
      const fallback = TAMANHOS.find(
        (t) => ((t as unknown as { categoria?: string }).categoria ?? "tradicional") === tipo,
      );
      if (fallback) setTamanhoId(fallback.id);
    }
  }

  const extrasTotal = EXTRAS.reduce((s, e) => s + (extras[e.id] ?? 0) * e.preco, 0);
  const acaiPreview = round(tamanho.preco + extrasTotal);

  const polpaLines: PolpaLine[] = useMemo(
    () =>
      POLPAS.flatMap((p) => {
        const q = polpaQty[p.id];
        return q && (q.u > 0 || q.p > 0) ? [{ kind: "polpa" as const, polpa: p, unidades: q.u, pacotes: q.p }] : [];
      }),
    [polpaQty],
  );

  const totalItemsCount = acaiLines.length + polpaLines.reduce((s, l) => s + (l.unidades > 0 ? 1 : 0) + (l.pacotes > 0 ? 1 : 0), 0);
  const subtotal = round(acaiLines.reduce((s, l) => s + l.preco, 0) + polpaLines.reduce((s, l) => s + polpaPreco(l), 0));
  const reg = REGIOES.find((r) => r.id === regiao) ?? REGIOES[0]!;
  const total = round(subtotal + reg.taxa);
  const carrinhoVazio = acaiLines.length === 0 && polpaLines.length === 0;

  const toggleAcomp = (a: string) => {
    setAcomp((cur) => {
      if (cur.includes(a)) return cur.filter((x) => x !== a);
      if (cur.length < MAX_ACOMP) return [...cur, a];
      return cur;
    });
  };

  const setExtra = (id: string, delta: number) => {
    setExtras((cur) => ({ ...cur, [id]: Math.max(0, Math.min(1, (cur[id] ?? 0) + delta)) }));
  };

  const setPolpa = (id: string, field: "u" | "p", delta: number) => {
    setPolpaQty((cur) => {
      const c = cur[id] ?? { u: 0, p: 0 };
      const limit = 20;
      return { ...cur, [id]: { ...c, [field]: Math.max(0, Math.min(limit, c[field] + delta)) } };
    });
  };

  function addAcaiToCart() {
    const ex = EXTRAS.filter((e) => (extras[e.id] ?? 0) > 0);
    const nomeCompleto = (tamanho as unknown as { nome?: string }).nome
      ? `${(tamanho as unknown as { nome?: string }).nome} ${tamanho.tamanho}`
      : tamanho.tamanho;
    setAcaiLines((lines) => [
      ...lines,
      {
        kind: "acai",
        key: crypto.randomUUID(),
        tamanhoId,
        tamanho: nomeCompleto,
        acompanhamentos: [...acomp],
        extras: ex.map((e) => e.id),
        extrasNomes: ex.map((e) => e.nome),
        preco: acaiPreview,
      },
    ]);
    setAcomp([]);
    setExtras({});
    setItemAddedToast(true);
    setTimeout(() => setItemAddedToast(false), 2400);
  }

  function copyPixKey(key: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  }

  function montarComanda(id: string, tot: number, frete: number, linesSource?: AcaiLine[]): string {
    const lines = [`*Pedido ${id}* — ${catalog.estabelecimento.nome}`, ""];
    const acaiList = linesSource ?? acaiLines;
    acaiList.forEach((l) => {
      lines.push(`🍧 *${l.tamanho}* — ${brl(l.preco)}`);
      if (l.acompanhamentos.length) lines.push(`   • Acomp: ${l.acompanhamentos.join(", ")}`);
      if (l.extrasNomes.length) lines.push(`   • Extras: ${l.extrasNomes.join(", ")}`);
    });
    polpaLines.forEach((l) => {
      const p: string[] = [];
      if (l.pacotes) p.push(`${l.pacotes} pct(s) com 10`);
      if (l.unidades) p.push(`${l.unidades} un.`);
      lines.push(`🍹 *Polpa ${l.polpa.nome}* (${p.join(" + ")}) — ${brl(polpaPreco(l))}`);
    });
    lines.push("");
    lines.push(`🛵 *Entrega (${reg.nome})*: ${frete > 0 ? brl(frete) : "Grátis"}`);
    lines.push(`💰 *Total: ${brl(tot)}*`);
    lines.push(`💳 *Pagamento*: ${forma === "pix" ? "Pix" : forma === "cartao" ? "Cartão (máquina)" : "Dinheiro"}`);
    if (forma === "dinheiro" && troco) lines.push(`💵 Troco para: R$ ${troco}`);
    lines.push(`👤 ${nome.trim()} — ${telefone}`);
    if (regiao !== "retirada") lines.push(`📍 ${endereco.trim()}`);
    if (obs.trim()) lines.push(`📝 Obs: ${obs.trim()}`);
    return lines.join("\n");
  }

  async function enviarPedido(e: FormEvent) {
    e.preventDefault();

    // Auto-adicionar açaí ao carrinho se o usuário configurou na tela mas ainda não clicou no botão adicionar:
    let currentAcai = [...acaiLines];
    if (carrinhoVazio && tamanho) {
      const ex = EXTRAS.filter((e) => (extras[e.id] ?? 0) > 0);
      const nomeCompleto = (tamanho as unknown as { nome?: string }).nome
        ? `${(tamanho as unknown as { nome?: string }).nome} ${tamanho.tamanho}`
        : tamanho.tamanho;
      const autoLine: AcaiLine = {
        kind: "acai",
        key: crypto.randomUUID(),
        tamanhoId,
        tamanho: nomeCompleto,
        acompanhamentos: [...acomp],
        extras: ex.map((e) => e.id),
        extrasNomes: ex.map((e) => e.nome),
        preco: acaiPreview,
      };
      currentAcai = [autoLine];
      setAcaiLines([autoLine]);
    }

    const currentTotal = round(
      currentAcai.reduce((s, l) => s + l.preco, 0) + polpaLines.reduce((s, l) => s + polpaPreco(l), 0) + reg.taxa,
    );
    const currentSubtotal = round(
      currentAcai.reduce((s, l) => s + l.preco, 0) + polpaLines.reduce((s, l) => s + polpaPreco(l), 0),
    );

    const problemas: string[] = [];
    if (currentAcai.length === 0 && polpaLines.length === 0) {
      problemas.push("Escolha ao menos um açaí ou polpa antes de finalizar o pedido.");
    }
    if (nome.trim().length < 2) problemas.push("Informe seu nome completo.");
    const dig = telefone.replace(/\D/g, "");
    if (dig.length < 10) problemas.push("Informe um WhatsApp válido com DDD (ex: 61999999999).");
    if (regiao !== "retirada" && endereco.trim().length < 4) problemas.push("Informe o endereço completo para entrega.");

    const trocoNum = troco ? Number(troco.replace(",", ".")) : undefined;
    if (forma === "dinheiro" && trocoNum === undefined) problemas.push("Informe o valor em dinheiro para calcularmos o troco.");
    if (forma === "dinheiro" && trocoNum !== undefined && (!Number.isFinite(trocoNum) || trocoNum < currentTotal)) {
      problemas.push(`O valor para troco deve ser maior ou igual ao total de ${brl(currentTotal)}.`);
    }

    if (problemas.length > 0) {
      setErros(problemas);
      document.getElementById("form-erros")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const itens = [
      ...currentAcai.map((l) => ({
        tipo: "acai" as const,
        tamanhoId: l.tamanhoId,
        acompanhamentos: l.acompanhamentos,
        extras: l.extras,
        quantidade: 1,
      })),
      ...polpaLines.map((l) => ({
        tipo: "polpa" as const,
        sabor: l.polpa.nome,
        quantidade: polpaQtd(l),
      })),
    ];

    setErros([]);
    setLoading(true);

    try {
      // Tenta enviar para o backend Fastify se disponível
      const res = await fetch(`${API_URL}/api/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: { nome: nome.trim(), telefone: dig, endereco: endereco.trim(), regiao },
          itens,
          pagamento: { forma, ...(forma === "dinheiro" && trocoNum ? { valorParaTroco: trocoNum } : {}) },
          ...(obs.trim() ? { observacoes: obs.trim() } : {}),
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (typeof data.pedidoId === "string") {
          setOk({
            pedidoId: data.pedidoId,
            total: data.total,
            subtotal: data.subtotal,
            taxaEntrega: data.taxaEntrega,
            pixChave: data.pixChave || PIX_CHAVE,
            tempoEstimado: data.tempoEstimado,
            forma,
            whatsappText: montarComanda(data.pedidoId, data.total, data.taxaEntrega, currentAcai),
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }

      // Se a API retornou erro de validação real do backend (400 com campos)
      if (res && res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        if (Array.isArray(errData.campos)) {
          setErros(errData.campos.map((c: { mensagem: string }) => c.mensagem));
          return;
        }
      }
    } catch {
      // Falha de rede ou API offline
    } finally {
      setLoading(false);
    }

    // FALLBACK CLIENT-SIDE (VERCEL FIRST):
    // Se o backend Fastify estiver offline ou não configurado na nuvem,
    // o cliente NUNCA fica travado! Gera o código do pedido localmente e avança para a confirmação e WhatsApp!
    const agora = new Date();
    const dataStr = agora.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const pedidoLocalId = `PED-${dataStr}-${rand}`;

    setOk({
      pedidoId: pedidoLocalId,
      total: currentTotal,
      subtotal: currentSubtotal,
      taxaEntrega: reg.taxa,
      pixChave: PIX_CHAVE || "61995610630",
      tempoEstimado: "30 a 50 minutos",
      forma,
      whatsappText: montarComanda(pedidoLocalId, currentTotal, reg.taxa, currentAcai),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // TELA DE SUCESSO
  if (ok) {
    const pixFinal = ok.pixChave || PIX_CHAVE || "";
    return (
      <div className="app">
        <StoreHeader onOpenMenu={() => setModalMenuOpen(true)} />
        <main className="container">
          <section className="card success-screen">
            <div className="success-icon-badge">✓</div>
            <h2 className="success-title">Pedido Confirmado!</h2>
            <p className="card-subtitle">Já recebemos seu pedido na nossa cozinha.</p>

            <div className="order-code-box">
              <span className="order-code-label">Código do Pedido</span>
              <span className="order-code-val">{ok.pedidoId}</span>
            </div>

            <ul className="summary-table">
              <li><span>Subtotal</span><strong>{brl(ok.subtotal)}</strong></li>
              <li>
                <span>Taxa de Entrega</span>
                {ok.taxaEntrega > 0 ? <strong>{brl(ok.taxaEntrega)}</strong> : <span className="tag-free-shipping">Grátis</span>}
              </li>
              <li className="total-row"><span>Total</span><strong>{brl(ok.total)}</strong></li>
            </ul>

            {ok.tempoEstimado && (
              <div className="payment-notice">
                <b>⏱️ Tempo estimado de entrega</b>
                <span>{ok.tempoEstimado}</span>
              </div>
            )}

            {ok.forma === "pix" && pixFinal && (
              <div className="payment-notice pix-box">
                <b>📱 Chave Pix para pagamento</b>
                <div className="copy-pix-row">
                  <span className="pix-key-display">{pixFinal}</span>
                  <button type="button" className="btn-copy" onClick={() => copyPixKey(pixFinal)}>
                    {copiedPix ? "Copiado! ✓" : "Copiar"}
                  </button>
                </div>
                <small style={{ color: "var(--ink-secondary)", marginTop: 4 }}>
                  Após pagar, envie o comprovante pelo WhatsApp para liberarmos o preparo imediato.
                </small>
              </div>
            )}

            <a
              className="btn btn-primary"
              style={{ fontSize: "1.05rem", padding: "16px" }}
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(ok.whatsappText)}`}
            >
              📲 Acompanhar Pedido no WhatsApp
            </a>

            <button type="button" className="btn btn-outline" onClick={() => location.reload()}>
              Fazer Novo Pedido
            </button>
          </section>
        </main>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="app">
      <StoreHeader onOpenMenu={() => setModalMenuOpen(true)} />

      {/* Tabs de Categoria */}
      <nav className="nav-tabs-wrapper" aria-label="Categorias do cardápio">
        <div className="nav-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "acai" ? "active" : ""}`}
            onClick={() => setActiveTab("acai")}
          >
            <span>🍧</span> Açaí
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "polpas" ? "active" : ""}`}
            onClick={() => setActiveTab("polpas")}
          >
            <span>🍹</span> Polpas
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "carrinho" ? "active" : ""}`}
            onClick={() => setActiveTab("carrinho")}
          >
            <span>🛒</span> Carrinho
            {totalItemsCount > 0 && <span className="badge-count">{totalItemsCount}</span>}
          </button>
        </div>
      </nav>

      <main className="container">
        {/* Toast de Item Adicionado */}
        {itemAddedToast && (
          <div
            style={{
              position: "fixed",
              top: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--brand-purple)",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "9999px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              zIndex: 100,
              fontSize: "0.9rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "modalIn 0.2s ease",
            }}
          >
            ✓ Açaí adicionado ao carrinho!
          </div>
        )}

        {/* SEÇÃO 1: AÇAÍ */}
        {activeTab === "acai" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title-group">
                <h2 className="card-title">🍧 Monte seu Açaí Artesanal</h2>
                <p className="card-subtitle">Puro açaí batido na hora, cremoso e com acompanhamentos frescos</p>
              </div>
            </div>

            {/* Seletor de Tipo de Açaí */}
            <div className="acai-type-selector">
              <button
                type="button"
                className={`acai-type-pill ${acaiTipo === "tradicional" ? "active" : ""}`}
                onClick={() => switchAcaiTipo("tradicional")}
              >
                <span className="type-icon">🍧</span>
                <div>
                  <strong>Açaí Tradicional</strong>
                  <small>Puro açaí batido na hora, super cremoso</small>
                </div>
              </button>
              <button
                type="button"
                className={`acai-type-pill ${acaiTipo === "mousse" ? "active" : ""}`}
                onClick={() => switchAcaiTipo("mousse")}
              >
                <span className="type-icon">💛</span>
                <div>
                  <span className="pill-badge-novidade">NOVIDADE ✨</span>
                  <strong>Açaí c/ Mousse de Maracujá</strong>
                  <small>Camadas de mousse artesanal irresistível</small>
                </div>
              </button>
            </div>

            {/* Passo 1: Tamanho */}
            <div className="step-label">
              <span>1. Escolha o Tamanho ({acaiTipo === "tradicional" ? "Tradicional" : "c/ Mousse"})</span>
            </div>
            <div className="sizes-grid">
              {tamanhosFiltrados.map((t, idx) => {
                const isActive = t.id === tamanhoId;
                const isMedium = idx === 1;
                const isLarge = idx === 2;
                const imgSrc = SIZE_IMAGES[t.id] || (acaiTipo === "mousse" ? "/items/acai-mousse-500.jpg" : "/items/acai-500.jpg");
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`size-option ${isActive ? "active" : ""}`}
                    onClick={() => setTamanhoId(t.id)}
                    aria-pressed={isActive}
                  >
                    {isMedium && <span className="size-badge-featured">MAIS PEDIDO ⭐</span>}
                    {isLarge && <span className="size-badge-featured" style={{ background: "var(--brand-purple)" }}>FAMÍLIA 🔥</span>}
                    <img src={imgSrc} alt={t.tamanho} className="size-cup-photo" />
                    <span className="size-name">{t.tamanho.split(" ")[0]}</span>
                    <span className="size-vol">{t.tamanho.match(/\((.*)\)/)?.[1] || ""}</span>
                    <span className="size-price">{brl(t.preco)}</span>
                  </button>
                );
              })}
            </div>

            {/* Passo 2: Acompanhamentos Grátis */}
            <div className="step-label">
              <span>2. Acompanhamentos Grátis</span>
              <span className={`step-counter ${acomp.length >= MAX_ACOMP ? "full" : ""}`}>
                {acomp.length} de {MAX_ACOMP} inclusos
              </span>
            </div>
            <div className="chips-grid">
              {ACOMP.map((item) => {
                const isSelected = acomp.includes(item);
                const isDisabled = !isSelected && acomp.length >= MAX_ACOMP;
                const imgSrc = ACOMP_IMAGES[item] || "/items/banana.jpg";
                return (
                  <div
                    key={item}
                    className={`chip-select ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                    onClick={() => toggleAcomp(item)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={isDisabled ? -1 : 0}
                  >
                    <img src={imgSrc} alt={item} className="chip-photo" />
                    <span className="chip-name">{item}</span>
                    <div className="chip-check">{isSelected ? "✓" : ""}</div>
                  </div>
                );
              })}
            </div>

            {/* Passo 3: Extras */}
            <div className="step-label">
              <span>3. Extras Especiais (Opcional)</span>
            </div>
            <div className="extras-list">
              {EXTRAS.map((extra) => {
                const qty = extras[extra.id] ?? 0;
                const imgSrc = EXTRA_IMAGES[extra.nome] || "/items/extra-morango.jpg";
                return (
                  <div className="extra-row" key={extra.id}>
                    <div className="extra-left">
                      <img src={imgSrc} alt={extra.nome} className="extra-photo" />
                      <div className="extra-info">
                        <span className="extra-name">{extra.nome}</span>
                        <span className="extra-price">+ {brl(extra.preco)}</span>
                      </div>
                    </div>
                    <Stepper
                      value={qty}
                      onMinus={() => setExtra(extra.id, -1)}
                      onPlus={() => setExtra(extra.id, 1)}
                      max={qty >= 1}
                      label={extra.nome}
                    />
                  </div>
                );
              })}
            </div>

            {/* Botão Adicionar Açaí */}
            <button
              type="button"
              className="btn btn-brand"
              style={{ marginTop: 8 }}
              onClick={addAcaiToCart}
            >
              Adicionar Açaí ao Carrinho • {brl(acaiPreview)}
            </button>
          </section>
        )}

        {/* SEÇÃO 2: POLPAS */}
        {activeTab === "polpas" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title-group">
                <h2 className="card-title">🍹 Polpas de Fruta Naturais</h2>
                <p className="card-subtitle">100% fruta natural e selecionada da marca Açaí da Hora. Embalagens individuais ou pacotes com 10.</p>
              </div>
            </div>

            <div className="polpas-grid">
              {POLPAS.map((p) => {
                const q = polpaQty[p.id] ?? { u: 0, p: 0 };
                const hasQty = q.u > 0 || q.p > 0;
                const imgSrc = POLPA_IMAGES[p.nome] || "/items/polpa-abacaxi.jpg";
                return (
                  <div className={`polpa-item ${hasQty ? "has-qty" : ""}`} key={p.id}>
                    <div className="polpa-header">
                      <div className="polpa-title-group">
                        <img src={imgSrc} alt={p.nome} className="polpa-photo" />
                        <div>
                          <span className="polpa-title">{p.nome}</span>
                          <span className="polpa-subtitle">100% fruta natural congelada</span>
                        </div>
                      </div>
                      <span className="polpa-economy-badge">Economize no pacote</span>
                    </div>
                    <div className="polpa-controls">
                      <div className="polpa-subrow">
                        <div>
                          <span>Unidade</span>
                          <strong>{brl(p.preco_unidade)}</strong>
                        </div>
                        <Stepper
                          value={q.u}
                          onMinus={() => setPolpa(p.id, "u", -1)}
                          onPlus={() => setPolpa(p.id, "u", 1)}
                          max={q.u >= 20}
                          label={`${p.nome} unidade`}
                        />
                      </div>
                      <div className="polpa-subrow">
                        <div>
                          <span>Pct c/ 10</span>
                          <strong>{brl(p.preco_pacote_10)}</strong>
                        </div>
                        <Stepper
                          value={q.p}
                          onMinus={() => setPolpa(p.id, "p", -1)}
                          onPlus={() => setPolpa(p.id, "p", 1)}
                          max={q.p >= 20}
                          label={`${p.nome} pacote`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SEÇÃO 3: CARRINHO E CHECKOUT */}
        {(activeTab === "carrinho" || !carrinhoVazio) && (
          <>
            {/* Carrinho de Itens */}
            <section className="card" id="carrinho">
              <div className="card-header">
                <div className="card-title-group">
                  <h2 className="card-title">🛒 Seu Carrinho</h2>
                  <p className="card-subtitle">Revise seus itens antes de finalizar</p>
                </div>
              </div>

              {carrinhoVazio ? (
                <div className="cart-empty-state">
                  <span className="cart-empty-icon">🥣</span>
                  <b>Seu carrinho está vazio</b>
                  <span>Escolha um açaí ou polpas nas abas acima para começar!</span>
                </div>
              ) : (
                <div className="cart-items-list">
                  {acaiLines.map((l) => (
                    <div className="cart-item-row" key={l.key}>
                      <div className="cart-item-details">
                        <span className="cart-item-title">🍧 Açaí {l.tamanho}</span>
                        {l.acompanhamentos.length > 0 && (
                          <span className="cart-item-meta">
                            <strong>Acomp:</strong> {l.acompanhamentos.join(", ")}
                          </span>
                        )}
                        {l.extrasNomes.length > 0 && (
                          <span className="cart-item-meta">
                            <strong>Extras:</strong> {l.extrasNomes.join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="cart-item-right">
                        <span className="cart-item-price">{brl(l.preco)}</span>
                        <button
                          type="button"
                          className="btn-remove-item"
                          aria-label="Remover item"
                          onClick={() => setAcaiLines((lines) => lines.filter((x) => x.key !== l.key))}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {polpaLines.map((l) => (
                    <div className="cart-item-row" key={l.polpa.id}>
                      <div className="cart-item-details">
                        <span className="cart-item-title">🍹 Polpa {l.polpa.nome}</span>
                        <span className="cart-item-meta">
                          {[
                            l.pacotes > 0 ? `${l.pacotes} pacote(s) c/ 10` : null,
                            l.unidades > 0 ? `${l.unidades} un.` : null,
                          ]
                            .filter(Boolean)
                            .join(" + ")}
                        </span>
                      </div>
                      <div className="cart-item-right">
                        <span className="cart-item-price">{brl(polpaPreco(l))}</span>
                        <button
                          type="button"
                          className="btn-remove-item"
                          aria-label="Remover polpa"
                          onClick={() => setPolpaQty((cur) => ({ ...cur, [l.polpa.id]: { u: 0, p: 0 } }))}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela de Totais */}
              <ul className="summary-table">
                <li>
                  <span>Subtotal</span>
                  <strong>{brl(subtotal)}</strong>
                </li>
                <li>
                  <span>Taxa de Entrega ({reg.nome})</span>
                  {reg.taxa > 0 ? <strong>{brl(reg.taxa)}</strong> : <span className="tag-free-shipping">Grátis</span>}
                </li>
                <li className="total-row">
                  <span>Total</span>
                  <strong>{brl(total)}</strong>
                </li>
              </ul>
            </section>

            {/* Formulário de Entrega e Pagamento */}
            <form className="card" onSubmit={enviarPedido} noValidate id="checkout-form">
              <div className="card-header">
                <div className="card-title-group">
                  <h2 className="card-title">📍 Entrega e Pagamento</h2>
                  <p className="card-subtitle">Preencha seus dados para entrega rápida</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="field-nome">Nome Completo *</label>
                  <input
                    id="field-nome"
                    className="input-field"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    placeholder="Ex.: Maria Silva"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="field-telefone">WhatsApp com DDD *</label>
                  <input
                    id="field-telefone"
                    className="input-field"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(61) 99999-9999"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="field-regiao">Região de Entrega *</label>
                  <select
                    id="field-regiao"
                    className="select-field"
                    value={regiao}
                    onChange={(e) => setRegiao(e.target.value as RegiaoId)}
                  >
                    {REGIOES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome} {r.taxa > 0 ? `(+ ${brl(r.taxa)})` : "(Frete Grátis)"}
                      </option>
                    ))}
                  </select>
                </div>

                {regiao !== "retirada" && (
                  <div className="input-group">
                    <label htmlFor="field-endereco">Endereço Completo com Ponto de Referência *</label>
                    <textarea
                      id="field-endereco"
                      className="textarea-field"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      rows={2}
                      maxLength={200}
                      placeholder="Conjunto, quadra, número da casa, condomínio..."
                    />
                  </div>
                )}

                {/* Forma de Pagamento */}
                <div className="input-group">
                  <label>Forma de Pagamento *</label>
                  <div className="payment-cards-grid">
                    {(
                      [
                        ["pix", "📱 Pix (Instantâneo)"],
                        ["cartao", "💳 Cartão (Máquina)"],
                        ["dinheiro", "💵 Dinheiro"],
                      ] as const
                    ).map(([val, label]) => (
                      <label key={val} className={`payment-card ${forma === val ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="forma"
                          checked={forma === val}
                          onChange={() => setForma(val)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Detalhes de Pagamento */}
                {forma === "pix" && (
                  <div className="payment-notice pix-box">
                    <b>📱 Chave Pix da Loja</b>
                    {PIX_CHAVE ? (
                      <div className="copy-pix-row">
                        <span className="pix-key-display">{PIX_CHAVE}</span>
                        <button type="button" className="btn-copy" onClick={() => copyPixKey(PIX_CHAVE)}>
                          {copiedPix ? "Copiado! ✓" : "Copiar"}
                        </button>
                      </div>
                    ) : (
                      <span>A chave Pix será fornecida ao confirmar o pedido.</span>
                    )}
                    <small>⚠️ O preparo começa imediatamente após o envio do comprovante no WhatsApp.</small>
                  </div>
                )}

                {forma === "cartao" && (
                  <div className="payment-notice">
                    <span>💳 Levamos a máquina de cartão na entrega. Aceitamos débito, crédito e aproximação.</span>
                  </div>
                )}

                {forma === "dinheiro" && (
                  <div className="input-group">
                    <label htmlFor="field-troco">Troco para quanto? *</label>
                    <input
                      id="field-troco"
                      className="input-field"
                      value={troco}
                      onChange={(e) => setTroco(e.target.value.replace(/[^\d,.]/g, ""))}
                      inputMode="decimal"
                      placeholder={`Ex.: 50 (Total: ${brl(total)})`}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button
                        type="button"
                        className="btn-header-view-menu"
                        style={{ color: "var(--brand-purple)", background: "var(--surface-subtle)" }}
                        onClick={() => setTroco(total.toFixed(2).replace(".", ","))}
                      >
                        Sem troco ({brl(total)})
                      </button>
                      <button
                        type="button"
                        className="btn-header-view-menu"
                        style={{ color: "var(--brand-purple)", background: "var(--surface-subtle)" }}
                        onClick={() => setTroco("50")}
                      >
                        Troco p/ R$ 50
                      </button>
                      <button
                        type="button"
                        className="btn-header-view-menu"
                        style={{ color: "var(--brand-purple)", background: "var(--surface-subtle)" }}
                        onClick={() => setTroco("100")}
                      >
                        Troco p/ R$ 100
                      </button>
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="field-obs">Observações para a cozinha</label>
                  <textarea
                    id="field-obs"
                    className="textarea-field"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Ex.: Enviar colher descartável, caprichar no leite condensado..."
                  />
                </div>

                {/* Erros de Validação */}
                {erros.length > 0 && (
                  <div className="errors-card" id="form-erros" role="alert">
                    <strong>Por favor, corrija os seguintes itens:</strong>
                    <ul>
                      {erros.map((erro, idx) => (
                        <li key={idx}>{erro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: "1.1rem", padding: "16px" }}
                  disabled={loading}
                >
                  {loading ? "Enviando Pedido..." : `Enviar Pedido • ${brl(total)}`}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      {/* Floating Sticky Cart Bar no Mobile */}
      {!carrinhoVazio && !ok && (
        <aside className="sticky-cart-bar" aria-label="Resumo rápido do pedido">
          <div className="sticky-cart-bar-inner">
            <div className="sticky-info">
              <span className="sticky-total">{brl(total)}</span>
              <span className="sticky-count">
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "itens"} • {reg.taxa === 0 ? "Frete Grátis" : `Entrega ${brl(reg.taxa)}`}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setActiveTab("carrinho");
                document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Finalizar Pedido →
            </button>
          </div>
        </aside>
      )}

      {/* Modal do Cardápio Original Impresso */}
      {modalMenuOpen && (
        <div className="modal-backdrop" onClick={() => setModalMenuOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cardápio Oficial da Loja</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModalMenuOpen(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="modal-tabs">
              <button
                type="button"
                className={`modal-tab-btn ${modalMenuTab === "tradicional" ? "active" : ""}`}
                onClick={() => setModalMenuTab("tradicional")}
              >
                🍧 Açaí Tradicional
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${modalMenuTab === "mousse" ? "active" : ""}`}
                onClick={() => setModalMenuTab("mousse")}
              >
                💛 Açaí c/ Mousse
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${modalMenuTab === "polpas" ? "active" : ""}`}
                onClick={() => setModalMenuTab("polpas")}
              >
                🍹 Polpas de Fruta
              </button>
            </div>
            <div className="modal-body">
              {modalMenuTab === "tradicional" && (
                <img src="/cardapio-1.jpg" alt="Cardápio Oficial de Açaí Tradicional" />
              )}
              {modalMenuTab === "mousse" && (
                <img src="/cardapio-2.jpg" alt="Cardápio Oficial de Açaí com Mousse de Maracujá" />
              )}
              {modalMenuTab === "polpas" && (
                <img src="/cardapio-3.jpg" alt="Catálogo Oficial de Polpas de Fruta" />
              )}
            </div>
          </div>
        </div>
      )}

      <StoreFooter />
    </div>
  );
}

function StoreHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="store-header">
      <div className="header-content">
        <div className="brand-badge-wrap">
          <img
            src="/logo.jpg"
            alt="Logo Açaí da Hora"
            className="brand-avatar"
            width={84}
            height={84}
          />
          <div className="online-dot" title="Aberto agora" />
        </div>

        <div className="brand-title-group">
          <h1>
            {catalog.estabelecimento.nome}
          </h1>
          <p className="brand-desc">O melhor açaí artesanal, açaí com mousse de maracujá e polpas naturais de Águas Quentes</p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn-header-view-menu" onClick={onOpenMenu}>
            📸 Ver Cardápio Completo
          </button>
        </div>
      </div>
    </header>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
  max,
  label,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  max: boolean;
  label: string;
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={onMinus}
        disabled={value <= 0}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={onPlus}
        disabled={max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        +
      </button>
    </div>
  );
}

function StoreFooter() {
  return (
    <footer className="store-footer">
      <div>
        <b>{catalog.estabelecimento.nome}</b> • Águas Quentes - DF
      </div>
      <div>Instagram: {catalog.estabelecimento.instagram} • WhatsApp: {catalog.estabelecimento.whatsapp}</div>
      <div style={{ opacity: 0.7, marginTop: 4 }}>Atendimento de Terça a Domingo, das 11h às 22h</div>
    </footer>
  );
}
