# piscopo-ora.github.io

Sito personale di Vincenzo Claudio Piscopo: dati e fonti dietro ai video.

- `index.html` — home, legge `dati/index.json`
- `dati/<slug>/index.html` — copia di `dati/_template.html`
- `dati/<slug>/data.json` — dati della dashboard (stesso schema della skill infografiche-youtube-ora + `sources`)
- `?video=1` in fondo all'indirizzo di una dashboard → modalità video: un grafico per schermata con animazioni per elemento (parole, contatori, barre, linea, arco, tappe). Freccia giù o spazio per avanzare, freccia su per tornare, R per rifare l'animazione.
- `?video=1&passi=1` → come sopra, ma barre, tappe e punti della lista compaiono uno per volta a ogni tasto, per andare a tempo con la voce.
- Social in home e nel piè di pagina: modificali in `index.html` e `dati/_template.html` (e nelle pagine già create).

Nuova dashboard: crea la cartella, copia il template, scrivi `data.json` (formato di esempio, con dati finti, in `dati/_esempio-data.json`), aggiungi una voce in `dati/index.json`.
