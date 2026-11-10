# 🔧 Oficina – Ordens de Serviço

Sistema web simples para oficinas de automóvel: cadastro de ordens de serviço, lista de serviços a fazer com valores e status, e **vistoria da lataria em 3D**, onde é possível marcar avarias diretamente sobre um modelo do carro.

Feito com **HTML, CSS e JavaScript puro**, sem frameworks e sem backend. Os dados ficam salvos no navegador.

## ✨ Funcionalidades

- **Ordens de serviço**: criar, selecionar e excluir ordens; a lista lateral mostra placa, modelo, cliente e data de entrada.
- **Cliente e veículo**: nome, telefone, placa, modelo, cor e quilometragem, com salvamento automático ao digitar.
- **Serviços a fazer**: descrição e valor (R$), com total calculado automaticamente.
  - Status por serviço: *Pendente → Em andamento → Concluído* (clique no selo para alternar).
- **Vistoria da lataria em 3D** (Three.js):
  - Arraste para girar o carro.
  - Clique no carro para marcar o ponto da avaria.
  - A zona é identificada automaticamente (para-choque, capô, porta, paralama, teto, para-brisa etc.).
  - Escolha o tipo (amassado, risco, trinca, ferrugem, pintura descascada, outro) e adicione observação.
  - As avarias aparecem numeradas no modelo e na lista.
- **Impressão**: botão "Imprimir ordem" com layout próprio para impressão (esconde botões e formulários).
- **Tema claro/escuro** automático conforme o sistema.
- **Responsivo**: funciona em celular e desktop.

## 🗂️ Estrutura

```
.
├── index.html   # estrutura da página
├── style.css    # estilos, temas claro/escuro e impressão
└── script.js    # lógica, armazenamento e visualização 3D
```

## 🚀 Como usar

1. Baixe ou clone os três arquivos na mesma pasta.
2. Abra o `index.html` no navegador (ou use uma extensão como o Live Server do VS Code).
3. Clique em **Nova ordem** e preencha os dados.

> É necessária conexão com a internet para carregar o Three.js (via CDN) e as fontes do Google Fonts. Sem o Three.js, a página mostra a mensagem "Não foi possível carregar o 3D", e o restante continua funcionando.

## 💾 Armazenamento de dados

Tudo é salvo no `localStorage` do navegador, na chave `oficina-v1`.

- Os dados ficam **apenas naquele navegador e dispositivo**.
- Limpar os dados do site apaga as ordens.
- Não há sincronização entre dispositivos nem backup automático.

## 🛠️ Tecnologias

- HTML5 e CSS3 (variáveis CSS, Grid, Flexbox, `prefers-color-scheme`, `@media print`)
- JavaScript (ES6+)
- [Three.js r128](https://threejs.org/) (renderização 3D e raycasting para marcar avarias)
- [Google Fonts](https://fonts.google.com/): Barlow e Barlow Condensed

## 🧭 Ideias para evoluir

- Exportar e importar ordens (JSON) para backup
- Gerar PDF da ordem de serviço
- Fotos das avarias
- Filtro e busca na lista de ordens
- Backend com banco de dados e login
- Envio da ordem ao cliente por WhatsApp

## 👤 Autor

Desenvolvido por **Alexandre Santos** – [@DevAlexandreSantos](https://github.com/DevAlexandreSantos)