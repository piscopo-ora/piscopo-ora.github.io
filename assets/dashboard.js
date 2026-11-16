/* Dashboard dati — piscopo-ora.github.io
   Legge ./data.json dalla cartella della pagina e disegna i grafici.
   Tipi: bigstat, split, compare, bars, trend, donut, timeline, list (stesso schema della skill infografiche-youtube-ora).
   Ogni grafico: id, label, title, note, src: [numeri delle fonti].
   ?video=1          → modalità video: un grafico per schermata, animazioni per elemento.
   ?video=1&passi=1  → come sopra, ma barre, tappe e punti compaiono uno per volta a ogni tasto. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => esc(s).replace(/\[([^\]]+)\]/g, '<span class="hl">$1</span>').replace(/\{([^}]+)\}/g, '<span class="acc">$1</span>');
  const fmt = v => typeof v === 'number' ? v.toLocaleString('it-IT', { maximumFractionDigits: 1 }) : String(v);
  const params = new URLSearchParams(location.search);
  const VIDEO = !!params.get('video'), PASSI = VIDEO && !!params.get('passi');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = (() => { try { return localStorage.getItem('tema'); } catch (e) { return null; } })();

  /* ---------- rendering ---------- */
  const head = c => (c.label ? `<div class="label"><span class="sq"></span>${esc(c.label)}</div>` : '') + (c.title ? `<h2 class="split-words">${rich(c.title)}</h2>` : '');
  const note = c => c.note ? `<p class="note">${rich(c.note)}</p>` : '';

  const R = {
    bigstat: c => `<div class="bigstat"><div class="bignum"><span class="count">${esc(c.value)}</span>${c.unit ? `<small>${esc(c.unit)}</small>` : ''}</div><div class="bigtxt">${head(c)}${note(c)}</div></div>`,
    split: c => {
      const box = (d, side) => `<div class="box ${side} ${d.highlight ? 'on' : ''}"><div class="v count">${esc(d.value)}</div><div class="c">${rich(d.caption || '')}</div></div>`;
      return `${head(c)}<div class="split">${box(c.left, 'l')}<div class="vs">${esc(c.vs || 'vs')}</div>${box(c.right, 'r')}</div>${note(c)}`;
    },
    compare: c => bars(c), bars: c => bars(c),
    trend: c => `${head(c)}<div class="chart" data-trend></div>${note(c)}`,
    donut: c => {
      const v = Math.max(0, Math.min(100, +c.value)), r = 100, C = 2 * Math.PI * r;
      return `<div class="donut"><div class="dwrap"><svg viewBox="0 0 260 260"><g transform="rotate(-90 130 130)">
        <circle cx="130" cy="130" r="${r}" fill="none" stroke="var(--track)" stroke-width="34"/>
        <circle class="arc" cx="130" cy="130" r="${r}" fill="none" stroke="var(--yel)" stroke-width="34" style="--to:${(C * v / 100).toFixed(1)} ${C.toFixed(1)};--c:${C.toFixed(1)}"/></g></svg>
        <div class="dv count">${esc(c.display || fmt(v) + '%')}</div></div>
        <div class="bigtxt">${head(c)}${note(c)}</div></div>`;
    },
    timeline: c => `${head(c)}<div class="tl">${(c.events || []).map((e, i) => `<div class="ev step ${e.highlight ? 'on' : ''}" style="--i:${i}"><i></i><div class="d">${esc(e.date)}</div><div class="x">${rich(e.text)}</div></div>`).join('')}</div>${note(c)}`,
    list: c => `${head(c)}<ol class="list">${(c.items || []).map((t, i) => `<li class="step" style="--i:${i}"><span>${String(i + 1).padStart(2, '0')}</span><div>${rich(t)}</div></li>`).join('')}</ol>${note(c)}`,
  };

  function bars(c) {
    const it = c.items || [], mx = Math.max(...it.map(i => +i.value)) || 1;
    return `${head(c)}<div class="bars">${it.map((i, k) => `<div class="bar step ${i.highlight ? 'on' : ''}" style="--i:${k};--w:${Math.max(1.5, 100 * i.value / mx).toFixed(1)}%" title="${esc(i.name)}: ${esc(i.display || fmt(+i.value))}">
      <div class="n">${esc(i.name)}</div><div class="t"><div class="f"></div></div>
      <div class="v count">${esc(i.display || fmt(+i.value))}</div></div>`).join('')}</div>${note(c)}`;
  }

  function drawTrend(box, c) {
    const pts = c.points || [], ys = pts.map(p => +p.y);
    const span = (Math.max(...ys) - Math.min(...ys)) || Math.abs(Math.max(...ys)) || 1;
    const lo = c.from_zero ? Math.min(0, ...ys) : Math.min(...ys) - span * .6;
    const hi = c.from_zero ? Math.max(...ys) * 1.12 : Math.max(...ys) + span * .35;
    const W = 1000, H = 360, px = 30, py = 40;
    const X = i => px + i * (W - 2 * px) / Math.max(1, pts.length - 1);
    const Y = v => py + (H - 2 * py) * (1 - (v - lo) / (hi - lo));
    const line = ys.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const n = Math.max(1, pts.length - 1);
    let s = `<svg viewBox="0 0 ${W} ${H + 30}"><line class="ax" x1="${px}" y1="${H - py}" x2="${W - px}" y2="${H - py}"/>
      <polygon class="ar" points="${X(0)},${H - py} ${line} ${X(ys.length - 1)},${H - py}"/><polyline class="ln" points="${line}"/>`;
    pts.forEach((p, i) => {
      const last = i === pts.length - 1, f = (i / n).toFixed(3);
      s += `<circle class="pt ${last ? 'last' : ''}" cx="${X(i)}" cy="${Y(ys[i])}" r="${last ? 9 : 6}" data-i="${i}" style="--f:${f}"/>`;
      if (last || i === 0 || p.show) s += `<text class="tv ${last ? 'last' : ''}" x="${X(i)}" y="${Y(ys[i]) - 20}" text-anchor="${last ? 'end' : i === 0 ? 'start' : 'middle'}" style="--f:${f}">${esc(p.display || fmt(ys[i]))}</text>`;
      s += `<text class="tx" x="${X(i)}" y="${H - 6}" text-anchor="middle" style="--f:${f}">${esc(p.x)}</text>`;
    });
    box.innerHTML = s + '</svg><div class="tip"></div>';
    const ln = $('.ln', box), L = Math.ceil(ln.getTotalLength ? ln.getTotalLength() : 3000);
    ln.style.setProperty('--len', L);
    const tip = $('.tip', box), svg = $('svg', box);
    $$('.pt', box).forEach(pt => {
      pt.addEventListener('mouseenter', () => {
        const i = +pt.dataset.i, r = svg.getBoundingClientRect(), k = r.width / W;
        tip.innerHTML = `${esc(pts[i].x)}: <b>${esc(pts[i].display || fmt(ys[i]))}</b>`;
        tip.style.left = X(i) * k + 'px'; tip.style.top = Y(ys[i]) * k + 'px'; tip.style.opacity = 1;
      });
      pt.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
    });
  }

  /* ---------- parole del titolo che salgono una per volta ---------- */
  function splitWords(root) {
    let k = 0;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--d', k++);
            w.appendChild(inner); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) {
          if (ch.classList.contains('hl')) ch.style.setProperty('--hd', (0.35 + k * 0.055 + 0.25).toFixed(2) + 's');
          walk(ch);
        }
      });
    };
    walk(root);
    root.style.setProperty('--words', k);
  }

  /* ---------- contatori ---------- */
  function parseNum(t) {
    const m = t.match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/);
    if (!m) return null;
    const raw = m[0], dec = (raw.split(',')[1] || '').length;
    const val = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    return { pre: t.slice(0, m.index), post: t.slice(m.index + raw.length), val, dec, thousands: /\.\d{3}/.test(raw) };
  }
  function countUp(el, delay) {
    if (!el.dataset.orig) el.dataset.orig = el.textContent;
    const p = parseNum(el.dataset.orig);
    if (!p || REDUCED) { el.textContent = el.dataset.orig; return; }
    const dur = 1100, f = v => v.toLocaleString('it-IT', { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec, useGrouping: p.thousands });
    el.textContent = p.pre + f(0) + p.post;
    clearTimeout(el._t); cancelAnimationFrame(el._r);
    el._t = setTimeout(() => {
      const t0 = performance.now();
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = p.pre + f(p.val * e) + p.post;
        if (k < 1) el._r = requestAnimationFrame(tick); else el.textContent = el.dataset.orig;
      };
      el._r = requestAnimationFrame(tick);
    }, delay);
  }

  /* ---------- coreografia ---------- */
  function play(sec) {
    sec.classList.add('in');
    const counts = $$('.count', sec);
    counts.forEach(el => {
      const bar = el.closest('.step');
      if (PASSI && bar) return;                                  // in modalità passi conta quando compare
      const i = bar ? +getComputedStyle(bar).getPropertyValue('--i') || 0 : 0;
      const base = el.closest('.box.r') ? 750 : el.closest('.box') ? 550 : el.closest('.bar') ? 550 + i * 90 : 450;
      countUp(el, base);
    });
  }
  function rewind(sec) {
    sec.classList.remove('in');
    $$('.step.shown', sec).forEach(s => s.classList.remove('shown'));
    $$('.count', sec).forEach(el => { clearTimeout(el._t); cancelAnimationFrame(el._r); if (el.dataset.orig) el.textContent = el.dataset.orig; });
  }
  function nextStep(sec) {
    const s = $$('.step:not(.shown)', sec)[0];
    if (!s) return false;
    s.classList.add('shown');
    const c = $('.count', s); if (c) countUp(c, 150);
    return true;
  }

  function srcLinks(ids, sources) {
    if (!ids || !ids.length) return '<span></span>';
    return 'Fonte: ' + ids.map(n => {
      const s = sources[n - 1]; if (!s) return '';
      return `<a class="src" href="#fonte-${n}">${esc(s.ente)}${s.anno ? ', ' + esc(s.anno) : ''}</a>`;
    }).filter(Boolean).join(' · ');
  }

  async function main() {
    const d = await (await fetch('data.json', { cache: 'no-cache' })).json();
    document.documentElement.dataset.theme = saved || d.theme || 'chiaro';
    document.title = `${d.title.replace(/[\[\]{}]/g, '')} · Dati e fonti · Vincenzo Claudio Piscopo`;
    const desc = document.querySelector('meta[name="description"]'); if (desc) desc.content = d.lead || '';
    const S = d.sources || [], charts = d.charts || [];
    const dt = d.date ? new Date(d.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    let h = `<header class="dhead anim"><div class="wrap">
      <div class="label"><span class="sq"></span>${esc(d.area || 'Sicilia')} · dati e fonti</div>
      <h1 class="split-words">${rich(d.title)}</h1><p class="lead">${rich(d.lead || '')}</p>
      <div class="meta">${dt ? `<span>Aggiornato al ${dt}</span>` : ''}<span>${charts.length} grafici · ${S.length} fonti</span>
      ${d.video ? `<a href="${esc(d.video)}" target="_blank" rel="noopener">Guarda il video ▸</a>` : ''}</div>
      <nav class="toc">${charts.map((c, i) => `<a href="#${esc(c.id || 'g' + (i + 1))}">${esc(c.label || c.title || 'Grafico ' + (i + 1))}</a>`).join('')}<a href="#fonti">Fonti</a></nav>
    </div></header>`;
    charts.forEach((c, i) => {
      const id = c.id || 'g' + (i + 1);
      h += `<section class="viz anim t-${esc(c.type)}" id="${esc(id)}" data-i="${i}"><div class="wrap">${(R[c.type] || (() => ''))(c)}
        <div class="vfoot"><div>${srcLinks(c.src, S)}</div><button class="copy" data-id="${esc(id)}">Copia link</button></div></div></section>`;
    });
    h += `<section class="sources" id="fonti"><div class="wrap"><h2>Fonti</h2><ol>${S.map((s, i) => `<li id="fonte-${i + 1}"><div>
      <span class="e">${esc(s.ente)}</span>${s.titolo ? ` · ${esc(s.titolo)}` : ''}${s.anno ? ` (${esc(s.anno)})` : ''}
      ${s.url ? `<br><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url.replace(/^https?:\/\//, '').slice(0, 70))}</a>` : ''}
      ${s.nota ? `<div class="w2">${esc(s.nota)}</div>` : ''}</div></li>`).join('')}</ol>
      <p class="w2" style="margin-top:24px">Hai trovato un errore? Scrivimi: correggo e lo segnalo qui.</p></div></section>`;
    $('main').innerHTML = h;

    charts.forEach((c, i) => { if (c.type === 'trend') drawTrend($(`section[data-i="${i}"] [data-trend]`), c); });
    $$('.split-words').forEach(splitWords);
    if (VIDEO) document.body.classList.add('video');
    if (PASSI) document.body.classList.add('passi');
    if (REDUCED) document.body.classList.add('reduced');

    const secs = $$('.anim');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= (VIDEO ? .6 : .25)) {
        if (!e.target.classList.contains('in')) play(e.target);
        if (!VIDEO) io.unobserve(e.target);
      } else if (VIDEO && e.intersectionRatio < .05) rewind(e.target);   // tornando indietro l'animazione riparte
    }), { threshold: [0, .05, .25, .6], root: VIDEO ? $('main') : null });
    secs.forEach(s => io.observe(s));

    $$('.copy').forEach(b => b.addEventListener('click', async () => {
      const u = location.origin + location.pathname + '#' + b.dataset.id;
      try { await navigator.clipboard.writeText(u); b.textContent = 'Copiato'; } catch (e) { prompt('Link:', u); }
      setTimeout(() => b.textContent = 'Copia link', 1500);
    }));

    if (VIDEO) {
      let k = 0;
      const go = n => { k = Math.max(0, Math.min(secs.length - 1, n)); secs[k].scrollIntoView({ behavior: 'smooth' }); };
      $('main').addEventListener('scroll', () => {
        const top = $('main').scrollTop, hgt = innerHeight;
        k = Math.round(top / hgt);
      }, { passive: true });
      addEventListener('keydown', e => {
        if (['ArrowDown', 'ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) {
          e.preventDefault();
          if (PASSI && secs[k].classList.contains('in') && nextStep(secs[k])) return;
          go(k + 1);
        }
        if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(k - 1); }
        if (e.key === 'r' || e.key === 'R') { rewind(secs[k]); requestAnimationFrame(() => play(secs[k])); }
      });
    }
  }

  window.toggleTheme = () => {
    const t = document.documentElement.dataset.theme === 'scuro' ? 'chiaro' : 'scuro';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('tema', t); } catch (e) {}
  };
  main().catch(e => { $('main').innerHTML = `<div class="wrap" style="padding:80px 0">Dati non disponibili. (${esc(e.message)})</div>`; });
})();
