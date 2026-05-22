export function formatCurrencyInput(value, currencyCode = 'BRL') {
  if (value === undefined || value === null) return '';
  
  let str;
  if (typeof value === 'number') {
    str = Math.round(value * 100).toString();
  } else {
    str = String(value).replace(/\D/g, '');
  }
  
  if (str === '') return '';
  const num = parseInt(str, 10) / 100;

  const locales = {
    'BRL': 'pt-BR',
    'USD': 'en-US',
    'CAD': 'en-CA',
    'EUR': 'de-DE',
    'GBP': 'en-GB'
  };

  return num.toLocaleString(locales[currencyCode] || 'pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function parseCurrencyInput(value) {
  if (!value) return 0;
  const digits = String(value).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) / 100 : 0;
}

export function formatCurrency(value, currencyCode = 'BRL') {
  const locales = {
    'BRL': 'pt-BR',
    'USD': 'en-US',
    'CAD': 'en-CA',
    'EUR': 'de-DE',
    'GBP': 'en-GB'
  };
  
  return new Intl.NumberFormat(locales[currencyCode] || 'pt-BR', { 
    style: 'currency', 
    currency: currencyCode 
  }).format(value || 0);
}
