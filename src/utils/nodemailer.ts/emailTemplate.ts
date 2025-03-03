interface Props {
  title: string;
  name: string;
  message: string;
  btnTxt: string;
  btnAction: string;
}

export const getEmail = function ({ title, name, message, btnTxt, btnAction }: Props) {
  const date = new Date();

  return `
<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <title>${title}</title>
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a {
        padding: 0;
      }
      body {
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      table,
      td {
        border-collapse: collapse;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }
      img {
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
      }
      p {
        display: block;
        margin: 13px 0;
      }
    </style>
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->
    <!--[if lte mso 11]>
      <style type="text/css">
        .mj-outlook-group-fix { width:100% !important; }
      </style>
    <![endif]-->
    <!--[if !mso]><!-->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" type="text/css">
    <style type="text/css">
      @import url(https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap);
    </style>
    <!--<![endif]-->
    <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 {
          width: 100% !important;
          max-width: 100%;
        }
        .mj-column-per-25 {
          width: 25% !important;
          max-width: 25%;
        }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 {
        width: 100% !important;
        max-width: 100%;
      }
      .moz-text-html .mj-column-per-25 {
        width: 25% !important;
        max-width: 25%;
      }
    </style>
    <style type="text/css">
      @media only screen and (max-width:480px) {
        table.mj-full-width-mobile {
          width: 100% !important;
        }
        td.mj-full-width-mobile {
          width: auto !important;
        }
      }
    </style>
    <style type="text/css">
      @media only screen and (max-width: 480px) {
        .mobile-header {
          font-size: 18px !important;
        }
        .mobile-body {
          font-size: 14px !important;
          line-height: 24px !important;
        }
        .mobile-footer {
          font-size: 14px !important;
        }
        .mobile-button {
          font-size: 12px !important;
        }
        .flexible-button {
          width: 100% !important;
        }
        .mobile-section {
          width: 90% !important;
        }
      }
    </style>
  </head>
  <body style="word-spacing:normal;background-color:#3ea1da;">
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${title}</div>
    <div style="background-color:#3ea1da;">
      <!--[if mso | IE]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600">
          <tr>
            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div style="margin:0px auto;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
          <tbody>
            <tr>
              <td style="direction:ltr;font-size:0px;padding:0px;text-align:center;">
                <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="" style="vertical-align:top;width:600px;">
                <![endif]-->
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tbody>
                      <tr>
                        <td style="vertical-align:top;padding:0px;padding-top:20px;padding-bottom:40px;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                              <tr>
                                <td align="center" style="font-size:0px;padding:0px;word-break:break-word;">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                                    <tbody>
                                      <tr>
                                        <td style="width:200px;">
                                          <img alt="email icon asset" height="auto" src="./assets/image" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="200">
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
                  </table>
                </div>
                <!--[if mso | IE]>
                      </td>
                    </tr>
                  </table>
                <![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!--[if mso | IE]>
          </td>
        </tr>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="mobile-section-outlook" style="width:600px;" width="600" bgcolor="#ffffff">
        <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div class="mobile-section" style="background:#ffffff;background-color:#ffffff;margin:0px auto;border-radius:16px;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;border-radius:16px;">
          <tbody>
            <tr>
              <td style="direction:ltr;font-size:0px;padding:50px 20px;text-align:center;">
                <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="" style="vertical-align:top;width:560px;">
                <![endif]-->
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tbody>
                      <tr>
                        <td style="vertical-align:top;padding:0px;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                              <tr>
                                <td align="center" style="font-size:0px;padding:10px 0;word-break:break-word;">
                                  <!--[if mso | IE]>
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                      <tr>
                                        <td>
                                  <![endif]-->
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table;">
                                    <tr>
                                      <td style="padding:0 5px;vertical-align:middle;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:transparent;border-radius:3px;width:24px;">
                                          <tr>
                                            <td style="font-size:0;height:24px;vertical-align:middle;width:24px;">
                                              <a href="#" target="_blank">
                                                <img height="24" src="https://www.mailjet.com/images/theme/v1/icons/ico-social/instagram.png" style="border-radius:3px;display:block;" width="24">
                                              </a>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <!--[if mso | IE]>
                                        </td>
                                      </tr>
                                    </table>
                                  <![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="font-size:0px;padding:10px 0;word-break:break-word;">
                                  <div style="font-family:Poppins, sans-serif;font-size:28px;font-weight:500;line-height:1;text-align:center;color:#3ea1da;"><span class="mobile-header">Confirmation Email</span></div>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="font-size:0px;padding:10px 0;word-break:break-word;">
                                  <div style="font-family:Poppins, sans-serif;font-size:18px;line-height:32px;text-align:center;color:#252525;"><span class="mobile-body">Hello, ${name} <br> ${message}</span></div>
                                </td>
                              </tr>
                              <!-- Centered Button -->
                              <tr>
                                <td align="center" vertical-align="top" style="font-size:0px;padding:0px;word-break:break-word;">
                                  <div class="mj-column-per-25 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                      <tbody>
                                        <tr>
                                          <td style="vertical-align:top;padding:0px;">
                                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                                              <tbody>
                                                <tr>
                                                  <td align="center" vertical-align="middle" class="mobile-button content-based-button" style="min-width: 200px; display: inline-block; font-size: 0px; padding: 12px 20px; word-break: break-word; width: auto;">
                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                                                      <tr>
                                                        <td align="center" bgcolor="#3ea1da" role="presentation" style="border:none;border-radius:8px;cursor:auto;mso-padding-alt:12px 30px;background:#3ea1da;" valign="middle">
                                                          <a href="${btnAction}" target="_blank" style="text-decoration:none;">
                                                            <p style="display:inline-block;background:#3ea1da;color:#ffffff;font-family:Poppins, sans-serif;font-size:14px;font-weight:600;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:12px 30px;mso-padding-alt:0px;border-radius:8px;">${btnTxt}</p>
                                                          </a>
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
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!--[if mso | IE]>
                      </td>
                    </tr>
                  </table>
                <![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!--[if mso | IE]>
          </td>
        </tr>
      </table>
      <![endif]-->
      <!-- Footer section with explicit padding -->
      <!--[if mso | IE]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600">
          <tr>
            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div style="margin:0px auto;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
          <tbody>
            <tr>
              <td style="direction:ltr;font-size:0px;padding:35px 0 0 0;text-align:center;">
                <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="" style="vertical-align:top;width:600px;">
                <![endif]-->
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tbody>
                      <tr>
                        <td style="vertical-align:top;padding:0px;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                              <tr>
                                <td align="center" style="font-size:0px;padding:10px 0;word-break:break-word;">
                                  <!--[if mso | IE]>
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                      <tr>
                                        <td>
                                  <![endif]-->
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table;">
                                    <tr>
                                      <td style="padding:0 5px;vertical-align:middle;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:transparent;border-radius:3px;width:24px;">
                                          <tr>
                                            <td style="font-size:0;height:24px;vertical-align:middle;width:24px;">
                                              <a href="https://www.facebook.com/sharer/sharer.php?u=#" target="_blank">
                                                <img height="24" src="https://www.mailjet.com/images/theme/v1/icons/ico-social/facebook.png" style="border-radius:3px;display:block;" width="24">
                                              </a>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <!--[if mso | IE]>
                                        </td>
                                        <td>
                                  <![endif]-->
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table;">
                                    <tr>
                                      <td style="padding:0 5px;vertical-align:middle;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:transparent;border-radius:3px;width:24px;">
                                          <tr>
                                            <td style="font-size:0;height:24px;vertical-align:middle;width:24px;">
                                              <a href="https://twitter.com/intent/tweet?url=#" target="_blank">
                                                <img height="24" src="https://www.mailjet.com/images/theme/v1/icons/ico-social/twitter.png" style="border-radius:3px;display:block;" width="24">
                                              </a>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <!--[if mso | IE]>
                                        </td>
                                        <td>
                                  <![endif]-->
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table;">
                                    <tr>
                                      <td style="padding:0 5px;vertical-align:middle;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:transparent;border-radius:3px;width:24px;">
                                          <tr>
                                            <td style="font-size:0;height:24px;vertical-align:middle;width:24px;">
                                              <a href="https://www.linkedin.com/shareArticle?mini=true&url=#&title=&summary=&source=" target="_blank">
                                                <img height="24" src="https://www.mailjet.com/images/theme/v1/icons/ico-social/linkedin.png" style="border-radius:3px;display:block;" width="24">
                                              </a>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <!--[if mso | IE]>
                                        </td>
                                        <td>
                                  <![endif]-->
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table;">
                                    <tr>
                                      <td style="padding:0 5px;vertical-align:middle;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:transparent;border-radius:3px;width:24px;">
                                          <tr>
                                            <td style="font-size:0;height:24px;vertical-align:middle;width:24px;">
                                              <a href="#" target="_blank">
                                                <img height="24" src="https://www.mailjet.com/images/theme/v1/icons/ico-social/instagram.png" style="border-radius:3px;display:block;" width="24">
                                              </a>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <!--[if mso | IE]>
                                        </td>
                                      </tr>
                                    </table>
                                  <![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="font-size:0px;padding:5px 0;word-break:break-word;">
                                  <div style="font-family:Poppins, sans-serif;font-size:16px;line-height:1;text-align:center;color:#ffffff;"><span class="mobile-footer"><a href="https://sequentialjobs.com" target="_blank" style="color: #ffffff; text-decoration: none;">https://sequentialjobs.com</a></span></div>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="font-size:0px;padding:5px 0;word-break:break-word;">
                                  <div style="font-family:Poppins, sans-serif;font-size:16px;line-height:1;text-align:center;color:#ffffff;"><span class="mobile-footer">&copy; ${date.getFullYear()} Sequential Jobs. All Rights Reserved.</span></div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!--[if mso | IE]>
                      </td>
                    </tr>
                  </table>
                <![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!--[if mso | IE]>
          </td>
        </tr>
      </table>
      <![endif]-->
    </div>
  </body>
</html>
  `;
};
