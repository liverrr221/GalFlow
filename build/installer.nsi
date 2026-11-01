Unicode true
!include "MUI2.nsh"

!ifndef ROOT
  !error "ROOT is not defined. Pass /DROOT=<project root> to makensis."
!endif

!define PRODUCT_NAME "GalFlow"
!define PRODUCT_VERSION "0.1.0"
!define PRODUCT_PUBLISHER "GalFlow"
!define PRODUCT_EXE "GalFlow.exe"
!define APP_REG_KEY "Software\GalFlow"
!define UNINSTALL_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\GalFlow"

Name "${PRODUCT_NAME} 剧情流程工作台"
OutFile "${ROOT}\release\GalFlow-Setup-0.1.0-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\GalFlow"
InstallDirRegKey HKCU "${APP_REG_KEY}" "InstallDir"
RequestExecutionLevel user
BrandingText "${PRODUCT_NAME}"
ShowInstDetails show
ShowUninstDetails show

SetCompressor /SOLID lzma
SetCompressorDictSize 64

Icon "${ROOT}\build\icon.ico"
UninstallIcon "${ROOT}\build\icon.ico"

VIProductVersion "0.1.0.0"
VIAddVersionKey /LANG=2052 "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=2052 "FileDescription" "${PRODUCT_NAME} 剧情流程工作台安装程序"
VIAddVersionKey /LANG=2052 "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=2052 "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=2052 "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=2052 "LegalCopyright" "Copyright © 2026 GalFlow"

!define MUI_ABORTWARNING
!define MUI_ICON "${ROOT}\build\icon.ico"
!define MUI_UNICON "${ROOT}\build\icon.ico"
!define MUI_WELCOMEPAGE_TITLE "欢迎安装 GalFlow"
!define MUI_WELCOMEPAGE_TEXT "GalFlow 是一个面向 galgame 编剧的可视化剧情流程工作台。$\r$\n$\r$\n安装完成后会在桌面和开始菜单创建快捷方式，双击即可在独立窗口中打开，不需要浏览器。"
!define MUI_DIRECTORYPAGE_TEXT_TOP "请选择 GalFlow 的安装位置。建议使用默认目录。"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动 GalFlow"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "GalFlow 主程序" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /r "${ROOT}\release\GalFlow-win32-x64\*.*"

  CreateDirectory "$SMPROGRAMS\GalFlow"
  CreateShortcut "$SMPROGRAMS\GalFlow\GalFlow.lnk" "$INSTDIR\${PRODUCT_EXE}" "" "$INSTDIR\${PRODUCT_EXE}" 0 SW_SHOWNORMAL
  CreateShortcut "$DESKTOP\GalFlow.lnk" "$INSTDIR\${PRODUCT_EXE}" "" "$INSTDIR\${PRODUCT_EXE}" 0 SW_SHOWNORMAL

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "${APP_REG_KEY}" "InstallDir" "$INSTDIR"

  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "DisplayName" "${PRODUCT_NAME} 剧情流程工作台"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_EXE}"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTALL_REG_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_REG_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\GalFlow.lnk"
  Delete "$SMPROGRAMS\GalFlow\GalFlow.lnk"
  RMDir "$SMPROGRAMS\GalFlow"

  DeleteRegKey HKCU "${UNINSTALL_REG_KEY}"
  DeleteRegKey HKCU "${APP_REG_KEY}"

  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
SectionEnd
