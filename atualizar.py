"""
Fut Mensal - Script de atualizacao semanal
==========================================

Uso:
  python atualizar.py

Antes de rodar:
  1. Atualize a planilha Excel (pasta pai do projeto)
  2. Adicione/remova fotos em assets/fotos/ (campeoes/, jogadores/, motm/, premios/)
  3. Adicione novos uniformes em assets/uniformes/ (ex: 2026.2/)

O script vai:
  - Regenerar stats.json a partir das planilhas
  - Regenerar gallery.json a partir das fotos
  - Sincronizar fotos e uniformes com public/ (adicoes E remocoes)
  - Detectar novos uniformes e gerar o HTML automaticamente
  - Fazer commit e push para GitHub (deploy automatico via Cloudflare)
"""

import subprocess
import shutil
import re
import sys
from pathlib import Path
from datetime import datetime

SITE = Path(__file__).resolve().parent
PUBLIC = SITE / "public"
INDEX = SITE / "index.html"


def run(cmd, cwd=None):
    """Roda comando e retorna se teve sucesso."""
    print(f"  > {cmd}")
    result = subprocess.run(
        cmd, shell=True, cwd=cwd or SITE,
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if result.returncode != 0:
        print(f"  ERRO: {(result.stderr or '').strip()}")
        return False
    stdout = (result.stdout or "").strip()
    if stdout:
        print(f"  {stdout}")
    return True


def sync_folder(src: Path, dst: Path):
    """Espelha src para dst: copia novos/alterados, remove os que nao existem mais em src."""
    added, removed = 0, 0

    # Copiar novos e atualizados
    for file in src.rglob("*"):
        if file.is_dir():
            continue
        rel = file.relative_to(src)
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or file.stat().st_mtime > target.stat().st_mtime:
            shutil.copy2(file, target)
            added += 1

    # Remover arquivos que nao existem mais na origem
    if dst.exists():
        for file in list(dst.rglob("*")):
            if file.is_dir():
                continue
            rel = file.relative_to(dst)
            if not (src / rel).exists():
                file.unlink()
                removed += 1
                # Limpar pastas vazias
                try:
                    file.parent.rmdir()
                except OSError:
                    pass

    return added, removed


def parse_stats():
    """Roda parse-stats e copia JSON para public."""
    print("\n[1/5] Atualizando estatisticas...")
    if not run("npm run parse-stats"):
        return False
    src = SITE / "data" / "stats.json"
    dst = PUBLIC / "data" / "stats.json"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print("  stats.json copiado para public/")
    return True


def parse_gallery():
    """Roda parse-gallery e copia JSON para public."""
    print("\n[2/5] Atualizando galeria...")
    if not run("npm run parse-gallery"):
        return False
    src = SITE / "data" / "gallery.json"
    dst = PUBLIC / "data" / "gallery.json"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print("  gallery.json copiado para public/")
    return True


def sync_fotos():
    """Sincroniza fotos entre assets/ e public/assets/ (espelho)."""
    print("\n[3/5] Sincronizando fotos...")
    src = SITE / "assets" / "fotos"
    dst = PUBLIC / "assets" / "fotos"
    added, removed = sync_folder(src, dst)
    print(f"  Fotos: {added} adicionadas/atualizadas, {removed} removidas")


def sync_estatisticas_html():
    """Detecta novos anos nas planilhas e adiciona tabs/blocos de estatisticas ao HTML."""
    print("\n[3.5/5] Verificando anos de estatisticas no HTML...")

    # Detectar anos nas planilhas
    parent = SITE.parent
    xlsx_files = [f for f in parent.iterdir() if f.suffix.lower() == ".xlsx" and "stats" in f.name.lower()]
    disk_years = set()
    for f in xlsx_files:
        m = re.search(r"(20\d{2})", f.name)
        if m:
            disk_years.add(m.group(1))

    if not disk_years:
        print("  Nenhuma planilha encontrada")
        return

    html = INDEX.read_text(encoding="utf-8")

    # Anos ja presentes no HTML
    existing_tabs = set(re.findall(r'<button class="tab[^"]*" data-year="(\d{4})"', html))
    new_years = sorted(disk_years - existing_tabs)

    if not new_years:
        print("  Todos os anos ja estao no HTML")
        return

    for year in new_years:
        print(f"  Adicionando ano {year}...")

        # Adicionar tab (depois do All Time)
        tab_html = f'\n        <button class="tab" data-year="{year}">{year}</button>'
        all_time_tab = '<button class="tab active" data-year="allTime">All Time</button>'
        html = html.replace(all_time_tab, all_time_tab + tab_html)

        # Adicionar bloco de conteudo (antes do All Time content)
        content_html = (
            f'\n      <!-- {year} Stats -->\n'
            f'      <div class="estatisticas__content" data-year="{year}">\n'
            f'        <div id="stats-summary-{year}" class="stats-summary reveal"></div>\n'
            f'        <div class="stats-grid">\n'
            f'          <div class="stat-card reveal">\n'
            f'            <div class="stat-card__header">\n'
            f'              <h3 class="stat-card__title">Artilharia</h3>\n'
            f'              <span class="stat-card__icon">&#9917;</span>\n'
            f'            </div>\n'
            f'            <div id="stats-gols-{year}" class="bar-chart"></div>\n'
            f'          </div>\n'
            f'          <div class="stat-card reveal">\n'
            f'            <div class="stat-card__header">\n'
            f'              <h3 class="stat-card__title">Títulos</h3>\n'
            f'              <span class="stat-card__icon">&#127942;</span>\n'
            f'            </div>\n'
            f'            <div id="stats-titulos-{year}" class="bar-chart"></div>\n'
            f'          </div>\n'
            f'          <div class="stat-card reveal">\n'
            f'            <div class="stat-card__header">\n'
            f'              <h3 class="stat-card__title">Craque da Semana</h3>\n'
            f'              <span class="stat-card__icon">&#11088;</span>\n'
            f'            </div>\n'
            f'            <div id="stats-votos-{year}" class="bar-chart"></div>\n'
            f'          </div>\n'
            f'        </div>\n'
            f'      </div>\n'
        )

        all_time_content = '      <!-- All Time Stats -->'
        html = html.replace(all_time_content, content_html + all_time_content)

    # All Time permanece como tab ativa (default)
    # Garantir que nenhum ano tenha active
    html = re.sub(r'<button class="tab active" data-year="(\d{4})"', r'<button class="tab" data-year="\1"', html)
    html = re.sub(r'<div class="estatisticas__content active" data-year="(\d{4})"', r'<div class="estatisticas__content" data-year="\1"', html)

    INDEX.write_text(html, encoding="utf-8")
    print(f"  Anos adicionados: {', '.join(new_years)}. Tab ativa: All Time")


def sync_uniformes():
    """Sincroniza uniformes e detecta novas temporadas para adicionar ao HTML."""
    print("\n[4/5] Sincronizando uniformes...")
    src = SITE / "assets" / "uniformes"
    dst = PUBLIC / "assets" / "uniformes"
    added, removed = sync_folder(src, dst)
    print(f"  Uniformes: {added} adicionados/atualizados, {removed} removidos")

    # Detectar temporadas novas que nao estao no HTML
    html = INDEX.read_text(encoding="utf-8")
    existing = set(re.findall(r'data-year="([^"]+)"', html))
    disk_seasons = sorted(
        [d.name for d in src.iterdir() if d.is_dir() and re.match(r"\d{4}\.\d", d.name)]
    )
    new_seasons = [s for s in disk_seasons if s not in existing]

    if not new_seasons:
        print("  Nenhuma temporada nova detectada")
        return

    for season in new_seasons:
        print(f"  Nova temporada detectada: {season}")
        season_dir = src / season
        images = sorted([f for f in season_dir.iterdir() if f.suffix.lower() in (".jpeg", ".jpg", ".png", ".webp")])

        if not images:
            print(f"    Sem imagens em {season}, pulando")
            continue

        # Gerar HTML do kit-node
        groups = []
        for img in images:
            name = img.stem.lower()
            if "goleiro" in name or "gk" in name:
                badge_class = "kit-group__badge--gk"
                badge_label = "GK"
                title = f"Goleiro {season}"
            elif "alt" in name or "away" in name:
                badge_class = "kit-group__badge--away"
                badge_label = "Alt"
                title = f"Linha Alt {season}"
            else:
                badge_class = "kit-group__badge--home"
                badge_label = "Linha"
                title = f"Linha {season}"

            groups.append(
                f'              <div class="kit-group">\n'
                f'                <span class="kit-group__badge {badge_class}">{badge_label}</span>\n'
                f'                <button class="kit-thumb kit-thumb--single" data-title="{title}" data-front="./assets/uniformes/{season}/{img.name}">\n'
                f'                  <img src="./assets/uniformes/{season}/{img.name}" alt="{title}" loading="lazy">\n'
                f'                </button>\n'
                f'              </div>'
            )

        block = (
            f'\n          <!-- {season} -->\n'
            f'          <div class="kit-node" data-year="{season}">\n'
            f'            <div class="kit-node__year">{season}</div>\n'
            f'            <div class="kit-node__items">\n'
            + "\n".join(groups) + "\n"
            f'            </div>\n'
            f'          </div>\n'
        )

        # Inserir antes do fechamento </div> da track
        marker = "        </div>\n      </div>\n\n      <!-- Expanded detail panel"
        if marker in html:
            html = html.replace(marker, block + "\n" + marker)
            print(f"    HTML adicionado para {season}")
        else:
            print(f"    AVISO: nao encontrei o ponto de insercao no HTML para {season}")
            print(f"    Adicione manualmente o bloco ao index.html")

    INDEX.write_text(html, encoding="utf-8")


def git_push():
    """Commit e push para GitHub."""
    print("\n[5/5] Publicando no GitHub...")
    today = datetime.now().strftime("%d/%m/%Y")

    run("git add -A")

    # Verificar se ha mudancas
    result = subprocess.run("git status --porcelain", shell=True, cwd=SITE, capture_output=True, text=True)
    if not result.stdout.strip():
        print("  Nenhuma alteracao para commitar")
        return

    msg = f"Atualizacao semanal {today}"
    run(f'git commit -m "{msg}"')
    run("git push origin main")
    print(f"\n  Deploy automatico iniciado no Cloudflare Pages!")
    print(f"  Acesse https://futmensal.pages.dev em ~1 minuto")


def main():
    print("=" * 50)
    print("  Fut Mensal - Atualizacao Semanal")
    print("=" * 50)

    parse_stats()
    parse_gallery()
    sync_fotos()
    sync_estatisticas_html()
    sync_uniformes()
    git_push()

    print("\n" + "=" * 50)
    print("  Concluido!")
    print("=" * 50)


if __name__ == "__main__":
    main()
