/**
 * Um CEP brasileiro tem exatamente 8 dígitos -- é a única entrada da busca
 * que dá para classificar com certeza, sem consultar nada. Aceita
 * `78000-000`, `78000000` e `78.000-000` porque é assim que as pessoas
 * digitam.
 *
 * Mesma regra de antes, só que agora compartilhada: vivia como função
 * privada em `resolve-location.ts` e a busca única da home (Onda 3)
 * precisa exatamente dela para escolher entre "isto é um lugar" e "isto é
 * o nome de uma escola" antes de decidir para onde mandar a pessoa.
 */
export function looksLikeCep(input: string): boolean {
  return input.replace(/\D/g, "").length === 8;
}
