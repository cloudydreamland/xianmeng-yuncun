import { useEffect, useRef, useState } from 'react';

export interface LightboxImage {
  src: string;
  thumbnail: string;
  alt: string;
  caption?: string;
}

interface Props {
  galleryId: string;
  title: string;
  images: LightboxImage[];
}

export default function GalleryLightbox({ galleryId, title, images }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const show = (index: number, trigger?: HTMLElement | null) => {
    setActiveIndex(index);
    lastTriggerRef.current = trigger ?? null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  };

  const close = () => {
    dialogRef.current?.close();
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  };

  const move = (direction: number) => {
    setActiveIndex((index) => (index + direction + images.length) % images.length);
  };

  useEffect(() => {
    const root = document.getElementById(galleryId);
    if (!root) return;
    const triggers = [...root.querySelectorAll<HTMLElement>('[data-gallery-open]')];
    const listeners = triggers.map((trigger, index) => {
      const listener = (event: Event) => {
        event.preventDefault();
        show(index, trigger);
      };
      trigger.addEventListener('click', listener);
      return { trigger, listener };
    });
    return () => listeners.forEach(({ trigger, listener }) => trigger.removeEventListener('click', listener));
  }, [galleryId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const keydown = (event: KeyboardEvent) => {
      if (!dialog.open) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    };
    dialog.addEventListener('keydown', keydown);
    return () => dialog.removeEventListener('keydown', keydown);
  }, [images.length]);

  if (images.length === 0) return null;
  const image = images[activeIndex];

  return (
    <dialog
      ref={dialogRef}
      className="gallery-lightbox"
      aria-label={`${title}作品灯箱`}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.currentTarget === event.target) close(); }}
    >
      <div className="gallery-lightbox__panel">
        <header>
          <p><span>{String(activeIndex + 1).padStart(2, '0')}</span> / {String(images.length).padStart(2, '0')}</p>
          <strong>{title}</strong>
          <button type="button" onClick={close} aria-label="关闭作品灯箱">×</button>
        </header>
        <figure>
          <img src={image.src} alt={image.alt} />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
        {images.length > 1 && (
          <>
            <button className="gallery-lightbox__arrow gallery-lightbox__arrow--prev" type="button" onClick={() => move(-1)} aria-label="查看上一张">←</button>
            <button className="gallery-lightbox__arrow gallery-lightbox__arrow--next" type="button" onClick={() => move(1)} aria-label="查看下一张">→</button>
            <nav aria-label="选择作品图片">
              {images.map((item, index) => (
                <button key={`${item.src}-${index}`} type="button" className={index === activeIndex ? 'active' : ''} aria-label={`查看第 ${index + 1} 张：${item.alt}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveIndex(index)}>
                  <img src={item.thumbnail} alt="" />
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </dialog>
  );
}
