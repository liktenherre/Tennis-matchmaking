// Reads App Clip runtime config from Info.plist (synced from EXPO_PUBLIC_* via scripts/sync-clip-env.mjs).

import Foundation

enum ClipConfig {
  static let inviteHost = "app.cotetennis.com"
  static let sessionAccessTokenKey = "clip.supabase.access_token"
  static let sessionRefreshTokenKey = "clip.supabase.refresh_token"
  static let pendingWindowIdKey = "clip.pending_window_id"

  static var appGroupId: String {
    string(forInfoKey: "CTAppGroupId") ?? "group.com.cotetennis.app"
  }

  static var supabaseURL: String {
    string(forInfoKey: "CTSupabaseURL")
      ?? ProcessInfo.processInfo.environment["EXPO_PUBLIC_SUPABASE_URL"]
      ?? ""
  }

  static var supabaseAnonKey: String {
    string(forInfoKey: "CTSupabaseAnonKey")
      ?? ProcessInfo.processInfo.environment["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
      ?? ""
  }

  static var isConfigured: Bool {
    !supabaseURL.isEmpty && !supabaseAnonKey.isEmpty
  }

  private static func string(forInfoKey key: String) -> String? {
    guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}
