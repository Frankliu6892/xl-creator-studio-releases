!macro customInstall
  CreateDirectory "$SMPROGRAMS\XL Creator Studio"
  CreateShortCut "$SMPROGRAMS\XL Creator Studio\XL Creator Studio.lnk" "$INSTDIR\XL Creator Studio.exe" "" "$INSTDIR\XL Creator Studio.exe" 0
  CreateShortCut "$SMPROGRAMS\XL Creator Studio\Uninstall XL Creator Studio.lnk" "$INSTDIR\Uninstall XL Creator Studio.exe" "" "$INSTDIR\Uninstall XL Creator Studio.exe" 0
!macroend

!macro customUnInstall
  nsExec::ExecToStack 'taskkill /F /IM "XL Creator Studio.exe" /T'
  Delete "$SMPROGRAMS\XL Creator Studio\Uninstall XL Creator Studio.lnk"
  Delete "$SMPROGRAMS\XL Creator Studio\XL Creator Studio.lnk"
  RMDir "$SMPROGRAMS\XL Creator Studio"
!macroend
