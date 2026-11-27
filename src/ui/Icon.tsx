const PATHS: Record<string, string> = {
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  cursor: 'M5 3l14 7-6 2-2 6z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  rotate: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  close: 'M6 6l12 12M18 6 6 18',
  chevronUp: 'm6 15 6-6 6 6',
  chevronDown: 'm6 9 6 6 6-6',
  check: 'm5 12 5 5 9-10',
  folder: 'M3 6h7l2 2h9v11H3z',
  download: 'M12 4v11m-5-5 5 5 5-5M5 20h14',
  upload: 'M12 20V9m-5 5 5-5 5 5M5 4h14',
  image: 'M4 5h16v14H4zM8 10h.01M20 16l-5-5-9 8',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  front: 'M8 8h12v12H8zM4 4h12v2M4 4v12h2',
  back: 'M4 4h12v12H4zM20 8v12H8v-2',
  polygon: 'M12 3l8 6-3 11H7L4 9z',
  walk: 'M8 3c1.5 0 2 1.5 2 3.5S9 11 8 11 6 9 6 6.5 6.5 3 8 3zM7 13h2v3H7zM16 8c1.5 0 2 1.5 2 3.5S17 16 16 16s-2-2-2-4.5.5-3.5 2-3.5zM15 18h2v3h-2z',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7',
};

export function Icon({ name, title }: { name: keyof typeof PATHS | string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
