/**
 * Valida um CPF seguindo as regras da Receita Federal
 * @param {string} cpf - O CPF para validar (com ou sem máscara)
 * @returns {boolean} - Verdadeiro se for válido
 */
export function validateCPF(cpf) {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/[^\d]+/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Verifica CPFs com dígitos repetidos conhecidos (inválidos)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cleanCPF.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

/**
 * Aplica máscara de CPF (###.###.###-##)
 * @param {string} value 
 * @returns {string}
 */
export function formatCPF(value) {
  return value
    .replace(/\D/g, '') // substitui qualquer caracter que não seja numero por nada
    .replace(/(\d{3})(\d)/, '$1.$2') // captura 2 grupos de numero o primeiro de 3 e o segundo de 1, apos o primeiro grupo ele adiciona um ponto
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1'); // captura 2 numeros apos o traço e não deixa digitar mais nada
}
