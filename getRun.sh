NAME="CTV.tar.gz"
rm $NAME || true
wget -L --header "PRIVATE-TOKEN: TOKEN" "https://gitlab.com/ctvisualizer/front-end/-/jobs/artifacts/build-pipeline/raw/CTVisualizer-darwin-x64.tar.gz?job=buildTar" -O "./$NAME"
tar -xzvf $NAME