import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Interactive,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Workspace} from './Workspace';
import {compileTimeline, visualState} from './motion.mjs';
import {synthesize} from '../public/audio/synth.mjs';
import {preparedTimelineSignature} from './preparedAudio';
import type {FilmProps} from './schema';
import './workspace.css';

const fontsReady = typeof window === 'undefined' ? Promise.resolve() : Promise.all([
  loadFont({family: 'Manrope', url: staticFile('fonts/manrope.woff2'), weight: '200 800'}),
  loadFont({family: 'IBM Plex Mono', url: staticFile('fonts/plex-mono-regular.woff2'), weight: '400'}),
  loadFont({family: 'IBM Plex Mono', url: staticFile('fonts/plex-mono-medium.woff2'), weight: '500'}),
]);

function pcmWavDataUri(channels: Float32Array[], sampleRate: number): string {
  const samples = channels[0].length;
  const bytes = new Uint8Array(44 + samples * 4);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 4, true);
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < 2; channel++) {
      const value = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(44 + (i * 2 + channel) * 2, Math.round(value * 32767), true);
    }
  }
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16384) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 16384)));
  }
  return 'data:audio/wav;base64,' + btoa(parts.join(''));
}

/** Picture and score always share this exact serialized timing definition. */
export const RocketFilm: React.FC<FilmProps> = ({config, audioEnabled, masterVolume}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [fontGate] = useState(() => delayRender('Load workspace fonts before fitting editable text'));
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fontsReady.then(() => {if (active) setFontsLoaded(true);}).catch(cancelRender);
    return () => {active = false;};
  }, []);
  useLayoutEffect(() => {
    if (fontsLoaded) continueRender(fontGate);
  }, [fontGate, fontsLoaded]);
  const timeline = useMemo(() => compileTimeline(config), [config]);
  const signature = JSON.stringify(timeline);
  const audioSource = useMemo(() => {
    if (!audioEnabled) return null;
    if (signature === preparedTimelineSignature) return staticFile('audio/soundtrack.wav');
    const result = synthesize(JSON.parse(signature), {sampleRate: 48000});
    return pcmWavDataUri(result.mix, result.sampleRate);
  }, [audioEnabled, signature]);

  return (
    <AbsoluteFill style={{backgroundColor: config.palette.canvas}}>
      {fontsLoaded ? <Interactive.Div
        name="Continuous design workspace"
        premountFor={fps}
        style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}}
      >
        <Workspace config={config} variables={visualState(frame / fps, config)} />
      </Interactive.Div> : null}
      {audioSource ? (
        <Audio
          name="Original music + synchronized interface sounds"
          src={audioSource}
          premountFor={fps}
          volume={masterVolume}
        />
      ) : null}
    </AbsoluteFill>
  );
};
