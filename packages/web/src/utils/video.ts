// Convierte enlaces de video conocidos a su versión embebible.
// Devuelve null cuando el proveedor no se puede incrustar (se muestra el enlace).
export function aUrlEmbebible(url: string): string | null {
  try {
    const analizada = new URL(url);
    const host = analizada.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = analizada.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host.endsWith('youtube.com')) {
      const porParametro = analizada.searchParams.get('v');
      const porRuta = analizada.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? null;
      const id = porParametro ?? porRuta;
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host.endsWith('vimeo.com')) {
      const id = analizada.pathname.split('/').filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }

    if (host === 'drive.google.com') {
      const id = analizada.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      return id ? `https://drive.google.com/file/d/${id}/preview` : null;
    }

    // Salas de videollamada: se abren en una pestaña, no se incrustan
    return null;
  } catch {
    return null;
  }
}

// Etiqueta legible del proveedor, para el texto de respaldo del enlace
export function nombreDelProveedor(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('youtube') || host === 'youtu.be') return 'YouTube';
    if (host.includes('vimeo')) return 'Vimeo';
    if (host === 'drive.google.com') return 'Google Drive';
    if (host.includes('meet.google')) return 'Google Meet';
    if (host.includes('zoom')) return 'Zoom';
    return host;
  } catch {
    return 'enlace externo';
  }
}
