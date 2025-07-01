package expo.modules.paysafe;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.*;
import com.paysafe.android.*;

public class PaysafeModule extends ReactContextBaseJavaModule {
  public PaysafeModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return "Paysafe";
  }

  @ReactMethod
  public void initiateCheckout(ReadableMap options, Promise promise) {
    try {
      Activity activity = getCurrentActivity();
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No current activity");
        return;
      }

      String apiKey = options.getString("apiKey");
      String accountId = options.getString("accountId");
      double amount = options.getDouble("amount");
      String currency = options.getString("currencyCode");
      String environment = options.hasKey("environment") && options.getString("environment").equals("LIVE")
        ? "LIVE" : "TEST";

      PaysafeSDK.setup(apiKey, environment.equals("LIVE") ? PSEnvironment.LIVE : PSEnvironment.TEST);

      ThreeDSecureOptions.Builder threeDSBuilder = new ThreeDSecureOptions.Builder()
        .amount(amount)
        .currency(currency)
        .accountId(accountId);

      if (options.hasKey("merchantRefNum")) {
        threeDSBuilder.merchantRefNum(options.getString("merchantRefNum"));
      }

      ThreeDSecureOptions threeDSOptions = threeDSBuilder.build();

      PSCardFormConfig.Builder configBuilder = new PSCardFormConfig.Builder()
        .accountId(accountId)
        .threeDSecureOptions(threeDSOptions);

      PSCardFormController.initialize(configBuilder.build(), null, new PSCallback<PSCardFormController>() {
        @Override
        public void onSuccess(PSCardFormController controller) {
          controller.launch(activity, result -> {
            if (result.isSuccess()) {
              promise.resolve(result.getPaymentHandle());
            } else {
              promise.reject("3DS_FAILED", result.getError().getMessage());
            }
          });
        }

        @Override
        public void onFailure(Exception e) {
          promise.reject("SDK_INIT_FAILED", e.getMessage());
        }
      });
    } catch (Exception e) {
      promise.reject("PAYSAFE_INIT_ERROR", e.getMessage());
    }
  }
}
