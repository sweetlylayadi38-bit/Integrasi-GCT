// Small progressive enhancement for the rendered study guide.
(function () {
  'use strict';

  var app = document.getElementById('app');
  var nav = app && app.querySelector('nav');
  if (!nav) return;

  nav.id = 'materi';
  nav.setAttribute('aria-label', 'Navigasi dan pencarian materi');

  var label = document.createElement('label');
  label.className = 'search-control';
  label.innerHTML = '<span class="search-icon" aria-hidden="true">⌕</span><span class="visually-hidden">Cari di seluruh materi</span>';
  var input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Cari materi, topik, atau kata kunci…';
  input.autocomplete = 'off';
  input.setAttribute('aria-controls', 'materi');
  label.appendChild(input);

  var status = document.createElement('p');
  status.className = 'search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  nav.parentNode.insertBefore(label, nav);
  nav.parentNode.insertBefore(status, nav);

  function filter() {
    var query = input.value.trim().toLocaleLowerCase('id');
    var visible = 0;
    Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (link) {
      var id = decodeURIComponent(link.getAttribute('href').slice(1));
      var section = document.getElementById(id);
      var match = !query || (section && section.textContent.toLocaleLowerCase('id').indexOf(query) !== -1) || link.textContent.toLocaleLowerCase('id').indexOf(query) !== -1;
      link.hidden = !match;
      if (section && section.tagName === 'SECTION') {
        section.hidden = !match;
        if (match) visible += 1;
      }
    });
    status.textContent = query ? (visible ? visible + ' bagian cocok dengan “' + input.value.trim() + '”.' : 'Tidak ada materi yang cocok. Coba kata kunci lain.') : '';
  }

  input.addEventListener('input', filter);
})();
