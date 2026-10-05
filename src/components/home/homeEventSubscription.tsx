import { Text, Pressable, View } from "react-native";
import { useState } from "react";

export default function HomeEventSubscription({
  isEventActive,
  isUserSubscribed,
  onSubscribeRequest,
  disabled = false,
}: {
  isEventActive: boolean;
  isUserSubscribed: boolean;
  onSubscribeRequest: () => void;
  disabled?: boolean;
}) {
  const [isBtnPressed, setIsBtnPressed] = useState(false);

  let titleText = "";
  let subtitleText = "";
  let buttonText = "";
  let buttonDisabled = disabled;
  let onPressHandler: () => void = () => {};

  // Estilo
  let borderColor = "";
  let buttonColor = "";

  if (!isEventActive) {
    titleText = "Estamos preparando a próxima edição!";
    subtitleText = "O evento ainda não está ativo. Aguarde o período para inscrição";
    buttonText = "Inscrições fechadas";
    buttonDisabled = true;
    borderColor = "border-gray-700";
    buttonColor = "bg-gray-400/10";
  } else if (!isUserSubscribed) {
    titleText = "Inscreva-se na Secomp!";
    subtitleText = "Para participar do evento e suas atividades, garanta sua inscrição aqui";
    buttonText = "Inscrever-se";
    onPressHandler = onSubscribeRequest;
    borderColor = "border-blue-500/50";
    buttonColor = "bg-blue-500";
  }

  return (
    <View className={`flex-col w-full rounded-[8px] items-start justify-start mb-8 px-6 py-5 bg-background border ${borderColor}`}>
      <Text className="text-white text-base font-poppinsMedium mb-1">{titleText}</Text>
      <Text className="text-default font-inter leading-[1.6] mb-1">
        {subtitleText}
      </Text>

      { isEventActive &&
        <Pressable
          onPress={onPressHandler}
          onPressIn={() => setIsBtnPressed(true)}
          onPressOut={() => setIsBtnPressed(false)}
          disabled={buttonDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: buttonDisabled }}
          style={{ opacity: buttonDisabled ? 0.5 : 1 }}
          className={`rounded-[6px] py-[12px] px-7 items-center mt-4 mb-1 ${buttonColor} ${
            isBtnPressed ? "opacity-80" : "opacity-100"
          }`}
        >
          <Text className="text-white text-[14px] font-poppinsMedium">{buttonText}</Text>
        </Pressable>
      }
    </View>
  );
}
