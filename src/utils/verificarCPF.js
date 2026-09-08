export function validarCPF(cpf) {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11 || /^(\d)\1+$/.test(cpfLimpo)) return false;

    const calcularDigito = (fator) => {
        let soma = 0;
        for (let i = 0; i < fator -1; i++) {
            soma += parseInt(cpfLimpo.charAt(i) * (fator - i));
        }
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    return calcularDigito(10) === parseInt(cpfLimpo.charAt(9)) && calcularDigito(11) === parseInt(cpfLimpo.charAt(10));
}