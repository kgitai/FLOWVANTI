!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\flowvanti"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\flowvanti"
!macroend

!macro customInstall
  CopyFiles /SILENT "$INSTDIR\${UNINSTALL_FILENAME}" "$INSTDIR\uninstall.exe"
  ${if} $installMode == "all"
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString '"$INSTDIR\uninstall.exe" /allusers'
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" QuietUninstallString '"$INSTDIR\uninstall.exe" /allusers /S'
  ${else}
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString '"$INSTDIR\uninstall.exe" /currentuser'
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" QuietUninstallString '"$INSTDIR\uninstall.exe" /currentuser /S'
  ${endif}

  !ifdef MENU_FILENAME
    CreateDirectory "$SMPROGRAMS\${MENU_FILENAME}"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\Uninstall FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\Remove FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\FLOWVANTI Un-install.lnk"
    CreateShortCut "$SMPROGRAMS\${MENU_FILENAME}\uninstall.exe.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0 "" "" "uninstall.exe"
    WinShell::SetLnkAUMI "$SMPROGRAMS\${MENU_FILENAME}\uninstall.exe.lnk" "app.flowvanti.desktop.remove"
  !else
    CreateDirectory "$SMPROGRAMS\FLOWVANTI"
    Delete "$SMPROGRAMS\FLOWVANTI\Uninstall FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\FLOWVANTI\Remove FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\FLOWVANTI\FLOWVANTI Un-install.lnk"
    CreateShortCut "$SMPROGRAMS\FLOWVANTI\uninstall.exe.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0 "" "" "uninstall.exe"
    WinShell::SetLnkAUMI "$SMPROGRAMS\FLOWVANTI\uninstall.exe.lnk" "app.flowvanti.desktop.remove"
  !endif
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
  ClearErrors
!macroend

!macro customUnInstall
  !ifdef MENU_FILENAME
    WinShell::UninstShortcut "$SMPROGRAMS\${MENU_FILENAME}\uninstall.exe.lnk"
    WinShell::UninstShortcut "$SMPROGRAMS\${MENU_FILENAME}\FLOWVANTI Un-install.lnk"
    WinShell::UninstShortcut "$SMPROGRAMS\${MENU_FILENAME}\Remove FLOWVANTI.lnk"
    WinShell::UninstShortcut "$SMPROGRAMS\${MENU_FILENAME}\Uninstall FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\uninstall.exe.lnk"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\FLOWVANTI Un-install.lnk"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\Remove FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\Uninstall FLOWVANTI.lnk"
    RMDir "$SMPROGRAMS\${MENU_FILENAME}"
  !else
    WinShell::UninstShortcut "$SMPROGRAMS\FLOWVANTI\uninstall.exe.lnk"
    WinShell::UninstShortcut "$SMPROGRAMS\FLOWVANTI\FLOWVANTI Un-install.lnk"
    WinShell::UninstShortcut "$SMPROGRAMS\FLOWVANTI\Remove FLOWVANTI.lnk"
    WinShell::UninstShortcut "$SMPROGRAMS\FLOWVANTI\Uninstall FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\FLOWVANTI\uninstall.exe.lnk"
    Delete "$SMPROGRAMS\FLOWVANTI\FLOWVANTI Un-install.lnk"
    Delete "$SMPROGRAMS\FLOWVANTI\Remove FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\FLOWVANTI\Uninstall FLOWVANTI.lnk"
    Delete "$SMPROGRAMS\Uninstall FLOWVANTI.lnk"
    RMDir "$SMPROGRAMS\FLOWVANTI"
  !endif
  WinShell::UninstAppUserModelId "app.flowvanti.desktop.remove"
  Delete "$INSTDIR\uninstall.exe"

  SetShellVarContext current
  RMDir /r "$APPDATA\FLOWVANTI"
  RMDir /r "$APPDATA\flowvanti"
  RMDir /r "$LOCALAPPDATA\FLOWVANTI"
  RMDir /r "$LOCALAPPDATA\flowvanti"

  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
  ClearErrors
!macroend
