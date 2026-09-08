import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

let cachedTransporter = null;

function getTransporter() {
  if (process.env.DISABLED_EMAIL === 'true') return null;
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;

  if (!host || !port) {
    console.warn('Email host/port não configurado — envio de emails desabilitado');
    return null;
  }

  const secure = (process.env.EMAIL_SECURE === 'true');

  const auth = process.env.EMAIL_USER ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined;

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure,
    auth,
  });

  return cachedTransporter;
}

class SendMail {
  static async enviaEmail(infoemail) {
    if (process.env.DISABLED_EMAIL === 'true') {
      console.info('Serviço de email desabilitado (DISABLED_EMAIL=true). Email não será enviado.');
      return { ok: true, disabled: true };
    }

    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.info('Transporter não configurado. Pulando envio de email.');
        return { ok: true, skipped: true };
      }

      const hashId = () => crypto.randomBytes(6).toString('hex');

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: infoemail.to,
        subject: `${infoemail.subject} Email: #${hashId()}`,
        text: infoemail.text,
        html: infoemail.html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.info('Email enviado: %s', info.messageId);
      return { ok: true, messageId: info.messageId, info };
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      return { ok: false, error: true, code: 500, message: 'Erro interno do Servidor', details: err.message };
    }
  }

  static async enviaEmailError(err, pathname, date, req) {
    const infoEmail = {
      to: process.env.ADMIN_EMAIL,
      subject: `Erro interno do servidor na classe: ${pathname}`,
      text: `Erro Detectado \n\nErro interno do Servidor\n\nAtenciosamente,\nEquipe de suporte\n\nErro: ${err.message}\n\nArquivo: ${pathname}\n\nData e Hora: ${date}`,
      html: `<p>Olá,</p><p>Erro interno do Servidor</p><p>Atenciosamente,</p><p>Equipe de suporte</p><p>Erro: ${err.message}</p><p>Arquivo: ${pathname}</p><p>Data e Hora: ${date}</p><p>Requisição: ${req?.method}</p><p>URL: ${req ? `${req.protocol}://${req.get('host')}${req.originalUrl}` : ''}</p>`,
    };

    return this.enviaEmail(infoEmail);
  }

  static async enviaEmailErrorDbConect(err, pathname, date) {
    const infoEmail = {
      to: process.env.ADMIN_EMAIL,
      subject: `Erro interno do servidor na classe: ${pathname}`,
      text: `Erro Detectado \n\nErro interno do Servidor\n\nAtenciosamente,\nEquipe de suporte\n\nErro: ${err.message}\n\nArquivo: ${pathname}\n\nData e Hora: ${date}`,
      html: `<p>Olá,</p><p>Erro interno do Servidor</p><p>Atenciosamente,</p><p>Equipe de suporte</p><p>Erro: ${err.message}</p><p>Arquivo: ${pathname}</p><p>Data e Hora: ${date}</p>`,
    };

    return this.enviaEmail(infoEmail);
  }
}

export default SendMail;
