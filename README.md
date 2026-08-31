<p align="center">
  <img src="https://github.com/MiguelNinja19/ArvoreReader/blob/main/icone%20arvorereader.png" width="150" alt="Ícone do ÁrvoreReader">
</p>
<h1 align="center">ÁrvoreReader</h1>

**ÁrvoreReader** é um script que automatiza a leitura de livros na plataforma Árvore, passando páginas automaticamente com intervalos configuráveis.

## ✨ Funcionalidades

- ⏱️ Intervalo aleatório entre páginas (configurável)
- 🎨 Interface amigável com botão flutuante
- 🔔 Notificações visuais
- ⏯️ Controle de início/parada
- 📖 Detecção automática do final do livro
- ✅ Marca como lido ao terminar

## 🚀 Como Usar

### Método 1: Execução direta (PC/Mobile)
1. Acesse um livro na plataforma Árvore
2. Na barra de endereços, digite: `javascript:` e cole o código abaixo:
```js
fetch(`https://raw.githubusercontent.com/MiguelNinja19/ArvoreReader/refs/heads/main/script.js`).then(r => r.text()).then(r => eval(r));
```
3. Pressione Enter

### Método 2: Criando um bookmarklet (PC/Mobile)
1. Crie um novo favorito/bookmark
2. No campo de URL, cole o código JavaScript acima
3. Salve e clique nele quando estiver na página de leitura

## UserScript

### Método 3: Copiar Conteúdo (SEM SYNC) 
1. Baixe as extensões que suportem userscipts como Tempermonkey ([Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/))
2. Copie o conteúdo de: `https://raw.githubusercontent.com/MiguelNinja19/ArvoreReader/refs/heads/main/userscript.js` depois no Tempermonkey clique em: "Adicionar novo script..." e apague o conteudo padrão e cole o conteúdo que foi copiado depois disso clique em "Arquivo" depois salvar.

### Método 4: GitHub Gist (COM SYNC)
1. Baixe as extensões que suportem userscipts. ex: Tempermonkey ([Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/))
2. Acesse: `https://gist.github.com/MiguelNinja19/60dfa522babbe0a2735a4f74c5309515` em seguida clique em "Raw" depois adicione.

## 🛠️ Configuração

Após executar o script:
1. Clique no ícone flutuante (canto superior direito)
2. Configure:
   - Tempo mínimo entre páginas (segundos)
   - Tempo máximo entre páginas (segundos)
3. Clique em "Iniciar"

## 📌 Observações

- Funciona apenas em `e-reader.arvore.com.br`
- Intervalo recomendado: 5-10 segundos para parecer natural
- O script para automaticamente ao chegar na última página

## ☎️ Suporte

...

## ⚠️ Aviso Legal

Este script é apenas para fins educacionais. Use por sua conta e risco e respeite os termos de serviço da plataforma.

## 📜 Licença

MIT License
