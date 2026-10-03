import { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../styles/colors";
import { useAuth } from "../../hooks/AuthContext";
import { updateActivity } from "../../services/activities";
import { getActivityEnrollmentSummary } from "../../services/userAtActivities";
import { createActivityImage, getImagesByActivityId, updateActivityImageById } from "../../services/activityImage";
import Button from "../button/button";
import { Input } from "../input/input";
import SpeakerPhotoCropper from "./speakerPhotoCropper";

interface Props {
  activity: Activity;
  onCancel: () => void;
  onSaved: (activity: Activity) => void;
  onPhotoSaved: (photo: ActivityImage) => void;
}

// A API existente representa o horário do evento nos componentes UTC da data.
function activityTime(data: string) {
  if (!data) return "";
  const date = new Date(data);
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export default function ActivityTextEditor({ activity, onCancel, onSaved, onPhotoSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(activity.nome);
  const [speakerName, setSpeakerName] = useState(activity.palestranteNome);
  const [speakerTitle, setSpeakerTitle] = useState<"APRESENTADOR" | "APRESENTADORA">(activity.palestranteTitulo ?? "APRESENTADOR");
  const [savedPhoto, setSavedPhoto] = useState<ActivityImage | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [croppingPhoto, setCroppingPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [photoError, setPhotoError] = useState(false);
  const [photoLoadAttempt, setPhotoLoadAttempt] = useState(0);
  const [selectingPhoto, setSelectingPhoto] = useState(false);
  const [details, setDetails] = useState(activity.detalhes ?? "");
  const [time, setTime] = useState(activityTime(activity.data));
  const [location, setLocation] = useState(activity.local ?? "");
  const [locationLink, setLocationLink] = useState(activity.localLink ?? "");
  const [vacancies, setVacancies] = useState(activity.vagas == null ? "" : String(activity.vagas));
  const [presentCount, setPresentCount] = useState<number | null>(null);
  const [loadingPresence, setLoadingPresence] = useState(true);
  const [presenceAttempt, setPresenceAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const speakerLabel = speakerTitle === "APRESENTADORA" ? "Apresentadora" : "Apresentador";
  const vacanciesChanged = vacancies !== (activity.vagas == null ? "" : String(activity.vagas));
  const belowMinimum = presentCount !== null && /^\d+$/.test(vacancies) && Number(vacancies) < presentCount;
  const capacityBlocked = vacanciesChanged && (loadingPresence || presentCount === null || belowMinimum);

  useEffect(() => {
    let active = true;
    setLoadingPresence(true);
    setPresentCount(null);
    getActivityEnrollmentSummary(activity.id)
      .then((summary) => {
        if (active && Number.isInteger(summary.presentCount) && summary.presentCount! >= 0) setPresentCount(summary.presentCount!);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingPresence(false);
      });
    return () => {
      active = false;
    };
  }, [activity.id, presenceAttempt]);

  useEffect(() => {
    let active = true;
    setLoadingPhoto(true);
    setPhotoError(false);
    getImagesByActivityId(activity.id)
      .then((photos) => {
        if (active) setSavedPhoto(photos.find((photo) => photo.typeOfImage === "palestrante") ?? null);
      })
      .catch(() => {
        if (active) setPhotoError(true);
      })
      .finally(() => {
        if (active) setLoadingPhoto(false);
      });
    return () => {
      active = false;
    };
  }, [activity.id, photoLoadAttempt]);

  const handleSelectPhoto = async () => {
    if (saving.current || loadingPhoto || photoError || selectingPhoto) return;
    setSelectingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (result.canceled) return;
      const photo = result.assets[0];
      const mimeType = photo.file?.type || photo.mimeType;
      if (mimeType && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
        setError("Escolha uma foto JPG, PNG, WebP ou GIF.");
        return;
      }
      if ((photo.file?.size ?? photo.fileSize ?? 0) > 8 * 1024 * 1024) {
        setError("A foto deve ter no máximo 8 MB.");
        return;
      }
      setCroppingPhoto(photo);
      setError("");
    } catch {
      setError("Não foi possível selecionar a foto. Tente novamente.");
    } finally {
      setSelectingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (saving.current || selectingPhoto || user?.tipo !== "ADMIN") return;

    const nome = name.trim();
    const palestranteNome = speakerName.trim();
    if (!nome || !palestranteNome) {
      setError(`Preencha o título da atividade e o nome da pessoa que apresenta.`);
      return;
    }
    if (nome.length > 255 || palestranteNome.length > 255) {
      setError("Cada nome deve ter no máximo 255 caracteres.");
      return;
    }
    if (details.length > 1500) {
      setError("Os detalhes devem ter no máximo 1500 caracteres.");
      return;
    }
    const local = location.trim();
    const localLink = locationLink.trim() || null;
    if (!local || local.length > 255) {
      setError("Preencha o local com até 255 caracteres.");
      return;
    }
    if (localLink) {
      try {
        const url = new URL(localLink);
        if (!["http:", "https:"].includes(url.protocol) || localLink.length > 2048) throw new Error();
      } catch {
        setError("Informe um link completo do local, começando com https:// ou http://.");
        return;
      }
    }
    const dateUpdate: { data?: string } = {};
    const capacityUpdate: { vagas?: number } = {};
    if (vacanciesChanged) {
      const vagas = Number(vacancies);
      if (!/^\d+$/.test(vacancies) || !Number.isSafeInteger(vagas) || vagas > 2147483647) {
        setError("Informe um número inteiro de vagas entre 0 e 2147483647.");
        return;
      }
      if (loadingPresence || presentCount === null) {
        setError("Confira o total de presenças antes de alterar as vagas.");
        return;
      }
      if (vagas < presentCount) {
        setError(`Mínimo permitido: ${presentCount} vagas, pois há presença registrada para esse total de participantes.`);
        return;
      }
      capacityUpdate.vagas = vagas;
    }
    if (time !== activityTime(activity.data)) {
      const date = new Date(activity.data);
      if (!activity.data || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || Number.isNaN(date.getTime())) {
        setError("Informe o horário no formato HH:mm, entre 00:00 e 23:59.");
        return;
      }
      const [hour, minute] = time.split(":").map(Number);
      date.setUTCHours(hour, minute, 0, 0);
      dateUpdate.data = date.toISOString();
    }

    saving.current = true;
    setIsSaving(true);
    setError("");
    let photoSaved = false;
    try {
      if (selectedPhoto) {
        const blob = selectedPhoto.file ?? (await fetch(selectedPhoto.uri).then((response) => response.blob()));
        if (!blob) throw new Error("Não foi possível ler a foto selecionada. Selecione a foto novamente.");
        if (blob.size > 8 * 1024 * 1024) throw new Error("A foto deve ter no máximo 8 MB.");
        const formData = new FormData();
        formData.append("activityId", activity.id);
        formData.append("typeOfImage", "palestrante");
        formData.append("image", blob, selectedPhoto.file?.name || selectedPhoto.fileName || "foto");
        const uploaded = savedPhoto ? await updateActivityImageById(savedPhoto.id, formData) : await createActivityImage(formData);
        setSavedPhoto(uploaded);
        setSelectedPhoto(null);
        onPhotoSaved(uploaded);
        photoSaved = true;
      }
      const updated = await updateActivity(activity.id, {
        nome,
        palestranteNome,
        palestranteTitulo: speakerTitle,
        detalhes: details,
        local,
        localLink,
        ...dateUpdate,
        ...capacityUpdate,
      });
      if (updated.palestranteTitulo !== speakerTitle) {
        throw new Error("A API ainda não está pronta para salvar essa seleção. Tente novamente após a atualização.");
      }
      onSaved({ ...activity, ...updated });
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.msg || error.message || "Não foi possível salvar. Tente novamente.";
      setError(photoSaved ? `A foto foi salva, mas os dados da atividade não foram atualizados. ${message}` : message);
      if (capacityUpdate.vagas !== undefined && error.response?.status === 409) setPresenceAttempt(attempt => attempt + 1);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  if (croppingPhoto) {
    return (
      <SpeakerPhotoCropper
        photo={croppingPhoto}
        onCancel={() => setCroppingPhoto(null)}
        onConfirm={(photo) => {
          setSelectedPhoto(photo);
          setCroppingPhoto(null);
          setError("");
        }}
      />
    );
  }

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving.current) onCancel();
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-4 sm:px-6 sm:py-8">
        <View className="w-full max-w-lg rounded-lg bg-blue-900 p-4 sm:p-6" style={{ maxHeight: "100%" }}>
          <Text accessibilityRole="header" className="text-white text-xl font-poppinsSemiBold mb-5">
            Editar atividade
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ minHeight: 0 }} contentContainerStyle={{ paddingRight: 4 }}>
            <Text className="text-gray-400 text-sm font-inter mb-2">Título da atividade</Text>
            <Input>
              <Input.Field
                accessibilityLabel="Título da atividade"
                value={name}
                onChangeText={setName}
                editable={!isSaving}
                maxLength={255}
                autoFocus
              />
            </Input>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Forma de apresentação</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Forma de apresentação" className="flex-col xxs:flex-row gap-3 mb-4">
              {(["APRESENTADORA", "APRESENTADOR"] as const).map((title) => (
                <Pressable
                  key={title}
                  accessibilityRole="radio"
                  accessibilityLabel={title === "APRESENTADORA" ? "Apresentadora" : "Apresentador"}
                  accessibilityState={{ checked: speakerTitle === title, disabled: isSaving }}
                  aria-checked={speakerTitle === title}
                  aria-disabled={isSaving}
                  disabled={isSaving}
                  onPress={() => setSpeakerTitle(title)}
                  className={`flex-1 flex-row items-center justify-center gap-2 p-3 border rounded-lg ${speakerTitle === title ? "border-blue-500 bg-blue-500/10" : "border-border"}`}
                >
                  <Text className="text-white font-inter">
                    {speakerTitle === title ? "◉" : "○"} {title === "APRESENTADORA" ? "Apresentadora" : "Apresentador"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-gray-400 text-sm font-inter mb-2">
              Nome {speakerTitle === "APRESENTADORA" ? "da apresentadora" : "do apresentador"}
            </Text>
            <Input>
              <Input.Field
                accessibilityLabel={`Nome ${speakerTitle === "APRESENTADORA" ? "da apresentadora" : "do apresentador"}`}
                value={speakerName}
                onChangeText={setSpeakerName}
                editable={!isSaving}
                maxLength={255}
              />
            </Input>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">
              Foto {speakerTitle === "APRESENTADORA" ? "da apresentadora" : "do apresentador"}
            </Text>
            {(selectedPhoto?.uri || savedPhoto?.imageUrl) && (
              <Image
                source={{ uri: selectedPhoto?.uri || savedPhoto?.imageUrl }}
                accessibilityLabel={`Foto: ${speakerName || speakerLabel}`}
                className="w-24 h-24 rounded-full mb-3"
                resizeMode="cover"
              />
            )}
            {photoError ? (
              <View>
                <Text accessibilityRole="alert" className="text-danger font-inter mb-3">
                  Não foi possível carregar a foto atual.
                </Text>
                <Button
                  title="Tentar carregar foto novamente"
                  accessibilityRole="button"
                  bgColor="bg-gray-700"
                  disabled={isSaving}
                  onPress={() => setPhotoLoadAttempt((attempt) => attempt + 1)}
                />
              </View>
            ) : (
              <Button
                title={loadingPhoto ? "Carregando foto..." : selectedPhoto || savedPhoto ? "Trocar foto" : "Selecionar foto"}
                accessibilityRole="button"
                bgColor="bg-gray-700"
                disabled={isSaving || loadingPhoto || selectingPhoto}
                onPress={handleSelectPhoto}
              />
            )}
            {selectedPhoto && (
              <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => setSelectedPhoto(null)} className="py-3">
                <Text className="text-blue-200 font-inter">Desfazer seleção da foto</Text>
              </Pressable>
            )}
            <Text className="text-gray-400 text-xs font-inter mt-2">JPG, PNG, WebP ou GIF, até 8 MB. A foto será enviada ao salvar.</Text>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Horário da atividade</Text>
            <Input>
              <Input.Field
                accessibilityLabel="Horário da atividade"
                value={time}
                onChangeText={setTime}
                editable={!isSaving}
                maxLength={5}
                placeholder="HH:mm"
              />
            </Input>
            <Text className="text-gray-400 text-xs font-inter mt-2">Horário do evento. A data da atividade será mantida.</Text>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Local da atividade</Text>
            <Input>
              <Input.Field accessibilityLabel="Local da atividade" value={location} onChangeText={setLocation} editable={!isSaving} maxLength={255} />
            </Input>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Link do local</Text>
            <Input>
              <Input.Field
                accessibilityLabel="Link do local"
                value={locationLink}
                onChangeText={setLocationLink}
                editable={!isSaving}
                maxLength={2048}
                placeholder="https://..."
                autoCapitalize="none"
              />
            </Input>
            <Text className="text-gray-400 text-xs font-inter mt-2">Opcional. Sem link, usamos a busca do local no mapa.</Text>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Número de vagas</Text>
            <Input>
              <Input.Field
                accessibilityLabel="Número de vagas"
                value={vacancies}
                onChangeText={setVacancies}
                editable={!isSaving}
                maxLength={10}
                keyboardType="number-pad"
                placeholder="Não definido"
                aria-invalid={belowMinimum}
              />
            </Input>
            {loadingPresence ? (
              <Text className="text-gray-400 text-xs font-inter mt-2">Conferindo presenças...</Text>
            ) : presentCount === null ? (
              <View>
                <Text accessibilityRole="alert" className="text-danger text-xs font-inter mt-2">
                  Não foi possível conferir o mínimo de vagas.
                </Text>
                <Button
                  title="Conferir presenças novamente"
                  accessibilityRole="button"
                  bgColor="bg-gray-700"
                  disabled={isSaving}
                  onPress={() => setPresenceAttempt((attempt) => attempt + 1)}
                />
              </View>
            ) : (
              <Text accessibilityLiveRegion="polite" className={`${belowMinimum ? "text-danger" : "text-gray-400"} text-xs font-inter mt-2`}>
                {presentCount === 0
                  ? "Mínimo permitido: 0 vagas. Nenhuma presença registrada."
                  : `Mínimo permitido: ${presentCount} ${presentCount === 1 ? "vaga, pois 1 participante já possui" : `vagas, pois ${presentCount} participantes já possuem`} presença registrada.`}
              </Text>
            )}
            <Text className="text-gray-400 text-xs font-inter mt-2">
              Ao reduzir, os últimos inscritos passam para a fila. Ao aumentar, a fila preenche as vagas pela ordem de inscrição. Ninguém é excluído.
            </Text>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Detalhes da atividade</Text>
            <TextInput
              accessibilityLabel="Detalhes da atividade"
              value={details}
              onChangeText={setDetails}
              editable={!isSaving}
                maxLength={1500}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Descreva a atividade"
              placeholderTextColor={colors.border}
              className="w-full min-h-[128px] px-5 py-4 text-white text-sm font-inter bg-background border border-border rounded-lg outline-none"
            />
            <Text className="text-gray-400 text-xs font-inter mt-2">{details.length}/1500 caracteres</Text>
            {!!error && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-danger font-inter mt-3">
                {error}
              </Text>
            )}
          </ScrollView>
            <View className="flex-row flex-wrap gap-3 mt-5 pt-4 border-t border-border">
              <Button
                title="Cancelar"
                accessibilityRole="button"
                bgColor="bg-gray-700"
                className="flex-1 min-w-[104px]"
                disabled={isSaving || selectingPhoto}
                onPress={onCancel}
              />
              <Button
                title="Salvar"
                accessibilityRole="button"
                accessibilityLabel="Salvar alterações"
                className="flex-1 min-w-[104px]"
                loading={isSaving}
                disabled={isSaving || selectingPhoto || capacityBlocked}
                onPress={handleSave}
              />
            </View>
        </View>
      </View>
    </Modal>
  );
}
