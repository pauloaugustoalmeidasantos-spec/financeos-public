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

interface TrialExpiringProps {
  name: string;
}

export const TrialExpiringEmail = ({ name }: TrialExpiringProps) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  return (
    <Html>
      <Head />
      <Preview>Seu teste do FinanceOS está terminando</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Seu teste está quase no fim!</Heading>
          <Text style={text}>
            Olá {name || "Membro"}, esperamos que você esteja aproveitando o <strong>FinanceOS</strong>!
          </Text>
          <Text style={text}>
            Seu período de teste grátis irá expirar em alguns dias. Para não perder acesso aos seus dashboards e simulações, faça o upgrade da sua conta hoje.
          </Text>
          <Link href={`${appUrl}/upgrade`} style={button}>
            Fazer Upgrade Agora
          </Link>
          <Text style={footer}>
            Se você não deseja assinar, não é preciso fazer nada; sua conta será rebaixada para o plano gratuito sem cobranças surpresas.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TrialExpiringEmail;

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
  color: "#eab308", // Yellow for warning
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
