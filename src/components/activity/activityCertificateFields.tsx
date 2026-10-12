import { Pressable, Text, View } from "react-native";
import { Input } from "../input/input";
import { CertificationForm, isAlwaysNonCertifiable } from "../../utils/activityCertification";

interface Props {
  value: CertificationForm;
  onChange: (value: CertificationForm) => void;
  name: string;
  category?: Category;
  disabled?: boolean;
  editing?: boolean;
}

export default function ActivityCertificateFields({ value, onChange, name, category, disabled = false, editing = false }: Props) {
  const excluded = isAlwaysNonCertifiable({ nome: name, categoria: category });
  const certifiable = excluded ? false : value.certifiable;
  return (
    <View className="w-full gap-3 my-3">
      <Text className="text-white font-interMedium">Duração e certificado</Text>
      <Text className="text-gray-400 text-sm font-inter">Informe a duração oficial da atividade, mesmo quando ela não gerar horas no certificado.</Text>
      <Text className="text-gray-400 text-sm font-inter">Duração oficial em minutos</Text>
      <Input><Input.Field accessibilityLabel="Duração oficial em minutos" value={value.minutes}
        onChangeText={minutes => onChange({ ...value, minutes })} editable={!disabled} keyboardType="number-pad" maxLength={5} placeholder="Ex.: 60" /></Input>
      <Text className="text-gray-400 text-sm font-inter">Fonte da duração oficial</Text>
      <Input><Input.Field accessibilityLabel="Fonte da duração oficial" value={value.source}
        onChangeText={source => onChange({ ...value, source })} editable={!disabled} maxLength={500} /></Input>
      <Text className="text-gray-400 text-sm font-inter">Atividade certificável?</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Atividade certificável" className="flex-row flex-wrap gap-3">
        {[true, false].map(option => (
          <Pressable key={String(option)} accessibilityRole="radio" accessibilityLabel={option ? "Sim, certificável" : "Não certificável"}
            accessibilityState={{ checked: certifiable === option, disabled: disabled || excluded }} disabled={disabled || excluded}
            aria-checked={certifiable === option} aria-disabled={disabled || excluded}
            onPress={() => onChange({ ...value, certifiable: option })}
            className={`px-4 py-3 rounded-lg border ${certifiable === option ? "border-blue-500 bg-blue-500/10" : "border-gray-600"}`}>
            <Text className="text-white font-inter">{certifiable === option ? "◉" : "○"} {option ? "Sim" : "Não"}</Text>
          </Pressable>
        ))}
      </View>
      {excluded && <Text className="text-gray-400 text-sm font-inter">Esta atividade é excluída da carga horária dos certificados pelas regras do evento.</Text>}
      {editing && <Text className="text-gray-400 text-sm font-inter">Alterações valem para novas emissões e reemissões. Os certificados já emitidos mantêm seu histórico.</Text>}
    </View>
  );
}
