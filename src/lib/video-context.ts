export interface SelectedVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  publishDate: string;
}

export function setSelectedVideo(video: SelectedVideo) {
  sessionStorage.setItem("selected_video", JSON.stringify(video));
}

export function getSelectedVideo(): SelectedVideo | null {
  const stored = sessionStorage.getItem("selected_video");
  return stored ? JSON.parse(stored) : null;
}

export function clearSelectedVideo() {
  sessionStorage.removeItem("selected_video");
}
