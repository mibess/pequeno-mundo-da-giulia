# Pequeno Mundo da Giulia

Um brinquedo de teclado para Mac e Windows. As teclas dão vida a personagens no jardim, no oceano e no céu. Os sons e a brincadeira funcionam sem internet.

## Baixar e abrir

Baixe o ZIP do seu computador na [página da versão mais recente](https://github.com/mibess/pequeno-mundo-da-giulia/releases/latest). No Mac, escolha `mac-arm64` para chips Apple ou `mac-x64` para Intel, descompacte e abra o aplicativo. No Windows, escolha `win-x64` para Intel ou AMD, ou `win-arm64` para ARM. Extraia a pasta inteira e abra **Pequeno Mundo da Giulia.exe**.

Quem está usando a versão 1.0.2 ou anterior precisa abrir um desses pacotes novos uma vez para receber o atualizador.

| Computador | Atalho dos pais para fechar |
| --- | --- |
| Mac | **Control + Option + Shift + Q** |
| Windows | **Ctrl + Alt + Shift + Q** |

## Testar uma atualização

1. Instale a [versão de teste 1.1.0](https://github.com/mibess/pequeno-mundo-da-giulia/releases/tag/v1.1.0) e abra o app com internet.
2. Segure **Área dos pais** por dois segundos. Na seção de atualização você pode consultar a versão em uso e verificar a disponibilidade de uma edição nova.
3. Clique em **Atualizar agora**. O app baixa o pacote, confere a assinatura e reinicia. Abra a Área dos pais de novo e confira o novo número de versão.

O app consulta as versões públicas no GitHub. A atualização fica na conta do usuário e preserva as preferências da brincadeira. A versão exibida na Área dos pais corresponde ao código em uso. O número que o Finder ou o Explorador exibem corresponde ao pacote instalado inicialmente. Mudanças no próprio Electron ou no mecanismo de atualização exigem um novo pacote completo. Os detalhes de publicação estão no [guia de atualizações](docs/atualizacoes.md).

Os executáveis distribuídos são gerados sem certificado de editor para Windows e sem notarização da Apple. A assinatura usada pelo atualizador permite ao próprio aplicativo verificar seus pacotes. O sistema operacional aplica suas próprias verificações ao abrir o aplicativo pela primeira vez.

## Versões na pasta local de desenvolvimento

Após empacotar neste Mac, a pasta **ABRIR AQUI** abre o aplicativo local. Os ZIPs estão em `release/Atual/Mac/` e `release/Atual/Windows/`. As edições anteriores permanecem em `release/Versões/`.

## Durante a brincadeira

Use os botões abaixo do cenário para escolher **Jardim**, **Oceano** ou **Céu**. Também dá para clicar diretamente no cenário. **Sons suaves** liga ou desliga o áudio, que começa na primeira interação.

Segure **Área dos pais** com o mouse por **2 segundos** para ajustar o volume ou ativar **Movimentos tranquilos**. O app lembra o mundo escolhido e as preferências de som e movimento neste computador. As ilustrações, fontes e sons funcionam **sem internet**. O app não exige conta nem coleta telemetria.

O modo de tela cheia intercepta as teclas recebidas pelo app e impede o fechamento comum. O atalho dos pais aparece no rodapé. Se o sistema não permitir registrá-lo, o app avisa e mantém a tela livre. O sistema operacional continua com o controle das próprias teclas e dos botões de hardware. Atalhos como **Ctrl + Alt + Delete** no Windows e o encerramento forçado no Mac podem continuar disponíveis.

## Preparar uma nova versão neste Mac

Os comandos a seguir são para quem mantém o projeto. Use Node.js 24 e npm. Na primeira vez, instale as dependências com `npm install`. Para publicar uma alteração, reserve um novo número (por exemplo, `npm version patch --no-git-tag-version`). Uma edição já guardada não é substituída. Execute um empacotamento por vez.

```sh
npm run pack
```

O comando gera e organiza os quatro pacotes para Mac e Windows, ambos em ARM64 e x64, e a opção de navegador para Windows. `npm run pack:web` gera apenas o arquivo HTML. A versão só passa a ser **Atual** quando há quatro pacotes nativos e o app deste Mac. Nesse momento, **ABRIR AQUI** também passa a apontar para seu aplicativo. As versões anteriores continuam no histórico.

Para gerar e organizar os dois pacotes de um único sistema, use `npm run pack:mac` ou `npm run pack:win`. Uma versão parcial fica guardada no histórico enquanto **Atual** continua apontando para a última versão completa. Se já houver arquivos gerados para organizar, execute `npm run organizar`. A pasta oculta `release/.preparo/` é usada durante a preparação.

### Distribuição nativa assinada para Windows

Os executáveis locais para Windows são gerados sem certificado de editor. Para preparar uma edição futura, configure no ambiente de compilação uma identidade de assinatura de código emitida por um provedor confiável, conforme a [orientação da Microsoft](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control). Mantenha as credenciais fora do projeto. Com um novo número de versão, execute `npm run pack:mac` e depois `npm run pack:win:assinado`. O segundo comando exige que o empacotador assine os binários e interrompe a preparação se não houver identidade disponível. O comando comum `pack` continua destinado a pacotes locais sem assinatura.

Antes de distribuir, confira no Windows as assinaturas e a cadeia de confiança (por exemplo, `Get-AuthenticodeSignature` no executável e nas bibliotecas) e valide a abertura e o atalho de saída com o Controle Inteligente de Aplicativos ligado.

## Desenvolvimento e verificações

`npm run dev` inicia a prévia da interface no navegador em `http://127.0.0.1:5173`. `npm run preview:desktop` abre o aplicativo em uma janela de teste. Nestas duas prévias, a tela fica livre. `npm start` abre o app a partir do código em modo protegido.

| Comando | O que verifica |
| --- | --- |
| `npm run build` | Tipos e compilação da interface. |
| `npm run test:desktop` | Regras de entrada de teclado e saída. |
| `npm run test:ui` | Interações da interface com Playwright. |
| `npm run test:electron` | Áudio na primeira tecla, atalhos, funcionamento offline e saída dos pais em uma janela do aplicativo. |
| `npm run test:kiosk` | Abertura em tela cheia, bloqueio do fechamento comum e saída pelo atalho. O teste encerra automaticamente e tem um limite de 15 segundos. |

Para instalar o Chromium usado pelos testes da interface, execute `npx playwright install chromium`.
