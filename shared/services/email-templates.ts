interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Reusable HTML email wrapper with consistent design
const emailWrapper = (content: string) => `
  <!DOCTYPE html>
  <html lang="tr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .header { background: #007bff; padding: 20px; text-align: center; color: #fff !important; border-top-left-radius: 8px; border-top-right-radius: 8px; }
      .header img { max-width: 150px; }
      .content { padding: 20px; color: #333; line-height: 1.6; }
      .content strong { color: #007bff; }
      .footer { text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #eee; }
      .button { display: inline-block; padding: 10px 20px; margin-top: 10px; background: #007bff; color: #fff !important; text-decoration: none; border-radius: 5px; }
      a { color: #007bff; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>İlan Yönetim Sistemi</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>İlan Yönetim Sistemi | <a href="mailto:destek@platformadı.com">destek@platformadı.com</a></p>
        <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen doğrudan yanıtlamayınız.</p>
      </div>
    </div>
  </body>
  </html>
`;

// Email template for when a listing is deactivated by admin
export function generateListingDeactivatedEmail(
  username: string,
  listingTitle: string
): EmailOptions {
  const subject = "İlanınız Pasif Duruma Alındı";
  const text = `
    Sayın ${username},

    "${listingTitle}" başlıklı ilanınız, platformumuzun yöneticileri tarafından pasif duruma alınmıştır. Bu karar, genellikle ilan içeriğinin platform kurallarımıza uygun olmaması durumunda alınır.

    Daha fazla bilgi almak veya itirazda bulunmak isterseniz, lütfen destek ekibimizle iletişime geçin: [destek@platformadı.com](mailto:destek@platformadı.com).

    Anlayışınız için teşekkür eder, iyi günler dileriz.

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Sayın ${username},</p>
    <p><strong>"${listingTitle}"</strong> başlıklı ilanınız, platformumuzun yöneticileri tarafından pasif duruma alınmıştır. Bu karar, genellikle ilan içeriğinin platform kurallarımıza uygun olmaması durumunda alınır.</p>
    <p>Daha fazla bilgi almak veya itirazda bulunmak isterseniz, lütfen <a href="mailto:destek@platformadı.com" class="button">Destek Ekibiyle İletişime Geçin</a>.</p>
    <p>Anlayışınız için teşekkür eder, iyi günler dileriz.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: "", subject, text, html };
}

// Email template for when a listing is deleted by admin
export function generateListingDeletedEmail(
  username: string,
  listingTitle: string
): EmailOptions {
  const subject = "İlanınız Silindi";
  const text = `
    Sayın ${username},

    "${listingTitle}" başlıklı ilanınız, platformumuzun yöneticileri tarafından silinmiştir. Bu işlem, genellikle ilan içeriğinin kullanım koşullarımızı veya topluluk standartlarımızı ihlal ettiği durumlarda gerçekleştirilir.

    Kararla ilgili sorularınız varsa, lütfen destek ekibimizle iletişime geçin: [destek@platformadı.com](mailto:destek@platformadı.com).

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Sayın ${username},</p>
    <p><strong>"${listingTitle}"</strong> başlıklı ilanınız, platformumuzun yöneticileri tarafından silinmiştir. Bu işlem, genellikle ilan içeriğinin kullanım koşullarımızı veya topluluk standartlarımızı ihlal ettiği durumlarda gerçekleştirilir.</p>
    <p>Kararla ilgili sorularınız varsa, lütfen <a href="mailto:destek@platformadı.com" class="button">Destek Ekibiyle İletişime Geçin</a>.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: "", subject, text, html };
}

// Email template for when a user is banned
export function generateUserBannedEmail(username: string): EmailOptions {
  const subject = "Hesabınız Askıya Alındı";
  const text = `
    Sayın ${username},

    Platformumuzdaki hesabınız, yöneticilerimiz tarafından askıya alınmıştır. Bu işlem, genellikle platform kurallarımızın veya kullanım koşullarımızın ihlal edilmesi durumunda uygulanır.

    Daha fazla bilgi almak veya itirazda bulunmak isterseniz, lütfen destek ekibimize ulaşın: [destek@platformadı.com](mailto:destek@platformadı.com).

    Anlayışınız için teşekkür ederiz.

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Sayın ${username},</p>
    <p>Platformumuzdaki hesabınız, yöneticilerimiz tarafından askıya alınmıştır. Bu işlem, genellikle platform kurallarımızın veya kullanım koşullarımızın ihlal edilmesi durumunda uygulanır.</p>
    <p>Daha fazla bilgi almak veya itirazda bulunmak isterseniz, lütfen <a href="mailto:destek@platformadı.com" class="button">Destek Ekibiyle İletişime Geçin</a>.</p>
    <p>Anlayışınız için teşekkür ederiz.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: "", subject, text, html };
}

// Email template for when a pending listing is rejected
export function generateListingRejectedEmail(
  username: string,
  listingTitle: string
): EmailOptions {
  const subject = "İlanınız Reddedildi";
  const text = `
    Sayın ${username},

    "${listingTitle}" başlıklı ilanınız, yöneticilerimiz tarafından incelenmiş ve onaylanmamıştır. Bu durum, genellikle içeriğin platform standartlarımıza veya politikalarımıza uygun bulunmaması nedeniyle gerçekleşir.

    İlanınızı gözden geçirip düzenleyerek tekrar onaya sunabilirsiniz. Daha fazla bilgi için destek ekibimizle iletişime geçebilirsiniz: [destek@platformadı.com](mailto:destek@platformadı.com).

    İlginiz için teşekkür ederiz.

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Sayın ${username},</p>
    <p><strong>"${listingTitle}"</strong> başlıklı ilanınız, yöneticilerimiz tarafından incelenmiş ve onaylanmamıştır. Bu durum, genellikle içeriğin platform standartlarımıza veya politikalarımıza uygun bulunmaması nedeniyle gerçekleşir.</p>
    <p>İlanınızı gözden geçirip düzenleyerek tekrar onaya sunabilirsiniz. Daha fazla bilgi için <a href="mailto:destek@platformadı.com" class="button">Destek Ekibiyle İletişime Geçin</a>.</p>
    <p>İlginiz için teşekkür ederiz.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: "", subject, text, html };
}

// Email template for when a listing is approved
export function generateListingApprovedEmail(
  username: string,
  listingTitle: string
): EmailOptions {
  const subject = "İlanınız Onaylandı 🎉";
  const text = `
    Sayın ${username},

    Tebrikler! "${listingTitle}" başlıklı ilanınız, yöneticilerimiz tarafından incelenmiş ve onaylanmıştır. İlanınız artık platformumuzda tüm kullanıcılar tarafından görüntülenebilir.

    İlanınızın performansını ve mesajlarını takip etmek için hesabınızı düzenli olarak kontrol etmenizi öneririz.

    Bizi tercih ettiğiniz için teşekkür eder, bol şans dileriz!

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Sayın ${username},</p>
    <p><strong>Tebrikler!</strong> <strong>"${listingTitle}"</strong> başlıklı ilanınız, yöneticilerimiz tarafından incelenmiş ve onaylanmıştır. İlanınız artık platformumuzda tüm kullanıcılar tarafından görüntülenebilir.</p>
    <p>İlanınızın performansını ve mesajlarını takip etmek için hesabınızı düzenli olarak kontrol etmenizi öneririz.</p>
    <p>Bizi tercih ettiğiniz için teşekkür eder, bol şans dileriz!</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: "", subject, text, html };
}

// Email template for when a user account is reactivated
export function generateUserReactivatedEmail(username: string): EmailOptions {
  const subject = "Hesabınız Yeniden Aktif 🎉";
  const text = `
    Sayın ${username},

    Harika haber! Hesabınız, yöneticilerimiz tarafından yeniden aktif hale getirilmiştir. Artık platformumuzun tüm özelliklerine erişebilir, ilanlarınızı yönetebilir ve yeni ilanlar ekleyebilirsiniz.

    Sizi tekrar aramızda görmekten mutluluk duyuyor, platformumuzu kullanmaya devam ettiğiniz için teşekkür ediyoruz.

    Sorularınız için bize ulaşabilirsiniz: [destek@platformadı.com](mailto:destek@platformadı.com).

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Sayın ${username},</p>
    <p><strong>Harika haber!</strong> Hesabınız, yöneticilerimiz tarafından yeniden aktif hale getirilmiştir. Artık platformumuzun tüm özelliklerine erişebilir, ilanlarınızı yönetebilir ve yeni ilanlar ekleyebilirsiniz.</p>
    <p>Sizi tekrar aramızda görmekten mutluluk duyuyor, platformumuzu kullanmaya devam ettiğiniz için teşekkür ediyoruz.</p>
    <p>Sorularınız için <a href="mailto:destek@platformadı.com" class="button">Bize Ulaşın</a>.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: "", subject, text, html };
}

// Email template for email verification
export function generateVerificationEmail(
  email: string,
  token: string
): EmailOptions {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.APP_URL || "https://yourdomain.com"
      : "http://localhost:3000";

  console.log("Generating verification email with base URL:", baseUrl);

  const verificationLink = `${baseUrl}/verify-email?token=${token}`;
  const subject = "Email Adresinizi Doğrulayın";
  const text = `
    Merhaba,

    Platformumuza hoş geldiniz! Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:
    ${verificationLink}

    Bu bağlantı 24 saat boyunca geçerlidir. Doğrulama işlemini tamamlamazsanız, hesabınıza tam erişim sağlayamayabilirsiniz.

    Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı dikkate almayın.

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Merhaba,</p>
    <p>Platformumuza hoş geldiniz! Hesabınızı doğrulamak için lütfen aşağıdaki düğmeye tıklayın:</p>
    <p style="margin: 20px 0;">
      <a href="${verificationLink}" class="button">Email Adresimi Doğrula</a>
    </p>
    <p>Veya bu bağlantıyı tarayıcınızda açabilirsiniz:</p>
    <p style="word-break: break-all;">${verificationLink}</p>
    <p>Bu bağlantı 24 saat boyunca geçerlidir. Doğrulama işlemini tamamlamazsanız, hesabınıza tam erişim sağlayamayabilirsiniz.</p>
    <p>Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı dikkate almayın.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: email, subject, text, html };
}

// Email template for password reset
export function generatePasswordResetEmail(
  email: string,
  token: string
): EmailOptions {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.APP_URL || "https://yourdomain.com"
      : "http://localhost:3000";

  const resetLink = `${baseUrl}/reset-password?token=${token}`;
  const subject = "Şifre Sıfırlama İsteği";
  const text = `
    Merhaba,

    Hesabınız için bir şifre sıfırlama talebi aldık. Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:
    ${resetLink}

    Bu bağlantı 1 saat boyunca geçerlidir. Süre dolmadan işleminizi tamamlamanızı öneririz.

    Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.

    Saygılarımızla,
    İlan Yönetim Ekibi
  `;
  const htmlContent = `
    <p>Merhaba,</p>
    <p>Hesabınız için bir şifre sıfırlama talebi aldık. Şifrenizi sıfırlamak için aşağıdaki düğmeye tıklayın:</p>
    <p style="margin: 20px 0;">
      <a href="${resetLink}" class="button">Şifremi Sıfırla</a>
    </p>
    <p>Veya bu bağlantıyı tarayıcınızda açabilirsiniz:</p>
    <p style="word-break: break-all;">${resetLink}</p>
    <p>Bu bağlantı 1 saat boyunca geçerlidir. Süre dolmadan işleminizi tamamlamanızı öneririz.</p>
    <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
    <p>Saygılarımızla,<br>İlan Yönetim Ekibi</p>
  `;
  const html = emailWrapper(htmlContent);

  return { to: email, subject, text, html };
}
