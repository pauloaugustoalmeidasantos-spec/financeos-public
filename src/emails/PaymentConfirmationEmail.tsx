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

interface PaymentConfirmationProps {
  name: string;
  planName: string;
}

export const PaymentConfirmationEmail = ({ name, planName }: PaymentConfirmationProps) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  return (
    <Html>
      <Head />
      <Preview>Confirmação de Pagamento FinanceOS</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Pagamento Confirmado! 🎉</Heading>
          <Text style={text}>
            Olá {name || "Membro"}, incrível ter você com a conta Premium!
          </Text>
          <Text style={text}>
            Seu pagamento para o plano <strong>{planName}</strong> foi processado com sucesso.
            Você agora tem acesso ilimitado a todos os recursos da plataforma.
          </Text>
          <Link href={appUrl} style={button}>
            Ir para o Dashboard
          </Link>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentConfirmationEmail;

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
  color: "#16a34a", // Green
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
