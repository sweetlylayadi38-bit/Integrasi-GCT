// Renders window.REKAP (data.js, slide page) or window.INTEG (integ.js, exam page) into #app. No dependencies.
(function () {
  'use strict';
  var app = document.getElementById('app'), D = window.REKAP, T = window.INTEG;
  if (!D && !T) { document.getElementById('lede').textContent = 'Data gagal dimuat. Muat ulang halaman.'; return; }

  // el('figure', 'text' | [children], {attr: value}) -- text always goes through textContent, never innerHTML
  function el(sel, kids, attrs) {
    var p = sel.split('.'), n = document.createElement(p[0]);
    if (p.length > 1) n.className = p.slice(1).join(' ');
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    [].concat(kids == null ? [] : kids).forEach(function (k) { n.append(k); });
    return n;
  }
  function pad(i) { return (i < 10 ? '0' : '') + i; }

  function section(m) {
    var sec = el('section', [el('p.eyebrow', m.nama), el('h2', m.judul)], { id: m.key });

    // Gallery stays closed: lazy images inside a closed <details> are not fetched until opened.
    sec.append(el('details.galeri', [
      el('summary', 'Slide (' + m.halaman.length + ' halaman)'),
      el('div.gal', m.halaman.map(function (h) {
        return el('figure', [
          el('img', null, { loading: 'lazy', decoding: 'async', src: 'img/' + m.key + '-' + pad(h.n) + '.webp', alt: m.nama + ' halaman ' + h.n, width: m.w, height: m.h, tabindex: '0', role: 'button', 'aria-expanded': 'false' }),
          el('figcaption', [el('b', String(h.n)), ' ' + h.ket,
            h.jelas ? el('p.jelas', [el('b', 'Penjelasan: '), h.jelas]) : '',
            h.catatan ? el('p.catatan', [el('b', 'Catatan: '), h.catatan]) : '',
            h.sumber ? el('p.sumber', 'Sumber: ' + h.sumber.join('; ')) : ''])
        ], { id: m.key + '-' + h.n });
      }))
    ]));
    return sec;
  }


  // ---- Latihan soal ----
  // ponytail: exact match after normalising; add fuzzy matching only if valid answers keep getting rejected
  function norm(s) {
    return String(s).toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/(\d),(\d)/g, '$1.$2')   // 1,5 and 1.5 are the same number
      .replace(/["'()!?;:]/g, '').replace(/[.,]+(\s|$)/g, '$1').replace(/\s+/g, ' ').trim();
  }
  function cocok(input, jawab) { var v = norm(input); return !!v && jawab.some(function (j) { return norm(j) === v; }); }

  // One question. s: {q, img?, opsi+jawab | terima, alasan, mk?, hal?, status?, kunci?, catatan?}
  function soalItem(s, id, nilai) {
    var li = el('li'), kunci = s.opsi ? 'ABCDEFGH'[s.jawab] + '. ' + s.opsi[s.jawab] : s.terima[0];
    li.ulang = function () { var baru = soalItem(s, id, nilai); li.replaceWith(baru); return baru; };   // back to unanswered
    function selesai(ok) {                      // ok: true/false = scored, null = revealed without scoring
      li.classList.add(ok === null ? 'lihat' : ok ? 'ok' : 'no');
      nilai();
      var p = el('p.hasil', [el('b', ok === null ? 'Jawaban: ' : ok ? 'Benar. ' : 'Salah. '), (ok === null ? '' : 'Jawaban: ') + kunci + '. ' + s.alasan + ' ']);
      if (s.mk) p.append(el('a', 'hal. ' + s.hal, { href: 'index.html#' + s.mk + '-' + s.hal, target: '_blank', rel: 'noopener' }));
      li.append(p);
      if (s.status === 'beda') li.append(el('p.cat', [el('b', 'Beda dengan kunci berkas. '), (s.kunci ? 'Kunci berkas: ' + s.kunci + '. ' : '') + (s.catatan || '')]));
      else if (s.status === 'tidak_ada_di_ppt') li.append(el('p.cat', [el('b', 'Tidak ada di PPT. '), s.catatan || 'Jawaban ikut kunci berkas.']));
      if (ok === false && !s.opsi) {            // exact matching misses valid wording: let the student overrule it
        var ralat = el('button.sek', 'Jawabanku benar', { type: 'button' });
        ralat.addEventListener('click', function () {
          li.classList.replace('no', 'ok'); nilai(); li.querySelector('.hasil b').textContent = 'Benar. '; ralat.nextSibling.focus(); ralat.remove();
        });
        li.append(ralat);
      }
      var reset = el('button.sek', 'Reset soal', { type: 'button' });
      reset.addEventListener('click', function () { var baru = li.ulang(); nilai(); baru.querySelector('input, button').focus(); });
      li.append(reset);
    }
    function gambar() {
      return el('div.gbr', s.img.map(function (g, i) {
        var im = el('img', null, { loading: 'lazy', decoding: 'async', src: 'img/integ/' + g[0], width: g[1], height: g[2], alt: 'Gambar ' + (i + 1) + ' soal ' + (s.no || '') });
        return s.img.length > 1 ? el('figure', [im, el('figcaption', 'Gambar ' + (i + 1))]) : im;
      }));
    }
    if (s.opsi) {
      li.append(el('p.q', s.q));
      if (s.img) li.append(gambar());
      var ops = el('div.opsi', s.opsi.map(function (o, i) {
        return el('button', [el('b', 'ABCDEFGH'[i] + '. '), o], { type: 'button', 'data-i': i });
      }));
      ops.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || b.disabled) return;
        var i = +b.getAttribute('data-i');
        [].forEach.call(ops.children, function (x, j) { x.disabled = true; if (j === s.jawab) x.classList.add('kunci'); });
        if (i !== s.jawab) b.classList.add('pilih');
        selesai(i === s.jawab);
      });
      li.append(ops);
    } else {
      var inp = el('input', null, { id: id, type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
      var cek = el('button', 'Cek', { type: 'submit' }), lihat = el('button.sek', 'Lihat jawaban', { type: 'button' });
      var f = el('form', [el('label.q', s.q, { for: id })]);
      if (s.img) f.append(gambar());
      f.append(el('div.baris', [inp, cek, lihat]));
      function kunciForm() { inp.disabled = cek.disabled = lihat.disabled = true; }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (inp.disabled) return;
        if (!inp.value.trim()) { inp.focus(); return; }
        kunciForm(); selesai(cocok(inp.value, s.terima));
      });
      lihat.addEventListener('click', function () { kunciForm(); selesai(null); });
      li.append(f);
    }
    return li;
  }

  // groups: [{judul, items}] -> <details> with running score
  function kuis(id, judul, groups) {
    var total = groups.reduce(function (n, g) { return n + g.items.length; }, 0);
    var skor = el('p.skor', '', { 'aria-live': 'polite' });
    var reset = el('button.sek', 'Reset semua jawaban', { type: 'button', hidden: '' });
    function hitung(sel) { return d.querySelectorAll(sel).length; }
    function nilai() {                          // recount from the DOM, so no reset path can leave the score out of sync
      var benar = hitung('.soal > .ok'), dijawab = benar + hitung('.soal > .no');
      skor.textContent = dijawab ? 'Skor ' + benar + ' dari ' + dijawab + ' terjawab (' + total + ' soal)' : '';
      reset.hidden = !dijawab && !hitung('.soal > .lihat');
    }
    var d = el('details.latihan', [el('summary', judul + ' (' + total + ')'), skor, reset], { id: id });
    d.ulang = function () {
      [].forEach.call(d.querySelectorAll('.soal > .ok, .soal > .no, .soal > .lihat'), function (li) { li.ulang(); });
      nilai();
    };
    reset.addEventListener('click', function () {
      var n = hitung('.soal > .ok, .soal > .no, .soal > .lihat');
      if (n > 1 && !confirm('Reset ' + n + ' jawaban di ' + judul + '?')) return;
      d.ulang(); d.firstChild.focus();
    });
    groups.forEach(function (g, gi) {
      d.append(el('h4', g.judul), el('ol.soal', g.items.map(function (s, n) { return soalItem(s, 'isi-' + id + '-' + gi + '-' + n, nilai); })));
    });
    return d;
  }

  // Past integrated exams: one quiz per year, grouped by subject in original order.
  function tahun(t) {
    var groups = [];
    t.soal.forEach(function (s) {
      var g = groups[groups.length - 1];
      if (!g || g.judul !== s.bidang) groups.push(g = { judul: s.bidang, items: [] });
      g.items.push(s);
    });
    return kuis(t.key, t.nama, groups);
  }

  if (new URLSearchParams(location.search).has('selftest')) {
    console.assert(cocok('  Kapsula Fibrosa. ', ['kapsula fibrosa']) && cocok('3\u20134 cm', ['3-4 cm']) && !cocok('', ['x']) && !cocok('kapsul', ['kapsula fibrosa']) &&
      cocok('1,5 mL', ['1.5 ml']) && !cocok('15 ml', ['1,5 ml']) && cocok('E. coli', ['e. coli']) && cocok('h&e', ['H&E']), 'cocok() rusak');
  }

  var nav;
  if (D && /^#integ/.test(location.hash)) { location.replace('integrasi.html' + location.hash); return; }   // old links to exams on the slide page
  if (D) {
    var nPage = D.reduce(function (n, m) { return n + m.halaman.length; }, 0);
    document.getElementById('lede').textContent = D.length + ' berkas praktikum, ' + nPage + ' halaman slide.';
    nav = el('nav', D.map(function (m) {
      return el('a', [m.nama, el('small', m.halaman.length + ' hal')], { href: '#' + m.key });
    }), { 'aria-label': 'Materi' });
    app.append(nav);
    D.forEach(function (m) { app.append(section(m)); });
  } else {
    var nSoal = T.reduce(function (n, t) { return n + t.soal.length; }, 0);
    document.getElementById('lede').textContent = nSoal + ' soal dari ' + T.length + ' tahun ujian. Jawaban mengikuti slide praktikum; bila kunci di berkas berbeda atau topiknya tidak ada di slide, ada catatan setelah soal dijawab.';
    nav = el('nav', T.map(function (t) {
      return el('a', [t.nama, el('small', t.soal.length + ' soal')], { href: '#' + t.key });
    }), { 'aria-label': 'Tahun ujian' });
    app.append(nav);
    var semua = el('button.sek.semua', 'Reset semua jawaban di halaman ini', { type: 'button' });
    semua.addEventListener('click', function () {
      var n = app.querySelectorAll('.soal > .ok, .soal > .no, .soal > .lihat').length;
      if (!n || n > 1 && !confirm('Reset ' + n + ' jawaban di semua tahun?')) return;
      [].forEach.call(app.querySelectorAll('details.latihan'), function (d) { d.ulang(); });
    });
    app.append(semua);
    app.append(el('section', T.map(tahun), { id: 'integrasi' }));
  }

  // Content is rendered after load, so the browser's own jump to #hash has nothing to land on: do it once here.
  // In-page links only need their <details> opened; the browser then scrolls and restores position on Back.
  function reveal(id) {
    var t = id && document.getElementById(id), d = t && t.closest('details');
    if (d) d.open = true;
    return t;
  }
  var first = reveal(location.hash.slice(1));
  if (first) first.scrollIntoView();

  app.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a) reveal(a.getAttribute('href').slice(1));
    if (e.target.matches('.gal img')) e.target.setAttribute('aria-expanded', e.target.closest('figure').classList.toggle('big'));
  });
  app.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.gal img')) { e.preventDefault(); e.target.click(); }
  });
})();
