#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : RCTAppDelegate

/// Legacy architecture only; matches Android `newArchEnabled=false` (see implementation in AppDelegate.mm).
- (BOOL)newArchEnabled;

@end
