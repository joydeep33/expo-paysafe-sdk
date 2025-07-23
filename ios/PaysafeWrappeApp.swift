import SwiftUI
import PaysafePaymentsSDK

// Billing Address struct for Paysafe SDK integration
struct BillingAddress {
    /// Billing address id
    let id: String = UUID().uuidString
    /// Billing address nickname
    let nickName: String
    /// Billing address street
    let street: String
    /// Billing address city
    let city: String
    /// Billing address state
    let state: String
    /// Billing address country
    let country: String
    /// Billing address zip code
    let zip: String

    var billingAddressString: String {
        "\(nickName)\n\(street)\n\(city), \(state), \(zip)"
    }
}

extension BillingAddress {
    func toBillingDetails() -> BillingDetails {
        BillingDetails(
            country: country,
            zip: zip,
            state: state,
            city: city,
            street: street,
            street1: nil,
            street2: nil,
            phone: nil,
            nickName: nickName
        )
    }
}

// @objc for bridging to React Native and NSObject is required for objective-c compatibility
@objc public class PaysafeWrappeApp: NSObject {
 
 //Singleton instance shared is used to manage one central entry point.
    @objc public static let shared = PaysafeWrappeApp()

//shared observable state for card form and payment logic
    @objc public let viewModel = PaysafeViewModel()
    
    // Store configuration from frontend - all values are dynamic
    private var currentApiKey: String?
    private var currentAccountId: String?
    private var currentAmount: Int?
    private var currentCurrencyCode: String?
    private var currentEnvironment: String?
    private var currentMerchantRefNum: String?
    private var currentSingleUseCustomerToken: String?
    private var currentEmail: String?
    private var currentFirstName: String?
    private var currentLastName: String?
    private var currentPhone: String?
    private var currentThreeDSMerchantUrl: String?

    @objc public static func presentCardForm() {
        // Ensures the UI update runs on the main thread (required for UIKit/SwiftUI updates)
        DispatchQueue.main.async {
            //ContentView is your SwiftUI form screen.
            let contentView = ContentView().environmentObject(shared.viewModel)
            //Embeds SwiftUI into UIKit using UIHostingController
            let hostingController = UIHostingController(rootView: contentView)
            
            hostingController.modalPresentationStyle = .fullScreen
            
            // Ensure the hosting controller can handle keyboard properly
            hostingController.view.backgroundColor = UIColor.systemBackground
            

            //Finds the current window and presents the SwiftUI view.
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first {
                window.rootViewController?.present(hostingController, animated: true) {
                    NSLog("[iOS] SwiftUI card form presented successfully!")
                }
            }
        }
    }

    // Create beautiful Paysafe theme based on official documentation
    private static func createPaysafeTheme() -> PSTheme {
        return PSTheme(
            backgroundColor: UIColor.systemBackground,
            borderColor: UIColor(red: 220/255, green: 220/255, blue: 220/255, alpha: 1.0),
            focusedBorderColor: UIColor(red: 38/255, green: 93/255, blue: 177/255, alpha: 1.0),
            borderCornerRadius: 8.0,
            errorColor: UIColor(red: 220/255, green: 53/255, blue: 69/255, alpha: 1.0),
            textInputColor: UIColor.label,
            placeholderColor: UIColor(red: 111/255, green: 111/255, blue: 111/255, alpha: 0.9),
            hintColor: UIColor(red: 111/255, green: 111/255, blue: 111/255, alpha: 0.9),
            textInputFont: UIFont.systemFont(ofSize: 16, weight: .medium),
            placeholderFont: UIFont.systemFont(ofSize: 14, weight: .regular),
            hintFont: UIFont.systemFont(ofSize: 14, weight: .regular)
        )
    }

    @objc public static func initiateCheckout(
        apiKey: String,
        accountId: String,
        amount: Int,
        currencyCode: String,
        environment: String,
        merchantRefNum: String?,
        singleUseCustomerToken: String?,
        email: String?,
        firstName: String?,
        lastName: String?,
        phone: String?,
        threeDSMerchantUrl: String? = nil
    ) {
        // Store configuration data
        shared.currentApiKey = apiKey
        shared.currentAccountId = accountId
        shared.currentAmount = amount
        shared.currentCurrencyCode = currencyCode
        shared.currentEnvironment = environment
        shared.currentMerchantRefNum = merchantRefNum
        shared.currentSingleUseCustomerToken = singleUseCustomerToken
        shared.currentEmail = email
        shared.currentFirstName = firstName
        shared.currentLastName = lastName
        shared.currentPhone = phone
        shared.currentThreeDSMerchantUrl = threeDSMerchantUrl
        
        NSLog("[iOS] Configuration stored - API Key: \(apiKey.prefix(20))..., Account ID: \(accountId), Amount: \(amount), Currency: \(currencyCode)")
        
        // Create beautiful Paysafe theme
        let paysafeTheme = createPaysafeTheme()
        
        // Set up the Paysafe SDK with beautiful theme
        PaysafeSDK.shared.setup(
            apiKey: apiKey,
            environment: environment.uppercased() == "PROD" ? .production : .test,
            theme: paysafeTheme
        ) { result in
            switch result {
                    case .success:
            print("[iOS] Paysafe SDK setup succeeded with environment: \(environment)")
            NSLog("[iOS] About to update ViewModel configuration")
            // Pass the stored configuration to the view model
            shared.viewModel.updateConfiguration(
                apiKey: apiKey,
                accountId: accountId,
                amount: amount,
                currencyCode: currencyCode,
                environment: environment,
                merchantRefNum: merchantRefNum,
                singleUseCustomerToken: singleUseCustomerToken,
                email: email,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                threeDSMerchantUrl: threeDSMerchantUrl
            )
            case .failure(let error):
                NSLog("[iOS] Paysafe SDK setup failed: \(error)")
            }
        }
    }
    
    // Legacy method - now uses stored configuration
    @objc public static func setupPaysafeSDK() {
        if let apiKey = shared.currentApiKey,
           let accountId = shared.currentAccountId {
            initiateCheckout(
                apiKey: apiKey,
                accountId: accountId,
                amount: shared.currentAmount ?? 0,
                currencyCode: shared.currentCurrencyCode ?? "USD",
                environment: shared.currentEnvironment ?? "TEST",
                merchantRefNum: shared.currentMerchantRefNum,
                singleUseCustomerToken: shared.currentSingleUseCustomerToken,
                email: shared.currentEmail,
                firstName: shared.currentFirstName,
                lastName: shared.currentLastName,
                phone: shared.currentPhone,
                threeDSMerchantUrl: shared.currentThreeDSMerchantUrl
            )
        } else {
            NSLog("[iOS] ERROR: Cannot setup SDK - missing required configuration")
        }
    }
    
    // Getter methods for accessing stored configuration
    @objc public func getCurrentConfiguration() -> [String: Any] {
        return [
            "apiKey": currentApiKey ?? "",
            "accountId": currentAccountId ?? "",
            "amount": currentAmount ?? 0,
            "currencyCode": currentCurrencyCode ?? "",
            "environment": currentEnvironment ?? "",
            "merchantRefNum": currentMerchantRefNum ?? "",
            "singleUseCustomerToken": currentSingleUseCustomerToken ?? "",
            "email": currentEmail ?? "",
            "firstName": currentFirstName ?? "",
            "lastName": currentLastName ?? "",
            "phone": currentPhone ?? "",
            "threeDSMerchantUrl": currentThreeDSMerchantUrl ?? ""
        ]
    }
}


@objc public final class PaysafeViewModel: NSObject, ObservableObject {
    // Used in SwiftUI to store observable state (@Published).
    // Holds the SDK-generated card input form.
    @Published public var cardForm: PSCardForm?
    @Published @objc public var paymentStatus: String = ""

    // Prevents duplicate payments on repeated form updates.
    @Published @objc public var placeOrderEnabled: Bool = false
    
    @objc public var cardFormExists: Bool {
        return cardForm != nil
    }

    private var hasTriggeredPayment = false
    
    // Store configuration from PaysafeWrappeApp - all values are dynamic
    private var configApiKey: String?
    private var configAccountId: String?
    private var configAmount: Int?
    private var configCurrencyCode: String?
    private var configEnvironment: String?
    private var configMerchantRefNum: String?
    private var configSingleUseCustomerToken: String?
    private var configEmail: String?
    private var configFirstName: String?
    private var configLastName: String?
    private var configPhone: String?
    private var configThreeDSMerchantUrl: String?
    private var currentBillingAddress: BillingAddressData?
    
    public override init() {
        super.init()
    }

    // Method to update configuration from PaysafeWrappeApp
    public func updateConfiguration(
        apiKey: String,
        accountId: String,
        amount: Int,
        currencyCode: String,
        environment: String,
        merchantRefNum: String?,
        singleUseCustomerToken: String?,
        email: String?,
        firstName: String?,
        lastName: String?,
        phone: String?,
        threeDSMerchantUrl: String?
    ) {
        configApiKey = apiKey
        configAccountId = accountId
        configAmount = amount
        configCurrencyCode = currencyCode
        configEnvironment = environment
        configMerchantRefNum = merchantRefNum
        configSingleUseCustomerToken = singleUseCustomerToken
        configEmail = email
        configFirstName = firstName
        configLastName = lastName
        configPhone = phone
        configThreeDSMerchantUrl = threeDSMerchantUrl
        
        NSLog("[iOS] ViewModel configuration updated with amount: \(amount), currency: \(currencyCode), merchantRefNum: \(merchantRefNum ?? "nil")")
    }
    
    // Method to set billing address
    public func setBillingAddress(_ billingAddress: BillingAddressData?) {
        currentBillingAddress = billingAddress
        NSLog("[iOS] Billing address updated: \(billingAddress?.addressLine1 ?? "nil")")
    }

    public func configureCardForm(
        accountId: String,
        cardNumberView: PSCardNumberInputSwiftUIView,
        cardholderNameView: PSCardholderNameInputSwiftUIView,
        cardExpiryView: PSCardExpiryInputSwiftUIView,
        cardCVVView: PSCardCVVInputSwiftUIView,
        amountProvider: @escaping () -> Int
    ) {
        // Use stored configuration or fallback to parameters
        let finalAccountId = configAccountId ?? accountId
        let finalCurrencyCode = configCurrencyCode ?? "USD"
        
        NSLog("[iOS] CONFIGURING CARD FORM:")
        NSLog("[iOS] - Account ID: \(finalAccountId)")
        NSLog("[iOS] - Currency: \(finalCurrencyCode)")
        NSLog("[iOS] Using global Paysafe theme for consistent styling")
        NSLog("[iOS] Starting PSCardForm.initialize...")
        
        PSCardForm.initialize(
            currencyCode: finalCurrencyCode,
            accountId: finalAccountId,
            cardNumberSwiftUIView: cardNumberView,
            cardholderNameSwiftUIView: cardholderNameView,
            cardExpirySwiftUIView: cardExpiryView,
            cardCVVSwiftUIView: cardCVVView
        ) { [weak self] result in
            NSLog("[iOS] PSCardForm.initialize callback received")
            
            DispatchQueue.main.async {
                NSLog("[iOS] Processing result on main thread")
                
                switch result {
                case .success(let cardForm):
                    NSLog("[iOS] Card form initialization SUCCESS")
                    self?.cardForm = cardForm
                    NSLog("[iOS] Card form stored in view model")
                    
                    // Update status and enable form
                    self?.paymentStatus = " Card form ready - Enter card details"
                    self?.placeOrderEnabled = true
                    NSLog("[iOS] Payment status updated to: \(self?.paymentStatus ?? "nil")")
                    NSLog("[iOS] Place order button enabled")
                    
                    cardForm.onCardFormUpdate = { isValid in
                        DispatchQueue.main.async {
                            NSLog("[iOS] Card form validation update: \(isValid)")
                            self?.placeOrderEnabled = isValid
                            NSLog("[iOS] Card form ready for user interaction")
                        }
                    }
                    
                case .failure(let error):
                    NSLog("[iOS] Card form initialization FAILED: \(error.localizedDescription)")
                    self?.paymentStatus = "Card form initialization failed: \(error.localizedDescription)"
                    NSLog("[iOS] Payment status updated to: '\(self?.paymentStatus ?? "nil")'")
                }
            }
        }
    }

    public func placeOrder(accountId: String, amount: Int) {
        guard let cardForm = cardForm else {
            paymentStatus = "Card form not initialized"
            NSLog("[iOS] FATAL ERROR: \(paymentStatus)")
            return
        }

        NSLog("[iOS] Card form exists: \(cardForm)")
        paymentStatus = "Processing payment..."
        NSLog("[iOS] Payment status updated to: '\(paymentStatus)'")

        // Use stored configuration instead of hardcoded values
        let finalAmount = configAmount ?? amount
        let finalCurrencyCode = configCurrencyCode ?? "USD"
        let finalAccountId = configAccountId ?? accountId
        let finalMerchantRefNum = configMerchantRefNum ?? "deposit_\(Int(Date().timeIntervalSince1970))"
        let finalThreeDSMerchantUrl = configThreeDSMerchantUrl ?? "https://api.qa.paysafe.com/checkout/v2/index.html#/desktop"
        
        NSLog("[iOS] PAYMENT CONFIGURATION:")
        NSLog("[iOS] - Amount: \(finalAmount)")
        NSLog("[iOS] - Currency: \(finalCurrencyCode)")
        NSLog("[iOS] - Account ID: \(finalAccountId)")
        NSLog("[iOS] - Merchant Ref: \(finalMerchantRefNum)")
        
        // Create billing details from saved address
        let billingDetails: BillingDetails?
        if let address = currentBillingAddress {
            // Convert BillingAddressData to BillingAddress and then to BillingDetails
            let billingAddress = BillingAddress(
                nickName: address.nickname,
                street: address.addressLine1,
                city: address.city,
                state: AppConstants.getStateCode(from: address.state), // Convert to state abbreviation for API
                country: AppConstants.getCountryCode(from: address.country), // Convert to country code for API
                zip: address.zipCode
            )
            billingDetails = billingAddress.toBillingDetails()
            NSLog("[iOS] Using billing address: \(address.addressLine1), \(address.city), \(address.state)")
        } else {
            billingDetails = nil
            NSLog("[iOS] No billing address provided")
        }
        
        // Create tokenize options
        let options: PSCardTokenizeOptions
        
        if let customerToken = configSingleUseCustomerToken, !customerToken.isEmpty {
            NSLog("[iOS] Creating tokenize options WITH customer token")
            options = PSCardTokenizeOptions(
                amount: finalAmount,
                currencyCode: finalCurrencyCode,
                transactionType: .payment,
                merchantRefNum: finalMerchantRefNum,
                billingDetails: billingDetails,
                accountId: finalAccountId,
                threeDS: ThreeDS(merchantUrl: finalThreeDSMerchantUrl, process: true),
                singleUseCustomerToken: customerToken
            )
        } else {
            NSLog("[iOS] Creating tokenize options WITHOUT customer token")
            options = PSCardTokenizeOptions(
                amount: finalAmount,
                currencyCode: finalCurrencyCode,
                transactionType: .payment,
                merchantRefNum: finalMerchantRefNum,
                billingDetails: billingDetails,
                accountId: finalAccountId,
                threeDS: ThreeDS(merchantUrl: finalThreeDSMerchantUrl, process: true)
            )
        }
        
        NSLog("[iOS] Using tokenize options - Amount: \(finalAmount), Currency: \(finalCurrencyCode), MerchantRefNum: \(finalMerchantRefNum), AccountId: \(finalAccountId)")
        
        cardForm.tokenize(using: options) { [weak self] result in
            DispatchQueue.main.async {
                NSLog("[iOS] Tokenization callback received")
                switch result {
                case .success(let token):
                    self?.paymentStatus = "Payment successful! Token: \(token)"
                    NSLog("[iOS] Payment status updated to: '\(self?.paymentStatus ?? "nil")'")
                case .failure(let error):
                    self?.paymentStatus = "Payment failed: \(error.localizedDescription)"
                    self?.hasTriggeredPayment = false
                    NSLog("[iOS] Payment status updated to: '\(self?.paymentStatus ?? "nil")'")
                }
            }
        }
    }

    // React Native bridge methods - these use the stored configuration
    @objc public func initializeCardFormWithAccountId(_ accountId: String,
                                                      amountProvider: @escaping () -> Int) {
        hasTriggeredPayment = false
        paymentStatus = ""
        placeOrderEnabled = false
        
        NSLog("[iOS] React Native bridge: Card form preparation complete")
    }

    @objc public func processCardPaymentWithAccountId(_ accountId: String, amount: Int) {
        hasTriggeredPayment = false
        NSLog("[iOS] Reset hasTriggeredPayment to: \(hasTriggeredPayment)")
        placeOrder(accountId: accountId, amount: amount)
    }
}

