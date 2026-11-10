import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  return (
    <Html>
      <Head />
      <Preview>Bem-vindo ao FinanceOS!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Olá, {name || "Membro"}!</Heading>
          <Text style={text}>
            Bem-vindo ao <strong>FinanceOS</strong>. Estamos muito felizes em tê-lo conosco na jornada rumo à liberdade financeira.
          </Text>
          <Text style={text}>
            Seu período de teste grátis de 14 dias já começou. Explore todas as nossas ferramentas de inteligência artificial e planejamento de longo prazo.
          </Text>
          <Link href={appUrl} style={button}>
            Acessar o Dashboard
          </Link>
          <Text style={footer}>
            — A equipe FinanceOS
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  padding: "0 48px",
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  padding: "0 48px",
};

const button = {
  backgroundColor: "#4f46e5",
  borderRadius: "5px",
  color: "#fff",
  display: "block",
  fontSize: "16px",
  fontWeight: "bold",
  textAlign: "center" as const,
  padding: "12px 20px",
  margin: "24px 48px",
  textDecoration: "none",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  padding: "0 48px",
};
