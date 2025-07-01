import Foundation
import ExpoModulesCore

public class PaysafeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Paysafe")

    Function("initiateCheckout") { (options: [String: Any]) -> String in
      // TODO: Integrate Paysafe iOS SDK call here
      print("initiateCheckout called with: \(options)")
      return "Simulated payment token"
    }
  }
}