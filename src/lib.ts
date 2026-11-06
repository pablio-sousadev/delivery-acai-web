import catalog from "./catalog.json";

export const brl = (v: number | undefined): string => `R$ ${(v ?? 0).toFixed(2).replace(".", ",")}`;
export const round = (v: number): number => Math.round(v * 100) / 100;

export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || window.location.origin).replace(/\/$/, "");
export const PIX_CHAVE = (import.meta.env.VITE_PIX_CHAVE as string | undefined) || "";
export const STORE_WHATSAPP =
  (import.meta.env.VITE_WHATSAPP as string | undefined) || `55${catalog.estabelecimento.whatsapp.replace(/\D/g, "")}`;

export const REGIOES = [
  { id: "sao_francisco", nome: "No Condomínio (São Francisco)", taxa: 0 },
  { id: "fora_condominio", nome: "Fora do Condomínio", taxa: 4 },
  { id: "retirada", nome: "Retirada no local", taxa: 0 },
] as const;
export type RegiaoId = (typeof REGIOES)[number]["id"];

export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export type Polpa = (typeof catalog.produtos.polpas)[number];
export interface AcaiLine {
  kind: "acai";
  key: string;
  tamanhoId: string;
  tamanho: string;
  acompanhamentos: string[];
  extras: string[]; // ids
  extrasNomes: string[];
  preco: number;
}
export interface PolpaLine {
  kind: "polpa";
  polpa: Polpa;
  unidades: number;
  pacotes: number;
}
export const polpaQtd = (l: PolpaLine): number => l.unidades + l.pacotes * 10;
export const polpaPreco = (l: PolpaLine): number =>
  round(l.unidades * l.polpa.preco_unidade + l.pacotes * l.polpa.preco_pacote_10);
