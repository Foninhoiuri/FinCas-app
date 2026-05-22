# 📖 Guia de Instruções — FinCas App

Bem-vindo ao seu novo sistema de gestão financeira premium. Este documento resume as principais funcionalidades e como tirar o melhor proveito delas.

## 🚀 Novidades e Estabilização
*   **Zero Erro 500:** O sistema foi blindado contra falhas de banco de dados. Agora, as tabelas de orçamentos e recorrências estão totalmente integradas.
*   **Auto-Migração:** Sempre que o servidor inicia, ele verifica se o banco de dados está atualizado.

## 💳 Gestão de Cartões e Faturas
1.  **Compras Parceladas:** Ao adicionar um gasto com método "Crédito", o sistema gera automaticamente todas as parcelas futuras na fatura do cartão correspondente.
2.  **Fechamento e Vencimento:** O sistema calcula em qual mês a compra deve cair baseado no dia de fechamento que você configurou no cadastro do cartão.
3.  **Pagamento de Fatura:** Na tela de cartões, você pode clicar em "Pagar Fatura". Isso criará um lançamento de saída na sua conta bancária e liberará o limite do cartão automaticamente.

## 📊 Orçamentos Inteligentes (Flash Tracker)
Você pode criar limites de gastos (ex: "Lazer" - R$ 500/mês). 
*   **Regras Automáticas:** No cadastro do orçamento, você define regras (por categoria, por cartão ou por conta). 
*   **Vínculo Inteligente:** Quando você abrir o modal de "Adicionar Registro", o sistema vai sugerir o orçamento correto assim que você escolher a categoria ou o cartão.
*   **Consumo em Tempo Real:** A barra de progresso no Dashboard mostra quanto do limite já foi consumido no mês atual.

## 🔁 Transações Recorrentes
Para contas fixas (Aluguel, Netflix, Internet), use a aba **Recorrentes**.
*   **Lançamento Automático:** O sistema identifica essas contas no início de cada mês e as exibe na sua linha do tempo como "Pendentes".
*   **Confirmação:** Basta um clique para confirmar o pagamento e transformar a pendência em uma transação real.

## ⚠️ Dicas para evitar erros
*   **IDs Vazios:** Ao preencher formulários, se não for usar um Cartão ou Conta, deixe o campo "Nenhum" ou vazio. O sistema agora trata isso como `NULL` corretamente.
*   **Sincronização:** Se você estiver com o app aberto em dois dispositivos, as atualizações aparecem em tempo real via WebSocket.

## 🛠️ Suporte Técnico
A documentação técnica completa da API (Swagger) pode ser acessada em:
`http://[IP-DO-SERVIDOR]:3001/api-docs`
