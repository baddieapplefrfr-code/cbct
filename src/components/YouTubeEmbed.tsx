interface YouTubeEmbedProps {
  videoId: string;
  className?: string;
}

export default function YouTubeEmbed({ videoId, className = "" }: YouTubeEmbedProps) {
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
      width="100%"
      style={{
        aspectRatio: "16/9",
        borderRadius: "12px",
        border: "none",
        display: "block",
      }}
      className={className}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
