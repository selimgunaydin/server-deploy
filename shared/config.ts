interface Config {
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
    fromAddress: string;
  };
  appUrl: string;
}

export const config: Config = {
  email: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    user: 'apikey', // SendGrid requires this to be 'apikey'
    password: process.env.SENDGRID_API_KEY || '',
    fromName: 'İlan Yönetim Sistemi',
    fromAddress: process.env.SENDGRID_FROM_EMAIL || 'noreply@creaati.com',
  },
  appUrl: process.env.APP_URL || 'http://localhost:3000',
}; 