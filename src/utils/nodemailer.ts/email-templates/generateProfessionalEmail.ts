import mjml2html from "mjml";

export type EmailTypes = "invite" | "verification" | "meeting" | "test" | "general" | "hire";

interface EmailTemplateProps {
  type: EmailTypes;
  title: string;
  recipientName: string;
  message: string;
  buttonText: string;
  buttonAction: string;
  additionalDetails?: {
    date?: string;
    time?: string;
    location?: string;
    organizerName?: string;
  };
}

export const generateProfessionalEmail = function ({ type, title, recipientName, message, buttonText, buttonAction, additionalDetails = {} }: EmailTemplateProps) {
  const date = new Date();

  // Determine color scheme based on email type
  const colorSchemes = {
    hire: "#ddd",
    invite: "#3498db", // Blue
    verification: "#2ecc71", // Green
    meeting: "#9b59b6", // Purple
    test: "#e67e22", // Orange
    general: "#2c3e50", // Dark Blue
  };

  const primaryColor = colorSchemes[type] || colorSchemes["general"];

  return mjml2html(`
<mjml>
  <mj-head>
    <mj-title>Sequential Jobs - Professional Communication</mj-title>
    <mj-preview>Important Communication from Sequential Jobs</mj-preview>
    <mj-font name="Poppins" href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" />
    <mj-attributes>
      <mj-all font-family="Poppins, Helvetica, Arial, sans-serif" />
      <mj-text font-weight="400" font-size="16px" color="#252525" line-height="24px" />
      <mj-section padding="20px 0" />
      <mj-divider border-color="#E5E5E5" border-width="1px" />
    </mj-attributes>
    <mj-style>
      @media (max-width: 480px) {
        .mobile-header { font-size: 20px !important; }
        .mobile-body { font-size: 14px !important; line-height: 24px !important; }
        .mobile-footer { font-size: 14px !important; }
        .mobile-button { font-size: 12px !important; }
        .mobile-section { padding: 20px 10px !important; }
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f7f9fc">
    <!-- Header Section -->
    <mj-section background-color="#2c3e50" padding="30px 0 20px">
      <mj-column width="100%">
       <mj-image src="https://ng.sequentialjobs.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsequential_logo.1feb9a7d.png&w=384&q=75" alt="Sequential Jobs" width="200px" padding="0px" />
      </mj-column>
    </mj-section>

    <!-- Main Content Section -->
    <mj-section background-color="#ffffff" padding="30px 20px" border-radius="8px" css-class="mobile-section">
      <mj-column width="100%">
        <mj-text font-size="28px" font-weight="700" color="#2c3e50" align="center" padding="0 0 20px 0" css-class="mobile-header">
          ${title}
        </mj-text>

        <mj-text font-size="18px" color="#333333" align="center" padding="0 0 20px 0" css-class="mobile-body">
          Hello, ${recipientName} <br><br> ${message}
        </mj-text>

        ${
          additionalDetails.date || additionalDetails.time || additionalDetails.location
            ? `
        <mj-section background-color="#f4f4f4" border-radius="6px" padding="15px" css-class="mobile-body">
          <mj-column>
            ${
              additionalDetails.date
                ? `
            <mj-text font-size="16px" color="#555555" align="center">
              <strong>Date:</strong> ${additionalDetails.date}
            </mj-text>`
                : ""
            }
            ${
              additionalDetails.time
                ? `
            <mj-text font-size="16px" color="#555555" align="center">
              <strong>Time:</strong> ${additionalDetails.time}
            </mj-text>`
                : ""
            }
            ${
              additionalDetails.location
                ? `
            <mj-text font-size="16px" color="#555555" align="center">
              <strong>Location:</strong> ${additionalDetails.location}
            </mj-text>`
                : ""
            }
            ${
              additionalDetails.organizerName
                ? `
            <mj-text font-size="16px" color="#555555" align="center">
              <strong>Organized by:</strong> ${additionalDetails.organizerName}
            </mj-text>`
                : ""
            }
          </mj-column>
        </mj-section>`
            : ""
        }

        <mj-button background-color="${primaryColor}" color="#ffffff" font-size="16px" font-weight="600" padding="20px 0" border-radius="8px" href="${buttonAction}" width="220px" css-class="mobile-button">
          ${buttonText}
        </mj-button>
      </mj-column>
    </mj-section>

    <!-- Divider Section -->
    <mj-section padding="20px 0">
      <mj-column>
        <mj-divider border-color="#E5E5E5" border-width="1px" padding="0 20px" />
      </mj-column>
    </mj-section>

    <!-- Additional Information Section -->
    <mj-section background-color="#ffffff" padding="20px" border-radius="8px">
      <mj-column width="100%">
        <mj-text align="center" font-size="16px" color="#555555" padding-bottom="10px">
          Need help? Contact our support team at:
        </mj-text>
        <mj-text align="center" font-size="16px" color="#3498db" font-weight="500" padding="0">
          support@sequentialjobs.com
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Footer Section -->
    <mj-section background-color="#2c3e50" padding="30px 0">
      <mj-column width="100%">
        <mj-social mode="horizontal" padding="10px 0">
          <mj-social-element name="facebook" href="https://www.facebook.com/" />
          <mj-social-element name="twitter" href="https://twitter.com/" />
          <mj-social-element name="linkedin" href="https://www.linkedin.com/" />
          <mj-social-element name="instagram" href="https://www.instagram.com/" />
        </mj-social>

        <mj-text font-size="16px" color="#ffffff" align="center" padding="5px 0" css-class="mobile-footer">
          <a href="https://sequentialjobs.com" style="color: #ffffff; text-decoration: none;">sequentialjobs.com</a>
        </mj-text>

        <mj-text font-size="14px" color="#cccccc" align="center" padding="5px 0" css-class="mobile-footer">
          &copy; ${date.getFullYear()} Sequential Jobs. All Rights Reserved.
        </mj-text>

        <mj-text font-size="12px" color="#cccccc" align="center" padding="5px 0" css-class="mobile-footer">
          <a href="#" style="color: #cccccc; text-decoration: underline;">Unsubscribe</a> | <a href="#" style="color: #cccccc; text-decoration: underline;">Privacy Policy</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `);
};
