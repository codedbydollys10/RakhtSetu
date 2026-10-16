import { useCallback, useEffect, useRef, useState } from "react"

export default function AutoplayVideo({
  src,
  label,
}: {
  src: string
  label: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)

  const attemptPlayback = useCallback(async (video = videoRef.current) => {
    if (!video) return

    try {
      await video.play()
      setPlaybackBlocked(false)
    } catch {
      setPlaybackBlocked(true)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (video?.readyState && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      void attemptPlayback(video)
    }
  }, [attemptPlayback, src])

  useEffect(() => {
    const resumeWhenVisible = () => {
      if (!document.hidden) void attemptPlayback()
    }

    document.addEventListener("visibilitychange", resumeWhenVisible)
    return () => document.removeEventListener("visibilitychange", resumeWhenVisible)
  }, [attemptPlayback])

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={src}
        aria-label={label}
        autoPlay
        loop
        muted
        playsInline
        onCanPlay={(event) => void attemptPlayback(event.currentTarget)}
        onPlay={() => setPlaybackBlocked(false)}
        onPause={(event) => {
          const video = event.currentTarget
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.ended) {
            setPlaybackBlocked(true)
          }
        }}
        className="h-full w-full bg-transparent object-contain"
      />
      {playbackBlocked && (
        <button
          type="button"
          onClick={() => void attemptPlayback()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/30 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Play welcome video
        </button>
      )}
    </div>
  )
}
