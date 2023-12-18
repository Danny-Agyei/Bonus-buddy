import nodemailer from "nodemailer";

export const sendEmail = (referrer, invitee) => {
  const mailDescription = `<!DOCTYPE html>

  <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
  
  <head>
      <title></title>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
      <style>
          * {
              box-sizing: border-box;
          }
  
          body {
              background: #ffffff;
              margin: 0;
              padding: 0;
          }
  
          a[x-apple-data-detectors] {
              color: inherit !important;
              text-decoration: inherit !important;
          }
  
          #MessageViewBody a {
              color: inherit;
              text-decoration: none;
          }
  
          p {
              line-height: inherit
          }
  
          .desktop_hide,
          .desktop_hide table {
              mso-hide: all;
              display: none;
              max-height: 0px;
              overflow: hidden;
          }
  
          .image_block img+div {
              display: none;
          }
  
          @media (max-width:700px) {
              .desktop_hide table.icons-inner {
                  display: inline-block !important;
              }
  
              .icons-inner {
                  text-align: center;
              }
  
              .icons-inner td {
                  margin: 0 auto;
              }
  
              .mobile_hide {
                  display: none;
              }
  
              .row-content {
                  width: 100% !important;
              }
  
              .stack .column {
                  width: 100%;
                  display: block;
              }
  
              .mobile_hide {
                  min-height: 0;
                  max-height: 0;
                  max-width: 0;
                  overflow: hidden;
                  font-size: 0px;
              }
  
              .desktop_hide,
              .desktop_hide table {
                  display: table !important;
                  max-height: none !important;
              }
          }
  
      </style>
  </head>
  
  <body style="background-color: #ffffff; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
      <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;" width="100%" bg="#ffffff">
          <tbody>
              <tr>
                  <td>
                      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;" width="100%">
                          <tbody>
                              <tr>
                                  <td>
                                      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
                                          <tbody>
                                              <tr>
                                                  <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
                                                      <div class="spacer_block block-1" style="height:35px;line-height:35px;font-size:1px;"> </div>
                                                  </td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;" width="100%">
                          <tbody>
                              <tr>
                                  <td>
                                      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 680px; margin: 0 20px;" width="680">
                                          <tbody>
                                              <tr>
                                                  <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
                                                      <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                                                          <tr>
                                                              <td class="pad">
                                                                  <h1 style="margin: 0; color: #000000; direction: ltr; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 21.599999999999998px;"><span class="tinyMce-placeholder">Hi Denise,</span></h1>
                                                              </td>
                                                          </tr>
                                                      </table>
                                                      <table border="0" cellpadding="10" cellspacing="0" class="paragraph_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
                                                          <tr>
                                                              <td class="pad">
                                                                  <div style="color:#101112;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:19.2px;">
                                                                      <p style="margin: 0; margin-bottom: 16px;">I wanted to inform you that <strong><a href="mailto:${referrer}" rel="noopener" style="text-decoration: none; color: #56a2f2;" target="_blank" title="${referrer}"><strong>${referrer}</strong></a></strong> has successfully referred <strong><strong><a href="mailto:${invitee}" rel="noopener" style="text-decoration: none; color: #56a2f2;" target="_blank" title="${invitee}"><strong><strong>${invitee}</strong></strong></a></strong></strong>, who has just enrolled in our upcoming event - <strong>Promo masterclass.</strong></p>
                                                                      <p style="margin: 0; margin-bottom: 16px;">As a token of our appreciation for their referral, could you please take care of this and ensure that the campaign with their gift is dispatched promptly?</p>
                                                                      <p style="margin: 0; margin-bottom: 16px;"> </p>
                                                                      <p style="margin: 0; margin-bottom: 16px;">Best regards,</p>
                                                                      <p style="margin: 0;"><strong><a href="mailto:joe%40joeciprianoconsulting.com" rel="noopener" style="text-decoration: none; color: #56a2f2;" target="_blank" title="joe@joeciprianoconsulting.com"><strong>Joe Cipriano</strong></a></strong></p>
                                                                  </div>
                                                              </td>
                                                          </tr>
                                                      </table>
                                                  </td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
  
                  </td>
              </tr>
          </tbody>
      </table><!-- End -->
  </body>
  
  </html>
  `;

  const transporter = nodemailer.createTransport({
    host: "server233.web-hosting.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  async function main() {
    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: '"Joe Cipriano" <info@merkadobarkada.com>', // sender address
      to: "dandesign96@gmail.com,dr4lyf@gmail.com", // list of receivers
      //   to: "joe@joeciprianoconsulting.com,denise@promomasterclass.com", // list of receivers
      subject: "Urgent - Invitee just Enrolled!",
      text: "", // plain text body
      html: mailDescription, // html body
    });

    console.log("Message sent: %s", info.messageId);
  }

  main().catch(console.error);
};
