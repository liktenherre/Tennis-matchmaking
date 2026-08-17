// Persists Clip auth tokens into the shared App Group for the full app to import.

import Foundation

enum SessionHandoff {
  private static var defaults: UserDefaults? {
    UserDefaults(suiteName: ClipConfig.appGroupId)
  }

  static func save(accessToken: String, refreshToken: String, windowId: String?) {
    defaults?.set(accessToken, forKey: ClipConfig.sessionAccessTokenKey)
    defaults?.set(refreshToken, forKey: ClipConfig.sessionRefreshTokenKey)
    if let windowId, !windowId.isEmpty {
      defaults?.set(windowId, forKey: ClipConfig.pendingWindowIdKey)
    }
    defaults?.synchronize()
  }

  static func clear() {
    defaults?.removeObject(forKey: ClipConfig.sessionAccessTokenKey)
    defaults?.removeObject(forKey: ClipConfig.sessionRefreshTokenKey)
    defaults?.removeObject(forKey: ClipConfig.pendingWindowIdKey)
    defaults?.synchronize()
  }
}
