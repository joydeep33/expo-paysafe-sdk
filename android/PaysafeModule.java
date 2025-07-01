package expo.modules.paysafe;

import android.app.Activity;
import android.util.Log;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.*;

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
    // TODO: Integrate Paysafe Android SDK call here
    Log.d("Paysafe", "initiateCheckout called with: " + options);
    promise.resolve("Simulated payment token");
  }
}