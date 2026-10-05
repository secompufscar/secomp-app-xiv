import { Pressable, View, Text, GestureResponderEvent } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { colors } from "../../styles/colors";

type MenuButtonProps = {
  icon: IconDefinition;
  label: string;
  onPress: (event: GestureResponderEvent) => void; 
  disabled?: boolean;
  busy?: boolean;
};

const ProfileButton = ({ icon, label, onPress, disabled = false, busy = false }: MenuButtonProps) => {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy }} style={{ opacity: disabled ? 0.5 : 1 }}>
      {({ pressed }) => (
        <View
          className={`flex-row h-[58px] items-center justify-between rounded-lg p-4 mb-3 transition-all duration-100 ${
            pressed ? "bg-background/60" : "bg-background"
          }`}
        >
          <View className="flex-row items-center gap-4">
            <View className="w-6 flex items-center justify-center">
              <FontAwesomeIcon icon={icon} size={20} color={colors.blue[200]} />
            </View>
            <Text className="text-white text-base font-inter">{label}</Text>
          </View>

          <View className="w-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faChevronRight} size={16} color={colors.blue[200]} />
          </View>
        </View>
      )}
    </Pressable>
  );
};

export default ProfileButton;
