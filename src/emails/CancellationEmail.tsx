import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface CancellationProps {
  name: string;
}

export const CancellationEmail = ({ name }: CancellationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Cancelamento de Assinatura FinanceOS</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Que pena ver você ir! 😢</Heading>
          <Text style={text}>
            Olá {name || "Membro"},
          </Text>
          <Text style={text}>
            Confirmamos o cancelamento da sua assinatura do <strong>FinanceOS</strong>. 
            Você ainda terá acesso aos recursos premium até o final do período vigente.
          </Text>
          <Text style={text}>
            Se quiser voltar, estaremos sempre aqui de braços abertos!
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CancellationEmail;

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
  color: "#ef4444", // Red
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
