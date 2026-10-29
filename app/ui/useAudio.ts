'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Optional device speech and locally synthesized music. No provider requests. */
export function useAudio() {
  const [voice, setVoice] = useState(false);
  const [music, setMusic] = useState(false);
  const [available, setAvailable] = useState(false);
  const voiceEnabled = useRef(false);
  const musicEnabled = useRef(false);
  const lastCaption = useRef('');
  const currentLine = useRef<SpeechSynthesisUtterance | null>(null);
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tones = useRef(new Set<OscillatorNode>());
  const musicRun = useRef(0);
  const mounted = useRef(true);

  const stopMusic = useCallback(() => {
    musicRun.current++;
    musicEnabled.current = false;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    for (const tone of tones.current) {
      try { tone.stop(); } catch { /* A completed tone may already be stopped. */ }
    }
    tones.current.clear();
    if (context.current?.state === 'running') void context.current.suspend().catch(() => {});
  }, []);

  useEffect(() => {
    mounted.current = true;
    setAvailable('speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function');
    return () => {
      mounted.current = false;
      currentLine.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopMusic();
      const old = context.current;
      context.current = null;
      if (old && old.state !== 'closed') void old.close().catch(() => {});
    };
  }, [stopMusic]);

  const readCaption = useCallback((text: string) => {
    if (!text || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;
    try {
      window.speechSynthesis.cancel();
      const line = new SpeechSynthesisUtterance(text);
      currentLine.current = line;
      line.rate = 0.93;
      line.pitch = 0.92;
      line.volume = 0.75;
      line.onend = () => { if (currentLine.current === line) currentLine.current = null; };
      line.onerror = event => {
        if (currentLine.current !== line || event.error === 'canceled' || event.error === 'interrupted') return;
        currentLine.current = null;
        voiceEnabled.current = false;
        if (mounted.current) setVoice(false);
      };
      window.speechSynthesis.speak(line);
    } catch {
      voiceEnabled.current = false;
      if (mounted.current) setVoice(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    // Retain the current caption even while muted. Enabling narration can read it immediately.
    lastCaption.current = text;
    if (voiceEnabled.current) readCaption(text);
  }, [readCaption]);

  const toggleVoice = useCallback(() => {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;
    const enabled = !voiceEnabled.current;
    voiceEnabled.current = enabled;
    setVoice(enabled);
    if (enabled) readCaption(lastCaption.current);
    else {
      currentLine.current = null;
      window.speechSynthesis.cancel();
    }
  }, [readCaption]);

  const toggleMusic = useCallback(() => {
    if (musicEnabled.current) {
      stopMusic();
      setMusic(false);
      return;
    }
    try {
      const audio = context.current?.state !== 'closed' ? context.current ?? new AudioContext() : new AudioContext();
      context.current = audio;
      const run = ++musicRun.current;
      musicEnabled.current = true;
      setMusic(true);
      // Resume inside the user's gesture; guard its asynchronous completion against rapid toggles.
      void audio.resume().then(() => {
        if (!mounted.current || !musicEnabled.current || musicRun.current !== run) return;
        let step = 0;
        const notes = [146.83, 220, 293.66, 349.23, 261.63, 220, 174.61, 196];
        const play = () => {
          if (document.hidden || audio.state !== 'running' || musicRun.current !== run) return;
          const gain = audio.createGain();
          gain.gain.setValueAtTime(0, audio.currentTime);
          gain.gain.linearRampToValueAtTime(0.035, audio.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 2.8);
          gain.connect(audio.destination);
          const tone = audio.createOscillator();
          tones.current.add(tone);
          tone.type = 'sine';
          tone.frequency.value = notes[step++ % notes.length];
          tone.connect(gain);
          tone.onended = () => { tones.current.delete(tone); tone.disconnect(); gain.disconnect(); };
          tone.start();
          tone.stop(audio.currentTime + 3);
        };
        play();
        timer.current = setInterval(play, 1800);
      }).catch(() => {
        if (musicRun.current !== run || !mounted.current) return;
        stopMusic();
        setMusic(false);
      });
    } catch {
      stopMusic();
      setMusic(false);
    }
  }, [stopMusic]);

  return { voice, music, available, speak, toggleVoice, toggleMusic };
}
