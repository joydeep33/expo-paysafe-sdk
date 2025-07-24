import SwiftUI
import Combine
import PaysafePaymentsSDK

// Billing Address Model
public struct BillingAddressData {
    let nickname: String
    let addressLine1: String
    let addressLine2: String
    let zipCode: String
    let city: String
    let country: String
    let state: String
}

class KeyboardResponder: ObservableObject {
    @Published var currentHeight: CGFloat = 0
    private var cancellables: Set<AnyCancellable> = []

    init() {
        let willShow = NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)
            .map { ($0.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect)?.height ?? 0 }

        let willHide = NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)
            .map { _ in CGFloat(0) }

        Publishers.Merge(willShow, willHide)
            .receive(on: RunLoop.main)
            .assign(to: \.currentHeight, on: self)
            .store(in: &cancellables)
    }
}


struct ContentView: View {
    @EnvironmentObject var viewModel: PaysafeViewModel

    private var cardNumberView = PSCardNumberInputSwiftUIView(
        animateTopPlaceholderLabel: false,
        hint: "Card Number"
    )
    private var cardholderNameView = PSCardholderNameInputSwiftUIView(
        animateTopPlaceholderLabel: false,
        hint: "Cardholder Name"
    )
    private var cardExpiryView = PSCardExpiryInputSwiftUIView(
        animateTopPlaceholderLabel: false,
        hint: "Expiry Date"
    )
    private var cardCVVView = PSCardCVVInputSwiftUIView(
        animateTopPlaceholderLabel: false,
        hint: "CVV"
    )

    @State private var textFieldText: String = ""
    @StateObject private var keyboard = KeyboardResponder()
    
    @State private var amountText: String = ""
    @State private var showBillingAddressSheet = false
    @State private var saveCardDetails: Bool = false
    @State private var savedBillingAddress: BillingAddressData?
    
    // Field validation states
    @State private var cardNumberHasError: Bool = false
    @State private var cardholderNameHasError: Bool = false
    @State private var expiryHasError: Bool = false
    @State private var cvvHasError: Bool = false
    
    // Theme colors matching our PSTheme configuration
    private let paysafeBlue = Color(red: 20/255, green: 115/255, blue: 230/255)
    private let paysafeBlueDark = Color(red: 13/255, green: 71/255, blue: 161/255)
    private let borderGray = Color(red: 201/255, green: 201/255, blue: 201/255)
    private let errorRed = Color(red: 220/255, green: 38/255, blue: 127/255)

    var body: some View {
        VStack(spacing: 0) {
            // Blue Header Section (using theme colors)
            VStack(spacing: 16) {
                HStack {
                    Button(action: {
                        DispatchQueue.main.async {
                            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                               let window = windowScene.windows.first,
                               let rootViewController = window.rootViewController {
                                
                                // Find the presented view controller (modal)
                                var currentVC = rootViewController
                                while let presentedVC = currentVC.presentedViewController {
                                    currentVC = presentedVC
                                }
                                
                                // Dismiss the current modal
                                currentVC.dismiss(animated: true) {
                                    NSLog("[iOS] Payment form closed successfully!")
                                }
                            }
                        }
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    Text("Make Your Payment")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    // Invisible spacer for centering
                    Image(systemName: "xmark")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.clear)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                
                // Payment Amount Section
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Payment")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                        Text("Amount: USD")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    Text("$\(amountText)")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.white)
                        )
                        .frame(width: 120)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .background(
                LinearGradient(
                    colors: [paysafeBlue, paysafeBlueDark],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            
            // White Card Form Section
            ScrollView {
                VStack(spacing: 0) {
                    // Card Type Header
                    HStack {
                        Image(systemName: "creditcard.fill")
                            .font(.system(size: 18))
                            .foregroundColor(paysafeBlue)
                        
                        Text("Credit/Debit Card")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 24)
                    .padding(.bottom, 20)
                    
                    VStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Card Number")
                                .font(.system(size: 15, weight: .medium))
                                .padding(.horizontal, 4)
                                .foregroundColor(.primary)
                            cardNumberView
                                .frame(height: 50)
                        }
                        
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Cardholder Name")
                                .font(.system(size: 15, weight: .medium))
                                .padding(.horizontal, 4)
                                .foregroundColor(.primary)
                            cardholderNameView
                                .frame(height: 50)
                        }
                        
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Expiry Date")
                                .font(.system(size: 15, weight: .medium))
                                .padding(.horizontal, 4)
                                .foregroundColor(.primary)
                            cardExpiryView
                                .frame(height: 50)
                        }
                        
                        VStack(alignment: .leading, spacing: 6) {
                            Text("CVV")
                                .font(.system(size: 15, weight: .medium))
                                .padding(.horizontal, 4)
                                .foregroundColor(.primary)
                            cardCVVView
                                .frame(height: 50)
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Billing Address Section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Billing Address")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(paysafeBlue)
                            
                            Spacer()
                            
                            Button("Change") {
                                showBillingAddressSheet = true
                            }
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(paysafeBlue)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(savedBillingAddress?.nickname ?? "Test User")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.primary)
                            
                            if let address = savedBillingAddress {
                                Text("\(address.addressLine1), \(address.city), \(address.state), \(address.zipCode)")
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(.secondary)
                                    .lineLimit(2)
                            } else {
                                Text("Test Address, Test City, Test State, 12345")
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(.secondary)
                                    .lineLimit(2)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 40)
                    
                    // Payment Button
                    VStack(spacing: 16) {
                        Button(action: {
                            // Pass billing address to view model
                            viewModel.setBillingAddress(savedBillingAddress)
                            // Use the configured account ID and amount from the SDK initialization
                            let config = PaysafeWrappeApp.shared.getCurrentConfiguration()
                            let configuredAccountId = config["accountId"] as? String ?? ""
                            let configuredAmount = config["amount"] as? Int ?? 0
                            viewModel.placeOrder(accountId: configuredAccountId, amount: configuredAmount)
                        }) {
                            HStack {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.white)
                                
                                Text("Pay $\(amountText)")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(
                                        LinearGradient(
                                            colors: [paysafeBlue, paysafeBlueDark],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                            .shadow(color: paysafeBlue.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                        .disabled(!viewModel.placeOrderEnabled)
                        .padding(.horizontal, 20)
                        
                        // Paysafe Footer
                        VStack(spacing: 8) {
                            HStack {
                                Text("Paysafe")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.primary)
                                
                                Image(systemName: "shield.fill")
                                    .font(.system(size: 12))
                                    .foregroundColor(.orange)
                                
                                Spacer()
                            }
                            
                            Text("For any queries please reach us at support@paysafe.com")
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                            
                            Text("Information is processed in accordance with Paysafe's Privacy & Cookies notices")
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                    .padding(.top, 40)
                }
            }
            .background(Color.white)
        }
        .background(Color.white)
        .onTapGesture {
            print("Direct tap - dismissing keyboard")
            let scenes = UIApplication.shared.connectedScenes
            let windowScene = scenes.first as? UIWindowScene
            let window = windowScene?.windows.first
            window?.endEditing(true)
        }
        .onAppear {
            print("[iOS] ContentView appeared - configuring card form")
            
            // Get current configuration from the shared instance
            let config = PaysafeWrappeApp.shared.getCurrentConfiguration()
            let configuredAccountId = config["accountId"] as? String ?? ""
            let configuredAmount = config["amount"] as? Int ?? 0
            
            // Set initial amount from configuration if not already set
            if amountText.isEmpty && configuredAmount > 0 {
                amountText = String(format: "%.2f", Double(configuredAmount) / 100.0)
            }
            
            print("[iOS] Using dynamic configuration:")
            print("[iOS] - Account ID: \(configuredAccountId)")
            print("[iOS] - Amount: \(amountText)")
            print("[iOS] - Environment: \(config["environment"] as? String ?? "nil")")
            
            print("[iOS] About to call configureCardForm...")
            viewModel.configureCardForm(
                accountId: configuredAccountId,
                cardNumberView: cardNumberView,
                cardholderNameView: cardholderNameView,
                cardExpiryView: cardExpiryView,
                cardCVVView: cardCVVView,
                amountProvider: {
                    return configuredAmount
                }
            )
            print("[iOS] configureCardForm call completed")
        }
        .sheet(isPresented: $showBillingAddressSheet) {
            BillingAddressSheet(
                existingAddress: savedBillingAddress,
                onSave: { billingAddress in
                    savedBillingAddress = billingAddress
                    showBillingAddressSheet = false
                }
            )
        }
    }
}

struct BillingAddressSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    let existingAddress: BillingAddressData?
    let onSave: (BillingAddressData) -> Void
    
    @State private var nickname = ""
    @State private var addressLine1 = ""
    @State private var addressLine2 = ""
    @State private var zipCode = ""
    @State private var city = ""
    @State private var country = "United States"
    @State private var state = "Select State"
    
    private let countries = AppConstants.supportedCountries
    private let states = AppConstants.states
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    Text("Billing Address")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.primary)
                        .padding(.top, 20)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                
                // Form
                ScrollView {
                    VStack(spacing: 20) {
                        // Nickname
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Nickname", text: $nickname)
                                .textFieldStyle(CustomTextFieldStyle())
                        }
                        
                        // Address Line 1
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Address Line 1", text: $addressLine1)
                                .textFieldStyle(CustomTextFieldStyle())
                        }
                        
                        // Address Line 2
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Address Line 2 (Optional)", text: $addressLine2)
                                .textFieldStyle(CustomTextFieldStyle())
                        }
                        
                        // ZIP and City
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 8) {
                                TextField("ZIP Code", text: $zipCode)
                                    .textFieldStyle(CustomTextFieldStyle())
                                    .keyboardType(.numberPad)
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                TextField("City", text: $city)
                                    .textFieldStyle(CustomTextFieldStyle())
                            }
                        }
                        
                        // Country Picker
                        VStack(alignment: .leading, spacing: 8) {
                            Menu {
                                ForEach(countries, id: \.self) { countryOption in
                                    Button(countryOption) {
                                        country = countryOption
                                    }
                                }
                            } label: {
                                HStack {
                                    Text(country)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                            }
                        }
                        
                        // State Picker
                        VStack(alignment: .leading, spacing: 8) {
                            Menu {
                                ForEach(states, id: \.self) { stateOption in
                                    Button(stateOption) {
                                        state = stateOption
                                    }
                                }
                            } label: {
                                HStack {
                                    Text(state)
                                        .foregroundColor(state == "Select State" ? .secondary : .primary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 100) // Space for save button
                }
                
                // Save Button
                VStack {
                    Button(action: {
                        // Create billing address object
                        let billingAddress = BillingAddressData(
                            nickname: nickname,
                            addressLine1: addressLine1,
                            addressLine2: addressLine2,
                            zipCode: zipCode,
                            city: city,
                            country: country,
                            state: state
                        )
                        // Save billing address
                        onSave(billingAddress)
                    }) {
                        Text("Save Address")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.blue)
                            )
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
                .background(Color.white)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                // Populate existing address data if available
                if let existingAddress = existingAddress {
                    nickname = existingAddress.nickname
                    addressLine1 = existingAddress.addressLine1
                    addressLine2 = existingAddress.addressLine2
                    zipCode = existingAddress.zipCode
                    city = existingAddress.city
                    country = existingAddress.country
                    state = existingAddress.state
                }
            }
        }
    }
}

struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
            )
    }
}
