# Fut Mensal - Site

Site do time de futebol amador Fut Mensal. Stack: Vite + vanilla JS/CSS. Hospedado no Cloudflare Pages com deploy automatico via GitHub (repositorio: miguelstanzis/futmensal). A cada `git push` na branch `main`, o Cloudflare rebuilda e publica automaticamente.

URL de producao: https://futmensal.pages.dev

## Estrutura do projeto

```
site/
  index.html              # Pagina principal (hero, uniformes, galeria, estatisticas)
  package.json             # Scripts: dev, build, parse-stats, parse-gallery
  vite.config.js           # Config do Vite
  css/                     # Estilos por secao (hero.css, uniformes.css, galeria.css, etc.)
  js/                      # Modulos JS por secao (hero.js, uniformes.js, galeria.js, etc.)
  data/
    stats.json             # Estatisticas geradas pelo parse-stats.js
    gallery.json           # Galeria gerada pelo parse-gallery.js
  assets/
    logo/                  # Videos da hero e logos
    fotos/                 # Fotos da galeria (campeoes/, jogadores/, motm/, premios/)
    uniformes/             # Fotos dos uniformes por temporada (2024.1/, 2024.2/, etc.)
  public/                  # Arquivos copiados direto para o dist (nao processados pelo Vite)
    data/                  # Copia dos JSONs (stats.json, gallery.json)
    assets/fotos/          # Copia das fotos da galeria
    assets/uniformes/      # Copia dos uniformes
  scripts/
    parse-stats.js         # Le planilhas Excel e gera data/stats.json
    parse-gallery.js       # Le pasta assets/fotos/ e gera data/gallery.json
```

### Por que a pasta public/ existe?

O Vite so processa arquivos referenciados por `import` ou em tags HTML. Fotos da galeria e uniformes sao carregadas dinamicamente (via JSON ou data-attributes), entao o Vite nao as encontra. A pasta `public/` e copiada integralmente para `dist/` no build, garantindo que esses assets existam no site publicado.

**Regra importante:** toda vez que adicionar/alterar arquivos em `assets/fotos/` ou `assets/uniformes/`, copie tambem para `public/assets/fotos/` ou `public/assets/uniformes/`.

## Planilhas de estatisticas

As planilhas Excel ficam na pasta pai do projeto (um nivel acima de `site/`):
- `STATS FUT MENSAL - 2024.xlsx`
- `STATS FUT MENSAL - 2025.xlsx`
- `STATS 2026.xlsx`

Cada planilha tem abas: GOLS, TITULOS, VOTOS-MOTM, PRESENCA (2026 apenas).

---

# Guia de atualizacao semanal

Ao iniciar um novo chat no Claude Code para atualizar o site, copie e cole o comando relevante abaixo.

## 1. Atualizar estatisticas

> Atualize as estatisticas do site Fut Mensal. A planilha Excel na pasta pai do projeto ja foi atualizada com os dados da semana. Rode `npm run parse-stats` dentro de `site/`, depois copie `data/stats.json` para `public/data/stats.json`. Verifique se o parse rodou sem erros.

## 2. Adicionar fotos na galeria

> Adicione novas fotos a galeria do site Fut Mensal. As fotos ja estao na pasta `site/assets/fotos/` nas subpastas corretas (campeoes, jogadores, motm ou premios). O padrao de nome e: `categoria DD-MM-YY.jpg`. Rode `npm run parse-gallery` dentro de `site/`, depois copie `data/gallery.json` para `public/data/gallery.json` e copie as novas fotos de `assets/fotos/` para `public/assets/fotos/` mantendo a estrutura de pastas.

## 3. Adicionar novo uniforme

> Adicione um novo uniforme ao site Fut Mensal. A temporada e [TEMPORADA, ex: 2026.2]. As imagens ja estao em `site/assets/uniformes/[TEMPORADA]/`. Preciso que voce: (1) copie as imagens para `public/assets/uniformes/[TEMPORADA]/`, (2) adicione o novo bloco HTML em `index.html` na secao uniformes, seguindo o padrao dos blocos existentes (kit-node com kit-groups para cada tipo: Linha, GK, Alt).

## 4. Publicar as alteracoes

> Publique as alteracoes do site Fut Mensal. Faca commit de todos os arquivos alterados com uma mensagem descritiva e de push para o repositorio GitHub (origin main). O Cloudflare Pages vai rebuildar automaticamente.

## 5. Atualizar tudo de uma vez (fluxo completo semanal)

> Faca a atualizacao semanal completa do site Fut Mensal:
> 1. Rode `npm run parse-stats` em `site/` para atualizar estatisticas (planilha ja foi atualizada)
> 2. Rode `npm run parse-gallery` em `site/` para atualizar a galeria (fotos ja foram colocadas nas pastas)
> 3. Copie `data/stats.json` e `data/gallery.json` para `public/data/`
> 4. Copie `assets/fotos/` para `public/assets/fotos/`
> 5. Faca commit e push para GitHub
> 6. Confirme que nao houve erros em nenhuma etapa

---

## Comandos uteis

```bash
cd site
npm run dev          # Servidor local de desenvolvimento
npm run build        # Build de producao (gera dist/)
npm run preview      # Preview do build local
npm run parse-stats  # Gera data/stats.json a partir das planilhas Excel
npm run parse-gallery # Gera data/gallery.json a partir das fotos em assets/fotos/
```

## Observacoes

- O site usa apenas ferramentas 100% gratuitas (Cloudflare Pages free tier, GitHub free)
- Videos da hero: `video_novo_logo_fut_16_9.mp4` (desktop) e `video_novo_logo_fut_9_16.mp4` (mobile)
- Ao final do video, a imagem `logo-3d-sem-fundo.png` aparece com efeito de morph/scale
- Clicar na logo estatica ou no logo da nav replay o video
- Nao ha backend; tudo e estatico gerado no build
