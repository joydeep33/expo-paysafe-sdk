import Foundation
import ExpoModulesCore
import UIKit
import PaysafeCardPayments

public class PaysafeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Paysafe")

    AsyncFunction("initiateCheckout") { (options: [String: Any]) async throws -> String in
      guard let apiKey = options["apiKey"] as? String,
            let accountId = options["accountId"] as? String,
            let amount = options["amount"] as? Double,
            let currency = options["currencyCode"] as? String else {
        throw NSError(domain: "Paysafe", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Missing required fields"])
      }

      let environment: PaysafeEnvironment = (options["environment"] as? String)?.uppercased() == "LIVE" ? .production : .test

      let result = await PaysafeSDK.shared.setup(apiKey: apiKey, environment: environment)
      if case .failure(let error) = result {
        throw NSError(domain: "Paysafe", code: 1002, userInfo: [NSLocalizedDescriptionKey: error.displayMessage])
      }

      let merchantRefNum = options["merchantRefNum"] as? String

      let threeDSOptions = ThreeDSecureOptions(
        amount: amount,
        currency: currency,
        accountId: accountId,
        merchantRefNum: merchantRefNum
      )

      let config = PSCardFormConfig(accountId: accountId, threeDSecureOptions: threeDSOptions)
      let context = try await PSCardFormController.initialize(config: config)

      guard let rootVC = UIApplication.shared.keyWindow?.rootViewController else {
        throw NSError(domain: "Paysafe", code: 1003, userInfo: [NSLocalizedDescriptionKey: "Missing root view controller"])
      }

      let result = try await context.present(from: rootVC)

      switch result {
      case .completed(let token):
        return token
      case .cancelled:
        throw NSError(domain: "Paysafe", code: 1004, userInfo: [NSLocalizedDescriptionKey: "User cancelled"])
      }
    }
  }
}