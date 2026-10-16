import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor: el buscador no dispara una consulta por
 * cada tecla, solo cuando el usuario deja de escribir.
 */
export function useDebouncedValue<T>(valor: T, retrasoMs: number): T {
  const [valorDiferido, setValorDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setValorDiferido(valor), retrasoMs);
    return () => window.clearTimeout(temporizador);
  }, [valor, retrasoMs]);

  return valorDiferido;
}
