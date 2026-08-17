// App Clip entry: Free-window invitation via Universal Link / App Clip experience.

import SwiftUI

@main
struct ClipApp: App {
  @StateObject private var model = ClipViewModel()

  var body: some Scene {
    WindowGroup {
      ClipRootView(model: model)
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb, perform: handleUserActivity)
        .onOpenURL { url in
          model.handleInvocationURL(url)
        }
        .task {
          // Xcode / local testing: Product → Scheme → Arguments → Environment `_XCAppClipURL`
          if let raw = ProcessInfo.processInfo.environment["_XCAppClipURL"],
             let url = URL(string: raw)
          {
            model.handleInvocationURL(url)
          }
        }
    }
  }

  private func handleUserActivity(_ userActivity: NSUserActivity) {
    model.handleInvocationURL(userActivity.webpageURL)
  }
}
