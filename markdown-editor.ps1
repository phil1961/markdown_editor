$mdFile = if ($args[0]) { $args[0] } else { (Get-Content "D:\Projects\Markdown_Editor\md_args.txt")[0].Trim() }
$mdName = [System.IO.Path]::GetFileName($mdFile)
$htmlFile = "D:\Projects\Markdown_Editor\markdown-editor.html"
$tmpHtml = "D:\Projects\Markdown_Editor\md_editor_launch.html"
$b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($mdFile))
$html = [System.IO.File]::ReadAllText($htmlFile, [System.Text.Encoding]::UTF8)
$inject = "<script>window.MD_PAYLOAD={b64:`"$b64`",filename:`"$mdName`"};</script>"
$idx = $html.IndexOf("</head>")
$html = $html.Substring(0, $idx) + $inject + $html.Substring($idx)
[System.IO.File]::WriteAllText($tmpHtml, $html, [System.Text.Encoding]::UTF8)
Start-Process $tmpHtml
