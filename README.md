## 🌐 React-Lanchinho-Api10-EF-Jwt-mvp
Aplicativo de Lanchinho com automação Google Sheets em React e API com autenticação Jwt em C# ASP.NET Core 10 com banco de dados SQL-Server.

#### 🎨 Aqui uma Demonstração do Projeto
<img width="800" height="350" alt="Lanchinho" src="https://github.com/user-attachments/assets/0819c431-f7cf-47cc-9659-090a4bf6b5c3" />

#### ⚠️ String de conexão do banco
Modifique [SUA_SENHA] na string de conexão no arquivo **appsettings.json**, no trecho indicado:

```bash
 "ConnectionStrings": {
    "CoxexaoDb": "server=localhost\\SQLEXPRESS;User Id=sa;password=[SUA_SENHA];database=LanchinhoDB;Pooling=False;MultipleActiveResultSets=False;Encrypt=False;TrustServerCertificate=False;"
  },
```

## 📁 Backend

#### 📋 O que voçê vai ver nesse Projeto

| Tecnologia | Descrição |
|-----------|-----------|
| **Google Sheets** | Programa utilizado para planilhas online e gratuito do Google, permitindo criar, editar e analisar dados.|
| **MailKit** | Biblioteca usada para criar, enviar e receber e-mails. |
| **MimeKit** | Biblioteca usada para criar, analisar e modificar mensagens de e-mail. |
| **IFormFile** | Interface nativa que facilita a recepção de dados como imagens, documentos enviados por formulários. |

#### 🔄 Executar a aplicação

```bash
cd ProjetoLanchinhoAPI
dotnet ef migrations add BancoInicial
dotnet ef database update 
dotnet run 
```

A API ficará disponivel em **http://localhost:5000/scalar/**

## 📁 Frontend

#### 📋 O que voçê vai ver nesse Projeto

| Tecnologia | Descrição |
|-----------|-----------|
| **Bootstrap** | Framework front-end de códigos prontos em HTML, CSS e JavaScript para criar sites e interfaces web responsivas |
| **react-slick** | Biblioteca React usada para criar carrosséis (ou sliders). |

#### 🔄 Executar a aplicação

- Recuperar as dependencias do projeto node_modules . 
```bash
cd Frontend
npm install
```

- Executar o Build do Projeto

```bash
npm start
```

A App ficará disponivel em **http://localhost:3000**


#### 🧪 Executar Endpoints 

- Registrar usuario POST **http://localhost:5000/api/auth/register**
```bash
{
  "nome": "Adminstrador",
  "telefone": "17999999999",
  "email": "email@gmail.com",
  "endereco": "R Teste",
  "senha": "123456",
  "tipo": "ADM"
}
```

- Executar regra interna de alterar "cliente" por "ADM" 
```sql
UPDATE Clientes SET Tipo = 'ADM' where Email = 'email@gmail.com'
GO
``` 

- Fazer login POST **http://localhost:5000/api/auth/login**
```bash
{
  "email": "email@gmail.com",
  "senha": "123456"
}
```

- Copiar o Token gerado no Login e autenticar no Authorize da API. 

- Após criar Produtos em POST **http://localhost:5000/api/Produtos** , observação necessário FormData não aceita application/json, por causa de IFormFile das imagens. 


#### ⚙️ Configuração - Automação Google Sheets API

A importação de dados para planilha funciona como carga, toda vez que o projeto é iniciado. 

#### Passo 1: Criar Projeto e Criar Chave API_KEY
- Acesse **https://console.cloud.google.com/** e crie um novo projeto LanchinhoPlanilhaDB.
- Clique em **API e Serviços** -> Clique em + Ativar Serviços APIs, e na busca escreva **Google Sheets API** , selecione Ativar. 
- Em ativar APIs e Serviços -> Clique em Credenciais - > + Criar Credencias, escolha Chave API prossiga, coloque o nome **LanchinhoPlanilha**, selecione a opção **Google Sheets API**, e clique Criar.
- Copie a Chave e Subistitua [PROJETO_API_KEY]. 

#### Passo 2: Criação da Planilha
- Acesse uma planilha qualquer **https://docs.google.com/spreadsheets/create**, somente para pegar um ID.
- Copie o Id da planilha, copiei o conteudo de **d/** até **/edit** que aparece no link e subistitua em [ID_PLANILHA].  
```bash
  "GoogleSheets": {
    "SpreadsheetId": "[ID_PLANILHA]",
    "ApiKey": "[PROJETO_API_KEY]"
  },
  "SheetsAPI": {
    "Key": "[PROJETO_API_KEY]"
  },
```

#### Passo 3: Planilha Google Drive 
- O Documento ficará acessivel em  **https://drive.google.com/**
- Salve a Planilha com nome **Produtos** e crie as abas **Clientes, Produtos, Pedidos, Pagamentos, Estatisticas**

#### Passo 4: Criar Conta de Serviço
- Para gerar o arquivo de credenciais no Google Cloud, acesse **console do Google Cloud**.
- Vá em APIs e Serviços > Credenciais, clique em **+** , Criar Credenciais e escolha Conta de Serviço e de um nome clique Criar.
- Na lista de contas de serviço, clique em cima da conta criada, vá no menu supeior em **Chaves**, clique em Adicionar Chave > Criar nova -chave e escolha o formato JSON.

- Importante: Abra esse arquivo JSON, copie o e-mail que está no campo "client_email", vá na sua planilha do Google Sheets na internet e compartilhe a planilha com esse e-mail dando a ele a permissão de Editor.

#### Passo 4: Gerar chave Outh2 para App de Computador
- Acesse o Google Cloud Console.Vá em APIs e Serviços > Credenciais
- Selecione ID do cliente do OAuth -> Criar ID do cliente do OAuth , Selecione **App para Computador** e Baixe o Json.
- O download de um arquivo começará automaticamente. Renomeie esse arquivo para **google-credentials.json**.
- Cole ele na pasta raiz do projeto API 

#### Passo 5: Adicionar e-mail do Testador (OAuth)
- Acesse o Google Cloud Console. **https://console.cloud.google.com/**
- No menu lateral esquerdo, clique em APIs e Serviços > Tela de permissão OAuth (OAuth consent screen).
- Selecione Publico Alvo -> Clique no botão + ADD USERS (Adicionar usuários) em Usuario de Teste , adicione o email do Testador.
- Digite o seu e-mail e clique em Salvar.


#### ⚙️ Configuração - Gmail - Senha de app 
- Com senha de Verificação em Duas Etapas ativa no **https://mail.google.com/**, siga estes passos exatos:
- Acesse o painel da sua Conta do Google. Clique na aba Segurança no menu lateral. 
- No campo de busca no topo da página, digite Senhas de app e clique na opção que aparecer.
- Escolha um nome qualquer para identificar (ex: ProjetoLanchinho).Clique em Criar.
- O Google vai exibir uma senha de 16 letras dentro de uma caixa amarela.
- Copie essa senha (ignore os espaços, use as 16 letras juntas).

- Modifique [SEU_EMAIL] e [SUA_SENHA] no arquivo **appsettings.json**, no trecho indicado:

```bash
"EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "[SEU_EMAIL]",
    "SenderPassword": "[SUA_SENHA_APP]",
    "SenderName": "Lanchinho Delivery - Esqueci minha senha"
  },
```
