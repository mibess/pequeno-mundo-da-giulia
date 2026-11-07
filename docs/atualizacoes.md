# Atualizações do Pequeno Mundo da Giulia

No aplicativo para Mac ou Windows a partir da versão **1.1.0**, a consulta de novas versões ocorre ao abrir e a cada seis horas. Quando aparecer o aviso, segure **Área dos pais** por dois segundos e clique em **Atualizar agora**. O app baixa a atualização assinada, reinicia sozinho e mostra a nova versão na Área dos pais. A brincadeira e as preferências locais também funcionam sem conexão.

Quem tem uma versão anterior a 1.1.0 precisa baixar o ZIP atual uma vez para receber o atualizador. Os pacotes completos para os quatro tipos de computador ficam na [publicação mais recente](https://github.com/mibess/pequeno-mundo-da-giulia/releases/latest).

## Publicar uma versão

Faça as alterações no projeto e reserve o número da versão antes de preparar os arquivos. Os comandos abaixo usam o terminal do Mac com Node.js 24.14.1.

```sh
npm ci
npm version patch --no-git-tag-version
npm run update:prepare
versao="$(node -p 'require("./package.json").version')"
mkdir -p "updates/$versao"
cp "release/feed/$versao/giulia-update.json" "release/feed/$versao/giulia-app-$versao.asar" "updates/$versao/"
node scripts/preparar-atualizacao.mjs --verify
```

O preparo reúne a interface compilada e os módulos atualizáveis do aplicativo em um arquivo ASAR que serve para Mac e Windows. Assina o manifesto com Ed25519 e confere o tamanho, o SHA-256 e a assinatura contra a chave pública do aplicativo. Uma repetição com o mesmo conteúdo reproduz o pacote. Para publicar conteúdo diferente, use um novo número de versão.

A chave privada fica em `.release-keys/update-private.pem` neste computador. Também é possível indicar o caminho para a mesma chave com `GIULIA_UPDATE_KEY`. Mantenha uma cópia privada e protegida para as próximas publicações. O repositório recebe a chave pública e os dois arquivos assinados da versão.

Inclua as alterações de código no mesmo commit que o pacote correspondente. Revise os arquivos preparados e publique a tag do número exato da versão.

```sh
git add -p
git add -- package.json package-lock.json "updates/$versao"
git diff --cached --stat
git commit -m "Publica versão $versao"
git tag "v$versao"
git push origin HEAD
git push origin "v$versao"
```

A tag inicia a compilação dos ZIPs para os dois processadores de cada sistema. O processo reproduz o ASAR, valida a assinatura e conclui a publicação do rascunho depois de conferir os quatro ZIPs e os dois arquivos da atualização. Acompanhe o resultado em [Publicar aplicativos e atualização](https://github.com/mibess/pequeno-mundo-da-giulia/actions/workflows/release.yml).

## Verificar a atualização publicada

A partir da segunda versão com atualizador, o fluxo abre o aplicativo Windows x64 da publicação anterior em uma janela com um perfil temporário. Ele escolhe o Oceano, aguarda o aviso automático, aciona **Atualizar agora** e verifica o novo processo, a versão exibida, o mundo escolhido e a resposta à tecla A. A verificação usa a publicação que os usuários recebem.

Para repetir em um Mac ou Windows, execute o comando abaixo com o executável da versão anterior e os números de origem e destino. No Mac, o executável fica em `Pequeno Mundo da Giulia.app/Contents/MacOS/Pequeno Mundo da Giulia`. No Windows, use o `.exe` depois de extrair o ZIP inteiro.

```sh
node scripts/testar-atualizacao.mjs "/caminho/para/o/executável" 1.1.0 1.1.1
```

## Compatibilidade do aplicativo instalado

A atualização assinada substitui a interface, os sons e o código da janela da brincadeira. O Electron, o carregador inicial, o serviço de atualização e a chave pública pertencem à instalação original. Mudanças nessas partes exigem uma nova distribuição completa. Ao introduzir um formato incompatível com as instalações existentes, aumente o número de compatibilidade tanto no preparo do manifesto quanto no novo serviço de atualização. A instalação antiga poderá então avisar a família de que é preciso baixar o novo aplicativo.
