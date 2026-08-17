// SwiftUI screens for Free invite → OTP → short onboarding → interest + App Store overlay.

import StoreKit
import SwiftUI

struct ClipRootView: View {
  @ObservedObject var model: ClipViewModel

  var body: some View {
    NavigationStack {
      Group {
        switch model.step {
        case .loading:
          ProgressView("Chargement…")
        case .card:
          cardView
        case .phone:
          phoneView
        case .otp:
          otpView
        case .onboarding:
          onboardingView
        case .success:
          successView
        case .unavailable(let message):
          VStack(spacing: 16) {
            Text("Invitation indisponible")
              .font(.title.bold())
            Text(message)
              .multilineTextAlignment(.center)
              .foregroundStyle(.secondary)
          }
          .padding()
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Color(red: 0.96, green: 0.97, blue: 0.95))
      .navigationTitle("Côte Tennis")
      .navigationBarTitleDisplayMode(.inline)
    }
    .appStoreOverlay(isPresented: $model.showAppStoreOverlay) {
      SKOverlay.AppClipConfiguration(position: .bottom)
    }
  }

  @ViewBuilder
  private var cardView: some View {
    if let card = model.card {
      VStack(alignment: .leading, spacing: 16) {
        Text("JE SUIS DISPO")
          .font(.caption.weight(.semibold))
          .tracking(1.2)
          .foregroundStyle(.secondary)
        Text("\(card.firstName) est libre")
          .font(.largeTitle.bold())
        Text(formatRange(startsAt: card.startsAt, endsAt: card.endsAt))
          .font(.title3.weight(.semibold))
        if !card.areaLabel.isEmpty {
          Text(card.areaLabel)
            .foregroundStyle(.secondary)
        }
        Text("\(levelLabel(card.level)) · \(card.formats.joined(separator: ", "))")
          .font(.footnote)
          .foregroundStyle(.secondary)

        if !model.errorMessage.isEmpty {
          Text(model.errorMessage).foregroundStyle(.red)
        }

        Button("Ça m’intéresse") {
          model.continueToPhone()
        }
        .buttonStyle(.borderedProminent)
        .tint(Color(red: 0.78, green: 0.94, blue: 0.19))
        .foregroundStyle(.black)
        .frame(maxWidth: .infinity)
      }
      .padding(24)
    }
  }

  private var phoneView: some View {
    formStack(title: "Votre numéro", subtitle: "SMS pour continuer sans installer l’app.") {
      TextField("Téléphone", text: $model.phone)
        .keyboardType(.phonePad)
        .textContentType(.telephoneNumber)
      primaryButton("Recevoir le code") {
        Task { await model.sendOtp() }
      }
    }
  }

  private var otpView: some View {
    formStack(title: "Code SMS", subtitle: "Entrez le code à 6 chiffres.") {
      TextField("000000", text: $model.otp)
        .keyboardType(.numberPad)
        .textContentType(.oneTimeCode)
        .font(.title2.monospacedDigit())
      primaryButton("Valider") {
        Task { await model.verifyOtp() }
      }
    }
  }

  private var onboardingView: some View {
    formStack(title: "Profil rapide", subtitle: "Nice · pour rejoindre cette dispo.") {
      TextField("Prénom", text: $model.firstName)
        .textContentType(.givenName)
      TextField("Année de naissance", text: $model.birthYear)
        .keyboardType(.numberPad)
      Picker("Niveau", selection: $model.level) {
        ForEach(model.levels, id: \.self) { value in
          Text(levelLabel(value)).tag(value)
        }
      }
      primaryButton("Envoyer mon intérêt") {
        Task { await model.completeAndInterest() }
      }
    }
  }

  private var successView: some View {
    VStack(spacing: 16) {
      Text("Intérêt envoyé")
        .font(.largeTitle.bold())
      Text("Installez Côte Tennis pour chatter et confirmer le match si \(model.card?.firstName ?? "le joueur") accepte.")
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
      Button("Obtenir l’app") {
        model.showAppStoreOverlay = true
      }
      .buttonStyle(.borderedProminent)
      .tint(Color(red: 0.78, green: 0.94, blue: 0.19))
      .foregroundStyle(.black)
    }
    .padding(24)
  }

  private func formStack<Content: View>(
    title: String,
    subtitle: String,
    @ViewBuilder content: () -> Content
  ) -> some View {
    VStack(alignment: .leading, spacing: 16) {
      Text(title).font(.title.bold())
      Text(subtitle).foregroundStyle(.secondary)
      content()
      if !model.errorMessage.isEmpty {
        Text(model.errorMessage).foregroundStyle(.red)
      }
      Spacer()
    }
    .padding(24)
  }

  private func primaryButton(_ title: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      if model.isBusy {
        ProgressView()
          .frame(maxWidth: .infinity)
      } else {
        Text(title)
          .frame(maxWidth: .infinity)
      }
    }
    .buttonStyle(.borderedProminent)
    .tint(Color(red: 0.78, green: 0.94, blue: 0.19))
    .foregroundStyle(.black)
    .disabled(model.isBusy)
  }

  private func levelLabel(_ value: String) -> String {
    switch value {
    case "beginner": return "Débutant"
    case "intermediate": return "Intermédiaire"
    case "advanced": return "Avancé"
    case "competition": return "Compétition"
    default: return value
    }
  }

  private func formatRange(startsAt: String, endsAt: String) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let fallback = ISO8601DateFormatter()
    let start = formatter.date(from: startsAt) ?? fallback.date(from: startsAt)
    let end = formatter.date(from: endsAt) ?? fallback.date(from: endsAt)
    guard let start, let end else { return "Créneau à confirmer" }

    let time = DateFormatter()
    time.locale = Locale(identifier: "fr_FR")
    time.timeZone = TimeZone(identifier: "Europe/Paris")
    time.dateFormat = "EEE HH:mm"
    return "\(time.string(from: start)) – \(time.string(from: end))"
  }
}
