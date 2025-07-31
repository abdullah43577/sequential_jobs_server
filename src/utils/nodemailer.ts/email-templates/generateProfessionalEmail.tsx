import { Html, Head, Font, Preview, Body, Container, Section, Img, Text, Button, Hr, Link } from "@react-email/components";

export type EmailTypes = "invite" | "verification" | "meeting" | "test" | "general" | "hire";

interface EmailTemplateProps {
  type: EmailTypes;
  title: string;
  recipientName: string;
  message: string;
  buttonText?: string;
  buttonAction?: string;
  additionalDetails?: {
    date?: string;
    time?: string;
    location?: string;
    organizerName?: string;
  };
}

export const generateProfessionalEmail = ({ type = "general" as EmailTypes, title, recipientName, message, buttonText, buttonAction, additionalDetails = {} }: EmailTemplateProps) => {
  const date = new Date();

  // Enhanced color schemes with gradients and accent colors
  const colorSchemes = {
    hire: {
      primary: "#27ae60",
      secondary: "#2ecc71",
      accent: "#e8f5e8",
      gradient: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
    },
    invite: {
      primary: "#3498db",
      secondary: "#5dade2",
      accent: "#ebf3fd",
      gradient: "linear-gradient(135deg, #3498db 0%, #5dade2 100%)",
    },
    verification: {
      primary: "#2ecc71",
      secondary: "#58d68d",
      accent: "#e8f8f5",
      gradient: "linear-gradient(135deg, #2ecc71 0%, #58d68d 100%)",
    },
    meeting: {
      primary: "#9b59b6",
      secondary: "#bb8fce",
      accent: "#f4ecf7",
      gradient: "linear-gradient(135deg, #9b59b6 0%, #bb8fce 100%)",
    },
    test: {
      primary: "#e67e22",
      secondary: "#f39c12",
      accent: "#fef5e7",
      gradient: "linear-gradient(135deg, #e67e22 0%, #f39c12 100%)",
    },
    general: {
      primary: "#2c3e50",
      secondary: "#34495e",
      accent: "#ecf0f1",
      gradient: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
    },
  };

  const colors = colorSchemes[type] || colorSchemes["general"];
  const hasButton = buttonText && buttonAction;
  const hasAdditionalDetails = additionalDetails.date || additionalDetails.time || additionalDetails.location || additionalDetails.organizerName;

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap",
            format: "woff2",
          }}
        />
        <Preview>Important Communication from Sequential Jobs</Preview>
      </Head>
      <Body style={main}>
        <Container style={container}>
          {/* Enhanced Header Section with Gradient */}
          <Section style={{ ...header, background: "#24CDE2" }}>
            <div style={headerOverlay}>
              <Img src="https://ng.sequentialjobs.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsequential_logo.1feb9a7d.png&w=384&q=75" alt="Sequential Jobs" width="200" style={logo} />
            </div>
          </Section>

          {/* Enhanced Main Content Section */}
          <Section style={{ ...content, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
            <div style={{ ...typeIndicator, backgroundColor: colors.accent, borderLeft: `4px solid ${colors.primary}` }}>
              {/* {type?.toUpperCase()} */}
              <Text style={{ ...typeText, color: colors.primary }}>NOTIFICATION</Text>
            </div>

            <Text style={titleStyle}>{title}</Text>

            <Text style={bodyText}>
              Hello <span style={{ color: colors.primary, fontWeight: "600" }}>{recipientName}</span>,
              <br />
              <br />
              {message}
            </Text>

            {/* Enhanced Additional Details Section */}
            {hasAdditionalDetails && (
              <div style={{ ...detailsCard, backgroundColor: colors.accent, border: `1px solid ${colors.secondary}33` }}>
                <Text style={detailsHeader}>Event Details</Text>
                {additionalDetails.date && (
                  <div style={detailRow}>
                    <span style={{ ...detailLabel, color: colors.primary }}>📅 Date:</span>
                    <span style={detailValue}>{additionalDetails.date}</span>
                  </div>
                )}
                {additionalDetails.time && (
                  <div style={detailRow}>
                    <span style={{ ...detailLabel, color: colors.primary }}>⏰ Time:</span>
                    <span style={detailValue}>{additionalDetails.time}</span>
                  </div>
                )}
                {additionalDetails.location && (
                  <div style={detailRow}>
                    <span style={{ ...detailLabel, color: colors.primary }}>📍 Location:</span>
                    <span style={detailValue}>{additionalDetails.location}</span>
                  </div>
                )}
                {additionalDetails.organizerName && (
                  <div style={detailRow}>
                    <span style={{ ...detailLabel, color: colors.primary }}>👤 Organized by:</span>
                    <span style={detailValue}>{additionalDetails.organizerName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Enhanced Button */}
            {hasButton && (
              <Button
                style={{
                  ...button,
                  background: colors.gradient,
                  boxShadow: `0 4px 15px ${colors.primary}33`,
                }}
                href={buttonAction}
              >
                {buttonText}
              </Button>
            )}
          </Section>

          {/* Enhanced Divider */}
          <div style={gradientDivider}>
            <div style={{ ...dividerLine, background: colors.gradient }}></div>
          </div>

          {/* Enhanced Support Section */}
          <Section style={{ ...supportSection, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
            <div style={supportHeader}>
              <Text style={supportIcon}>💬</Text>
              <Text style={supportText}>Need help? Contact our support team at:</Text>
            </div>
            <Link href="mailto:support@sequentialjobs.com" style={{ ...supportEmail, color: colors.primary }}>
              support@sequentialjobs.com
            </Link>
          </Section>

          {/* Enhanced Footer Section */}
          <Section style={{ ...footer, background: "#24CDE2" }}>
            <div style={footerOverlay}>
              <Text style={socialText}>Connect with us:</Text>
              <div style={socialLinks}>
                <Link href="https://web.facebook.com/sequential.jobs" style={socialLink}>
                  Facebook
                </Link>
                <span style={socialSeparator}>•</span>
                <Link href="https://x.com/Sequential_Jobs" style={socialLink}>
                  Twitter
                </Link>
                <span style={socialSeparator}>•</span>
                <Link href="https://www.linkedin.com/company/77684353" style={socialLink}>
                  LinkedIn
                </Link>
                <span style={socialSeparator}>•</span>
                <Link href="https://www.instagram.com/sequential_jobs/" style={socialLink}>
                  Instagram
                </Link>
              </div>

              <Text style={footerText}>
                <Link href="https://sequentialjobs.com" style={linkStyle}>
                  sequentialjobs.com
                </Link>
              </Text>

              <Text style={copyright}>© {date.getFullYear()} Sequential Jobs. All Rights Reserved.</Text>

              <Text style={privacyLink}>
                <Link href="https://sequentialjobs.com/privacy-policy" style={privacyLinkStyle}>
                  Privacy Policy
                </Link>
              </Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Enhanced Styles
const main = {
  backgroundColor: "#f8fafc",
  fontFamily: "Poppins, Helvetica, Arial, sans-serif",
  padding: "20px 0",
};

const container = {
  backgroundColor: "#f8fafc",
  padding: "0",
  margin: "0 auto",
  maxWidth: "600px",
};

const header = {
  padding: "40px 0 30px",
  textAlign: "center" as const,
  position: "relative" as const,
};

const headerOverlay = {
  position: "relative" as const,
  zIndex: 1,
};

const logo = {
  margin: "0 auto",
  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "40px 30px",
  borderRadius: "16px",
  margin: "20px 0px 0px",
  border: "1px solid #e2e8f0",
};

const typeIndicator = {
  padding: "8px 16px",
  borderRadius: "8px",
  marginBottom: "20px",
  textAlign: "center" as const,
};

const typeText = {
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "1px",
  margin: "0",
};

const titleStyle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#1a202c",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "1.2",
};

const bodyText = {
  fontSize: "18px",
  color: "#4a5568",
  textAlign: "center" as const,
  margin: "0 0 30px 0",
  lineHeight: "1.6",
};

const detailsCard = {
  padding: "24px",
  borderRadius: "12px",
  margin: "20px 0 30px 0",
};

const detailsHeader = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#2d3748",
  textAlign: "center" as const,
  margin: "0 0 16px 0",
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "8px 0",
  padding: "4px 0",
};

const detailLabel = {
  fontSize: "15px",
  fontWeight: "600",
  minWidth: "120px",
};

const detailValue = {
  fontSize: "15px",
  color: "#4a5568",
  textAlign: "right" as const,
  flex: 1,
};

const button = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "16px 32px",
  borderRadius: "12px",
  textDecoration: "none",
  display: "block",
  textAlign: "center" as const,
  margin: "30px auto 0",
  width: "240px",
  transition: "all 0.3s ease",
};

const gradientDivider = {
  margin: "30px 40px",
  textAlign: "center" as const,
};

const dividerLine = {
  height: "2px",
  borderRadius: "1px",
  margin: "0 auto",
  width: "80px",
};

const supportSection = {
  backgroundColor: "#ffffff",
  padding: "30px 24px",
  borderRadius: "16px",
  margin: "20px 0px 0px",
  border: "1px solid #e2e8f0",
};

const supportHeader = {
  textAlign: "center" as const,
  marginBottom: "8px",
};

const supportIcon = {
  fontSize: "24px",
  margin: "0 0 8px 0",
};

const supportText = {
  textAlign: "center" as const,
  fontSize: "16px",
  color: "#4a5568",
  margin: "0",
};

const supportEmail = {
  textAlign: "center" as const,
  fontSize: "18px",
  fontWeight: "600",
  margin: "0",
  textDecoration: "none",
  display: "block",
};

const footer = {
  padding: "40px 20px",
  textAlign: "center" as const,
  position: "relative" as const,
  marginTop: "30px",
};

const footerOverlay = {
  position: "relative" as const,
  zIndex: 1,
};

const socialText = {
  fontSize: "16px",
  color: "#ffffff",
  fontWeight: "500",
  margin: "0 0 12px 0",
};

const socialLinks = {
  margin: "0 0 20px 0",
};

const socialLink = {
  color: "#ffffff",
  fontSize: "15px",
  textDecoration: "none",
  fontWeight: "500",
};

const socialSeparator = {
  color: "#ffffff",
  margin: "0 12px",
  opacity: 0.7,
};

const linkStyle = {
  color: "#ffffff",
  textDecoration: "none",
};

const footerText = {
  fontSize: "16px",
  color: "#ffffff",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

const copyright = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.8)",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

const privacyLink = {
  fontSize: "13px",
  color: "rgba(255,255,255,0.7)",
  textAlign: "center" as const,
  margin: "0",
};

const privacyLinkStyle = {
  color: "rgba(255,255,255,0.7)",
  textDecoration: "underline",
};

// Test Email Objects
export const testEmails = {
  // Email with button and additional details
  meetingInvite: {
    type: "meeting" as EmailTypes,
    title: "Team Quarterly Review Meeting",
    recipientName: "Sarah Johnson",
    message: "You're invited to our quarterly team review meeting. We'll be discussing project progress, upcoming goals, and celebrating our achievements this quarter.",
    buttonText: "Join Meeting",
    buttonAction: "https://sequentialjobs.com/meetings/quarterly-review-2024",
    additionalDetails: {
      date: "Friday, February 9th, 2024",
      time: "2:00 PM - 3:30 PM WAT",
      location: "Conference Room A / Zoom Link Available",
      organizerName: "Michael Chen, Project Manager",
    },
  },

  // Email without button (message only)
  welcomeMessage: {
    type: "general" as EmailTypes,
    title: "Welcome to Sequential Jobs!",
    recipientName: "David Thompson",
    message:
      "Thank you for joining Sequential Jobs! We're excited to have you as part of our growing community. Your profile has been successfully created and you can now start exploring opportunities that match your skills and interests. Our team will be reaching out soon with personalized job recommendations.",
  },
};
