# Open in Windows Explorer (VSCode/Antigravity)

Extensão para abrir arquivos e pastas do workspace diretamente no **Windows Explorer**.

Suporte incluído para:
- workspace local no Windows
- workspace no **WSL** (conversão automática de path Linux para path Windows)
- URIs remotas `vscode-remote://wsl+...` (via `\\wsl.localhost\\<distro>\\...`)

## Comando

- `Open in Windows Explorer` (`antigravity.openInWindowsExplorer`)

Onde aparece:
- Menu de contexto do Explorer (arquivo/pasta)
- Command Palette

<img width="1345" height="803" alt="image" src="https://github.com/user-attachments/assets/45fea2ea-4201-484f-9b44-4c701fdcc87d" />


## Como testar localmente

1. Abra este repositório no VSCode/Antigravity.
2. Rode a extensão em modo desenvolvimento (`F5`), ou use "Run Extension" no debugger.
3. No Explorer, clique com o botão direito em um arquivo/pasta e use **Open in Windows Explorer**.

## Comportamento esperado

- Arquivo: abre o Explorer com o arquivo selecionado.
- Pasta: abre a pasta no Explorer.
- No WSL: abre no Explorer do Windows usando `explorer.exe`.
- Em paths UNC (WSL remoto), a seleção de arquivo (`/select`) pode falhar no Explorer; nesses casos a extensão abre a pasta pai.
