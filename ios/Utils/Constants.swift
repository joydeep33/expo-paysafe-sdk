//
//  Constants.swift
//  paysafeetest
//
//  Copyright (c) 2024 Paysafe Group
//

import Foundation

struct AppConstants {
    
    // MARK: - Countries
    static let supportedCountries = ["United States"]
    
    // MARK: - US States
    static let states = [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
        "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
        "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
        "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
        "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
        "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
        "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
        "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
        "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ]
    
    // MARK: - State Name to API Code Mapping
    private static let stateMapping: [String: String] = [
        "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
        "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
        "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
        "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
        "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
        "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
        "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
        "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
        "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
        "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
        "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
        "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
        "Wisconsin": "WI", "Wyoming": "WY"
    ]
    
    // MARK: - Helper Methods
    
    /// Converts state display name to API code
    /// - Parameter displayName: Full state name (e.g., "California")
    /// - Returns: State abbreviation (e.g., "CA")
    static func getStateCode(from displayName: String) -> String {
        return stateMapping[displayName] ?? displayName
    }
    
    /// Converts state API code to display name
    /// - Parameter code: State abbreviation (e.g., "CA")
    /// - Returns: Full state name (e.g., "California")
    static func getStateDisplayName(from code: String) -> String {
        return stateMapping.first(where: { $0.value == code })?.key ?? code
    }
    
    // MARK: - Country Codes
    
    /// Converts country display name to API code
    /// - Parameter displayName: Full country name (e.g., "United States")
    /// - Returns: Country code (e.g., "US")
    static func getCountryCode(from displayName: String) -> String {
        switch displayName {
        case "United States":
            return "US"
        default:
            return displayName
        }
    }
} 