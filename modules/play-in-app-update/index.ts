import { requireNativeModule } from "expo-modules-core";

interface PlayInAppUpdateModule {
  startImmediateUpdate(): Promise<boolean>;
}

export default requireNativeModule<PlayInAppUpdateModule>("PlayInAppUpdate");
