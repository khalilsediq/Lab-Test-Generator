; Bukhari Lab Installer - Password Protection Script
; This script is included by electron-builder during NSIS installer generation.

!include nsDialogs.nsh
!include LogicLib.nsh

!macro customHeader
  SpaceTexts none
!macroend

; Define variables for the password dialog
Var PasswordDialog
Var PasswordLabel
Var PasswordInput

; Declare a custom page that will run before the Welcome page
Page custom EnterPasswordPage ValidatePasswordPage

Function EnterPasswordPage
  nsDialogs::Create 1018
  Pop $PasswordDialog

  ${If} $PasswordDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 12u "Enter installation password:"
  Pop $PasswordLabel

  ${NSD_CreatePassword} 0 15u 100% 12u ""
  Pop $PasswordInput

  nsDialogs::Show
FunctionEnd

Function ValidatePasswordPage
  ${NSD_GetText} $PasswordInput $0
  
  StrCmp $0 "bukhari_Lab1234" correct wrong

  wrong:
    MessageBox MB_ICONSTOP|MB_OK "Incorrect password. Please try again or cancel the installation."
    Abort ; Prevents moving to the next page

  correct:
FunctionEnd

!macro customInit
  ; Set default installation directory to Program Files
  StrCpy $INSTDIR "$PROGRAMFILES64\Bukhari Lab"
!macroend
