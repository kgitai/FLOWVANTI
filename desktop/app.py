import os
import sys
from pathlib import Path

import webview


def resource_path(name: str) -> str:
    candidates = []
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", "")
        exe_dir = os.path.dirname(sys.executable)
        candidates.extend(
            [
                os.path.join(meipass, name),
                os.path.join(exe_dir, name),
                os.path.join(exe_dir, "_internal", name),
            ]
        )
    else:
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        here = os.path.dirname(os.path.abspath(__file__))
        candidates.extend([os.path.join(root, name), os.path.join(here, name)])
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return candidates[0] if candidates else name


class Api:
    def __init__(self) -> None:
        root = os.path.join(os.environ.get("LOCALAPPDATA", str(Path.home())), "FLOWVANTI")
        os.makedirs(root, exist_ok=True)
        self.file = os.path.join(root, "workspace.json")

    def load_workspace(self) -> str:
        try:
            if os.path.isfile(self.file):
                with open(self.file, "r", encoding="utf-8") as fh:
                    return fh.read()
        except OSError:
            return ""
        return ""

    def save_workspace(self, raw: str) -> bool:
        try:
            tmp = self.file + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(raw or "")
            os.replace(tmp, self.file)
            return True
        except OSError:
            return False


def load_html() -> str:
    path = os.path.abspath(resource_path("dashboard.html"))
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read()
    return (
        "<!doctype html><html><body style='background:#0B0E14;color:#F4F7FB;"
        "font-family:sans-serif;padding:48px'>FLOWVANTI could not load dashboard.html.</body></html>"
    )


def lock_webview(window) -> None:
    form = getattr(window, "native", None)
    if form is None:
        return

    def apply() -> None:
        try:
            wv = getattr(form, "webview", None)
            core = getattr(wv, "CoreWebView2", None) if wv is not None else None
            if core is None:
                return
            settings = core.Settings
            settings.AreBrowserAcceleratorKeysEnabled = False
            settings.AreDefaultContextMenusEnabled = False
            settings.AreDevToolsEnabled = False
            settings.IsBuiltInErrorPageEnabled = False
            settings.IsStatusBarEnabled = False
            settings.IsSwipeNavigationEnabled = False
            settings.IsZoomControlEnabled = False
            try:
                settings.IsGeneralAutofillEnabled = False
                settings.IsPasswordAutosaveEnabled = False
            except Exception:
                pass
        except Exception:
            return

    try:
        from System import Action

        form.BeginInvoke(Action(apply))
    except Exception:
        apply()


def main() -> None:
    storage = os.path.join(os.environ.get("LOCALAPPDATA", str(Path.home())), "FLOWVANTI")
    os.makedirs(storage, exist_ok=True)
    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = False
    webview.settings["ALLOW_DOWNLOADS"] = True
    icon = resource_path("flowvanti.ico")
    if not os.path.isfile(icon):
        icon = os.path.join(os.path.dirname(os.path.abspath(__file__)), "flowvanti.ico")
    window = webview.create_window(
        title="FLOWVANTI",
        html=load_html(),
        js_api=Api(),
        width=1440,
        height=900,
        min_size=(1100, 700),
        background_color="#0B0E14",
        text_select=False,
        confirm_close=False,
    )
    window.events.loaded += lock_webview
    start_kwargs = dict(
        debug=False,
        private_mode=False,
        storage_path=storage,
        user_agent="FLOWVANTI",
    )
    if os.path.isfile(icon):
        start_kwargs["icon"] = icon
    webview.start(**start_kwargs)


if __name__ == "__main__":
    main()
