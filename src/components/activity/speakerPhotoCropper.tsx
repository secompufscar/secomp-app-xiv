import type { ImagePickerAsset } from "expo-image-picker";

export interface SpeakerPhotoCropperProps {
  photo: ImagePickerAsset;
  onCancel: () => void;
  onConfirm: (photo: ImagePickerAsset) => void;
}

// A edição administrativa de atividades está disponível somente na web.
export default function SpeakerPhotoCropper(_props: SpeakerPhotoCropperProps) {
  return null;
}
