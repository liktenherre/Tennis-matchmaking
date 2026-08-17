// Minimal Supabase Auth + RPC client for the App Clip (URLSession only).

import Foundation

struct FreeInviteCard: Decodable, Equatable {
  let windowId: String
  let userId: String
  let firstName: String
  let level: String
  let formats: [String]
  let startsAt: String
  let endsAt: String
  let areaLabel: String
  let courtNames: [String]

  enum CodingKeys: String, CodingKey {
    case windowId = "window_id"
    case userId = "user_id"
    case firstName = "first_name"
    case level
    case formats
    case startsAt = "starts_at"
    case endsAt = "ends_at"
    case areaLabel = "area_label"
    case courtNames = "court_names"
  }
}

struct AuthSession: Decodable {
  let accessToken: String
  let refreshToken: String

  enum CodingKeys: String, CodingKey {
    case accessToken = "access_token"
    case refreshToken = "refresh_token"
  }
}

enum SupabaseClientError: LocalizedError {
  case notConfigured
  case invalidResponse
  case server(String)

  var errorDescription: String? {
    switch self {
    case .notConfigured:
      return "Supabase n’est pas configuré pour l’App Clip."
    case .invalidResponse:
      return "Réponse serveur invalide."
    case .server(let message):
      return message
    }
  }
}

final class SupabaseClient {
  private let urlSession: URLSession
  private(set) var accessToken: String?

  init(urlSession: URLSession = .shared) {
    self.urlSession = urlSession
  }

  func fetchInvite(windowId: String) async throws -> FreeInviteCard {
    try await rpc(
      "get_free_window_invite",
      body: ["window_id_input": windowId],
      as: FreeInviteCard.self,
      authenticated: false
    )
  }

  func requestOtp(phone: String) async throws {
    var request = try makeRequest(path: "/auth/v1/otp", authenticated: false)
    request.httpMethod = "POST"
    request.httpBody = try JSONSerialization.data(withJSONObject: [
      "phone": phone,
    ])
    _ = try await sendRaw(request)
  }

  func verifyOtp(phone: String, token: String) async throws -> AuthSession {
    var request = try makeRequest(path: "/auth/v1/verify", authenticated: false)
    request.httpMethod = "POST"
    request.httpBody = try JSONSerialization.data(withJSONObject: [
      "phone": phone,
      "token": token,
      "type": "sms",
    ])
    let session: AuthSession = try await send(request)
    accessToken = session.accessToken
    return session
  }

  func completeClipOnboarding(
    firstName: String,
    birthYear: Int,
    level: String,
    formats: [String]
  ) async throws {
    try await rpcVoid(
      "complete_clip_onboarding",
      body: [
        "first_name_input": firstName,
        "birth_year_input": birthYear,
        "level_input": level,
        "formats_input": formats,
      ]
    )
  }

  func expressInterest(windowId: String) async throws {
    try await rpcVoid(
      "express_free_interest",
      body: ["window_id_input": windowId]
    )
  }

  private func rpc<T: Decodable>(
    _ name: String,
    body: [String: Any],
    as type: T.Type,
    authenticated: Bool
  ) async throws -> T {
    var request = try makeRequest(path: "/rest/v1/rpc/\(name)", authenticated: authenticated)
    request.httpMethod = "POST"
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    return try await send(request)
  }

  private func rpcVoid(_ name: String, body: [String: Any]) async throws {
    var request = try makeRequest(path: "/rest/v1/rpc/\(name)", authenticated: true)
    request.httpMethod = "POST"
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    _ = try await sendRaw(request)
  }

  private func makeRequest(path: String, authenticated: Bool) throws -> URLRequest {
    guard ClipConfig.isConfigured,
          let url = URL(string: ClipConfig.supabaseURL + path)
    else { throw SupabaseClientError.notConfigured }

    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(ClipConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
    let bearer =
      authenticated
      ? (accessToken ?? ClipConfig.supabaseAnonKey)
      : ClipConfig.supabaseAnonKey
    request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
    return request
  }

  private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
    let data = try await sendRaw(request)
    do {
      return try JSONDecoder().decode(T.self, from: data)
    } catch {
      throw SupabaseClientError.invalidResponse
    }
  }

  private func sendRaw(_ request: URLRequest) async throws -> Data {
    let (data, response) = try await urlSession.data(for: request)
    guard let http = response as? HTTPURLResponse else {
      throw SupabaseClientError.invalidResponse
    }
    guard (200 ... 299).contains(http.statusCode) else {
      let message = Self.parseErrorMessage(from: data) ?? "Erreur \(http.statusCode)"
      throw SupabaseClientError.server(message)
    }
    return data
  }

  private static func parseErrorMessage(from data: Data) -> String? {
    guard
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return String(data: data, encoding: .utf8) }

    if let msg = json["message"] as? String, !msg.isEmpty { return msg }
    if let msg = json["error_description"] as? String, !msg.isEmpty { return msg }
    if let msg = json["msg"] as? String, !msg.isEmpty { return msg }
    if let hint = json["hint"] as? String, !hint.isEmpty { return hint }
    return nil
  }
}
