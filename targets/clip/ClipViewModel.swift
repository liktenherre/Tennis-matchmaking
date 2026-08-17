// Drives App Clip Free-invite → OTP → short onboarding → Express Interest.

import Foundation
import SwiftUI

enum ClipStep: Equatable {
  case loading
  case card
  case phone
  case otp
  case onboarding
  case success
  case unavailable(String)
}

@MainActor
final class ClipViewModel: ObservableObject {
  @Published var step: ClipStep = .loading
  @Published var card: FreeInviteCard?
  @Published var windowId: String = ""
  @Published var phone: String = "+33"
  @Published var otp: String = ""
  @Published var firstName: String = ""
  @Published var birthYear: String = ""
  @Published var level: String = "intermediate"
  @Published var errorMessage: String = ""
  @Published var isBusy = false
  @Published var showAppStoreOverlay = false

  let levels = ["beginner", "intermediate", "advanced", "competition"]

  private let client = SupabaseClient()

  func handleInvocationURL(_ url: URL?) {
    guard let url else { return }
    if let id = Self.windowId(from: url), id != windowId {
      windowId = id
      Task { await loadInvite() }
    }
  }

  func loadInvite() async {
    guard !windowId.isEmpty else {
      step = .unavailable("Lien d’invitation invalide.")
      return
    }
    guard ClipConfig.isConfigured else {
      step = .unavailable("Configuration Supabase manquante. Lancez scripts/sync-clip-env.mjs.")
      return
    }

    step = .loading
    errorMessage = ""
    do {
      card = try await client.fetchInvite(windowId: windowId)
      step = .card
    } catch {
      step = .unavailable(error.localizedDescription)
    }
  }

  func continueToPhone() {
    step = .phone
    errorMessage = ""
  }

  func sendOtp() async {
    let normalized = Self.normalizePhone(phone)
    guard normalized.count >= 10 else {
      errorMessage = "Numéro invalide."
      return
    }
    isBusy = true
    errorMessage = ""
    defer { isBusy = false }
    do {
      phone = normalized
      try await client.requestOtp(phone: normalized)
      step = .otp
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func verifyOtp() async {
    guard otp.count >= 6 else {
      errorMessage = "Code à 6 chiffres requis."
      return
    }
    isBusy = true
    errorMessage = ""
    defer { isBusy = false }
    do {
      let session = try await client.verifyOtp(phone: phone, token: otp)
      SessionHandoff.save(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        windowId: windowId
      )
      step = .onboarding
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func completeAndInterest() async {
    let year = Int(birthYear) ?? 0
    let trimmed = firstName.trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmed.count >= 2 else {
      errorMessage = "Prénom requis (2 caractères min.)."
      return
    }
    guard year >= 1900, year <= Calendar.current.component(.year, from: Date()) - 18 else {
      errorMessage = "Année de naissance invalide (18+)."
      return
    }

    isBusy = true
    errorMessage = ""
    defer { isBusy = false }
    do {
      try await client.completeClipOnboarding(
        firstName: trimmed,
        birthYear: year,
        level: level,
        formats: ["either"]
      )
      try await client.expressInterest(windowId: windowId)
      step = .success
      showAppStoreOverlay = true
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  static func windowId(from url: URL) -> String? {
    let parts = url.path.split(separator: "/").map(String.init)
    if let fIndex = parts.firstIndex(of: "f"), parts.indices.contains(fIndex + 1) {
      return parts[fIndex + 1]
    }
    if let item = URLComponents(url: url, resolvingAgainstBaseURL: true)?
      .queryItems?
      .first(where: { $0.name == "windowId" })?
      .value
    {
      return item
    }
    return nil
  }

  static func normalizePhone(_ raw: String) -> String {
    let digits = raw.filter { $0.isNumber || $0 == "+" }
    if digits.hasPrefix("+") { return digits }
    if digits.hasPrefix("0") {
      return "+33" + digits.dropFirst()
    }
    return "+33" + digits
  }
}
