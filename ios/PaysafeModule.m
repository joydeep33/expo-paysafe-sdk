#import "PaysafeModule.h"
#import <React/RCTLog.h>
#import "PROJECT_NAME-Swift.h"

@implementation PaysafeModule

static NSString *apiKey = nil;
static NSString *accountId = nil;
static NSString *currencyCode = nil;
static int amount = 0;
static NSString *merchantRefNum = nil;
static NSString *singleUseCustomerToken = nil;
static NSString *customerEmail = nil;
static NSString *customerFirstName = nil;
static NSString *customerLastName = nil;
static NSString *customerPhone = nil;

RCT_EXPORT_MODULE(Paysafe)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[@"onCardBrandRecognized", @"onPaymentSuccess", @"onPaymentFailure"];
}

RCT_EXPORT_METHOD(initiateCheckout:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"[iOS] initiateCheckout called with options: %@", options);
    
    // Store the parameters for use in other methods
    apiKey = options[@"apiKey"];
    accountId = options[@"accountId"];
    currencyCode = options[@"currencyCode"];
    amount = [options[@"amount"] intValue];
    merchantRefNum = options[@"merchantRefNum"];
    singleUseCustomerToken = options[@"singleUseCustomerToken"];
    customerEmail = options[@"email"];
    customerFirstName = options[@"firstName"];
    customerLastName = options[@"lastName"];
    customerPhone = options[@"phone"];
    threeDSMerchantUrl = options[@"threeDSMerchantUrl"];
    
    
    NSLog(@"[iOS] Passing configuration to Swift: apiKey=%@, accountId=%@, amount=%d, currency=%@", 
          [apiKey substringToIndex:MIN(apiKey.length, 20)], accountId, amount, currencyCode);
    
    NSLog(@"[iOS] 🔍 BRIDGE DEBUG - Full Configuration:");
    NSLog(@"[iOS] - API Key: %@...", [apiKey substringToIndex:MIN(apiKey.length, 20)]);
    NSLog(@"[iOS] - Account ID: %@", accountId);
    NSLog(@"[iOS] - Amount: %d", amount);
    NSLog(@"[iOS] - Currency: %@", currencyCode);
    NSLog(@"[iOS] - Environment: %@", options[@"environment"] ?: @"TEST");
    NSLog(@"[iOS] - Merchant Ref: %@", merchantRefNum);
    NSLog(@"[iOS] - Email: %@", customerEmail);
    NSLog(@"[iOS] - Name: %@ %@", customerFirstName, customerLastName);
    
    // Initialize the Paysafe SDK with the provided configuration
    [PaysafeWrappeApp initiateCheckoutWithApiKey:apiKey
                                       accountId:accountId
                                          amount:amount
                                    currencyCode:currencyCode
                                     environment:options[@"environment"] ?: @"TEST"
                                  merchantRefNum:merchantRefNum
                          singleUseCustomerToken:singleUseCustomerToken
                                           email:customerEmail
                                       firstName:customerFirstName
                                        lastName:customerLastName
                                           phone:customerPhone
                               threeDSMerchantUrl:options[@"threeDSMerchantUrl"]];
    
    // Return success response
    NSDictionary *result = @{
        @"status": @"success",
        @"message": @"Paysafe SDK initialized successfully!",
        @"environment": options[@"environment"] ?: @"TEST",
        @"accountId": accountId,
        @"amount": @(amount),
        @"currency": currencyCode,
        @"merchantRefNum": merchantRefNum,
        @"singleUseCustomerToken": singleUseCustomerToken,
        @"customerEmail": customerEmail,
        @"customerName": [NSString stringWithFormat:@"%@ %@", customerFirstName, customerLastName],
        @"isInitialized": @YES,
        @"tokenizationReady": @NO,
        @"threeDSReady": @YES
    };
    
    resolve(result);
}

RCT_EXPORT_METHOD(initializeCardForm:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"[iOS] initializeCardForm called with config: %@", config);
    
    // Use the account ID from the config or the stored value
    NSString *configAccountId = config[@"accountId"] ?: accountId;
    NSString *configCurrencyCode = config[@"currencyCode"] ?: currencyCode;

    
    // Initialize the card form using the shared singleton
    PaysafeViewModel *viewModel = [PaysafeWrappeApp shared].viewModel;
    [viewModel initializeCardFormWithAccountId:configAccountId amountProvider:^NSInteger{
        return amount;
    }];
    
    NSLog(@"[iOS] Card form initialized successfully");
    
    // Return success response
    NSDictionary *result = @{
        @"status": @"success",
        @"message": @"Card form initialized successfully",
        @"cardFormReady": @YES,
        @"supportsValidation": @YES,
        @"supportsCardBrandRecognition": @YES,
        @"supportsTokenization": @YES,
        @"supports3DS": @YES
    };
    
    resolve(result);
}

RCT_EXPORT_METHOD(presentCardForm:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"[iOS] 🎯 presentCardForm called");
    
    [PaysafeWrappeApp presentCardForm];
    
    NSDictionary *result = @{
        @"status": @"success",
        @"message": @"Card form presented successfully",
        @"formPresented": @YES,
        @"timestamp": @([[NSDate date] timeIntervalSince1970])
    };
    
    resolve(result);
}

RCT_EXPORT_METHOD(processCardPayment:(NSDictionary *)paymentData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"[iOS] PROCESS CARD PAYMENT CALLED");
    NSLog(@"[iOS] Payment data received: %@", paymentData);
    
    NSString *paymentCurrency = paymentData[@"currency"] ?: currencyCode;
    NSNumber *paymentAmount = paymentData[@"amount"] ?: @(amount / 100.0); // Convert cents to dollars
    NSString *paymentFirstName = paymentData[@"firstName"] ?: customerFirstName;
    NSString *paymentLastName = paymentData[@"lastName"] ?: customerLastName;
    NSString *paymentEmail = paymentData[@"email"] ?: customerEmail;
    NSString *paymentPhone = paymentData[@"phone"] ?: customerPhone;
    NSString *paymentMerchantRefNum = paymentData[@"merchantRefNum"] ?: merchantRefNum;
    NSString *paymentAccountId = paymentData[@"card_account_id"] ?: accountId;
    
    NSLog(@"[iOS] CALLING SWIFT PAYMENT PROCESSING:");
    NSLog(@"[iOS] - Account ID: %@", paymentAccountId);
    NSLog(@"[iOS] - Amount: %d", (int)([paymentAmount doubleValue] * 100));
    NSLog(@"[iOS] - Currency: %@", paymentCurrency);
    
    PaysafeViewModel *viewModel = [PaysafeWrappeApp shared].viewModel;
    [viewModel processCardPaymentWithAccountId:paymentAccountId amount:(int)([paymentAmount doubleValue] * 100)];
    
    NSLog(@"[iOS] Swift payment processing method called");
    
    NSDictionary *result = @{
        @"status": @"processing",
        @"message": @"Payment processing initiated. Please check the card form for results.",
        @"accountId": paymentAccountId,
        @"currencyCode": paymentCurrency,
        @"amountInCents": @([paymentAmount doubleValue] * 100),
        @"amountInDollars": paymentAmount,
        @"customerName": [NSString stringWithFormat:@"%@ %@", paymentFirstName, paymentLastName],
        @"email": paymentEmail,
        @"phone": paymentPhone,
        @"formPresented": @YES,
        @"paymentCompleted": @NO,
        @"paymentProcessing": @YES,
        @"timestamp": @([[NSDate date] timeIntervalSince1970])
    };
    resolve(result);
}

// Required for RN event emitter
RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {
    // Required for RN event emitter
}

RCT_EXPORT_METHOD(removeListeners:(double)count) {
    // Required for RN event emitter
}

@end 