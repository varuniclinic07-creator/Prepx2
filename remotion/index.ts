import { registerRoot, Composition } from 'remotion';
import React from 'react';
import { ClassroomLecture } from './compositions/ClassroomLecture';

const compositions = [
  {
    id: 'ClassroomLecture',
    component: ClassroomLecture,
    durationInFrames: 30 * 24 * 60,
    fps: 24,
    width: 1280,
    height: 720,
    defaultProps: {
      title: 'UPSC Lecture',
      markers: [] as Array<{ id: string; timestamp: number; title: string; visual_cue: string }>,
      background: '#0f172a',
    },
  },
];

export { ClassroomLecture };

function RemotionRoot() {
  return React.createElement(
    React.Fragment,
    null,
    ...compositions.map((c) =>
      React.createElement(Composition, {
        key: c.id,
        id: c.id,
        component: c.component as any,
        durationInFrames: c.durationInFrames,
        fps: c.fps,
        width: c.width,
        height: c.height,
        defaultProps: c.defaultProps as any,
      })
    )
  );
}

registerRoot(RemotionRoot);
