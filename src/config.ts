export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 450,
  sceneStarts: [0, 90, 210, 330],
  sceneEnds: [90, 210, 330, 450],
} as const;

export const COLORS = {
  background: '#101114',
  foreground: '#F5F5F0',
  accent: '#D7FF3F',
  muted: '#777A77',
  hairline: '#35383A',
} as const;

export const COPY = {
  hook: ['Ý TƯỞNG', 'LỚN.'],
  development: ['BẮT ĐẦU TỪ', 'MỘT', 'CHUYỂN ĐỘNG.'],
  climax: ['RÕ RÀNG.', 'KHÁC BIỆT.', 'ĐÁNG NHỚ.'],
  ending: ['BIẾN Ý TƯỞNG', 'THÀNH CHUYỂN ĐỘNG.'],
} as const;

export const FONT_FAMILY = 'Noto Motion';
