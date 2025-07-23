import { NativeModules, NativeEventEmitter } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

const { Paysafe } = NativeModules;

// Create event emitter only if native module is available and when needed
let paysafeEventEmitter = null;

/**
 * Get or create the event emitter instance
 * @returns {NativeEventEmitter|null} Event emitter instance or null if not available
 */
function getEventEmitter() {
    if (!Paysafe) {
        console.warn('Paysafe native module is not available. Event emitter functionality is disabled.');
        return null;
    }

    if (!paysafeEventEmitter) {
        paysafeEventEmitter = new NativeEventEmitter(Paysafe);
    }

    return paysafeEventEmitter;
}

/**
 * Comprehensive Paysafe SDK for React Native
 * Android: Full functionality (payments, UI, validation, etc.)
 * iOS: Setup function only (minimal implementation)
 */
class PaysafeSDK {
    constructor() {
        this.eventListeners = new Map();
    }

    /**
     * Initialize the Paysafe SDK
     * @param {Object} options - SDK initialization options
     * @param {string} options.apiKey - Paysafe API key
     * @param {string} options.accountId - Merchant account ID (Android)
     * @param {number} options.amount - Payment amount (Android)
     * @param {string} options.currencyCode - Currency code (Android)
     * @param {string} options.environment - 'TEST' or 'LIVE'
     */
    async initiateCheckout(options) {
        if (!Paysafe) {
            throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
        }

        return await Paysafe.initiateCheckout(options);
    }

    /**
     * Initialize the card form with Compose UI components (Android only)
     * @param {Object} config - Card form configuration
     * @param {string} config.accountId - Merchant account ID
     * @param {string} config.currencyCode - Currency code
     */
    async initializeCardForm(config) {
        if (!Paysafe) {
            throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
        }

        return await Paysafe.initializeCardForm(config);
    }

    //     /**
    //      * Display the card payment UI to users (Android only)
    //      * @param {Object} config - UI configuration options
    //      */
    //     async showCardPaymentUI(config = {}) {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         return await Paysafe.showCardPaymentUI(config);
    //     }

    //     /**
    //      * Hide the card payment UI (Android only)
    //      */
    //     async hideCardPaymentUI() {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         return await Paysafe.hideCardPaymentUI();
    //     }

    //     /**
    //      * Process card payment with validation and brand recognition (Android only)
    //      * @param {Object} paymentOptions - Payment processing options
    //      * @param {number} paymentOptions.amount - Payment amount
    //      * @param {string} paymentOptions.currencyCode - Currency code
    //      * @param {string} paymentOptions.merchantRefNum - Merchant reference number (optional)
    //      */
    //     async processCardPayment(paymentOptions) {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         return await Paysafe.processCardPayment(paymentOptions);
    //     }

    //     /**
    //      * Get detailed validation status for all card fields (Android only)
    //      */
    //     async getCardValidationStatus() {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         return await Paysafe.getCardValidationStatus();
    //     }

    //     /**
    //      * Get card data status (without exposing sensitive information) (Android only)
    //      */
    //     async getCardData() {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         return await Paysafe.getCardData();
    //     }

    //     /**
    //      * Reset all card form fields (Android only)
    //      */
    //     async resetCardForm() {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         return await Paysafe.resetCardForm();
    //     }

    //     /**
    //      * Dispose of the card form and clean up resources (Android only)
    //      */
    //     async disposeCardForm() {
    //         if (!Paysafe) {
    //             throw new Error("Paysafe native module is not available. Make sure the native module is properly linked.");
    //         }

    //         // Remove all event listeners
    //         this.removeAllEventListeners();

    //         return await Paysafe.disposeCardForm();
    //     }

    //     /**
    //      * Listen for card brand recognition events (Android only)
    //      * @param {Function} callback - Callback function to handle card brand events
    //      * @returns {Function} - Function to remove the listener
    //      */
    //     onCardBrandRecognized(callback) {
    //         const eventEmitter = getEventEmitter();
    //         if (!eventEmitter) {
    //             console.warn('Event emitter not available. onCardBrandRecognized functionality is disabled.');
    //             return () => {}; // Return no-op function
    //         }

    //         const listener = eventEmitter.addListener('onCardBrandRecognized', callback);
    //         this.eventListeners.set('onCardBrandRecognized', listener);

    //         return () => {
    //             listener.remove();
    //             this.eventListeners.delete('onCardBrandRecognized');
    //         };
    //     }

    //     /**
    //      * Remove all event listeners (Android only)
    //      */
    //     removeAllEventListeners() {
    //         this.eventListeners.forEach((listener) => {
    //             listener.remove();
    //         });
    //         this.eventListeners.clear();
    //     }

    //     /**
    //      * Complete payment flow helper method (Android only)
    //      * @param {Object} options - Complete payment options
    //      */
    //     async initializePayment(options) {
    //         try {
    //             // Step 1: Initialize SDK
    //             const initResult = await this.initiateCheckout(options);
    //             console.log('SDK initialized:', initResult);

    //             // Step 2: Initialize card form
    //             const cardFormResult = await this.initializeCardForm({
    //                 accountId: options.accountId,
    //                 currencyCode: options.currencyCode
    //             });
    //             console.log('Card form initialized:', cardFormResult);

    //             return {
    //                 status: 'initialized',
    //                 message: 'Payment initialization completed successfully',
    //                 sdkInitialized: initResult.isInitialized,
    //                 cardFormReady: cardFormResult.cardFormReady,
    //                 supportsValidation: cardFormResult.supportsValidation,
    //                 supportsCardBrandRecognition: cardFormResult.supportsCardBrandRecognition
    //             };
    //         } catch (error) {
    //             console.error('Payment initialization error:', error);
    //             throw error;
    //         }
    //     }

    //     /**
    //      * Complete payment processing helper method (Android only)
    //      * @param {Object} options - Payment options
    //      */
    //     async completePayment(options) {
    //         try {
    //             // Step 1: Show UI for user to enter card details
    //             const uiResult = await this.showCardPaymentUI();
    //             console.log('UI displayed:', uiResult);

    //             // Step 2: Wait for user input and validate
    //             // In a real app, you'd wait for user interaction here

    //             // Step 3: Process the payment
    //             const paymentResult = await this.processCardPayment(options);
    //             console.log('Payment processed:', paymentResult);

    //             // Step 4: Hide UI
    //             await this.hideCardPaymentUI();

    //             return paymentResult;
    //         } catch (error) {
    //             console.error('Payment completion error:', error);
    //             // Make sure to hide UI even if there's an error
    //             try {
    //                 await this.hideCardPaymentUI();
    //             } catch (hideError) {
    //                 console.error('Error hiding UI:', hideError);
    //             }
    //             throw error;
    //         }
    //     }
}

// Create singleton instance
const paysafeSDK = new PaysafeSDK();

// Export both the class and instance for flexibility
export default paysafeSDK;
export { PaysafeSDK };

// Export individual methods for backward compatibility
export const {
    initiateCheckout,
    initializeCardForm,
    // showCardPaymentUI,
    // hideCardPaymentUI,
    // processCardPayment,
    // getCardValidationStatus,
    // getCardData,
    // resetCardForm,
    // disposeCardForm,
    // onCardBrandRecognized,
    // initializePayment,
    // completePayment
} = paysafeSDK;

/**
 * React Hook for Paysafe SDK
 * Provides state management and simplified API for payment processing
 */
export function usePaysafe() {
    const [paymentState, setPaymentState] = useState({
        isInitialized: false,
        isCardFormReady: false,
        isUIVisible: false,
        isProcessing: false,
        validationStatus: null,
        cardBrand: null,
        error: null,
        paymentResult: null,
        paymentHandleToken: null,
    });

    // Card brand recognition listener
    useEffect(() => {
        if (!Paysafe) {
            console.log('Paysafe native module not available');
            return;
        }

        const eventEmitter = getEventEmitter();
        if (!eventEmitter) {
            console.log('Event emitter not available');
            return;
        }

        const subscription = eventEmitter.addListener('onCardBrandRecognized', (event) => {
            console.log('Card brand recognized:', event.cardType);
            setPaymentState(prev => ({
                ...prev,
                cardBrand: event.cardType
            }));
        });

        return () => subscription.remove();
    }, []);

    /**
     * Initialize the Paysafe SDK and card form
     */
    const initializePayment = useCallback(async (config) => {
        try {
            if (!Paysafe) {
                throw new Error('Paysafe native module is not available');
            }

            setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));

            console.log('🔄 Initializing Paysafe payment system...');

            // Step 1: Initialize SDK
            const initResult = await Paysafe.initiateCheckout({
                apiKey: config.apiKey,
                accountId: config.accountId,
                amount: config.amount,
                currencyCode: config.currencyCode,
                environment: config.environment || 'TEST',
                merchantRefNum: config.merchantRefNum,
                singleUseCustomerToken: config.singleUseCustomerToken,
                email: config.email,
                firstName: config.firstName,
                lastName: config.lastName,
                phone: config.phone
            });

            // Step 2: Initialize card form
            const cardFormResult = await Paysafe.initializeCardForm({
                accountId: config.accountId,
                currencyCode: config.currencyCode
            });

            console.log('✅ Payment system initialized');

            setPaymentState(prev => ({
                ...prev,
                isInitialized: initResult.isInitialized,
                isCardFormReady: cardFormResult.cardFormReady,
                isProcessing: false,
                error: null
            }));

            return {
                status: 'initialized',
                message: 'Payment initialization completed successfully',
                sdkInitialized: initResult.isInitialized,
                cardFormReady: cardFormResult.cardFormReady,
                supportsValidation: cardFormResult.supportsValidation,
                supportsCardBrandRecognition: cardFormResult.supportsCardBrandRecognition
            };
        } catch (error) {
            console.error('❌ Payment initialization failed:', error);
            setPaymentState(prev => ({
                ...prev,
                isProcessing: false,
                error: error.message || 'Failed to initialize payment system'
            }));
            throw error;
        }
    }, []);

    /**
     * Clear any errors
     */
    const clearError = useCallback(() => {
        setPaymentState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        // State
        paymentState,

        // Actions
        initializePayment,
        clearError,

        // Computed values
        isReady: paymentState.isInitialized && paymentState.isCardFormReady,
        canProcess: paymentState.isCardFormReady && !paymentState.isProcessing,
        hasError: !!paymentState.error,
    };
} 