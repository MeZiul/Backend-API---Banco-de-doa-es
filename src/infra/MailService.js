import SendMail from "../utils/SendMail.js";

class MailService {
	constructor(mailSender = SendMail) {
		this.mailSender = mailSender;
	}

	async enviarLinkRecuperacao({ email, token }) {
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
		const link = `${frontendUrl.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
		const companyName = process.env.COMPANY_NAME || "DoaI";

		const resultado = await this.mailSender.enviaEmail({
			to: email,
			subject: `Redefinição de senha - ${companyName}`,
			text: `Olá,\n\nUse o link abaixo para redefinir sua senha:\n${link}\n\nEste link expira em 1 hora.\n\nAtenciosamente,\n${companyName}`,
			html: `<p>Olá,</p><p>Use o link abaixo para redefinir sua senha:</p><p><a href="${link}">Redefinir senha</a></p><p>Este link expira em 1 hora.</p><p>Atenciosamente,<br>${companyName}</p>`,
		});

		if (resultado?.ok === false) {
			throw new Error("Não foi possível enviar o e-mail de recuperação.");
		}

		return resultado;
	}
}

export default MailService;
