import React, { useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface Props {
  uri: string;
  isPlaying: boolean;
  muted?: boolean;
}

export default function VideoPlayer(props: Props) {
  if (Platform.OS === 'web') {
    return <WebVideoPlayer {...props} />;
  }
  return <NativeVideoPlayer {...props} />;
}

function NativeVideoPlayer({ uri, isPlaying, muted = true }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    if (isPlaying) player.play();
    else player.pause();
  }, [isPlaying, player]);

  return (
    <VideoView
      style={{ flex: 1, backgroundColor: '#111' }}
      player={player}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

function WebVideoPlayer({ uri, isPlaying }: Props) {
  const ref = useRef<any>(null);

  const setRef = useCallback((node: any) => {
    if (node) {
      node.muted = true;
      node.defaultMuted = true;
      node.src = uri;
      node.loop = true;
      node.playsInline = true;
      node.preload = 'auto';
      node.style.width = '100%';
      node.style.height = '100%';
      node.style.objectFit = 'cover';
      node.style.display = 'block';
    }
    ref.current = node;
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.src !== uri) v.src = uri;
    v.muted = true;

    if (isPlaying) {
      const tryPlay = () => {
        v.muted = true;
        v.play().catch(() => {});
      };
      if (v.readyState >= 2) {
        tryPlay();
      } else {
        v.load();
        v.addEventListener('canplay', tryPlay, { once: true });
        return () => v.removeEventListener('canplay', tryPlay);
      }
    } else {
      v.pause();
    }
  }, [isPlaying, uri]);

  return (React.createElement as any)('video', { ref: setRef });
}
