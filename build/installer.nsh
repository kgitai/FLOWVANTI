!macro customInstall
  !ifdef MENU_FILENAME
    CreateDirectory "$SMPROGRAMS\${MENU_FILENAME}"
    CreateShortCut "$SMPROGRAMS\${MENU_FILENAME}\Uninstall FLOWVANTI.lnk" "$INSTDIR\${UNINSTALL_FILENAME}" "" "$INSTDIR\uninstallerIcon.ico" 0 "" "" "Uninstall FLOWVANTI"
  !else
    CreateShortCut "$SMPROGRAMS\Uninstall FLOWVANTI.lnk" "$INSTDIR\${UNINSTALL_FILENAME}" "" "$INSTDIR\uninstallerIcon.ico" 0 "" "" "Uninstall FLOWVANTI"
  !endif
  ClearErrors
!macroend

!macro customUnInstall
  !ifdef MENU_FILENAME
    Delete "$SMPROGRAMS\${MENU_FILENAME}\Uninstall FLOWVANTI.lnk"
    RMDir "$SMPROGRAMS\${MENU_FILENAME}"
  !else
    Delete "$SMPROGRAMS\Uninstall FLOWVANTI.lnk"
  !endif
  ClearErrors
!macroend
