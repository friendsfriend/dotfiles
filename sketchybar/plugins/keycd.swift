// Tiny TIS helper for sketchybar. Compiled once by keyboard_layout.sh.
//   keycd list              -> one enabled keyboard-layout ID per line
//   keycd current           -> current keyboard-layout ID
//   keycd select <id>       -> switch to that layout
import Carbon

func str(_ p: UnsafeMutableRawPointer?) -> String? {
    guard let p else { return nil }
    return Unmanaged<CFString>.fromOpaque(p).takeUnretainedValue() as String
}

let args = CommandLine.arguments
let cmd = args.count > 1 ? args[1] : "current"

switch cmd {
case "list":
    let filter = [
        kTISPropertyInputSourceIsEnabled: true,
        kTISPropertyInputSourceType: kTISTypeKeyboardLayout,
    ] as CFDictionary
    for src in TISCreateInputSourceList(filter, false).takeRetainedValue() as! [TISInputSource] {
        if let id = str(TISGetInputSourceProperty(src, kTISPropertyInputSourceID)) {
            print(id)
        }
    }

case "select" where args.count > 2:
    let filter = [kTISPropertyInputSourceID: args[2] as CFString] as CFDictionary
    if let src = (TISCreateInputSourceList(filter, false).takeRetainedValue() as! [TISInputSource]).first {
        TISSelectInputSource(src)
    } else {
        FileHandle.standardError.write("unknown input source: \(args[2])\n".data(using: .utf8)!)
        exit(1)
    }

default:
    let src = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
    if let id = str(TISGetInputSourceProperty(src, kTISPropertyInputSourceID)) {
        print(id)
    }
}
