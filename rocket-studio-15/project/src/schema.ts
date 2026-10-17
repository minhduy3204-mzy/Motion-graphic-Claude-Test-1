import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

const position = {
  x: z.number().min(-1920).max(3840).step(1),
  y: z.number().min(-1080).max(2160).step(1),
  scale: z.number().min(0.1).max(4).step(0.01),
  visible: z.boolean(),
};

/** All design and content controls used by both renderers. */
export const projectSchema = z.object({
  name: z.string(),
  width: z.literal(1920),
  height: z.literal(1080),
  fps: z.literal(60),
  brand: z.object({
    appName: z.string(),
    company: z.string(),
    tagline: z.string(),
    cta: z.string(),
    url: z.string(),
  }),
  palette: z.object({
    ink: zColor(),
    acid: zColor(),
    ivory: zColor(),
    coral: zColor(),
    sage: zColor(),
    canvas: zColor(),
    line: zColor(),
  }),
  fonts: z.object({
    display: z.string(),
    data: z.string(),
  }),
  copy: z.object({
    document: z.string(),
    artboard: z.string(),
    title: z.string(),
    subtitle: z.string(),
    websiteCta: z.string(),
    eyebrow: z.string(),
    status: z.string(),
  }),
  ui: z.object({
    selectedObject: z.string(),
    page: z.string(),
    artLayer: z.string(),
    copyLayer: z.string(),
    ctaLayer: z.string(),
  }),
  layers: z.object({
    title: z.object({
      ...position,
      maxWidth: z.number().min(100).max(1400).step(1),
      maxHeight: z.number().min(40).max(700).step(1),
      initialSize: z.number().min(12).max(200).step(1),
      finalSize: z.number().min(12).max(240).step(1),
      initialWeight: z.number().min(200).max(800).step(1),
      finalWeight: z.number().min(200).max(800).step(1),
    }),
    art: z.object(position),
    subtitle: z.object(position),
    button: z.object(position),
  }),
  scenes: z.array(z.object({
    id: z.enum(['establish', 'select', 'style', 'reveal', 'brand']),
    name: z.string(),
    duration: z.number().min(1.5).max(30).step(0.01),
  })).length(5).refine(
    scenes => new Set(scenes.map(scene => scene.id)).size === 5,
    {message: 'Keep one of each scene ID so actions and sound cues stay connected.'},
  ),
  motion: z.object({
    cameraDepth: z.number().min(0).max(1.5).step(0.01),
    cursorVisible: z.boolean(),
  }),
});

export const filmSchema = z.object({
  config: projectSchema,
  audioEnabled: z.boolean(),
  masterVolume: z.number().min(0).max(1).step(0.01),
});

export type ProjectConfig = z.infer<typeof projectSchema>;
export type FilmProps = z.infer<typeof filmSchema>;
