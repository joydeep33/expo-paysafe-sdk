package expo.modules.paysafe;

import android.app.Activity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.Toast;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

import com.paysafe.android.PaysafeSDK;
import com.paysafe.android.core.domain.model.config.PSEnvironment;
import com.paysafe.android.core.domain.exception.PaysafeRuntimeError;
import com.paysafe.android.core.data.entity.PSCallback;
import com.paysafe.android.core.data.entity.PSResultCallback;

// Card Payment imports
import com.paysafe.android.hostedfields.PSCardFormController;
import com.paysafe.android.hostedfields.PSCardFormConfig;
import com.paysafe.android.hostedfields.cardnumber.PSCardNumberView;
import com.paysafe.android.hostedfields.holdername.PSCardholderNameView;
import com.paysafe.android.hostedfields.expirydate.PSExpiryDateTextView;
import com.paysafe.android.hostedfields.cvv.PSCvvView;
import com.paysafe.android.hostedfields.domain.model.PSCardTokenizeOptions;
import com.paysafe.android.hostedfields.domain.model.RenderType;

import com.paysafe.android.paymentmethods.domain.model.PSCreditCardType;

import com.paysafe.android.tokenization.domain.model.paymentHandle.BillingDetails;
import com.paysafe.android.tokenization.domain.model.paymentHandle.TransactionType;
import com.paysafe.android.tokenization.domain.model.paymentHandle.SimulatorType;

import com.paysafe.android.threedsecure.Paysafe3DS;
import com.paysafe.android.tokenization.domain.model.paymentHandle.threeds.ThreeDS;
import com.paysafe.android.tokenization.domain.model.paymentHandle.threeds.AuthenticationPurpose;
import com.paysafe.android.tokenization.domain.model.paymentHandle.threeds.MessageCategory;
import com.paysafe.android.tokenization.domain.model.paymentHandle.threeds.TransactionIntent;

/**
 * PaysafeModule - React Native bridge for Paysafe SDK
 * Handles card payment processing, tokenization, and 3DS authentication
 */
public class PaysafeModule extends ReactContextBaseJavaModule {
    
    // Constants
    private static final String MODULE_NAME = "Paysafe";
    private static final String DEFAULT_ENVIRONMENT = "TEST";
    private static final String DEFAULT_FIRST_NAME = "Test";
    private static final String DEFAULT_LAST_NAME = "Customer";
    private static final String DEFAULT_EMAIL = "test@example.com";
    private static final String DEFAULT_PHONE = "1234567890";
    private static final String DEFAULT_CURRENCY = "USD";
    private static final double DEFAULT_AMOUNT = 19.99;
    
    // Billing Details Constants
    private static final String DEFAULT_COUNTRY = "US";
    private static final String DEFAULT_ZIP = "94102";
    private static final String DEFAULT_STATE = "CA";
    private static final String DEFAULT_CITY = "San Francisco";
    private static final String MERCHANT_REF_PREFIX = "deposit_";
    
    // 3DS Constants
    private static final String MERCHANT_URL = "https://api.qa.paysafe.com/checkout/v2/index.html#/desktop";
    
    // Error Codes
    private static final String ERROR_NO_ACTIVITY = "NO_ACTIVITY";
    private static final String ERROR_NOT_INITIALIZED = "NOT_INITIALIZED";
    private static final String ERROR_VALIDATION_ERROR = "VALIDATION_ERROR";
    private static final String ERROR_TOKENIZE_FAILED = "TOKENIZE_FAILED";
    private static final String ERROR_PAYSAFE_RUNTIME = "PAYSAFE_RUNTIME_ERROR";
    private static final String ERROR_SETUP = "PAYSAFE_SETUP_ERROR";
    private static final String ERROR_CARD_FORM_INIT = "CARD_FORM_INIT_ERROR";
    private static final String ERROR_PAYMENT_PROCESSING = "PAYMENT_PROCESSING_ERROR";
    private static final String ERROR_PRESENT_CARD_FORM = "PRESENT_CARD_FORM_ERROR";
    
    // UI Constants
    private static final int INPUT_MIN_HEIGHT = 120;
    private static final int INPUT_PADDING = 16;
    private static final int CONTAINER_PADDING = 50;
    private static final int BUTTON_MARGIN = 10;
    private static final int FIELD_MARGIN = 16;
    private static final int CORNER_RADIUS = 20;
    private static final int OVERLAY_MARGIN = 40;
    
    // Colors
    private static final int COLOR_OVERLAY_BACKGROUND = 0x80000000;
    private static final int COLOR_WHITE = 0xFFFFFFFF;
    private static final int COLOR_TEXT_PRIMARY = 0xFF333333;
    private static final int COLOR_TEXT_SECONDARY = 0xFF666666;
    private static final int COLOR_BUTTON_CANCEL = 0xFFE0E0E0;
    private static final int COLOR_BUTTON_PRIMARY = 0xFF007BFF;
    
    private static volatile PaysafeModule instance;
    
    private PSCardFormController cardFormController;
    private PSCardNumberView cardNumberView;
    private PSCardholderNameView cardHolderNameView;
    private PSExpiryDateTextView cardExpiryDateView;
    private PSCvvView cardCvvView;
    private String currentAccountId;
    private String currentCurrencyCode;
    private double currentAmount;
    private Paysafe3DS threeDSService;
    private String currentEnvironment;
    
    // Customer data storage for use across methods
    private String currentFirstName;
    private String currentLastName;
    private String currentEmail;
    private String currentPhone;
    private String currentMerchantRefNum;
    private String currentSingleUseCustomerToken;
    private String currentApiKey;
    
    // Event listener tracking
    private volatile boolean hasListeners = false;
    private volatile int listenerCount = 0;
    
    public PaysafeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        synchronized (PaysafeModule.class) {
            instance = this;
        }
    }
    
    public static PaysafeModule getInstance() {
        return instance;
    }
    
    // Getter methods for card form components
    public PSCardFormController getCardFormController() {
        return cardFormController;
    }
    
    public PSCardNumberView getCardNumberView() {
        return cardNumberView;
    }
    
    public PSCardholderNameView getCardHolderNameView() {
        return cardHolderNameView;
    }
    
    public PSExpiryDateTextView getCardExpiryDateView() {
        return cardExpiryDateView;
    }
    
    public PSCvvView getCardCvvView() {
        return cardCvvView;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        
        // Event names that JavaScript can listen to
        constants.put("CARD_BRAND_RECOGNIZED", "onCardBrandRecognized");
        constants.put("PAYMENT_SUCCESS", "onPaymentSuccess");
        constants.put("PAYMENT_FAILURE", "onPaymentFailure");
        constants.put("VALIDATION_CHANGED", "onValidationChanged");
        constants.put("THREEDS_CHALLENGE", "onThreeDSChallenge");
        
        return constants;
    }

    @ReactMethod
    public void initiateCheckout(ReadableMap options, Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject(ERROR_NO_ACTIVITY, "No current activity");
                return;
            }

            String apiKey = options.getString("apiKey");
            currentApiKey = apiKey;
            currentAccountId = options.getString("accountId");
            
            // Handle amount correctly - if it's already in cents, use as-is; if in dollars, convert
            double amountValue = options.getDouble("amount");
            currentAmount = amountValue;
            currentCurrencyCode = options.getString("currencyCode");
            currentMerchantRefNum = options.hasKey("merchantRefNum") ? options.getString("merchantRefNum") : null;
            currentSingleUseCustomerToken = options.hasKey("singleUseCustomerToken") ? options.getString("singleUseCustomerToken") : null;
            
            // Handle environment correctly
            String environment = options.hasKey("environment") ? options.getString("environment") : DEFAULT_ENVIRONMENT;
            currentEnvironment = environment;

            String email = null;
            String firstName = null;
            String lastName = null;
            String phone = null;
            
            if (options.hasKey("email")) {
                email = options.getString("email");
                Log.d("PaysafeModule", "Found email in options: " + email);
            }
            if (options.hasKey("firstName")) {
                firstName = options.getString("firstName");
                Log.d("PaysafeModule", "Found firstName in options: " + firstName);
            }
            if (options.hasKey("lastName")) {
                lastName = options.getString("lastName");
                Log.d("PaysafeModule", "Found lastName in options: " + lastName);
            }
            if (options.hasKey("phone")) {
                phone = options.getString("phone");
                Log.d("PaysafeModule", "Found phone in options: " + phone);
            }
            
            currentFirstName = firstName != null ? firstName : DEFAULT_FIRST_NAME;
            currentLastName = lastName != null ? lastName : DEFAULT_LAST_NAME;
            currentEmail = email != null ? email : DEFAULT_EMAIL;
            currentPhone = (phone != null && !phone.isEmpty()) ? phone : DEFAULT_PHONE;

            // Setup PaysafeSDK
            PSEnvironment psEnv = environment.equals("PROD") ? PSEnvironment.PROD : PSEnvironment.TEST;
            
            try {
                PaysafeSDK.INSTANCE.setup(apiKey, psEnv);
                Log.d("PaysafeModule", "SDK Initialized Status: " + PaysafeSDK.INSTANCE.isInitialized());
                
                // Initialize 3DS service
                threeDSService = new Paysafe3DS();
                Log.d("PaysafeModule", "3DS Service initialized successfully");
                
            } catch (PaysafeRuntimeError e) {
                Log.e("PaysafeModule", "PaysafeRuntimeError during setup: " + e.getMessage());
                Log.e("PaysafeModule", "PaysafeRuntimeError details:", e);
                promise.reject(ERROR_PAYSAFE_RUNTIME, "Paysafe SDK runtime error: " + e.getMessage());
                return;
            } catch (Exception e) {
                Log.e("PaysafeModule", "General Exception during setup: " + e.getMessage());
                Log.e("PaysafeModule", "General Exception details:", e);
                promise.reject(ERROR_SETUP, "Paysafe SDK setup error: " + e.getMessage());
                return;
            }

            // Return success response
            WritableMap result = Arguments.createMap();
            result.putString("status", "success");
            result.putString("message", "Paysafe SDK initialized successfully!");
            result.putString("environment", environment);
            result.putString("accountId", currentAccountId);
            result.putDouble("amount", currentAmount);
            result.putString("currency", currentCurrencyCode);
            result.putString("merchantRefNum", currentMerchantRefNum);
            result.putString("singleUseCustomerToken", currentSingleUseCustomerToken);
            result.putString("customerEmail", currentEmail);
            result.putString("customerName", currentFirstName + " " + currentLastName);
            result.putBoolean("isInitialized", PaysafeSDK.INSTANCE.isInitialized());
            result.putBoolean("tokenizationReady", false);
            result.putBoolean("threeDSReady", threeDSService != null);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject(ERROR_SETUP, "Failed to initialize Paysafe SDK: " + e.getMessage());
        }
    }

    @ReactMethod
    public void initializeCardForm(ReadableMap config, Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null || !(activity instanceof AppCompatActivity)) {
                promise.reject(ERROR_NO_ACTIVITY, "No current activity or activity is not AppCompatActivity");
                return;
            }

            AppCompatActivity appCompatActivity = (AppCompatActivity) activity;
            String accountId = config.getString("accountId");
            String currencyCode = config.getString("currencyCode");

            currentAccountId = accountId;
            currentCurrencyCode = currencyCode;

            // Run everything on the main thread
            appCompatActivity.runOnUiThread(() -> {
                try {
                    // Create card form configuration
                    PSCardFormConfig cardFormConfig = new PSCardFormConfig(currencyCode, accountId);

                    // Create card input views with proper configuration
                    cardNumberView = new PSCardNumberView(appCompatActivity);
                    configureInputView(cardNumberView, "Enter card number");
                    
                    cardHolderNameView = new PSCardholderNameView(appCompatActivity);
                    configureInputView(cardHolderNameView, "Enter cardholder name");
                    
                    cardExpiryDateView = new PSExpiryDateTextView(appCompatActivity);
                    configureInputView(cardExpiryDateView, "MM/YY");
                    
                    cardCvvView = new PSCvvView(appCompatActivity);
                    configureInputView(cardCvvView, "Enter CVV");

                    Log.d("PaysafeModule", "Card form views created and configured successfully");

                    // Initialize card form controller
                    PSCardFormController.Companion.initialize(
                        cardFormConfig,
                        cardNumberView,
                        cardHolderNameView,
                        cardExpiryDateView,
                        cardCvvView,
                        new PSCallback<PSCardFormController>() {
                            @Override
                            public void onSuccess(PSCardFormController controller) {
                                appCompatActivity.runOnUiThread(() -> {
                                    try {
                                        cardFormController = controller;
                                        
                                        // Set up card brand recognition
                                        cardFormController.setOnCardBrandRecognition(cardType -> {
                                            appCompatActivity.runOnUiThread(() -> {
                                                WritableMap cardBrandEvent = Arguments.createMap();
                                                cardBrandEvent.putString("cardType", cardType.toString());
                                                sendEvent("onCardBrandRecognized", cardBrandEvent);
                                            });
                                            return null;
                                        });
                                        
                                        WritableMap result = Arguments.createMap();
                                        result.putString("status", "success");
                                        result.putString("message", "Card form initialized successfully");
                                        result.putBoolean("cardFormReady", true);
                                        result.putBoolean("supportsValidation", true);
                                        result.putBoolean("supportsCardBrandRecognition", true);
                                        result.putBoolean("supportsTokenization", true);
                                        result.putBoolean("supports3DS", true);
                                        promise.resolve(result);
                                    } catch (Exception e) {
                                        promise.reject(ERROR_CARD_FORM_INIT, "Failed in success callback: " + e.getMessage());
                                    }
                                });
                            }

                            @Override
                            public void onFailure(Exception exception) {
                                appCompatActivity.runOnUiThread(() -> {
                                    promise.reject(ERROR_CARD_FORM_INIT, "Failed to initialize card form: " + exception.getMessage());
                                });
                            }
                        }
                    );
                } catch (Exception e) {
                    promise.reject(ERROR_CARD_FORM_INIT, "Failed to initialize card form on UI thread: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            promise.reject(ERROR_CARD_FORM_INIT, "Failed to initialize card form: " + e.getMessage());
        }
    }

    @ReactMethod
    public void processCardPayment(ReadableMap paymentOptions, Promise promise) {
        Log.d("PaysafeModule", "=== PROCESSCARDPAYMENT STARTED ===");
        Log.d("PaysafeModule", "Received paymentOptions: " + (paymentOptions != null ? paymentOptions.toString() : "null"));
        
            if (cardFormController == null) {
            Log.e("PaysafeModule", "Card form controller is null");
            if (promise != null) {
                promise.reject(ERROR_NOT_INITIALIZED, "Card form not initialized. Call initializeCardForm first.");
            }
                return;
            }

            Activity activity = getCurrentActivity();
            if (activity == null || !(activity instanceof AppCompatActivity)) {
            Log.e("PaysafeModule", "No activity or activity is not AppCompatActivity");
            if (promise != null) {
                promise.reject(ERROR_NO_ACTIVITY, "No current activity or activity is not AppCompatActivity");
            }
                return;
            }

            AppCompatActivity appCompatActivity = (AppCompatActivity) activity;
            Log.d("PaysafeModule", "Activity and cardFormController validated successfully");

            appCompatActivity.runOnUiThread(() -> {
                try {
                Log.d("PaysafeModule", "=== STARTING CARD VALIDATION ===");
                
                    // Validate all fields first
                    boolean isValid = cardFormController.areAllFieldsValid();
                    Log.d("PaysafeModule", "Card form validation result: " + isValid);
                
                    if (!isValid) {
                    String errorMsg = "Card form validation failed. Please ensure all fields are properly filled with valid data.";
                    Log.e("PaysafeModule", errorMsg);
                    if (promise != null) {
                        promise.reject(ERROR_VALIDATION_ERROR, errorMsg);
                    }
                        return;
                    }

                Log.d("PaysafeModule", "=== USING STORED DATA ===");
                int amount = (int) (currentAmount);
                String currencyCode = currentCurrencyCode;
                String accountIdString = currentAccountId;
                String firstName = currentFirstName;
                String lastName = currentLastName;
                String email = currentEmail;
                String phone = currentPhone;
                String singleUseCustomerToken = currentSingleUseCustomerToken;
                String uniqueMerchantRefNum = currentMerchantRefNum != null ? currentMerchantRefNum : MERCHANT_REF_PREFIX + System.currentTimeMillis();
                
               
                Log.d("PaysafeModule", "=== CREATING BILLING DETAILS ===");
                
                // Create billing details using customer data
                String country = DEFAULT_COUNTRY;
                String zip = DEFAULT_ZIP;
                String state = DEFAULT_STATE;
                String city = DEFAULT_CITY;
                String street = DEFAULT_CITY + " " + lastName + " St";
                String billingEmail = email != null && !email.trim().isEmpty() ? email : DEFAULT_EMAIL;
                    
                    BillingDetails billingDetails = new BillingDetails(
                    country,        // country = "US"
                    zip,            // zip = "94102"
                    state,          // state = "CA"
                    city,           // city = "San Francisco"
                    street,         // street = "123 VeriffG St"
                    null,           // street1 = null
                    null,           // street2 = null
                    phone,          // phone = "9870987055"
                    null            // nickName = null
                    );

                String merchantUrl = MERCHANT_URL;
                    
                final ThreeDS threeDSConfig = new ThreeDS(
                    merchantUrl,                              // merchantUrl - required
                    true,                                     // useThreeDSecureVersion2 - required
                    AuthenticationPurpose.PAYMENT_TRANSACTION, // authenticationPurpose - required
                    true,                                     // process - required
                    null,                                     // maxAuthorizationsForInstalmentPayment
                    null,                                     // billingCycle
                    null,                                     // electronicDelivery
                    null,                                     // threeDSProfile
                    MessageCategory.PAYMENT,                  // messageCategory - required
                    null,                                     // requestorChallengePreference
                    null,                                     // userLogin
                    TransactionIntent.GOODS_OR_SERVICE_PURCHASE, // transactionIntent - required
                    null,                                     // initialPurchaseTime
                    null,                                     // orderItemDetails
                    null,                                     // purchasedGiftCardDetails
                    null,                                     // userAccountDetails
                    null,                                     // priorThreeDSAuthentication
                    null,                                     // shippingDetailsUsage
                    false,                                    // suspiciousAccountActivity - try false instead of null
                    null,                                     // totalPurchasesSixMonthCount
                    null,                                     // transactionCountForPreviousDay
                    null,                                     // transactionCountForPreviousYear
                    null                                      // travelDetails
                );
                
                Log.d("PaysafeModule", "=== 3DS CONFIG CREATED ===");
                Log.d("PaysafeModule", "threeDSConfig: " + threeDSConfig.toString());
                
                Log.d("PaysafeModule", "=== CREATING TOKENIZATION OPTIONS ===");
                
                PSCardTokenizeOptions cardTokenizeOptions = new PSCardTokenizeOptions(
                    amount,
                    currencyCode.toUpperCase(),
                    TransactionType.PAYMENT,
                    uniqueMerchantRefNum,
                    billingDetails,
                    null,
                    accountIdString,
                    null,
                    null,
                    threeDSConfig,         
                    singleUseCustomerToken,
                    null,
                    SimulatorType.EXTERNAL,
                    RenderType.BOTH
                );
                
                Log.d("PaysafeModule", "=== TOKENIZATION OPTIONS CREATED ===");
                Log.d("PaysafeModule", "=== STARTING TOKENIZATION ===");

                cardFormController.tokenize(appCompatActivity, cardTokenizeOptions, new PSResultCallback<String>() {
                            @Override
                    public void onSuccess(@Nullable String token) {
                        Log.d("PaysafeModule", "SUCCESS: Tokenization successful!");
                            
                            WritableMap result = Arguments.createMap();
                            result.putString("status", "success");
                            result.putString("message", "Payment processed successfully");
                            result.putString("paymentHandleToken", token);
                            result.putString("merchantRefNum", uniqueMerchantRefNum);
                            result.putString("customerName", firstName + " " + lastName);
                            result.putString("email", email);
                            result.putInt("amountInCents", amount);
                            result.putDouble("amountInDollars", currentAmount);
                            result.putString("currencyCode", currencyCode);
                             result.putString("accountId", accountIdString);
                        
                            PSCreditCardType cardBrand = cardFormController.getCardBrand();
                            result.putString("cardBrand", cardBrand != null ? cardBrand.toString() : "unknown");
                            
                            if (promise != null) {
                                promise.resolve(result);
                            }
                        }

                            @Override
                    public void onFailure(@NonNull Exception exception) {
                        Log.e("PaysafeModule", "=== TOKENIZATION FAILED ===");
                        Log.e("PaysafeModule", "Exception type: " + exception.getClass().getSimpleName());
                        Log.e("PaysafeModule", "Exception message: " + exception.getMessage());
                        Log.e("PaysafeModule", "Full stack trace:", exception);
                        
                        if (promise != null) {
                            promise.reject(ERROR_TOKENIZE_FAILED, "Could not get payment token: " + exception.getMessage());
                            }
                        }
                  });

                } catch (Exception e) {
                Log.e("PaysafeModule", " ERROR in processCardPayment: " + e.getMessage());
                if (promise != null) {
                    promise.reject(ERROR_PAYMENT_PROCESSING, "Failed to process card payment: " + e.getMessage());
                }
                }
            });
    }

    @ReactMethod
    public void presentCardForm(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null || !(activity instanceof AppCompatActivity)) {
                promise.reject(ERROR_NO_ACTIVITY, "No current activity or activity is not AppCompatActivity");
                return;
            }

            if (cardFormController == null) {
                promise.reject(ERROR_NOT_INITIALIZED, "Card form not initialized. Call initializeCardForm first.");
                return;
            }

            AppCompatActivity appCompatActivity = (AppCompatActivity) activity;
            
            appCompatActivity.runOnUiThread(() -> {
                try {
                    createAndShowCardFormDialog(appCompatActivity, promise);
                } catch (Exception e) {
                    promise.reject(ERROR_PRESENT_CARD_FORM, "Failed to present card form: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            promise.reject(ERROR_PRESENT_CARD_FORM, "Failed to present card form: " + e.getMessage());
        }
    }

    private void createAndShowCardFormDialog(AppCompatActivity activity, Promise promise) {
        android.widget.FrameLayout overlay = new android.widget.FrameLayout(activity);
        overlay.setBackgroundColor(COLOR_OVERLAY_BACKGROUND); // Semi-transparent black background
        overlay.setClickable(true);
        overlay.setFocusable(true);
        
        // Create the card form container
        LinearLayout container = new LinearLayout(activity);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(CONTAINER_PADDING, CONTAINER_PADDING, CONTAINER_PADDING, CONTAINER_PADDING);
        container.setBackgroundColor(COLOR_WHITE); 
        
        // Add rounded corners effect
        try {
            android.graphics.drawable.GradientDrawable shape = new android.graphics.drawable.GradientDrawable();
            shape.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
            shape.setCornerRadius(CORNER_RADIUS);
            shape.setColor(COLOR_WHITE);
            container.setBackground(shape);
        } catch (Exception e) {
            container.setBackgroundColor(COLOR_WHITE);
        }

        // Title
        android.widget.TextView titleText = new android.widget.TextView(activity);
        titleText.setText("Enter Card Details");
        titleText.setTextSize(20);
        titleText.setTextColor(COLOR_TEXT_PRIMARY);
        titleText.setGravity(android.view.Gravity.CENTER);
        titleText.setPadding(0, 0, 0, 30);
        container.addView(titleText);

        // Create proper layout parameters for the card input views
        LinearLayout.LayoutParams fieldParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        fieldParams.setMargins(0, FIELD_MARGIN, 0, FIELD_MARGIN);

        // Configure card number view
        if (cardNumberView != null) {
            android.widget.TextView cardNumberLabel = new android.widget.TextView(activity);
            cardNumberLabel.setText("Card Number");
            cardNumberLabel.setTextSize(14);
            cardNumberLabel.setTextColor(COLOR_TEXT_SECONDARY);
            container.addView(cardNumberLabel);
            container.addView(cardNumberView, fieldParams);
        }

        // Configure cardholder name view
        if (cardHolderNameView != null) {
            android.widget.TextView cardNameLabel = new android.widget.TextView(activity);
            cardNameLabel.setText("Cardholder Name");
            cardNameLabel.setTextSize(14);
            cardNameLabel.setTextColor(COLOR_TEXT_SECONDARY);
            container.addView(cardNameLabel);
            container.addView(cardHolderNameView, fieldParams);
        }

        // Configure expiry date view
        if (cardExpiryDateView != null) {
            android.widget.TextView expiryLabel = new android.widget.TextView(activity);
            expiryLabel.setText("Expiry Date (MM/YY)");
            expiryLabel.setTextSize(14);
            expiryLabel.setTextColor(COLOR_TEXT_SECONDARY);
            container.addView(expiryLabel);
            container.addView(cardExpiryDateView, fieldParams);
        }

        // Configure CVV view
        if (cardCvvView != null) {
            android.widget.TextView cvvLabel = new android.widget.TextView(activity);
            cvvLabel.setText("CVV");
            cvvLabel.setTextSize(14);
            cvvLabel.setTextColor(COLOR_TEXT_SECONDARY);
            container.addView(cvvLabel);
            container.addView(cardCvvView, fieldParams);
        }

        // Add buttons
        LinearLayout buttonContainer = new LinearLayout(activity);
        buttonContainer.setOrientation(LinearLayout.HORIZONTAL);
        buttonContainer.setPadding(0, 30, 0, 0);
        
        Button cancelButton = new Button(activity);
        cancelButton.setText("Cancel");
        cancelButton.setTextColor(COLOR_TEXT_SECONDARY);
        cancelButton.setBackgroundColor(COLOR_BUTTON_CANCEL);
        LinearLayout.LayoutParams cancelParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        cancelParams.setMargins(0, 0, BUTTON_MARGIN, 0);
        cancelButton.setLayoutParams(cancelParams);
        
        Button processButton = new Button(activity);
        processButton.setText("Process Payment");
        processButton.setTextColor(COLOR_WHITE);
        processButton.setBackgroundColor(COLOR_BUTTON_PRIMARY);
        LinearLayout.LayoutParams processParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        processParams.setMargins(BUTTON_MARGIN, 0, 0, 0);
        processButton.setLayoutParams(processParams);
        
        buttonContainer.addView(cancelButton);
        buttonContainer.addView(processButton);
        container.addView(buttonContainer);

        // Make container scrollable
        android.widget.ScrollView scrollView = new android.widget.ScrollView(activity);
        scrollView.addView(container);
        
        // Center the scroll view in the overlay
        android.widget.FrameLayout.LayoutParams scrollParams = new android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
            android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
        );
        scrollParams.gravity = android.view.Gravity.CENTER;
        scrollParams.setMargins(OVERLAY_MARGIN, OVERLAY_MARGIN, OVERLAY_MARGIN, OVERLAY_MARGIN);
        scrollView.setLayoutParams(scrollParams);
        
        overlay.addView(scrollView);

        // Add overlay to activity's root view
        android.view.ViewGroup rootView = activity.findViewById(android.R.id.content);
        rootView.addView(overlay, new android.view.ViewGroup.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Set up button click listeners
        cancelButton.setOnClickListener(v -> {
            rootView.removeView(overlay);
            promise.resolve(Arguments.createMap());
        });
        
        processButton.setOnClickListener(v -> {
            if (cardFormController != null && cardFormController.areAllFieldsValid()) {
                rootView.removeView(overlay);
                // Process payment using existing method
                WritableMap paymentOptions = Arguments.createMap();
                paymentOptions.putDouble("amount", currentAmount);
                paymentOptions.putString("currencyCode", currentCurrencyCode);
                paymentOptions.putString("accountId", currentAccountId);
                paymentOptions.putString("firstName", currentFirstName);
                paymentOptions.putString("lastName", currentLastName);
                paymentOptions.putString("email", currentEmail);
                paymentOptions.putString("phone", currentPhone);
                paymentOptions.putString("merchantRefNum", currentMerchantRefNum);
                paymentOptions.putString("singleUseCustomerToken", currentSingleUseCustomerToken);
                    
                    processCardPayment(paymentOptions, promise);
                } else {
                    android.widget.Toast.makeText(activity, "Please complete all fields correctly.", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
            
            // Request focus on the first field when overlay is shown
            overlay.post(() -> {
                if (cardNumberView != null) {
                    cardNumberView.requestFocus();
                }
            });
    }

    // Helper method to configure input views
    private void configureInputView(View inputView, String hint) {
        if (inputView != null) {
            // Set minimum height for better touch target
            inputView.setMinimumHeight(INPUT_MIN_HEIGHT);
            
            // Enable focus and touch interaction
            inputView.setFocusable(true);
            inputView.setFocusableInTouchMode(true);
            inputView.setClickable(true);
                                
            // Set padding for better touch area
            inputView.setPadding(INPUT_PADDING, INPUT_PADDING, INPUT_PADDING, INPUT_PADDING);
            
            // Add background to make it visually clear it's an input field
            try {
                inputView.setBackgroundResource(android.R.drawable.edit_text);
                } catch (Exception e) {
                Log.d("PaysafeModule", "Could not set background for input view: " + e.getMessage());
                // Fallback: set a simple border
                inputView.setBackgroundColor(COLOR_WHITE);
            }
            
            // Ensure the view can receive input events
            inputView.setEnabled(true);
            
            // Set layout parameters if not already set
            if (inputView.getLayoutParams() == null) {
                ViewGroup.LayoutParams params = new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                inputView.setLayoutParams(params);
            }
            
            Log.d("PaysafeModule", "Configured input view with hint: " + hint + 
                   ", focusable: " + inputView.isFocusable() + 
                   ", clickable: " + inputView.isClickable() + 
                   ", enabled: " + inputView.isEnabled());
        }
    }

    // Helper method to send events to React Native
    private void sendEvent(String eventName, WritableMap params) {
        if (hasListeners && getReactApplicationContext().hasActiveCatalystInstance()) {
            try {
                getReactApplicationContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
                Log.d("PaysafeModule", "Event sent: " + eventName);
            } catch (Exception e) {
                Log.e("PaysafeModule", "Failed to send event: " + eventName, e);
            }
        }
    }

    // EventEmitter support methods
    @ReactMethod
    public void addListener(String eventName) {
        if (listenerCount == 0) {
            hasListeners = true;
        }
        listenerCount++;
        Log.d("PaysafeModule", "Added listener for: " + eventName + " (total: " + listenerCount + ")");
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        listenerCount = Math.max(0, listenerCount - count);
        if (listenerCount == 0) {
            hasListeners = false;
        }
        Log.d("PaysafeModule", "Removed " + count + " listeners (remaining: " + listenerCount + ")");
    }

    @Override
    public void invalidate() {
        super.invalidate();
        
        // Reset event listener tracking
        hasListeners = false;
        listenerCount = 0;
        
        // Clean up resources
        if (cardFormController != null) {
            cardFormController.dispose();
            cardFormController = null;
        }
        if (threeDSService != null) {
            threeDSService.dispose();
            threeDSService = null;
        }
        cardNumberView = null;
        cardHolderNameView = null;
        cardExpiryDateView = null;
        cardCvvView = null;
        
        // Clear the static instance
        instance = null;
        
        Log.d("PaysafeModule", "Module invalidated and resources cleaned up");
    }
}


