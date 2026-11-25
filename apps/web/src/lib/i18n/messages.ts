import { enBase } from "./en";
import { ptBRBase } from "./pt-BR";
import { specEn } from "./spec-en";
import { specPtBR } from "./spec-pt-BR";
import { settingsEn } from "./settings-en";
import { qualityEn } from "./quality-en";
import { qualityPtBR } from "./quality-pt-BR";
import { settingsPtBR } from "./settings-pt-BR";

export const en = { ...enBase, ...specEn, ...settingsEn, ...qualityEn };
export type MessageKey = keyof typeof en;
export const ptBR: Record<MessageKey, string> = { ...ptBRBase, ...specPtBR, ...settingsPtBR, ...qualityPtBR };
