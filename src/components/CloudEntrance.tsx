import { useEffect, useState } from 'react';

export default function CloudEntrance() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  function dismiss() {
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 520);
  }

  if (!visible) return null;

  return (
    <div className={`cloud-entrance ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-label="进入闲梦world">
      <div className="cloud-entrance__mist cloud-entrance__mist--left" aria-hidden="true" />
      <div className="cloud-entrance__mist cloud-entrance__mist--right" aria-hidden="true" />
      <div className="cloud-entrance__copy">
        <span>闲梦world</span>
        <strong>云门开，山河现</strong>
        <button className="animal-like-button" type="button" onClick={dismiss} aria-label="跳过云幕，进入闲梦world">
          入境
        </button>
      </div>
    </div>
  );
}
