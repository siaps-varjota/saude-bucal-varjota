import React from "react";
import { FonteDado } from "@/hooks/useOficialMerge";

interface FonteBadgeProps {
  fonte: FonteDado;
  className?: string;
}

/**
 * Badge que indica se o dado é oficial (verde) ou preliminar (âmbar).
 * Use dentro de MonthlyCards, QuadrimesterCards e ResultadoFinal.
 */
export const FonteBadge: React.FC<FonteBadgeProps> = ({ fonte, className = "" }) => {
  const isOficial = fonte === "oficial";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
        isOficial
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
      } ${className}`}
      title={isOficial ? "Dado oficial homologado" : "Dado preliminar extraído das tabelas"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isOficial ? "bg-green-500" : "bg-amber-500"
        }`}
      />
      {isOficial ? "Oficial" : "Preliminar"}
    </span>
  );
};
