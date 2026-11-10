// Daftarkan service worker; beri tahu sekali saat semua file sudah tersimpan untuk offline.
if ('serviceWorker' in navigator) {
  const pertama = !navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    if (!pertama) return;
    const p = document.createElement('p');
    p.textContent = 'Siap dipakai offline.';
    p.setAttribute('role', 'status');
    p.style.cssText = 'position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);margin:0;padding:.5rem 1rem;border-radius:.5rem;background:#222;color:#fff;font:inherit;z-index:99';
    document.body.append(p);
    setTimeout(() => p.remove(), 4000);
  }).catch(() => {});
}
