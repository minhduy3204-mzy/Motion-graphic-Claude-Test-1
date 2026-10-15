import {Composition, registerRoot} from 'remotion';
import {Motion} from './Motion';
import {VIDEO} from './config';

const Root = () => <Composition id="StudioMotion" component={Motion} durationInFrames={VIDEO.durationInFrames} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />;

registerRoot(Root);
