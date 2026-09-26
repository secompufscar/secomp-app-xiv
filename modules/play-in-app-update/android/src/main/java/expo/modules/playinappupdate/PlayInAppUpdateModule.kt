package expo.modules.playinappupdate

import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayInAppUpdateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PlayInAppUpdate")

    AsyncFunction("startImmediateUpdate") { promise: Promise ->
      val activity = appContext.currentActivity
        ?: return@AsyncFunction promise.reject(Exceptions.MissingActivity())
      val updateManager = AppUpdateManagerFactory.create(activity)

      updateManager.appUpdateInfo
        .addOnSuccessListener { info ->
          val availability = info.updateAvailability()
          val canStart = availability == UpdateAvailability.UPDATE_AVAILABLE ||
            availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS

          if (!canStart || !info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
            promise.resolve(false)
            return@addOnSuccessListener
          }

          try {
            @Suppress("DEPRECATION")
            val started = updateManager.startUpdateFlowForResult(
              info,
              AppUpdateType.IMMEDIATE,
              activity,
              UPDATE_REQUEST_CODE,
            )
            promise.resolve(started)
          } catch (error: Exception) {
            promise.reject("ERR_PLAY_UPDATE_START", error.message, error)
          }
        }
        .addOnFailureListener { error ->
          promise.reject("ERR_PLAY_UPDATE_CHECK", error.message, error)
        }
    }
  }

  private companion object {
    const val UPDATE_REQUEST_CODE = 7301
  }
}
