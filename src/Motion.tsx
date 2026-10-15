import React, {useEffect} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {COLORS, COPY, FONT_FAMILY, VIDEO} from './config';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const progress = (frame: number, begin: number, frames: number) => ease((frame - begin) / frames);

type LineProps = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  frame: number;
  begin: number;
  color?: string;
  weight?: 400 | 700;
  spacing?: number;
  width?: number;
};

const Line: React.FC<LineProps> = ({id, text, x, y, size, frame, begin, color = COLORS.foreground, weight = 700, spacing = -3, width = 900}) => {
  const p = progress(frame, begin, 16);
  return <g clipPath={`url(#${id})`}>
    <defs><clipPath id={id}><rect x={x - 5} y={y - size * 1.05} width={width + 10} height={size * 1.28} /></clipPath></defs>
    <text x={x} y={y + (1 - p) * size * 0.95} opacity={p} fill={color} fontFamily={FONT_FAMILY} fontSize={size} fontWeight={weight} letterSpacing={spacing}>{text}</text>
  </g>;
};

const Rail: React.FC<{frame: number}> = ({frame}) => {
  const segment = frame < VIDEO.sceneEnds[0] ? 0 : frame < VIDEO.sceneEnds[1] ? 1 : frame < VIDEO.sceneEnds[2] ? 2 : 3;
  const start = VIDEO.sceneStarts[segment];
  const end = VIDEO.sceneEnds[segment];
  const current = clamp((frame - start) / (end - start));
  return <g>
    <line x1="90" y1="1655" x2="990" y2="1655" stroke={COLORS.hairline} strokeWidth="2" />
    <rect x="90" y="1652" width={900 * current} height="6" fill={COLORS.accent} />
    <text x="90" y="1717" fill={COLORS.muted} fontFamily={FONT_FAMILY} fontWeight="400" fontSize="26" letterSpacing="5">MOTION STUDY</text>
    <text x="990" y="1717" textAnchor="end" fill={COLORS.foreground} fontFamily={FONT_FAMILY} fontWeight="700" fontSize="26" letterSpacing="3">0{segment + 1} / 04</text>
  </g>;
};

const Hook: React.FC<{frame: number}> = ({frame}) => {
  const bar = progress(frame, 5, 22);
  const ring = progress(frame, 33, 22);
  return <g>
    <text x="90" y="282" fill={COLORS.accent} fontFamily={FONT_FAMILY} fontSize="28" letterSpacing="8">01 — KHỞI ĐẦU</text>
    <rect x="90" y="468" width={mix(0, 900, bar)} height="18" fill={COLORS.accent} />
    <Line id="hook1" text={COPY.hook[0]} x={90} y={746} size={175} frame={frame} begin={9} spacing={-8} />
    <Line id="hook2" text={COPY.hook[1]} x={90} y={977} size={220} frame={frame} begin={20} color={COLORS.accent} spacing={-10} />
    <circle cx="794" cy="1172" r={mix(0, 186, ring)} stroke={COLORS.accent} strokeWidth="5" fill="none" />
    <circle cx="794" cy="1172" r={mix(0, 137, ring)} stroke={COLORS.hairline} strokeWidth="2" fill="none" />
    <path d="M90 1350 H635" stroke={COLORS.foreground} strokeWidth="2" strokeDasharray={`${mix(0, 545, progress(frame, 29, 20))} 545`} />
    <text x="90" y="1420" fill={COLORS.muted} fontFamily={FONT_FAMILY} fontSize="32" letterSpacing="2">Mọi thứ bắt đầu bằng một nhịp.</text>
  </g>;
};

const Development: React.FC<{frame: number}> = ({frame}) => {
  const local = frame - VIDEO.sceneStarts[1];
  const sweep = progress(local, 1, 24);
  const stroke = progress(local, 37, 36);
  return <g>
    <text x="90" y="282" fill={COLORS.accent} fontFamily={FONT_FAMILY} fontSize="28" letterSpacing="8">02 — CHUYỂN ĐỘNG</text>
    <rect x="90" y="390" width="18" height={mix(40, 889, sweep)} fill={COLORS.accent} />
    <Line id="dev1" text={COPY.development[0]} x={146} y={626} size={122} frame={local} begin={5} spacing={-5} width={850} />
    <Line id="dev2" text={COPY.development[1]} x={146} y={833} size={161} frame={local} begin={21} color={COLORS.accent} spacing={-5} width={850} />
    <Line id="dev3" text={COPY.development[2]} x={146} y={1007} size={83} frame={local} begin={37} spacing={-3} width={850} />
    <path d={`M146 1135 H${mix(146, 990, stroke)}`} stroke={COLORS.accent} strokeWidth="4" />
    <rect x={mix(146, 884, stroke)} y="1161" width="106" height="106" fill="none" stroke={COLORS.foreground} strokeWidth="3" transform={`rotate(${mix(0, 45, stroke)} ${mix(199, 937, stroke)} 1214)`} />
    <text x="146" y="1420" fill={COLORS.muted} fontFamily={FONT_FAMILY} fontSize="30" letterSpacing="1.5">Từ ý niệm đến trải nghiệm.</text>
  </g>;
};

const Climax: React.FC<{frame: number}> = ({frame}) => {
  const local = frame - VIDEO.sceneStarts[2];
  const beatFrames = (VIDEO.sceneEnds[2] - VIDEO.sceneStarts[2]) / 3;
  const beats = [0, beatFrames, beatFrames * 2];
  const index = local < beatFrames ? 0 : local < beatFrames * 2 ? 1 : 2;
  const beat = local - beats[index];
  const enter = progress(beat, 2, 12);
  const exit = clamp((beatFrames - beat) / 8);
  const words = COPY.climax;
  return <g>
    <text x="90" y="282" fill={COLORS.accent} fontFamily={FONT_FAMILY} fontSize="28" letterSpacing="8">03 — TẠO DẤU ẤN</text>
    <text x="90" y="470" fill={COLORS.muted} fontFamily={FONT_FAMILY} fontSize="31" letterSpacing="4">MỘT CHUYỂN ĐỘNG. BA CẢM GIÁC.</text>
    <g opacity={exit}>
      {index === 0 && <>
        <rect x="90" y="700" width={mix(70, 900, enter)} height="206" fill={COLORS.accent} />
        <Line id="peak1" text={words[0]} x={114} y={854} size={123} frame={beat} begin={3} color={COLORS.background} spacing={-5} width={850} />
        <path d="M90 1007 H990" stroke={COLORS.foreground} strokeWidth="3" />
      </>}
      {index === 1 && <>
        <rect x="90" y="671" width="900" height="276" stroke={COLORS.accent} strokeWidth={mix(3, 9, enter)} fill="none" />
        <rect x={mix(800, 90, enter)} y="671" width="56" height="276" fill={COLORS.accent} />
        <Line id="peak2" text={words[1]} x={118} y={852} size={113} frame={beat} begin={3} spacing={-5} width={850} />
      </>}
      {index === 2 && <>
        <circle cx="856" cy="808" r={mix(12, 198, enter)} fill={COLORS.accent} />
        <circle cx="856" cy="808" r={mix(2, 123, enter)} fill={COLORS.background} />
        <Line id="peak3" text={words[2]} x={90} y={852} size={111} frame={beat} begin={3} spacing={-5} width={850} />
      </>}
    </g>
    <text x="90" y="1292" fill={COLORS.accent} fontFamily={FONT_FAMILY} fontSize="34" letterSpacing="4">0{index + 1} / 03</text>
    <line x1="90" x2="990" y1="1350" y2="1350" stroke={COLORS.hairline} strokeWidth="3" />
    <rect x={90 + index * 300} y="1346" width={300 * clamp(beat / beatFrames)} height="8" fill={COLORS.accent} />
  </g>;
};

const Ending: React.FC<{frame: number}> = ({frame}) => {
  const local = frame - VIDEO.sceneStarts[3];
  const box = progress(local, 0, 26);
  const underline = progress(local, 37, 18);
  return <g>
    <text x="90" y="282" fill={COLORS.accent} fontFamily={FONT_FAMILY} fontSize="28" letterSpacing="8">04 — THÔNG ĐIỆP</text>
    <rect x="90" y="480" width={mix(0, 900, box)} height="9" fill={COLORS.accent} />
    <Line id="end1" text={COPY.ending[0]} x={90} y={701} size={116} frame={local} begin={7} spacing={-5} />
    <Line id="end2" text={COPY.ending[1]} x={90} y={860} size={79} frame={local} begin={22} color={COLORS.accent} spacing={-3} />
    <rect x="90" y="952" width={mix(0, 900, underline)} height="2" fill={COLORS.foreground} />
    <text x="90" y="1097" fill={COLORS.muted} fontFamily={FONT_FAMILY} fontSize="32" letterSpacing="2">Từ một ý tưởng, tạo nên ấn tượng.</text>
    <circle cx="907" cy="1352" r="80" stroke={COLORS.accent} strokeWidth="3" fill="none" />
    <path d="M864 1352 H950 M925 1327 L950 1352 L925 1377" fill="none" stroke={COLORS.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </g>;
};

export const Motion: React.FC = () => {
  const frame = useCurrentFrame();
  useEffect(() => {
    const handle = delayRender('Loading Vietnamese fonts');
    Promise.all([
      document.fonts.load(`400 80px "${FONT_FAMILY}"`),
      document.fonts.load(`700 120px "${FONT_FAMILY}"`),
    ]).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, []);

  return <div style={{width: VIDEO.width, height: VIDEO.height, backgroundColor: COLORS.background}}>
    <style>{`@font-face{font-family:'${FONT_FAMILY}';src:url('${staticFile('fonts/NotoSansDisplay-Regular.ttf')}') format('truetype');font-weight:400;font-display:block}
      @font-face{font-family:'${FONT_FAMILY}';src:url('${staticFile('fonts/NotoSansDisplay-Bold.ttf')}') format('truetype');font-weight:700;font-display:block}`}</style>
    <svg width={VIDEO.width} height={VIDEO.height} viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Motion graphic: Biến ý tưởng thành chuyển động">
      <rect width="1080" height="1920" fill={COLORS.background} />
      <line x1="90" y1="200" x2="990" y2="200" stroke={COLORS.hairline} strokeWidth="2" />
      <text x="90" y="154" fill={COLORS.foreground} fontFamily={FONT_FAMILY} fontWeight="700" fontSize="26" letterSpacing="6">CREATIVE / MOTION</text>
      <text x="990" y="154" textAnchor="end" fill={COLORS.accent} fontFamily={FONT_FAMILY} fontWeight="700" fontSize="26" letterSpacing="3">{VIDEO.durationInFrames / VIDEO.fps} SEC</text>
      {frame < VIDEO.sceneEnds[0] && <Hook frame={frame} />}
      {frame >= VIDEO.sceneStarts[1] && frame < VIDEO.sceneEnds[1] && <Development frame={frame} />}
      {frame >= VIDEO.sceneStarts[2] && frame < VIDEO.sceneEnds[2] && <Climax frame={frame} />}
      {frame >= VIDEO.sceneStarts[3] && <Ending frame={frame} />}
      <Rail frame={frame} />
    </svg>
  </div>;
};
