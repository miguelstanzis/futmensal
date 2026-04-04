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

## Script automatizado: `atualizar.py`

O script `atualizar.py` na raiz do projeto automatiza todo o fluxo. Basta rodar:

```bash
cd site
python atualizar.py
```

### O que o script faz:
1. Roda `npm run parse-stats` para gerar stats.json a partir das planilhas Excel
2. Roda `npm run parse-gallery` para gerar gallery.json a partir das fotos
3. Sincroniza fotos com public/ (adicoes E remocoes - funciona como espelho)
4. Sincroniza uniformes com public/ e detecta novas temporadas automaticamente (gera o HTML)
5. Commit e push para GitHub (Cloudflare faz deploy automatico)

### Antes de rodar o script:
1. Atualize a planilha Excel na pasta pai do projeto
2. Adicione novas fotos em `assets/fotos/` (subpastas: campeoes, jogadores, motm, premios)
3. Para REMOVER fotos do site: delete o arquivo de `assets/fotos/` - o script remove automaticamente do public/
4. Para novo uniforme: crie a pasta em `assets/uniformes/` (ex: `2026.2/`) com as imagens (linha.jpeg, goleiro.jpeg, etc.)

### Prompt para o Claude Code caso o script de erro:

> O script `atualizar.py` deu erro ao rodar. Leia o script, identifique o problema e corrija. O script fica em `site/atualizar.py`.

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
