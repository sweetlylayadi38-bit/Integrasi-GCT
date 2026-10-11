// Renders window.REKAP (data.js) into #app. No dependencies.
(function () {
  'use strict';
  var app = document.getElementById('app'), D = window.REKAP;
  if (!D) { document.getElementById('lede').textContent = 'Data rekap (data.js) gagal dimuat. Muat ulang halaman.'; return; }

  var RANK = { tinggi: 0, sedang: 1, rendah: 2 };
  function serius(b) { return b.jenis !== 'typo' && b.yakin !== 'rendah'; }

  // el('li.bug', 'text' | [children], {attr: value}) -- text always goes through textContent, never innerHTML
  function el(sel, kids, attrs) {
    var p = sel.split('.'), n = document.createElement(p[0]);
    if (p.length > 1) n.className = p.slice(1).join(' ');
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    [].concat(kids == null ? [] : kids).forEach(function (k) { n.append(k); });
    return n;
  }
  function list(cls, items) { return el('ul' + cls, items.map(function (t) { return el('li', t); })); }
  function pad(i) { return (i < 10 ? '0' : '') + i; }

  function bugItem(m, b, withSrc) {
    var y = RANK.hasOwnProperty(b.yakin) ? b.yakin : 'rendah';
    var meta = el('div.meta', [
      el('a', 'hal. ' + b.hal, { href: '#' + m.key + '-' + b.hal }),
      el('span.tag', b.jenis), el('span.tag.yk', 'yakin ' + b.yakin)
    ]);
    if (withSrc) meta.prepend(el('span.tag.src', m.nama));
    return el('li.bug.y-' + y, [
      meta,
      el('p', [el('b', 'Tertulis: '), el('q', b.tertulis)]),
      el('p', [el('b', 'Seharusnya: '), b.seharusnya]),
      el('p.why', b.alasan)
    ]);
  }
  function sortBugs(a, b) { return serius(b.b) - serius(a.b) || RANK[a.b.yakin] - RANK[b.b.yakin] || a.b.hal - b.b.hal; }

  function section(m) {
    var bugs = m.bug.map(function (b) { return { b: b }; }).sort(sortBugs).map(function (x) { return x.b; });
    var s = bugs.filter(serius), r = bugs.filter(function (b) { return !serius(b); });
    var sec = el('section', [el('p.eyebrow', m.nama), el('h2', m.judul), el('h3', 'Inti ujian'), list('.inti', m.inti), el('h3', 'Rekap per topik')], { id: m.key });

    sec.append(el('div.topik', m.bagian.map(function (t) {
      var hl = el('p.hl', 'hal. ');
      (t.halaman || []).forEach(function (h) { hl.append(el('a', String(h), { href: '#' + m.key + '-' + h }), ' '); });
      return el('article', [el('h4', t.judul), list('', t.poin), hl]);
    })));

    if (m.soal) sec.append(latihan(m));

    sec.append(el('h3', 'Kesalahan di berkas (' + bugs.length + ')'));
    if (!bugs.length) sec.append(el('p', 'Tidak ada.'));
    if (s.length) sec.append(el('ul.bugs', s.map(function (b) { return bugItem(m, b); })));
    if (r.length) sec.append(el('details', [
      el('summary', r.length + ' temuan kecil: salah ketik dan dugaan lemah'),
      el('ul.bugs', r.map(function (b) { return bugItem(m, b); }))
    ]));

    // Gallery stays closed: lazy images inside a closed <details> are not fetched until opened.
    sec.append(el('details.galeri', [
      el('summary', 'Semua gambar (' + m.halaman.length + ' halaman)'),
      el('div.gal', m.halaman.map(function (h) {
        return el('figure', [
          el('img', null, { loading: 'lazy', decoding: 'async', src: 'img/' + m.key + '-' + pad(h.n) + '.webp', alt: m.nama + ' halaman ' + h.n, width: m.w, height: m.h, tabindex: '0', role: 'button', 'aria-expanded': 'false' }),
          el('figcaption', [el('b', String(h.n)), ' ' + h.ket])
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
      if (s.mk) p.append(el('a', 'hal. ' + s.hal, { href: '#' + s.mk + '-' + s.hal }));
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

  function latihan(m) {
    function ref(s) { s.mk = m.key; return s; }
    return kuis('latihan-' + m.key, 'Latihan soal', [
      { judul: 'Pilihan ganda', items: m.soal.pg.map(ref) },
      { judul: 'Isian', items: m.soal.isian.map(function (s) { s.terima = s.jawab; return ref(s); }) }
    ]);
  }

  // Past integrated exams: one quiz per year, grouped by subject in original order.
  function integrasi(T) {
    var sec = el('section', [
      el('p.eyebrow', 'Soal tahun lalu'), el('h2', 'Ujian Praktikum Integrasi'),
      el('p.lede', 'Jawaban mengikuti slide praktikum. Bila kunci di berkas berbeda atau topiknya tidak ada di slide, ada catatan setelah soal dijawab.')
    ], { id: 'integrasi' });
    T.forEach(function (t) {
      var groups = [];
      t.soal.forEach(function (s) {
        var g = groups[groups.length - 1];
        if (!g || g.judul !== s.bidang) groups.push(g = { judul: s.bidang, items: [] });
        g.items.push(s);
      });
      sec.append(kuis(t.key, t.nama, groups));
    });
    return sec;
  }

  if (new URLSearchParams(location.search).has('selftest')) {
    console.assert(cocok('  Kapsula Fibrosa. ', ['kapsula fibrosa']) && cocok('3\u20134 cm', ['3-4 cm']) && !cocok('', ['x']) && !cocok('kapsul', ['kapsula fibrosa']) &&
      cocok('1,5 mL', ['1.5 ml']) && !cocok('15 ml', ['1,5 ml']) && cocok('E. coli', ['e. coli']) && cocok('h&e', ['H&E']), 'cocok() rusak');
  }

  var nPage = 0, nBug = 0, all = [];
  D.forEach(function (m) {
    nPage += m.halaman.length; nBug += m.bug.length;
    m.bug.filter(serius).forEach(function (b) { all.push({ m: m, b: b }); });
  });
  all.sort(function (a, b) { return RANK[a.b.yakin] - RANK[b.b.yakin]; });

  document.getElementById('lede').textContent = D.length + ' berkas, ' + nPage + ' halaman, semua gambar slide ikut. ' +
    nBug + ' kesalahan materi ditemukan, ' + all.length + ' di antaranya kesalahan isi dengan keyakinan sedang atau tinggi.';

  var nav = el('nav', D.map(function (m) {
    return el('a', [m.nama, el('small', m.halaman.length + ' hal · ' + (m.soal ? m.soal.pg.length + m.soal.isian.length : 0) + ' soal')], { href: '#' + m.key });
  }), { 'aria-label': 'Materi' });
  if (window.INTEG) nav.append(el('a', ['Ujian integrasi', el('small', window.INTEG.reduce(function (n, t) { return n + t.soal.length; }, 0) + ' soal · ' + window.INTEG.length + ' tahun')], { href: '#integrasi' }));
  nav.append(el('a', ['Semua kesalahan isi', el('small', all.length + ' temuan')], { href: '#salah' }));
  app.append(nav);
  var semua = el('button.sek.semua', 'Reset semua jawaban di halaman ini', { type: 'button' });
  semua.addEventListener('click', function () {
    var n = app.querySelectorAll('.soal > .ok, .soal > .no, .soal > .lihat').length;
    if (!n || n > 1 && !confirm('Reset ' + n + ' jawaban di semua latihan dan ujian integrasi?')) return;
    [].forEach.call(app.querySelectorAll('details.latihan'), function (d) { d.ulang(); });
  });
  app.append(semua);
  D.forEach(function (m) { app.append(section(m)); });
  if (window.INTEG) app.append(integrasi(window.INTEG));
  app.append(el('section', [
    el('p.eyebrow', 'Gabungan'), el('h2', 'Semua kesalahan isi'),
    el('p.lede', 'Diurut dari yang paling yakin. Cocokkan dulu dengan dosen atau buku acuan sebelum dipakai membantah slide.'),
    el('ul.bugs', all.map(function (x) { return bugItem(x.m, x.b, true); }))
  ], { id: 'salah' }));

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
