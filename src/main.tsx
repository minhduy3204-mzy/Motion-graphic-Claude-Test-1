import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, type PlayerRef} from '@remotion/player';
import {Motion} from './Motion';
import {COPY, VIDEO} from './config';
import './preview.css';

const time = (frame: number) => `${(frame / VIDEO.fps).toFixed(1).padStart(4, '0')}s`;
const scenes = [
  {number: '01', title: 'Hook', subtitle: COPY.hook.join(' '), frame: VIDEO.sceneStarts[0]},
  {number: '02', title: 'Phát triển', subtitle: COPY.development.join(' '), frame: VIDEO.sceneStarts[1]},
  {number: '03', title: 'Cao trào', subtitle: COPY.climax.join(' · '), frame: VIDEO.sceneStarts[2]},
  {number: '04', title: 'Kết', subtitle: COPY.ending.join(' '), frame: VIDEO.sceneStarts[3]},
];

const App: React.FC = () => {
  const player = useRef<PlayerRef>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requested = Number(query.get('frame'));
    if (Number.isFinite(requested) && requested > 0) {
      player.current?.seekTo(Math.min(VIDEO.durationInFrames - 1, Math.floor(requested)));
    }
    let raf = 0;
    const update = () => {
      const f = player.current?.getCurrentFrame() ?? 0;
      setFrame(f);
      if (f >= VIDEO.durationInFrames - 1) setPlaying(false);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    if (playing) player.current?.pause();
    else {
      if (frame >= VIDEO.durationInFrames - 1) player.current?.seekTo(0);
      player.current?.play();
    }
    setPlaying(!playing);
  };

  const restart = () => {
    player.current?.pause();
    player.current?.seekTo(0);
    setPlaying(false);
  };

  const seek = (f: number) => {
    player.current?.seekTo(f);
    setFrame(f);
  };

  const active = frame < VIDEO.sceneEnds[0] ? 0 : frame < VIDEO.sceneEnds[1] ? 1 : frame < VIDEO.sceneEnds[2] ? 2 : 3;

  return <main className="app">
    <div className="topbar"><span className="brand-mark" /><span>MOTION / LAB</span><span className="topbar-right">CREATIVE STUDIO · 001</span></div>
    <div className="layout">
      <section className="stage-column" aria-label="Bản xem trước video">
        <div className="stage-title"><span className="eyebrow">BẢN XEM TRƯỚC / 01</span><span className="live-dot">30 FPS · 9:16</span></div>
        <div className="player-wrap"><Player ref={player} component={Motion} compositionWidth={VIDEO.width} compositionHeight={VIDEO.height} durationInFrames={VIDEO.durationInFrames} fps={VIDEO.fps} style={{width: '100%', height: '100%'}} controls={false} autoPlay={false} loop={false} /></div>
        <div className="transport">
          <div className="transport-head"><span>PLAYBACK</span><span>{time(frame)} <i>/</i> {time(VIDEO.durationInFrames)}</span></div>
          <input aria-label="Thanh tua video" className="seek" type="range" min="0" max={VIDEO.durationInFrames - 1} step="1" value={frame} onChange={(e) => seek(Number(e.target.value))} style={{'--seek-progress': `${frame / (VIDEO.durationInFrames - 1) * 100}%`} as React.CSSProperties} />
          <div className="transport-buttons"><button className="play-button" type="button" onClick={toggle}><span className={playing ? 'pause-symbol' : 'play-symbol'} aria-hidden="true" />{playing ? 'Tạm dừng' : 'Phát video'}</button><button className="icon-button" type="button" onClick={restart}>↺ <span>Phát lại</span></button><span className="frame-count">FRAME {String(frame).padStart(3, '0')} / {VIDEO.durationInFrames - 1}</span></div>
        </div>
      </section>
      <aside className="details">
        <span className="eyebrow accent">MOTION GRAPHIC / 2026</span>
        <h1>Biến ý tưởng<br /><em>thành chuyển động.</em></h1>
        <p className="intro">Một câu chuyện 15 giây về cách một ý tưởng trở nên rõ ràng, khác biệt và đáng nhớ qua chuyển động.</p>
        <div className="rule" />
        <div className="section-label"><span>CẤU TRÚC</span><span>04 CẢNH</span></div>
        <div className="scene-list">{scenes.map((scene, i) => <button type="button" key={scene.number} className={`scene ${active === i ? 'active' : ''}`} onClick={() => seek(scene.frame)}>
          <span className="scene-index">{scene.number}</span><span className="scene-copy"><strong>{scene.title}</strong><small>{scene.subtitle}</small></span><span className="scene-arrow" aria-hidden="true" />
        </button>)}</div>
        <div className="specs"><div><span>ĐỊNH DẠNG</span><strong>{VIDEO.width} × {VIDEO.height}</strong></div><div><span>THỜI LƯỢNG</span><strong>{VIDEO.durationInFrames / VIDEO.fps} GIÂY</strong></div><div><span>ÂM THANH</span><strong>KHÔNG</strong></div></div>
        <a className="download" href="/out/motion-graphic.mp4" download>↓ <span>Tải video MP4</span></a>
      </aside>
    </div>
  </main>;
};

createRoot(document.getElementById('root')!).render(<App />);
