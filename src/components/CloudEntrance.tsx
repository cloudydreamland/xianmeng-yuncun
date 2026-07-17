import { useEffect, useState } from 'react';

const SESSION_KEY = 'yuncun-entered';

export default function CloudEntrance() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visited = window.sessionStorage.getItem(SESSION_KEY) === 'true';

    if (reduceMotion || visited) return;

    setVisible(true);
    const timer = window.setTimeout(() => dismiss(), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    window.sessionStorage.setItem(SESSION_KEY, 'true');
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 650);
  }

  if (!visible) return null;

  return (
    <div className={`cloud-entrance ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-label="进入云村">
      <div className="cloud-entrance__mist cloud-entrance__mist--left" aria-hidden="true" />
      <div className="cloud-entrance__mist cloud-entrance__mist--right" aria-hidden="true" />
      <div className="cloud-entrance__copy">
        <span>XIÁN MÈNG</span>
        <strong>云深处，梦归乡</strong>
        <button className="animal-like-button" type="button" onClick={dismiss} aria-label="跳过云幕，进入云村">
          入村
        </button>
      </div>
    </div>
  );
}
