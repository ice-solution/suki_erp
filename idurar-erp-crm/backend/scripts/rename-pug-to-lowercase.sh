#!/bin/sh
# 將 src/pdf/*.pug 全部改為小寫檔名（解決 Linux 大小寫敏感導致 PDF 模板找不到）
# 部署到伺服器後若 PDF 出現 Template file not found，可執行此腳本一次。
# 使用方式：在 backend 目錄執行 ./scripts/rename-pug-to-lowercase.sh

cd "$(dirname "$0")/../src/pdf" || exit 1
for f in *.pug; do
  [ -e "$f" ] || continue
  low=$(echo "$f" | tr '[:upper:]' '[:lower:]')
  [ "$f" = "$low" ] && continue
  echo "Renaming: $f -> $low"
  mv "$f" "$low"
done
echo "Done."
