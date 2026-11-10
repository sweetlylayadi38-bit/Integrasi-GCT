// Daftarkan service worker. Versi baru langsung dipakai (halaman dimuat ulang sekali),
// lalu gambar slide disimpan di belakang layar untuk dipakai offline.
if ('serviceWorker' in navigator) {
  const sw = navigator.serviceWorker;
  const adaLama = !!sw.controller;
  let sudah = false;
  sw.addEventListener('controllerchange', () => {
    if (adaLama && !sudah) { sudah = true; location.reload(); }
  });
  sw.addEventListener('message', e => {
    if (e.data !== 'gambar-tersimpan') return;
    try { if (localStorage.getItem('gct-offline') === 'v3') return; localStorage.setItem('gct-offline', 'v3'); } catch (_) {}
    const p = document.createElement('p');
    p.textContent = 'Siap dipakai offline.';
    p.setAttribute('role', 'status');
    p.style.cssText = 'position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);margin:0;padding:.5rem 1rem;border-radius:.5rem;background:#222;color:#fff;font:inherit;z-index:99';
    document.body.append(p);
    setTimeout(() => p.remove(), 4000);
  });
  sw.register('sw.js', {updateViaCache: 'none'}).then(reg => {
    reg.update().catch(() => {});
    return sw.ready;
  }).then(reg => { if (reg.active) reg.active.postMessage('simpan-gambar'); }).catch(() => {});
}
