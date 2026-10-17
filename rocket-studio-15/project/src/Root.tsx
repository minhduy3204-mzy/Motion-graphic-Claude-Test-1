import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {RocketFilm} from './RocketFilm';
import {filmSchema, type FilmProps} from './schema';
import {compileTimeline} from './motion.mjs';

const calculateMetadata: CalculateMetadataFunction<FilmProps> = ({props}) => ({
  durationInFrames: compileTimeline(props.config).frames,
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id="RocketStudio"
    component={RocketFilm}
    schema={filmSchema}
    width={1920}
    height={1080}
    fps={60}
    durationInFrames={900}
    calculateMetadata={calculateMetadata}
    defaultProps={{
      config: {
        name: 'Rocket Studio / Design with direction',
        width: 1920 as const,
        height: 1080 as const,
        fps: 60 as const,
        brand: {
          appName: 'Rocket Studio Creative Workspace',
          company: 'Rocket Group',
          tagline: 'Design with direction.',
          cta: 'Start your next.',
          url: 'rocketgroup.asia',
        },
        palette: {
          ink: '#14251C',
          acid: '#DDFF54',
          ivory: '#F4F2E9',
          coral: '#FF785A',
          sage: '#A5B3A6',
          canvas: '#E3E6DE',
          line: '#CED4CA',
        },
        fonts: {
          display: 'Manrope',
          data: 'IBM Plex Mono',
        },
        copy: {
          document: 'Rocket Group / Website',
          artboard: 'Homepage · Desktop',
          title: 'Make what comes next. Design a bolder launch.',
          subtitle: 'Transform. Convert. Automate.',
          websiteCta: 'Let’s launch',
          eyebrow: 'ROCKET GROUP / WEB EXPERIENCE',
          status: 'All changes saved',
        },
        ui: {
          selectedObject: 'Hero / Title',
          page: 'Homepage',
          artLayer: 'Directional form',
          copyLayer: 'Supporting copy',
          ctaLayer: 'Launch CTA',
        },
        layers: {
          title: {
            x: 72,
            y: 174,
            scale: 1,
            maxWidth: 660,
            maxHeight: 286,
            visible: true,
            initialSize: 84,
            finalSize: 116,
            initialWeight: 350,
            finalWeight: 800,
          },
          art: {
            x: 900,
            y: 335,
            scale: 1,
            visible: true,
          },
          subtitle: {
            x: 76,
            y: 496,
            scale: 1,
            visible: true,
          },
          button: {
            x: 76,
            y: 558,
            scale: 1,
            visible: true,
          },
        },
        scenes: [{
          id: 'establish' as const,
          name: '01 / The canvas',
          duration: 2.4,
        }, {
          id: 'select' as const,
          name: '02 / Select the title',
          duration: 2.2,
        }, {
          id: 'style' as const,
          name: '03 / Give it direction',
          duration: 4.2,
        }, {
          id: 'reveal' as const,
          name: '04 / Preview the website',
          duration: 3.4,
        }, {
          id: 'brand' as const,
          name: '05 / Rocket Studio',
          duration: 3.6,
        }],
        motion: {
          cameraDepth: 1,
          cursorVisible: true,
        },
      },
      audioEnabled: true,
      masterVolume: 1,
    }}
  />
);
