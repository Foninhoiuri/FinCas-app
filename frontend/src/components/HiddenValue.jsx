import { useAuth } from '../context/AuthContext';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

/**
 * Exibe um valor monetário que respeita o estado global de ocultar valores.
 * Uso: <HiddenValue value={1234.56} />
 * Quando oculto, mostra "••••"
 */
export function HiddenValue({ value, prefix = '', suffix = '', className = '', decimals = 2 }) {
  const { valuesHidden, currency } = useAuth();
  
  if (valuesHidden) {
    return (
      <span className={`select-none ${className}`} aria-label="Valor oculto">
        {prefix}<span className="tracking-widest opacity-60">••••</span>{suffix}
      </span>
    );
  }

  const formatted = formatCurrencyUtil(value, currency);
  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

/**
 * Hook para obter função de formatar valores respeitando o estado de ocultar.
 */
export function useHiddenValue() {
  const { valuesHidden, currency } = useAuth();
  
  const formatHidden = (value, opts = {}) => {
    if (valuesHidden) return '••••';
    return formatCurrencyUtil(value, opts.currency || currency);
  };

  return { valuesHidden, formatHidden };
}

export default HiddenValue;
