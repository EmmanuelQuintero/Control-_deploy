import nodemailer from 'nodemailer';

// Configuración del transporter de nodemailer
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "emmanuel.quintero.palma@gmail.com",
    pass: "disd efbb xhnb xdsw"
  },
  tls: {
    rejectUnauthorized: false,
  }
});

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
}

export async function sendEmailNotification(email: EmailNotification) {
  const mailOptions = {
    from: "emmanuel.quintero.palma@gmail.com",
    to: email.to,
    subject: email.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Control+ - Notificación</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p style="color: #374151; line-height: 1.6;">${email.message}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Este es un mensaje automático de Control+
        </p>
      </div>
    `,
    text: email.message
  };

  await transporter.sendMail(mailOptions);
}
