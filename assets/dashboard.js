/* Dashboard dati — piscopo-ora.github.io
   Legge ./data.json dalla cartella della pagina e disegna i grafici.
   Tipi: bigstat, split, compare, bars, trend, donut, timeline, list (stesso schema della skill infografiche-youtube-ora).
   Ogni grafico: id, label, title, note, src: [numeri delle fonti].
   ?video=1 → modalità video: un grafico per schermata, per registrare lo schermo. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => esc(s).replace(/\[([^\]]+)\]/g, '<span class="hl">$1</span>').replace(/\{([^}]+)\}/g, '<span style="color:var(--num)">$1</span>');
  const fmt = v => typeof v === 'number' ? v.toLocaleString('it-IT', { maximumFractionDigits: 1 }) : String(v);
  const params = new URLSearchParams(location.search);

  // tema: scelta salvata > data.json > chiaro
  const saved = (() => { try { return localStorage.getItem('tema'); } catch (e) { return null; } })();

  function head(c) {
    return (c.label ? `<div class="label"><span class="sq"></span>${esc(c.label)}</div>` : '') +
      (c.title ? `<h2>${rich(c.title)}</h2>` : '');
  }
  const note = c => c.note ? `<p class="note">${rich(c.note)}</p>` : '';

  const R = {
    bigstat: c => `<div class="bigstat"><div class="bignum">${esc(c.value)}${c.unit ? `<small>${esc(c.unit)}</small>` : ''}</div><div style="flex:1;min-width:280px">${head(c)}${note(c)}</div></div>`,
    split: c => {
      const box = d => `<div class="box ${d.highlight ? 'on' : ''}"><div class="v">${esc(d.value)}</div><div class="c">${rich(d.caption || '')}</div></div>`;
      return `${head(c)}<div class="split">${box(c.left)}<div class="vs">${esc(c.vs || 'vs')}</div>${box(c.right)}</div>${note(c)}`;
    },
    compare: c => bars(c), bars: c => bars(c),
    trend: c => `${head(c)}<div class="chart" data-trend></div>${note(c)}`,
    donut: c => {
      const v = Math.max(0, Math.min(100, +c.value)), r = 100, C = 2 * Math.PI * r;
      return `<div class="donut"><svg viewBox="0 0 260 260"><g transform="rotate(-90 130 130)">
        <circle cx="130" cy="130" r="${r}" fill="none" stroke="var(--track)" stroke-width="34"/>
        <circle class="arc" cx="130" cy="130" r="${r}" fill="none" stroke="var(--yel)" stroke-width="34" stroke-dasharray="0 ${C}" data-to="${C * v / 100} ${C}"/></g>
        <text x="130" y="148" text-anchor="middle" style="font-family:var(--serif);font-weight:600;font-size:52px;fill:var(--ink)">${esc(c.display || fmt(v) + '%')}</text></svg>
        <div style="flex:1;min-width:280px">${head(c)}${note(c)}</div></div>`;
    },
    timeline: c => `${head(c)}<div class="tl">${(c.events || []).map(e => `<div class="ev ${e.highlight ? 'on' : ''}"><i></i><div class="d">${esc(e.date)}</div><div class="x">${rich(e.text)}</div></div>`).join('')}</div>${note(c)}`,
    list: c => `${head(c)}<ol class="list">${(c.items || []).map((t, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${rich(t)}</li>`).join('')}</ol>${note(c)}`,
  };

  function bars(c) {
    const it = c.items || [], mx = Math.max(...it.map(i => +i.value)) || 1;
    return `${head(c)}<div class="bars">${it.map(i => `<div class="bar ${i.highlight ? 'on' : ''}" title="${esc(i.name)}: ${esc(i.display || fmt(+i.value))}">
      <div class="n">${esc(i.name)}</div><div class="t"><div class="f" data-w="${Math.max(1.5, 100 * i.value / mx)}"></div></div>
      <div class="v">${esc(i.display || fmt(+i.value))}</div></div>`).join('')}</div>${note(c)}`;
  }

  function drawTrend(box, c) {
    const pts = c.points || [], ys = pts.map(p => +p.y);
    const span = (Math.max(...ys) - Math.min(...ys)) || Math.abs(Math.max(...ys)) || 1;
    const lo = c.from_zero ? Math.min(0, ...ys) : Math.min(...ys) - span * .6;
    const hi = c.from_zero ? Math.max(...ys) * 1.12 : Math.max(...ys) + span * .35;
    const W = 1000, H = 360, px = 30, py = 40;
    const X = i => px + i * (W - 2 * px) / Math.max(1, pts.length - 1);
    const Y = v => py + (H - 2 * py) * (1 - (v - lo) / (hi - lo));
    const line = ys.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
    let s = `<svg viewBox="0 0 ${W} ${H + 30}"><line class="ax" x1="${px}" y1="${H - py}" x2="${W - px}" y2="${H - py}"/>
      <polygon class="ar" points="${X(0)},${H - py} ${line} ${X(ys.length - 1)},${H - py}"/><polyline class="ln" points="${line}"/>`;
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      s += `<circle class="pt ${last ? 'last' : ''}" cx="${X(i)}" cy="${Y(ys[i])}" r="${last ? 9 : 6}" data-i="${i}"/>`;
      if (last || i === 0 || p.show) s += `<text class="tv ${last ? 'last' : ''}" x="${X(i)}" y="${Y(ys[i]) - 20}" text-anchor="${last ? 'end' : i === 0 ? 'start' : 'middle'}">${esc(p.display || fmt(ys[i]))}</text>`;
      s += `<text class="tx" x="${X(i)}" y="${H - 6}" text-anchor="middle">${esc(p.x)}</text>`;
    });
    box.innerHTML = s + '</svg><div class="tip"></div>';
    const tip = $('.tip', box), svg = $('svg', box);
    box.querySelectorAll('.pt').forEach(pt => {
      pt.addEventListener('mouseenter', () => {
        const i = +pt.dataset.i, r = svg.getBoundingClientRect(), k = r.width / W;
        tip.innerHTML = `${esc(pts[i].x)}: <b>${esc(pts[i].display || fmt(ys[i]))}</b>`;
        tip.style.left = X(i) * k + 'px'; tip.style.top = Y(ys[i]) * k + 'px'; tip.style.opacity = 1; pt.setAttribute('r', 11);
      });
      pt.addEventListener('mouseleave', () => { tip.style.opacity = 0; pt.setAttribute('r', pt.classList.contains('last') ? 9 : 6); });
    });
  }

  function animate(sec) {
    sec.classList.add('in');
    sec.querySelectorAll('.f[data-w]').forEach(f => f.style.width = f.dataset.w + '%');
    sec.querySelectorAll('.arc[data-to]').forEach(a => a.setAttribute('stroke-dasharray', a.dataset.to));
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
    const S = d.sources || [];
    const charts = d.charts || [];
    const dt = d.date ? new Date(d.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    let h = `<header class="dhead"><div class="wrap">
      <div class="label"><span class="sq"></span>${esc(d.area || 'Sicilia')} · dati e fonti</div>
      <h1>${rich(d.title)}</h1><p class="lead">${rich(d.lead || '')}</p>
      <div class="meta">${dt ? `<span>Aggiornato al ${dt}</span>` : ''}<span>${charts.length} grafici · ${S.length} fonti</span>
      ${d.video ? `<a href="${esc(d.video)}" target="_blank" rel="noopener">Guarda il video ▸</a>` : ''}</div>
      <nav class="toc">${charts.map((c, i) => `<a href="#${esc(c.id || 'g' + (i + 1))}">${esc(c.label || c.title || 'Grafico ' + (i + 1))}</a>`).join('')}<a href="#fonti">Fonti</a></nav>
    </div></header>`;
    charts.forEach((c, i) => {
      const id = c.id || 'g' + (i + 1);
      h += `<section class="viz reveal" id="${esc(id)}" data-i="${i}"><div class="wrap">${(R[c.type] || (() => ''))(c)}
        <div class="vfoot"><div>${srcLinks(c.src, S)}</div><button class="copy" data-id="${esc(id)}">Copia link</button></div></div></section>`;
    });
    h += `<section class="sources" id="fonti"><div class="wrap"><h2>Fonti</h2><ol>${S.map((s, i) => `<li id="fonte-${i + 1}"><div>
      <span class="e">${esc(s.ente)}</span>${s.titolo ? ` · ${esc(s.titolo)}` : ''}${s.anno ? ` (${esc(s.anno)})` : ''}
      ${s.url ? `<br><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url.replace(/^https?:\/\//, '').slice(0, 70))}</a>` : ''}
      ${s.nota ? `<div class="w">${esc(s.nota)}</div>` : ''}</div></li>`).join('')}</ol>
      <p class="w" style="margin-top:24px;color:var(--muted);font-size:15px">Hai trovato un errore? Scrivimi: correggo e lo segnalo qui.</p></div></section>`;
    $('main').innerHTML = h;

    charts.forEach((c, i) => { if (c.type === 'trend') drawTrend($(`section[data-i="${i}"] [data-trend]`), c); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); } }), { threshold: .3, root: params.get('video') ? $('main') : null });
    document.querySelectorAll('.reveal').forEach(s => io.observe(s));

    document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
      const u = location.origin + location.pathname + '#' + b.dataset.id;
      try { await navigator.clipboard.writeText(u); b.textContent = 'Copiato'; } catch (e) { prompt('Link:', u); }
      setTimeout(() => b.textContent = 'Copia link', 1500);
    }));

    if (params.get('video')) {
      document.body.classList.add('video');
      const m = $('main'), secs = [...m.querySelectorAll('.dhead, .viz')];
      let k = 0;
      const go = n => { k = Math.max(0, Math.min(secs.length - 1, n)); secs[k].scrollIntoView({ behavior: 'smooth' }); };
      addEventListener('keydown', e => {
        if (['ArrowDown', 'ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); go(k + 1); }
        if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(k - 1); }
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
